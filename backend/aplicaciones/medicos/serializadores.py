"""Serializadores: definen cómo se presentan los modelos de médicos en JSON."""

from rest_framework import serializers

from .models import BloqueoAgenda, Doctor, Especialidad


class EspecialidadSerializador(serializers.ModelSerializer):
    class Meta:
        model = Especialidad
        fields = ["id_especialidad", "nombre"]


class DoctorSerializador(serializers.ModelSerializer):
    especialidad = EspecialidadSerializador(read_only=True)

    class Meta:
        model = Doctor
        fields = ["id_doctor", "nombres", "apellidos", "especialidad"]


class ConsultaDisponibilidadSerializador(serializers.Serializer):
    """Parámetros de la consulta de disponibilidad (?fecha=AAAA-MM-DD)."""

    fecha = serializers.DateField()


class BloqueoAgendaSerializador(serializers.ModelSerializer):
    hora_inicio = serializers.TimeField(format="%H:%M", input_formats=["%H:%M", "%H:%M:%S"])
    hora_fin = serializers.TimeField(format="%H:%M", input_formats=["%H:%M", "%H:%M:%S"])
    motivo = serializers.CharField(max_length=200)

    class Meta:
        model = BloqueoAgenda
        fields = ["id_bloqueo", "fecha", "hora_inicio", "hora_fin", "motivo"]
        read_only_fields = ["id_bloqueo"]


class ConsultaBloqueosSerializador(serializers.Serializer):
    desde = serializers.DateField(required=False)
    hasta = serializers.DateField(required=False)
