"""Registro de auditoría de operaciones, incluidos los intentos denegados (no repudio)."""

from django.conf import settings
from django.db import models


class Auditoria(models.Model):
    id_auditoria = models.BigAutoField(primary_key=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="id_usuario",
        related_name="registros_auditoria",
    )
    operacion = models.CharField(max_length=30)
    tabla = models.CharField(max_length=40)
    id_registro = models.BigIntegerField(null=True, blank=True)
    resultado = models.CharField(max_length=20)
    detalle = models.CharField(max_length=255, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "auditoria"
        ordering = ["-fecha"]
        verbose_name = "registro de auditoría"
        verbose_name_plural = "auditoría"
        indexes = [models.Index(fields=["fecha"], name="ix_auditoria_fecha")]

    def __str__(self):
        return f"{self.fecha:%Y-%m-%d %H:%M} · {self.operacion} {self.tabla} · {self.resultado}"
