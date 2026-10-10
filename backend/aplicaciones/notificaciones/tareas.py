"""
Tareas en segundo plano (framework de tareas de Django).

Enviar un correo puede tardar segundos; por eso se encola como tarea en lugar de hacerse dentro de la
petición (lección de los procesos pesados en workers, Ingeniería Web). En desarrollo el backend
`ImmediateBackend` la ejecuta al instante; en producción se configura un backend con cola y un worker
sin cambiar este código (ver TASKS en configuracion/ajustes.py).
"""

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.tasks import task

registro = logging.getLogger(__name__)


@task
def enviar_correo(destinatario: str, asunto: str, cuerpo: str):
    try:
        send_mail(asunto, cuerpo, settings.DEFAULT_FROM_EMAIL, [destinatario])
    except Exception:
        # Un fallo de envío no debe romper la operación del usuario: se registra y se continúa.
        registro.exception("No se pudo enviar el correo '%s' a %s", asunto, destinatario)
