"""Serializadores de citas: entrada de la reserva y forma del JSON de salida."""
from rest_framework import serializers

from .models import Cita, EstadoCita


class AgendarCitaSerializador(serializers.Serializer):
    id_doctor = serializers.IntegerField(min_value=1)
    fecha = serializers.DateField()
    hora = serializers.TimeField(input_formats=["%H:%M", "%H:%M:%S"])


class ReprogramarCitaSerializador(serializers.Serializer):
    fecha = serializers.DateField()
    hora = serializers.TimeField(input_formats=["%H:%M", "%H:%M:%S"])
    id_doctor = serializers.IntegerField(min_value=1, required=False)


class RegistrarAtencionSerializador(serializers.Serializer):
    estado = serializers.ChoiceField(choices=[EstadoCita.ATENDIDA, EstadoCita.NO_ASISTIO])


class CitaSerializador(serializers.ModelSerializer):
    id_doctor = serializers.IntegerField(source="doctor.id_doctor", read_only=True)
    doctor = serializers.SerializerMethodField()
    especialidad = serializers.CharField(source="doctor.especialidad.nombre", read_only=True)
    id_especialidad = serializers.IntegerField(source="doctor.especialidad_id", read_only=True)
    hora = serializers.TimeField(format="%H:%M", read_only=True)

    class Meta:
        model = Cita
        fields = ["id_cita", "id_doctor", "doctor", "id_especialidad", "especialidad", "fecha", "hora", "estado"]

    def get_doctor(self, cita):
        return f"{cita.doctor.nombres} {cita.doctor.apellidos}"
