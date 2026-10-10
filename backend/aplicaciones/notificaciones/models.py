"""Notificaciones internas: avisos que el usuario ve en la campana del sistema."""

from django.conf import settings
from django.db import models


class TipoNotificacion(models.TextChoices):
    CITA = "CITA", "Cita"
    RECORDATORIO = "RECORDATORIO", "Recordatorio"
    AGENDA = "AGENDA", "Agenda médica"
    SEGURIDAD = "SEGURIDAD", "Seguridad"
    SISTEMA = "SISTEMA", "Sistema"


class Notificacion(models.Model):
    id_notificacion = models.BigAutoField(primary_key=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column="id_usuario", related_name="notificaciones"
    )
    tipo = models.CharField(max_length=15, choices=TipoNotificacion.choices, default=TipoNotificacion.SISTEMA)
    titulo = models.CharField(max_length=120)
    mensaje = models.CharField(max_length=300)
    # Sección del frontend a la que lleva la notificación (p. ej. "mis-citas", "agenda").
    destino = models.CharField(max_length=40, blank=True)
    leida = models.BooleanField(default=False)
    creada_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notificaciones"
        ordering = ["-creada_en"]
        verbose_name = "notificación"
        verbose_name_plural = "notificaciones"
        indexes = [models.Index(fields=["usuario", "leida", "-creada_en"], name="ix_notificaciones_usuario")]

    def __str__(self):
        return f"{self.usuario} · {self.titulo}"
