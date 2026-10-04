"""
Reglas de negocio del rol ADMIN (superadministrador): gestión de usuarios, horarios,
panel de resumen y reporte de ocupación (CU-05).
"""
from collections import Counter, defaultdict
from datetime import timedelta
from itertools import pairwise

from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from aplicaciones.auditoria import servicios as auditoria
from aplicaciones.auditoria.models import Auditoria
from aplicaciones.auditoria.servicios import Resultado
from aplicaciones.citas.models import Cita, EstadoCita
from aplicaciones.medicos.models import DiaSemana, Doctor, Especialidad, HorarioBase
from aplicaciones.medicos.servicios import generar_franjas
from aplicaciones.pacientes.models import Paciente
from aplicaciones.usuarios.models import Rol, Usuario
from configuracion.excepciones import Conflicto, ReglaInvalida

MAXIMO_DIAS_REPORTE = 366


def _perfil(usuario):
    return getattr(usuario, "paciente", None) or getattr(usuario, "doctor", None)


# --- Usuarios ---


@transaction.atomic
def crear_usuario(administrador, datos):
    rol = datos["rol"]
    usuario = Usuario.objects.create_user(
        username=datos["username"],
        email=datos.get("email", ""),
        password=datos["password"],
        rol=rol,
        first_name=datos["nombres"],
        last_name=datos["apellidos"],
        is_staff=rol == Rol.ADMIN,
    )
    if rol == Rol.PACIENTE:
        Paciente.objects.create(
            usuario=usuario,
            tipo_documento=datos["tipo_documento"],
            numero_documento=datos["numero_documento"],
            nombres=datos["nombres"],
            apellidos=datos["apellidos"],
            telefono=datos["telefono"],
            fecha_nacimiento=datos.get("fecha_nacimiento"),
        )
    elif rol == Rol.DOCTOR:
        Doctor.objects.create(
            usuario=usuario,
            especialidad=datos["especialidad"],
            nombres=datos["nombres"],
            apellidos=datos["apellidos"],
            registro_medico=datos["registro_medico"],
        )
    auditoria.registrar(administrador, "CREAR_USUARIO", "usuarios", usuario.id_usuario, detalle=f"rol={rol}")
    return usuario


@transaction.atomic
def actualizar_usuario(administrador, usuario, datos):
    if usuario == administrador and datos.get("activo") is False:
        raise Conflicto("No puede desactivar su propia cuenta.")

    perfil = _perfil(usuario)
    if "registro_medico" in datos and isinstance(perfil, Doctor):
        if Doctor.objects.filter(registro_medico=datos["registro_medico"]).exclude(pk=perfil.pk).exists():
            raise Conflicto("Ya existe un médico con ese registro.")

    if "email" in datos:
        usuario.email = datos["email"]
    if "activo" in datos:
        usuario.is_active = datos["activo"]
    if "nombres" in datos:
        usuario.first_name = datos["nombres"]
    if "apellidos" in datos:
        usuario.last_name = datos["apellidos"]
    usuario.save()

    if perfil:
        for campo in ("nombres", "apellidos"):
            if campo in datos:
                setattr(perfil, campo, datos[campo])
        if isinstance(perfil, Paciente) and "telefono" in datos:
            perfil.telefono = datos["telefono"]
        if isinstance(perfil, Doctor):
            if "especialidad" in datos:
                perfil.especialidad = datos["especialidad"]
            if "registro_medico" in datos:
                perfil.registro_medico = datos["registro_medico"]
            if "activo" in datos:
                perfil.activo = datos["activo"]  # Un médico desactivado deja de ofrecer franjas.
        perfil.save()

    cambios = ", ".join(sorted(datos))
    auditoria.registrar(administrador, "ACTUALIZAR_USUARIO", "usuarios", usuario.id_usuario, detalle=cambios)
    return usuario


def restablecer_clave(administrador, usuario, nueva_clave):
    usuario.set_password(nueva_clave)
    usuario.save(update_fields=["password"])
    auditoria.registrar(administrador, "RESTABLECER_CLAVE", "usuarios", usuario.id_usuario)


# --- Horario base de los médicos ---


@transaction.atomic
def reemplazar_horario(administrador, doctor, bloques):
    """Reemplaza todo el horario base del médico. Los bloques de un mismo día no pueden cruzarse."""
    por_dia = defaultdict(list)
    for bloque in bloques:
        por_dia[bloque["dia_semana"]].append(bloque)
    for dia, lista in por_dia.items():
        lista.sort(key=lambda b: b["hora_inicio"])
        for anterior, siguiente in pairwise(lista):
            if siguiente["hora_inicio"] < anterior["hora_fin"]:
                raise ReglaInvalida(f"Los bloques del {DiaSemana(dia).label.lower()} se cruzan.")

    doctor.horarios.all().delete()
    HorarioBase.objects.bulk_create(HorarioBase(doctor=doctor, **bloque) for bloque in bloques)
    auditoria.registrar(
        administrador, "ACTUALIZAR_HORARIO", "horario_base", doctor.id_doctor, detalle=f"{len(bloques)} bloques"
    )
    return doctor.horarios.all()


