"""
Notificaciones por correo al paciente (caso de uso "Recibir confirmación de la cita").

Los correos se envían solo cuando la transacción se confirma (on_commit), para no avisar de una cita
que luego se revirtió. En desarrollo se usa el backend de consola: el correo se imprime en la terminal
de runserver. Un fallo de envío no debe impedir la operación: se registra en el log y se continúa.
En producción, este envío debería moverse a una cola de trabajos (worker) para no demorar la respuesta.
"""
import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import formats

registro = logging.getLogger(__name__)

PIE = "\n\nEste es un mensaje automático del sistema de citas de la EPS. No responda a este correo."


def _descripcion(cita):
    fecha = formats.date_format(cita.fecha, "l j \\d\\e F \\d\\e Y")
    return (
        f"  Especialidad: {cita.doctor.especialidad.nombre}\n"
        f"  Médico: {cita.doctor.nombres} {cita.doctor.apellidos}\n"
        f"  Fecha: {fecha}\n"
        f"  Hora: {cita.hora:%H:%M}"
    )


def _enviar(paciente, asunto, cuerpo):
    destinatario = paciente.usuario.email
    if not destinatario:
        return

    def enviar_al_confirmar():
        try:
            send_mail(
                f"[Citas EPS] {asunto}",
                f"Hola, {paciente.nombres}.\n\n{cuerpo}{PIE}",
                settings.DEFAULT_FROM_EMAIL,
                [destinatario],
            )
        except Exception:
            registro.exception("No se pudo enviar la notificación '%s' a %s", asunto, destinatario)

    transaction.on_commit(enviar_al_confirmar)


def cita_agendada(cita):
    horas = settings.EPS_PARAMETROS["HORAS_MINIMAS_CANCELACION"]
    _enviar(
        cita.paciente,
        "Cita agendada",
        f"Su cita quedó agendada:\n\n{_descripcion(cita)}\n\n"
        f"Si no puede asistir, cancélela con al menos {horas} horas de antelación para liberar el cupo.",
    )


def cita_cancelada(cita, por_administrador=False):
    origen = "por el personal de la EPS" if por_administrador else "a solicitud suya"
    _enviar(cita.paciente, "Cita cancelada", f"Su cita fue cancelada {origen}:\n\n{_descripcion(cita)}")


def cita_reprogramada(anterior, nueva):
    _enviar(
        nueva.paciente,
        "Cita reprogramada",
        f"Su cita fue reprogramada.\n\nAntes:\n{_descripcion(anterior)}\n\nAhora:\n{_descripcion(nueva)}",
    )


def cita_afectada_por_bloqueo(cita, motivo):
    _enviar(
        cita.paciente,
        "Novedad en su cita",
        f"El médico registró una novedad en su agenda ({motivo}) que afecta su cita:\n\n{_descripcion(cita)}\n\n"
        "Su cita sigue activa, pero le recomendamos reprogramarla desde la opción «Mis citas».",
    )
