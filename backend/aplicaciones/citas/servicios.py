"""
Reglas de negocio de las citas: agendar (CU-02), cancelar y reprogramar (CU-03) y registrar atención (CU-04).

Protocolo de reserva contra el doble agendamiento (REQ-03, ADR-02):
  1. Bloqueo pesimista de la fila del médico (SELECT ... FOR UPDATE): las reservas del mismo médico van en serie.
  2. Revalidación de la franja con el bloqueo ya adquirido.
  3. Inserción; los índices únicos parciales son la última defensa.
"""

from datetime import datetime, timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied

from aplicaciones.auditoria import servicios as auditoria
from aplicaciones.auditoria.servicios import Resultado
from aplicaciones.medicos import servicios as agenda
from aplicaciones.medicos.models import Doctor
from aplicaciones.notificaciones import servicios as notificaciones
from aplicaciones.usuarios.models import Rol
from configuracion.excepciones import Conflicto, ReglaInvalida

from .models import Cita, EstadoCita


class FranjaNoDisponible(Conflicto):
    """La franja pedida está ocupada o bloqueada: es el único conflicto en el que se sugiere otra franja."""


def _parametro(nombre):
    return settings.EPS_PARAMETROS[nombre]


def _momento(fecha, hora):
    return timezone.make_aware(datetime.combine(fecha, hora))


def _paciente_de(usuario):
    paciente = getattr(usuario, "paciente", None)
    if paciente is None:
        raise ReglaInvalida("El usuario no tiene un perfil de paciente asociado.")
    return paciente


def _mensaje(error):
    detalle = error.detail
    return str(detalle.get("detail", detalle)) if isinstance(detalle, dict) else str(detalle)


def _verificar_antelacion(cita, accion):
    horas = _parametro("HORAS_MINIMAS_CANCELACION")
    if _momento(cita.fecha, cita.hora) - timezone.now() < timedelta(hours=horas):
        return ReglaInvalida(f"Las citas se {accion} con al menos {horas} horas de antelación.")
    return None


def _reservar(paciente, doctor, fecha, hora):
    """
    Valida la franja y crea la cita. Debe llamarse dentro de una transacción en la que ya se tenga
    el bloqueo (select_for_update) del médico.
    """
    if _momento(fecha, hora) <= timezone.now():
        raise ReglaInvalida("No se pueden agendar citas en fechas u horas pasadas.")

    teoricas = agenda.franjas_teoricas(doctor, fecha)
    if hora not in teoricas:
        raise ReglaInvalida("La hora no corresponde a una franja del horario del médico.")
    if agenda.franja_bloqueada(hora, teoricas[hora], doctor.bloqueos.filter(fecha=fecha)):
        raise FranjaNoDisponible("La franja está bloqueada en la agenda del médico.")

    activas = Cita.objects.exclude(estado=EstadoCita.CANCELADA)
    if activas.filter(doctor=doctor, fecha=fecha, hora=hora).exists():
        raise FranjaNoDisponible("La franja ya fue asignada.")
    if activas.filter(paciente=paciente, fecha=fecha, hora=hora).exists():
        raise Conflicto("Ya tiene otra cita activa a la misma hora.")
    futuras = activas.filter(paciente=paciente, estado=EstadoCita.AGENDADA, fecha__gte=timezone.localdate())
    if futuras.count() >= _parametro("MAXIMO_CITAS_ACTIVAS_PACIENTE"):
        raise Conflicto("Alcanzó el número máximo de citas activas permitidas.")

    try:
        with transaction.atomic():
            return Cita.objects.create(paciente=paciente, doctor=doctor, fecha=fecha, hora=hora)
    except IntegrityError as error:
        raise FranjaNoDisponible("La franja ya fue asignada.") from error


def _con_sugerencia(error, id_doctor, fecha, hora):
    """Agrega al 409 la siguiente franja libre del mismo médico (recomendación de la Tabla 29 del informe)."""
    doctor = Doctor.objects.filter(pk=id_doctor, activo=True).first()
    siguiente = agenda.siguiente_franja_libre(doctor, fecha, hora) if doctor else None
    if siguiente is None:
        return Conflicto(_mensaje(error))
    return Conflicto({"detail": _mensaje(error), "sugerencia": siguiente})


