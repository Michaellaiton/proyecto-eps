"""Modelo de usuarios: credenciales y rol, separados de los datos del paciente y del médico."""
from django.contrib.auth.models import AbstractUser
from django.db import models


class Rol(models.TextChoices):
    PACIENTE = "PACIENTE", "Paciente"
    DOCTOR = "DOCTOR", "Doctor"
    ADMIN = "ADMIN", "Administrativo EPS"


class Usuario(AbstractUser):
    id_usuario = models.BigAutoField(primary_key=True)
    rol = models.CharField(max_length=10, choices=Rol.choices, default=Rol.PACIENTE)

    class Meta:
        db_table = "usuarios"
        verbose_name = "usuario"
        verbose_name_plural = "usuarios"
        constraints = [
            models.CheckConstraint(condition=models.Q(rol__in=Rol.values), name="ck_usuarios_rol_valido"),
        ]

    def __str__(self):
        return f"{self.username} ({self.get_rol_display()})"
