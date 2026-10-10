"""Serializadores del módulo de administración: usuarios, horarios, citas y auditoría."""

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from aplicaciones.auditoria.models import Auditoria
from aplicaciones.citas.serializadores import CitaSerializador
from aplicaciones.medicos.models import Doctor, Especialidad, HorarioBase
from aplicaciones.pacientes.models import Paciente, TipoDocumento
from aplicaciones.usuarios.models import Rol, Usuario

# --- Usuarios ---


class UsuarioAdminSerializador(serializers.ModelSerializer):
    """Vista completa de un usuario con los datos de su perfil (paciente o médico)."""

    activo = serializers.BooleanField(source="is_active")
    nombres = serializers.SerializerMethodField()
    apellidos = serializers.SerializerMethodField()
    perfil = serializers.SerializerMethodField()
    ultimo_acceso = serializers.DateTimeField(source="last_login")
    fecha_registro = serializers.DateTimeField(source="date_joined")

    class Meta:
        model = Usuario
        fields = [
            "id_usuario",
            "username",
            "email",
            "rol",
            "activo",
            "nombres",
            "apellidos",
            "perfil",
            "ultimo_acceso",
            "fecha_registro",
        ]

    def _perfil(self, usuario):
        return getattr(usuario, "paciente", None) or getattr(usuario, "doctor", None)

    def get_nombres(self, usuario):
        perfil = self._perfil(usuario)
        return perfil.nombres if perfil else usuario.first_name

    def get_apellidos(self, usuario):
        perfil = self._perfil(usuario)
        return perfil.apellidos if perfil else usuario.last_name

    def get_perfil(self, usuario):
        paciente = getattr(usuario, "paciente", None)
        if paciente:
            return {
                "id_paciente": paciente.id_paciente,
                "tipo_documento": paciente.tipo_documento,
                "numero_documento": paciente.numero_documento,
                "telefono": paciente.telefono,
                "fecha_nacimiento": paciente.fecha_nacimiento,
            }
        doctor = getattr(usuario, "doctor", None)
        if doctor:
            return {
                "id_doctor": doctor.id_doctor,
                "id_especialidad": doctor.especialidad_id,
                "especialidad": doctor.especialidad.nombre,
                "registro_medico": doctor.registro_medico,
            }
        return None


class CrearUsuarioSerializador(serializers.Serializer):
    """Datos para crear un usuario. Los campos de perfil dependen del rol."""

    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    rol = serializers.ChoiceField(choices=Rol.choices)
    nombres = serializers.CharField(max_length=80)
    apellidos = serializers.CharField(max_length=80)
    # Paciente
    tipo_documento = serializers.ChoiceField(choices=TipoDocumento.choices, required=False)
    numero_documento = serializers.CharField(max_length=20, required=False)
    telefono = serializers.CharField(max_length=20, required=False)
    fecha_nacimiento = serializers.DateField(required=False, allow_null=True)
    # Médico
    id_especialidad = serializers.PrimaryKeyRelatedField(
        queryset=Especialidad.objects.all(), required=False, source="especialidad"
    )
    registro_medico = serializers.CharField(max_length=30, required=False)

    CAMPOS_POR_ROL = {
        Rol.PACIENTE: ["tipo_documento", "numero_documento", "telefono"],
        Rol.DOCTOR: ["especialidad", "registro_medico"],
        Rol.ADMIN: [],
    }

    def validate_username(self, valor):
        if Usuario.objects.filter(username__iexact=valor).exists():
            raise serializers.ValidationError("Ya existe un usuario con ese nombre.")
        return valor

    def validate(self, datos):
        faltantes = [c for c in self.CAMPOS_POR_ROL[datos["rol"]] if not datos.get(c)]
        if faltantes:
            nombres = ["id_especialidad" if c == "especialidad" else c for c in faltantes]
            raise serializers.ValidationError({c: "Obligatorio para este rol." for c in nombres})

        if (
            datos["rol"] == Rol.PACIENTE
            and Paciente.objects.filter(
                tipo_documento=datos["tipo_documento"], numero_documento=datos["numero_documento"]
            ).exists()
        ):
            raise serializers.ValidationError({"numero_documento": "Ya existe un paciente con ese documento."})
        if datos["rol"] == Rol.DOCTOR and Doctor.objects.filter(registro_medico=datos["registro_medico"]).exists():
            raise serializers.ValidationError({"registro_medico": "Ya existe un médico con ese registro."})

        validate_password(datos["password"], Usuario(username=datos["username"], email=datos.get("email", "")))
        return datos


class ActualizarUsuarioSerializador(serializers.Serializer):
    """Cambios permitidos sobre un usuario existente. El rol y el nombre de usuario no se cambian."""

    email = serializers.EmailField(required=False, allow_blank=True)
    activo = serializers.BooleanField(required=False)
    nombres = serializers.CharField(max_length=80, required=False)
    apellidos = serializers.CharField(max_length=80, required=False)
    telefono = serializers.CharField(max_length=20, required=False)
    id_especialidad = serializers.PrimaryKeyRelatedField(
        queryset=Especialidad.objects.all(), required=False, source="especialidad"
    )
    registro_medico = serializers.CharField(max_length=30, required=False)


class RestablecerClaveSerializador(serializers.Serializer):
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)

    def validate_password(self, valor):
        validate_password(valor, self.context.get("usuario"))
        return valor


# --- Horario base ---


class BloqueHorarioSerializador(serializers.ModelSerializer):
    hora_inicio = serializers.TimeField(format="%H:%M", input_formats=["%H:%M", "%H:%M:%S"])
    hora_fin = serializers.TimeField(format="%H:%M", input_formats=["%H:%M", "%H:%M:%S"])
    duracion_minutos = serializers.IntegerField(min_value=10, max_value=120)

    class Meta:
        model = HorarioBase
        fields = ["dia_semana", "hora_inicio", "hora_fin", "duracion_minutos"]

    def validate(self, datos):
        if datos["hora_fin"] <= datos["hora_inicio"]:
            raise serializers.ValidationError({"hora_fin": "Debe ser posterior a la hora de inicio."})
        return datos


class HorarioDoctorSerializador(serializers.Serializer):
    bloques = BloqueHorarioSerializador(many=True)


# --- Citas, reportes y auditoría ---


class CitaAdminSerializador(CitaSerializador):
    paciente = serializers.SerializerMethodField()
    documento_paciente = serializers.SerializerMethodField()

    class Meta(CitaSerializador.Meta):
        fields = CitaSerializador.Meta.fields + ["paciente", "documento_paciente"]

    def get_paciente(self, cita):
        return f"{cita.paciente.nombres} {cita.paciente.apellidos}"

    def get_documento_paciente(self, cita):
        return f"{cita.paciente.tipo_documento} {cita.paciente.numero_documento}"


class ConsultaRangoFechasSerializador(serializers.Serializer):
    desde = serializers.DateField()
    hasta = serializers.DateField()


class FiltroCitasSerializador(serializers.Serializer):
    desde = serializers.DateField(required=False)
    hasta = serializers.DateField(required=False)


class AuditoriaSerializador(serializers.ModelSerializer):
    usuario = serializers.CharField(source="usuario.username", default=None, read_only=True)

    class Meta:
        model = Auditoria
        fields = ["id_auditoria", "fecha", "usuario", "operacion", "tabla", "id_registro", "resultado", "detalle"]