def agendar_cita(usuario, id_doctor, fecha, hora):
    paciente = _paciente_de(usuario)
    try:
        with transaction.atomic():
            doctor = Doctor.objects.select_for_update().filter(pk=id_doctor, activo=True).first()
            if doctor is None:
                raise NotFound("El médico no existe.")
            cita = _reservar(paciente, doctor, fecha, hora)
            auditoria.registrar(usuario, "AGENDAR", "citas", cita.id_cita)
            notificaciones.cita_agendada(cita)
            return cita
    except Conflicto as error:
        auditoria.registrar(usuario, "AGENDAR", "citas", None, Resultado.CONFLICTO, _mensaje(error))
        if isinstance(error, FranjaNoDisponible):
            raise _con_sugerencia(error, id_doctor, fecha, hora) from error
        raise


def cancelar_cita(usuario, id_cita):
    error = None
    with transaction.atomic():
        cita = Cita.objects.select_for_update().filter(pk=id_cita).first()
        if cita is None:
            raise NotFound("La cita no existe.")

        es_admin = usuario.rol == Rol.ADMIN
        es_propietario = getattr(usuario, "paciente", None) == cita.paciente
        if not (es_admin or es_propietario):
            error = PermissionDenied("No puede cancelar una cita de otro paciente.")
        elif cita.estado != EstadoCita.AGENDADA:
            error = Conflicto(f"La cita no se puede cancelar porque está en estado '{cita.estado}'.")
        elif not es_admin:
            error = _verificar_antelacion(cita, "cancelan")

        if error is None:
            cita.estado = EstadoCita.CANCELADA
            cita.save(update_fields=["estado", "actualizado_en"])
            auditoria.registrar(usuario, "CANCELAR", "citas", cita.id_cita)
            notificaciones.cita_cancelada(cita, por_administrador=es_admin)

    # Los intentos rechazados se auditan después de cerrar la transacción para que el registro persista (DEF-02).
    if error is not None:
        resultado = Resultado.DENEGADO if isinstance(error, PermissionDenied) else Resultado.CONFLICTO
        auditoria.registrar(usuario, "CANCELAR", "citas", id_cita, resultado, _mensaje(error))
        raise error
    return cita


def reprogramar_cita(usuario, id_cita, fecha, hora, id_doctor=None):
    """
    Cambia la fecha/hora (y opcionalmente el médico, dentro de la misma especialidad) de una cita propia.
    La cita original queda 'Cancelada' y se crea una nueva, para conservar el histórico.
    Todo ocurre en una sola transacción: si la nueva franja no está disponible, la original no se toca.
    """
    paciente = _paciente_de(usuario)
    error = None
    try:
        with transaction.atomic():
            original = Cita.objects.select_for_update().select_related("doctor").filter(pk=id_cita).first()
            if original is None:
                raise NotFound("La cita no existe.")
            if original.paciente_id != paciente.id_paciente:
                error = PermissionDenied("No puede reprogramar una cita de otro paciente.")
            elif original.estado != EstadoCita.AGENDADA:
                error = Conflicto(f"La cita no se puede reprogramar porque está en estado '{original.estado}'.")
            else:
                error = _verificar_antelacion(original, "reprograman")

            if error is None:
                id_doctor = id_doctor or original.doctor_id
                # Se bloquean los médicos en orden de id para evitar interbloqueos entre transacciones.
                bloqueados = {
                    d.id_doctor: d
                    for d in Doctor.objects.select_for_update()
                    .filter(pk__in={original.doctor_id, id_doctor}, activo=True)
                    .order_by("id_doctor")
                }
                nuevo_doctor = bloqueados.get(id_doctor)
                if nuevo_doctor is None:
                    raise NotFound("El médico no existe.")
                if nuevo_doctor.especialidad_id != original.doctor.especialidad_id:
                    raise ReglaInvalida("Solo se puede reprogramar con un médico de la misma especialidad.")
                if (nuevo_doctor.id_doctor, fecha, hora) == (original.doctor_id, original.fecha, original.hora):
                    raise ReglaInvalida("La nueva fecha y hora son iguales a las actuales.")

                original.estado = EstadoCita.CANCELADA
                original.save(update_fields=["estado", "actualizado_en"])
                nueva = _reservar(paciente, nuevo_doctor, fecha, hora)
                auditoria.registrar(
                    usuario, "REPROGRAMAR", "citas", nueva.id_cita, detalle=f"Reemplaza la cita {original.id_cita}"
                )
                notificaciones.cita_reprogramada(original, nueva)
                return nueva
    except Conflicto as conflicto:
        auditoria.registrar(usuario, "REPROGRAMAR", "citas", id_cita, Resultado.CONFLICTO, _mensaje(conflicto))
        if isinstance(conflicto, FranjaNoDisponible):
            raise _con_sugerencia(conflicto, id_doctor, fecha, hora) from conflicto
        raise

    resultado = Resultado.DENEGADO if isinstance(error, PermissionDenied) else Resultado.CONFLICTO
    auditoria.registrar(usuario, "REPROGRAMAR", "citas", id_cita, resultado, _mensaje(error))
    raise error


