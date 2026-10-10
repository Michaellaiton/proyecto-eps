"""
Modelos del simulador de concurrencia (demostración del problema de sobreagendamiento de los informes).

- Simulacion: una ejecución, con sus parámetros, estado y resultados.
- EventoSimulacion: registro (log) de lo que ocurre durante la ejecución, para verlo en vivo.
- ReservaSinControl: tabla de LÍNEA BASE sin índices únicos ni bloqueos. Solo la usa el escenario
  "sin controles" para mostrar cómo se duplica una franja (CP-CONC-02 del informe de Calidad).
"""

from django.conf import settings
from django.db import models


class TipoSimulacion(models.TextChoices):
    RAFAGA = "RAFAGA", "Ráfaga sobre una franja"
    CARGA = "CARGA", "Consultas masivas"


class EstadoSimulacion(models.TextChoices):
    EN_CURSO = "EN_CURSO", "En curso"
    TERMINADA = "TERMINADA", "Terminada"
    FALLIDA = "FALLIDA", "Fallida"


class NivelEvento(models.TextChoices):
    INFO = "INFO", "Información"
    OK = "OK", "Éxito"
    CONFLICTO = "CONFLICTO", "Conflicto"
    ERROR = "ERROR", "Error"
    METRICA = "METRICA", "Métrica"


class Simulacion(models.Model):
    id_simulacion = models.BigAutoField(primary_key=True)
    tipo = models.CharField(max_length=10, choices=TipoSimulacion.choices)
    parametros = models.JSONField(default=dict)
    estado = models.CharField(max_length=10, choices=EstadoSimulacion.choices, default=EstadoSimulacion.EN_CURSO)
    resultados = models.JSONField(default=dict, blank=True)
    creada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, db_column="id_usuario", related_name="+"
    )
    iniciada_en = models.DateTimeField(auto_now_add=True)
    terminada_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "simulaciones"
        ordering = ["-iniciada_en"]
        verbose_name = "simulación"
        verbose_name_plural = "simulaciones"

    def __str__(self):
        return f"Simulación {self.id_simulacion} · {self.get_tipo_display()} · {self.get_estado_display()}"


class EventoSimulacion(models.Model):
    id_evento = models.BigAutoField(primary_key=True)
    simulacion = models.ForeignKey(
        Simulacion, on_delete=models.CASCADE, db_column="id_simulacion", related_name="eventos"
    )
    momento = models.DateTimeField()
    nivel = models.CharField(max_length=10, choices=NivelEvento.choices, default=NivelEvento.INFO)
    mensaje = models.CharField(max_length=300)

    class Meta:
        db_table = "simulacion_eventos"
        ordering = ["id_evento"]


class ReservaSinControl(models.Model):
    """Línea base: sin restricción de unicidad ni bloqueo. Nunca se usa en el agendamiento real."""

    id_reserva = models.BigAutoField(primary_key=True)
    id_doctor = models.BigIntegerField()
    id_paciente = models.BigIntegerField()
    fecha = models.DateField()
    hora = models.TimeField()
    creada_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "simulacion_reservas_sin_control"
