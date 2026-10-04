"""Modelo de pacientes afiliados. Solo datos de contacto e identificación (minimización, Ley 1581 de 2012)."""
from django.conf import settings
from django.db import models


class TipoDocumento(models.TextChoices):
    CEDULA = "CC", "Cédula de ciudadanía"
    TARJETA_IDENTIDAD = "TI", "Tarjeta de identidad"
    CEDULA_EXTRANJERIA = "CE", "Cédula de extranjería"
    PASAPORTE = "PA", "Pasaporte"
    REGISTRO_CIVIL = "RC", "Registro civil"


class Paciente(models.Model):
    id_paciente = models.BigAutoField(primary_key=True)
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, db_column="id_usuario", related_name="paciente"
    )
    tipo_documento = models.CharField(max_length=2, choices=TipoDocumento.choices)
    numero_documento = models.CharField(max_length=20)
    nombres = models.CharField(max_length=80)
    apellidos = models.CharField(max_length=80)
    telefono = models.CharField(max_length=20)
    fecha_nacimiento = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "pacientes"
        ordering = ["apellidos", "nombres"]
        verbose_name = "paciente"
        verbose_name_plural = "pacientes"
        constraints = [
            models.UniqueConstraint(fields=["tipo_documento", "numero_documento"], name="uq_pacientes_documento"),
        ]

    def __str__(self):
        return f"{self.nombres} {self.apellidos} ({self.tipo_documento} {self.numero_documento})"