def citas_del_paciente(usuario):
    paciente = _paciente_de(usuario)
    return paciente.citas.select_related("doctor__especialidad").order_by("-fecha", "-hora")


def registrar_atencion(usuario, id_cita, estado):
    """El médico marca su cita como 'Atendida' o 'No asistio' una vez llegada la hora (CU-04)."""
    if estado not in (EstadoCita.ATENDIDA, EstadoCita.NO_ASISTIO):
        raise ReglaInvalida("El estado debe ser 'Atendida' o 'No asistio'.")
    doctor = getattr(usuario, "doctor", None)

    error = None
    with transaction.atomic():
        cita = Cita.objects.select_for_update().filter(pk=id_cita).first()
        if cita is None:
            raise NotFound("La cita no existe.")
        if doctor is None or cita.doctor_id != doctor.id_doctor:
            error = PermissionDenied("Solo el médico de la cita puede registrar la atención.")
        elif cita.estado != EstadoCita.AGENDADA:
            error = Conflicto(f"La cita ya está en estado '{cita.estado}'.")
        elif _momento(cita.fecha, cita.hora) > timezone.now():
            error = ReglaInvalida("La atención se registra cuando llega la hora de la cita.")
        else:
            cita.estado = estado
            cita.save(update_fields=["estado", "actualizado_en"])
            auditoria.registrar(usuario, "REGISTRAR_ATENCION", "citas", cita.id_cita, detalle=estado)

    if error is not None:
        resultado = Resultado.DENEGADO if isinstance(error, PermissionDenied) else Resultado.CONFLICTO
        auditoria.registrar(usuario, "REGISTRAR_ATENCION", "citas", id_cita, resultado, _mensaje(error))
        raise error
    return cita


def enviar_recordatorios(ahora=None):
    """
    Envía el recordatorio a las citas agendadas que ocurren dentro de las próximas N horas y aún no lo
    recibieron (mitigación del riesgo RSK-03: inasistencias por olvido). Es idempotente: se puede ejecutar
    cada hora con el programador de tareas del sistema operativo. Devuelve cuántos recordatorios envió.
    """
    ahora = ahora or timezone.now()
    limite = ahora + timedelta(hours=_parametro("HORAS_ANTICIPACION_RECORDATORIO"))
    candidatas = Cita.objects.filter(
        estado=EstadoCita.AGENDADA,
        recordatorio_enviado_en__isnull=True,
        fecha__gte=timezone.localdate(ahora),
        fecha__lte=timezone.localdate(limite),
    ).select_related("paciente__usuario", "doctor__especialidad")

    enviados = 0
    for cita in candidatas:
        if not ahora < _momento(cita.fecha, cita.hora) <= limite:
            continue
        with transaction.atomic():
            # Se vuelve a marcar con un UPDATE condicional por si dos ejecuciones coinciden.
            if Cita.objects.filter(pk=cita.pk, recordatorio_enviado_en__isnull=True).update(
                recordatorio_enviado_en=ahora
            ):
                notificaciones.recordatorio_de_cita(cita)
                enviados += 1
    return enviados
