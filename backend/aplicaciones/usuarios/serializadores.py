"""Serializadores de autenticación y del usuario actual."""

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed, Throttled
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from aplicaciones.auditoria import servicios as auditoria
from aplicaciones.auditoria.servicios import Resultado
from aplicaciones.notificaciones import servicios as notificaciones

from . import servicios
from .models import Usuario


class CuentaBloqueada(Throttled):
    default_detail = "Demasiados intentos fallidos. La cuenta está bloqueada temporalmente."
    extra_detail_singular = "Intente de nuevo en {wait} segundo."
    extra_detail_plural = "Intente de nuevo en {wait} segundos."


class InicioSesionSerializador(TokenObtainPairSerializer):
    """
    Devuelve los tokens y, además, el rol, para que el frontend muestre las vistas que correspondan.
    Bloquea temporalmente la cuenta tras varios intentos fallidos (429).
    """

    default_error_messages = {"no_active_account": "Usuario o contraseña incorrectos."}

    @classmethod
    def get_token(cls, usuario):
        token = super().get_token(usuario)
        token["rol"] = usuario.rol
        return token

    def validate(self, datos):
        nombre_usuario = datos.get(self.username_field, "")
        if servicios.esta_bloqueado(nombre_usuario):
            raise CuentaBloqueada(wait=servicios.segundos_de_bloqueo())
        try:
            respuesta = super().validate(datos)
        except AuthenticationFailed:
            restantes = servicios.registrar_intento_fallido(nombre_usuario)
            if restantes == 0:
                notificaciones.cuenta_bloqueada(nombre_usuario, servicios.segundos_de_bloqueo() // 60)
            auditoria.registrar(
                None,
                "INICIAR_SESION",
                "usuarios",
                None,
                Resultado.DENEGADO,
                f"usuario={nombre_usuario[:60]}; intentos restantes={restantes}",
            )
            raise
        servicios.limpiar_intentos(nombre_usuario)
        respuesta["rol"] = self.user.rol
        return respuesta


class UsuarioActualSerializador(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()
    telefono = serializers.SerializerMethodField()
    especialidad = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ["id_usuario", "username", "rol", "nombre", "email", "telefono", "especialidad"]

    def get_nombre(self, usuario):
        perfil = getattr(usuario, "paciente", None) or getattr(usuario, "doctor", None)
        if perfil:
            return f"{perfil.nombres} {perfil.apellidos}"
        return usuario.get_full_name() or usuario.username

    def get_telefono(self, usuario):
        paciente = getattr(usuario, "paciente", None)
        return paciente.telefono if paciente else None

    def get_especialidad(self, usuario):
        doctor = getattr(usuario, "doctor", None)
        return doctor.especialidad.nombre if doctor else None


class ActualizarPerfilSerializador(serializers.Serializer):
    """Datos de contacto que el propio usuario puede cambiar."""

    email = serializers.EmailField(required=False, allow_blank=True)
    telefono = serializers.RegexField(
        r"^[0-9+ ]{7,20}$", required=False, error_messages={"invalid": "Use solo números (entre 7 y 20 caracteres)."}
    )


class CambiarClaveSerializador(serializers.Serializer):
    clave_actual = serializers.CharField(write_only=True)
    clave_nueva = serializers.CharField(write_only=True, min_length=8, max_length=128)

    def validate_clave_actual(self, valor):
        if not self.context["usuario"].check_password(valor):
            raise serializers.ValidationError("La contraseña actual no es correcta.")
        return valor

    def validate_clave_nueva(self, valor):
        validate_password(valor, self.context["usuario"])
        return valor
