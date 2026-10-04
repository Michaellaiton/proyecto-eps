"""
Reglas de negocio de la agenda médica: cálculo de franjas y disponibilidad (CU-01, REQ-01, REQ-05).

Las funciones `generar_franjas` y `franja_bloqueada` son puras (no usan la base de datos)
para poder probarlas de forma unitaria.
"""
from datetime import date, datetime, time, timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound

from aplicaciones.auditoria import servicios as auditoria
from aplicaciones.citas.models import Cita, EstadoCita
from aplicaciones.notificaciones import servicios as notificaciones
from configuracion.excepciones import Conflicto, ReglaInvalida

from .models import BloqueoAgenda, Doctor


def _sumar_minutos(hora: time, minutos: int) -> time:
    return (datetime.combine(date.min, hora) + timedelta(minutes=minutos)).time()


def generar_franjas(hora_inicio: time, hora_fin: time, duracion_minutos: int) -> list[time]:
    """Franjas de `duracion_minutos` dentro de [hora_inicio, hora_fin). Una franja incompleta al final se descarta."""
    if duracion_minutos <= 0 or hora_fin <= hora_inicio:
        return []
    franjas = []
    actual = datetime.combine(date.min, hora_inicio)
    limite = datetime.combine(date.min, hora_fin)
    paso = timedelta(minutes=duracion_minutos)
    while actual + paso <= limite:
        franjas.append(actual.time())
        actual += paso
    return franjas


def franja_bloqueada(hora: time, duracion_minutos: int, bloqueos) -> bool:
    """True si la franja [hora, hora+duración) se cruza con algún bloqueo (cada bloqueo tiene hora_inicio y hora_fin)."""
    fin_franja = _sumar_minutos(hora, duracion_minutos)
    return any(hora < bloqueo.hora_fin and fin_franja > bloqueo.hora_inicio for bloqueo in bloqueos)


def franjas_teoricas(doctor: Doctor, fecha: date) -> dict[time, int]:
    """Franjas del horario base del médico para el día de la semana de `fecha`, con su duración en minutos."""
    franjas = {}
    for horario in doctor.horarios.filter(dia_semana=fecha.weekday()):
        for hora in generar_franjas(horario.hora_inicio, horario.hora_fin, horario.duracion_minutos):
            franjas[hora] = horario.duracion_minutos
    return dict(sorted(franjas.items()))


def franjas_disponibles(doctor: Doctor, fecha: date) -> list[time]:
    """Franjas del horario base sin cita activa, sin bloqueo y futuras (criterio de aceptación de REQ-01)."""
    ocupadas = set(
        Cita.objects.filter(doctor=doctor, fecha=fecha)
        .exclude(estado=EstadoCita.CANCELADA)
        .values_list("hora", flat=True)
    )
    bloqueos = list(doctor.bloqueos.filter(fecha=fecha))
    ahora = timezone.localtime()

    disponibles = []
    for hora, duracion in franjas_teoricas(doctor, fecha).items():
        if hora in ocupadas or franja_bloqueada(hora, duracion, bloqueos):
            continue
        if fecha < ahora.date() or (fecha == ahora.date() and hora <= ahora.time()):
            continue
        disponibles.append(hora)
    return disponibles


DIAS_BUSQUEDA_SUGERENCIA = 30


def siguiente_franja_libre(doctor: Doctor, fecha: date, hora: time) -> dict | None:
    """Primera franja disponible del médico posterior a (fecha, hora), buscando hasta 30 días adelante."""
    inicio = max(fecha, timezone.localdate())
    for desplazamiento in range(DIAS_BUSQUEDA_SUGERENCIA + 1):
        dia = inicio + timedelta(days=desplazamiento)
        for libre in franjas_disponibles(doctor, dia):
            if dia > fecha or libre > hora:
                return {"id_doctor": doctor.id_doctor, "fecha": dia.isoformat(), "hora": libre.strftime("%H:%M")}
    return None


# --- Agenda y bloqueos del médico (CU-04, REQ-05) ---


