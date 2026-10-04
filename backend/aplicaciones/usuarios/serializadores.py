"""Serializadores de autenticación y del usuario actual."""
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed, Throttled
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from aplicaciones.auditoria import servicios as auditoria
from aplicaciones.auditoria.servicios import Resultado

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
            auditoria.registrar(
                None, "INICIAR_SESION", "usuarios", None, Resultado.DENEGADO,
                f"usuario={nombre_usuario[:60]}; intentos restantes={restantes}",
            )
            raise
        servicios.limpiar_intentos(nombre_usuario)
        respuesta["rol"] = self.user.rol
        return respuesta


class UsuarioActualSerializador(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ["id_usuario", "username", "rol", "nombre"]

    def get_nombre(self, usuario):
        perfil = getattr(usuario, "paciente", None) or getattr(usuario, "doctor", None)
        if perfil:
            return f"{perfil.nombres} {perfil.apellidos}"
        return usuario.get_full_name() or usuario.username
