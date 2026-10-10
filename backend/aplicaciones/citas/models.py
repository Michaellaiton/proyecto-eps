"""
Modelo de citas (agendamiento).

Los índices únicos parciales garantizan una sola cita activa por franja de un médico y por
paciente-hora, y permiten volver a reservar una franja cancelada sin borrar el histórico (REQ-03, REQ-04).
"""

from django.db import models
from django.db.models import Q

from aplicaciones.medicos.models import Doctor
from aplicaciones.pacientes.models import Paciente


class EstadoCita(models.TextChoices):
    AGENDADA = "Agendada", "Agendada"
    CANCELADA = "Cancelada", "Cancelada"
    ATENDIDA = "Atendida", "Atendida"
    NO_ASISTIO = "No asistio", "No asistió"


class Cita(models.Model):
    id_cita = models.BigAutoField(primary_key=True)
    paciente = models.ForeignKey(Paciente, on_delete=models.PROTECT, db_column="id_paciente", related_name="citas")
    doctor = models.ForeignKey(Doctor, on_delete=models.PROTECT, db_column="id_doctor", related_name="citas")
    fecha = models.DateField()
    hora = models.TimeField()
    estado = models.CharField(max_length=12, choices=EstadoCita.choices, default=EstadoCita.AGENDADA)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    # Marca del recordatorio enviado al paciente (evita enviarlo dos veces).
    recordatorio_enviado_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "citas"
        ordering = ["fecha", "hora"]
        verbose_name = "cita"
        verbose_name_plural = "citas"
        indexes = [
            models.Index(fields=["doctor", "fecha"], name="ix_citas_doctor_fecha"),
            models.Index(fields=["paciente", "fecha"], name="ix_citas_paciente_fecha"),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(estado__in=EstadoCita.values), name="ck_citas_estado_valido"),
            models.UniqueConstraint(
                fields=["doctor", "fecha", "hora"],
                condition=~Q(estado=EstadoCita.CANCELADA),
                name="ux_citas_franja_activa",
            ),
            models.UniqueConstraint(
                fields=["paciente", "fecha", "hora"],
                condition=~Q(estado=EstadoCita.CANCELADA),
                name="ux_citas_paciente_hora_activa",
            ),
        ]

    def __str__(self):
        return f"Cita {self.id_cita} · {self.fecha} {self.hora:%H:%M} · {self.estado}"