def agenda_del_dia(doctor: Doctor, fecha: date) -> dict:
    """
    Línea de tiempo del día: cada franja del horario con su estado (libre, cita o bloqueada).
    Las citas que quedaron fuera del horario actual (por un cambio de horario) también se muestran.
    """
    citas = {
        cita.hora: cita
        for cita in Cita.objects.filter(doctor=doctor, fecha=fecha)
        .exclude(estado=EstadoCita.CANCELADA)
        .select_related("paciente")
    }
    bloqueos = list(doctor.bloqueos.filter(fecha=fecha).order_by("hora_inicio"))
    teoricas = franjas_teoricas(doctor, fecha)

    franjas = []
    for hora in sorted(set(teoricas) | set(citas)):
        duracion = teoricas.get(hora, 20)
        cita = citas.get(hora)
        bloqueo = next(
            (b for b in bloqueos if hora < b.hora_fin and _sumar_minutos(hora, duracion) > b.hora_inicio), None
        )
        franjas.append(
            {
                "hora": hora.strftime("%H:%M"),
                "estado": "cita" if cita else ("bloqueada" if bloqueo else "libre"),
                "cita": None if cita is None else {
                    "id_cita": cita.id_cita,
                    "paciente": f"{cita.paciente.nombres} {cita.paciente.apellidos}",
                    "documento": f"{cita.paciente.tipo_documento} {cita.paciente.numero_documento}",
                    "estado": cita.estado,
                },
                "bloqueo": None if bloqueo is None else {"id_bloqueo": bloqueo.id_bloqueo, "motivo": bloqueo.motivo},
            }
        )

    estados_cita = [f["cita"]["estado"] for f in franjas if f["cita"]]
    return {
        "fecha": fecha.isoformat(),
        "franjas": franjas,
        "resumen": {
            "franjas": len(franjas),
            "citas": len(estados_cita),
            "agendadas": estados_cita.count(EstadoCita.AGENDADA),
            "atendidas": estados_cita.count(EstadoCita.ATENDIDA),
            "no_asistio": estados_cita.count(EstadoCita.NO_ASISTIO),
            "libres": sum(f["estado"] == "libre" for f in franjas),
            "bloqueadas": sum(f["estado"] == "bloqueada" for f in franjas),
        },
    }


def crear_bloqueo(usuario, doctor: Doctor, fecha: date, hora_inicio: time, hora_fin: time, motivo: str):
    """
    Registra un bloqueo en la agenda. Usa el mismo bloqueo pesimista que la reserva de citas,
    para que un bloqueo y una reserva simultáneos sobre el mismo médico no se crucen.
    Las citas que ya existían en el intervalo NO se cancelan: se informan al médico (Tabla 11 del informe).
    """
    if hora_fin <= hora_inicio:
        raise ReglaInvalida("La hora final debe ser posterior a la inicial.")
    if fecha < timezone.localdate():
        raise ReglaInvalida("No se pueden bloquear fechas pasadas.")

    with transaction.atomic():
        Doctor.objects.select_for_update().get(pk=doctor.pk)
        if doctor.bloqueos.filter(fecha=fecha, hora_inicio__lt=hora_fin, hora_fin__gt=hora_inicio).exists():
            raise Conflicto("El intervalo se cruza con otro bloqueo de ese día.")
        bloqueo = BloqueoAgenda.objects.create(
            doctor=doctor, fecha=fecha, hora_inicio=hora_inicio, hora_fin=hora_fin, motivo=motivo
        )
        afectadas = list(
            Cita.objects.filter(
                doctor=doctor, fecha=fecha, estado=EstadoCita.AGENDADA, hora__gte=hora_inicio, hora__lt=hora_fin
            ).select_related("paciente__usuario", "doctor__especialidad")
        )
        auditoria.registrar(
            usuario, "BLOQUEAR", "bloqueos_agenda", bloqueo.id_bloqueo, detalle=f"{len(afectadas)} citas en el intervalo"
        )
        for cita in afectadas:
            notificaciones.cita_afectada_por_bloqueo(cita, motivo)
    return bloqueo, afectadas


def eliminar_bloqueo(usuario, doctor: Doctor, id_bloqueo: int):
    bloqueo = doctor.bloqueos.filter(pk=id_bloqueo).first()
    if bloqueo is None:
        raise NotFound("El bloqueo no existe.")
    if bloqueo.fecha < timezone.localdate():
        raise ReglaInvalida("Los bloqueos de fechas pasadas se conservan como histórico.")
    bloqueo.delete()
    auditoria.registrar(usuario, "ELIMINAR_BLOQUEO", "bloqueos_agenda", id_bloqueo)
