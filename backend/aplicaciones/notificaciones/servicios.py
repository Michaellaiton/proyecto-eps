"""
Notificaciones del sistema: avisos internos (campana) y correos al paciente.

- El aviso interno se crea dentro de la transacción de la operación: si esta se revierte, el aviso también.
- El correo se encola como tarea solo cuando la transacción se confirma (on_commit), para no avisar de una
  cita que no quedó registrada.
"""

from django.conf import settings
from django.db import transaction
from django.utils import formats

from aplicaciones.usuarios.models import Rol, Usuario

from .models import Notificacion, TipoNotificacion
from .tareas import enviar_correo

PIE = "\n\nEste es un mensaje automático del sistema de citas de la EPS. No responda a este correo."


def notificar(usuario, titulo, mensaje, tipo=TipoNotificacion.SISTEMA, destino=""):
    """Crea un aviso interno para `usuario`."""
    return Notificacion.objects.create(
        usuario=usuario, tipo=tipo, titulo=titulo[:120], mensaje=mensaje[:300], destino=destino
    )


def _correo(usuario, nombre, asunto, cuerpo):
    if not usuario.email:
        return
    texto = f"Hola, {nombre}.\n\n{cuerpo}{PIE}"
    transaction.on_commit(lambda: enviar_correo.enqueue(usuario.email, f"[Citas EPS] {asunto}", texto))


def _fecha(cita):
    return formats.date_format(cita.fecha, "l j \\d\\e F").lower()


def _resumen(cita):
    return f"{cita.doctor.especialidad.nombre} · {_fecha(cita)} a las {cita.hora:%H:%M}"


def _descripcion(cita):
    return (
        f"  Especialidad: {cita.doctor.especialidad.nombre}\n"
        f"  Médico: {cita.doctor.nombres} {cita.doctor.apellidos}\n"
        f"  Fecha: {formats.date_format(cita.fecha, 'l j \\d\\e F \\d\\e Y').lower()}\n"
        f"  Hora: {cita.hora:%H:%M}"
    )


def _al_paciente(cita, titulo, mensaje, asunto, cuerpo, tipo=TipoNotificacion.CITA):
    paciente = cita.paciente
    notificar(paciente.usuario, titulo, mensaje, tipo, "mis-citas")
    _correo(paciente.usuario, paciente.nombres, asunto, cuerpo)


def _al_medico(cita, titulo):
    paciente = f"{cita.paciente.nombres} {cita.paciente.apellidos}"
    notificar(
        cita.doctor.usuario,
        titulo,
        f"{paciente} · {_fecha(cita)} a las {cita.hora:%H:%M}",
        TipoNotificacion.AGENDA,
        "agenda",
    )


# --- Eventos de citas ---


def cita_agendada(cita):
    horas = settings.EPS_PARAMETROS["HORAS_MINIMAS_CANCELACION"]
    _al_paciente(
        cita,
        "Cita agendada",
        _resumen(cita),
        "Cita agendada",
        f"Su cita quedó agendada:\n\n{_descripcion(cita)}\n\n"
        f"Si no puede asistir, cancélela con al menos {horas} horas de antelación para liberar el cupo.",
    )
    _al_medico(cita, "Nueva cita en tu agenda")


def cita_cancelada(cita, por_administrador=False):
    origen = "por el personal de la EPS" if por_administrador else "a solicitud suya"
    _al_paciente(
        cita,
        "Cita cancelada",
        f"{_resumen(cita)} · cancelada {origen}",
        "Cita cancelada",
        f"Su cita fue cancelada {origen}:\n\n{_descripcion(cita)}",
    )
    _al_medico(cita, "Se canceló una cita")


def cita_reprogramada(anterior, nueva):
    _al_paciente(
        nueva,
        "Cita reprogramada",
        f"Ahora: {_resumen(nueva)}",
        "Cita reprogramada",
        f"Su cita fue reprogramada.\n\nAntes:\n{_descripcion(anterior)}\n\nAhora:\n{_descripcion(nueva)}",
    )
    _al_medico(anterior, "Se movió una cita de tu agenda")
    _al_medico(nueva, "Nueva cita en tu agenda")


def cita_afectada_por_bloqueo(cita, motivo):
    _al_paciente(
        cita,
        "Novedad en tu cita",
        f"{_resumen(cita)} · {motivo}. Te sugerimos reprogramarla.",
        "Novedad en su cita",
        f"El médico registró una novedad en su agenda ({motivo}) que afecta su cita:\n\n{_descripcion(cita)}\n\n"
        "Su cita sigue activa, pero le recomendamos reprogramarla desde la opción «Mis citas».",
    )


def recordatorio_de_cita(cita):
    _al_paciente(
        cita,
        "Recordatorio de cita",
        f"Mañana: {_resumen(cita)}",
        "Recordatorio de su cita",
        f"Le recordamos su próxima cita:\n\n{_descripcion(cita)}\n\n"
        "Si no puede asistir, cancélela para liberar el cupo.",
        tipo=TipoNotificacion.RECORDATORIO,
    )


def bloqueo_con_citas_afectadas(doctor, cantidad, motivo):
    """Avisa a los administradores para que coordinen la reprogramación (Tabla 11 del informe de Calidad)."""
    for administrador in Usuario.objects.filter(rol=Rol.ADMIN, is_active=True):
        notificar(
            administrador,
            "Citas afectadas por un bloqueo",
            f"{doctor.nombres} {doctor.apellidos} bloqueó su agenda ({motivo}); {cantidad} cita(s) siguen activas.",
            TipoNotificacion.AGENDA,
            "citas",
        )


# --- Eventos de seguridad ---


def cuenta_bloqueada(nombre_usuario, minutos):
    usuario = Usuario.objects.filter(username__iexact=nombre_usuario).first()
    if usuario:
        notificar(
            usuario,
            "Intentos de acceso fallidos",
            f"Bloqueamos tu cuenta {minutos} minutos tras varios intentos fallidos. "
            "Si no fuiste tú, cambia tu contraseña.",
            TipoNotificacion.SEGURIDAD,
            "perfil",
        )


def clave_cambiada(usuario, por_administrador=False):
    origen = (
        "El administrador restableció tu contraseña." if por_administrador else "Tu contraseña se cambió correctamente."
    )
    notificar(
        usuario,
        "Contraseña actualizada",
        f"{origen} Si no reconoces este cambio, contacta a la EPS.",
        TipoNotificacion.SEGURIDAD,
        "perfil",
    )