# --- Especialidades ---


def eliminar_especialidad(administrador, especialidad):
    if especialidad.doctores.exists():
        auditoria.registrar(
            administrador, "ELIMINAR_ESPECIALIDAD", "especialidades", especialidad.id_especialidad,
            Resultado.CONFLICTO, "Tiene médicos asociados",
        )
        raise Conflicto("No se puede eliminar: hay médicos con esta especialidad.")
    identificador = especialidad.id_especialidad
    especialidad.delete()
    auditoria.registrar(administrador, "ELIMINAR_ESPECIALIDAD", "especialidades", identificador)


# --- Panel y reportes ---


def resumen():
    hoy = timezone.localdate()
    citas = Cita.objects.all()
    return {
        "pacientes": Paciente.objects.count(),
        "medicos_activos": Doctor.objects.filter(activo=True).count(),
        "especialidades": Especialidad.objects.count(),
        "usuarios_inactivos": Usuario.objects.filter(is_active=False).count(),
        "citas_hoy": citas.filter(fecha=hoy).exclude(estado=EstadoCita.CANCELADA).count(),
        "citas_proximos_7_dias": citas.filter(
            fecha__range=(hoy, hoy + timedelta(days=6)), estado=EstadoCita.AGENDADA
        ).count(),
        "cancelaciones_ultimos_30_dias": citas.filter(
            estado=EstadoCita.CANCELADA, actualizado_en__date__gte=hoy - timedelta(days=30)
        ).count(),
        "accesos_denegados_ultimos_7_dias": Auditoria.objects.filter(
            resultado=Resultado.DENEGADO, fecha__date__gte=hoy - timedelta(days=7)
        ).count(),
    }


def reporte_ocupacion(desde, hasta):
    """
    Ocupación por médico en un rango de fechas (CU-05).
    Franjas ofertadas = franjas del horario base en los días del rango.
    Ocupación = citas no canceladas (agendadas, atendidas o no asistió) / franjas ofertadas.
    """
    if hasta < desde:
        raise ReglaInvalida("La fecha final debe ser igual o posterior a la inicial.")
    if (hasta - desde).days >= MAXIMO_DIAS_REPORTE:
        raise ReglaInvalida(f"El rango máximo del reporte es de {MAXIMO_DIAS_REPORTE} días.")

    dias_del_rango = Counter((desde + timedelta(days=n)).weekday() for n in range((hasta - desde).days + 1))
    conteos = {
        fila["doctor"]: fila
        for fila in Cita.objects.filter(fecha__range=(desde, hasta))
        .values("doctor")
        .annotate(
            agendadas=Count("id_cita", filter=Q(estado=EstadoCita.AGENDADA)),
            atendidas=Count("id_cita", filter=Q(estado=EstadoCita.ATENDIDA)),
            no_asistio=Count("id_cita", filter=Q(estado=EstadoCita.NO_ASISTIO)),
            canceladas=Count("id_cita", filter=Q(estado=EstadoCita.CANCELADA)),
        )
    }

    filas = []
    for doctor in Doctor.objects.select_related("especialidad").prefetch_related("horarios"):
        franjas_por_dia = defaultdict(int)
        for horario in doctor.horarios.all():
            franjas_por_dia[horario.dia_semana] += len(
                generar_franjas(horario.hora_inicio, horario.hora_fin, horario.duracion_minutos)
            )
        ofertadas = sum(franjas_por_dia[dia] * veces for dia, veces in dias_del_rango.items())
        conteo = conteos.get(doctor.id_doctor, {})
        agendadas, atendidas, no_asistio, canceladas = (
            conteo.get(c, 0) for c in ("agendadas", "atendidas", "no_asistio", "canceladas")
        )
        ocupadas = agendadas + atendidas + no_asistio
        filas.append(
            {
                "id_doctor": doctor.id_doctor,
                "doctor": f"{doctor.nombres} {doctor.apellidos}",
                "especialidad": doctor.especialidad.nombre,
                "activo": doctor.activo,
                "franjas_ofertadas": ofertadas,
                "agendadas": agendadas,
                "atendidas": atendidas,
                "no_asistio": no_asistio,
                "canceladas": canceladas,
                "porcentaje_ocupacion": round(100 * ocupadas / ofertadas, 1) if ofertadas else 0.0,
            }
        )

    totales = {
        clave: sum(f[clave] for f in filas)
        for clave in ("franjas_ofertadas", "agendadas", "atendidas", "no_asistio", "canceladas")
    }
    ocupadas_total = totales["agendadas"] + totales["atendidas"] + totales["no_asistio"]
    totales["porcentaje_ocupacion"] = (
        round(100 * ocupadas_total / totales["franjas_ofertadas"], 1) if totales["franjas_ofertadas"] else 0.0
    )
    return {"desde": desde, "hasta": hasta, "medicos": filas, "totales": totales}
