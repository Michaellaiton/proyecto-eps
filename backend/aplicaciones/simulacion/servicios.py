"""Creación y seguimiento de simulaciones. La ejecución pesada vive en motor.py."""

import threading
from datetime import timedelta

from django.utils import timezone

from aplicaciones.auditoria import servicios as auditoria
from configuracion.excepciones import Conflicto

from . import motor
from .models import EstadoSimulacion, Simulacion

# Una simulación colgada (p. ej. si se reinició el servidor a mitad) se da por fallida pasado este tiempo.
MINUTOS_PARA_DAR_POR_FALLIDA = 10


def _cerrar_simulaciones_colgadas():
    limite = timezone.now() - timedelta(minutes=MINUTOS_PARA_DAR_POR_FALLIDA)
    Simulacion.objects.filter(estado=EstadoSimulacion.EN_CURSO, iniciada_en__lt=limite).update(
        estado=EstadoSimulacion.FALLIDA, terminada_en=timezone.now()
    )


def lanzar_en_segundo_plano(id_simulacion):
    threading.Thread(target=motor.ejecutar, args=(id_simulacion,), daemon=True).start()


def crear_simulacion(administrador, tipo, parametros):
    """Registra y lanza una simulación. Solo puede haber una en curso para no saturar la base de datos."""
    _cerrar_simulaciones_colgadas()
    if Simulacion.objects.filter(estado=EstadoSimulacion.EN_CURSO).exists():
        raise Conflicto("Ya hay una simulación en curso. Espera a que termine.")
    simulacion = Simulacion.objects.create(tipo=tipo, parametros=parametros, creada_por=administrador)
    auditoria.registrar(
        administrador, "SIMULAR_CONCURRENCIA", "simulaciones", simulacion.pk, detalle=f"{tipo} {parametros}"
    )
    lanzar_en_segundo_plano(simulacion.pk)
    return simulacion
