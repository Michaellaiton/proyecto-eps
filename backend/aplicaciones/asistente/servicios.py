"""
Asistente virtual por reglas.

Detecta la intención del mensaje con palabras clave (sin servicios externos ni costos) y responde con datos
reales del sistema según el rol de quien pregunta. Cada respuesta puede incluir una acción (un botón que lleva
a una pantalla) y sugerencias de siguientes preguntas.

La función `responder` es el único punto de entrada: si más adelante se quiere usar un modelo de lenguaje,
basta con reemplazar la detección de intenciones manteniendo el mismo formato de respuesta.
"""

import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date

from django.conf import settings
from django.utils import formats, timezone

from aplicaciones.administracion import servicios as administracion
from aplicaciones.citas.models import Cita, EstadoCita
from aplicaciones.medicos import servicios as agenda
from aplicaciones.medicos.models import DiaSemana, Especialidad, HorarioBase
from aplicaciones.usuarios.models import Rol

# Palabras con las que la gente suele referirse a cada especialidad, además de su nombre.
SINONIMOS_ESPECIALIDAD = {
    "odontologia": ["dentista", "diente", "dientes", "muela", "odontologo"],
    "pediatria": ["nino", "ninos", "nina", "bebe", "hijo", "hija", "pediatra"],
    "medicina general": ["general", "medico general", "chequeo", "consulta general"],
    "ginecologia": ["ginecologo", "ginecologa", "embarazo", "citologia"],
}

# El orden importa: las acciones van antes que las consultas («¿cómo cancelo mi cita?» es cancelar).
INTENCIONES = [
    ("despedida", ["gracias", "chao", "adios", "hasta luego", "nos vemos"]),
    ("clave", ["contrasena", "clave", "olvide", "no puedo entrar", "cuenta bloqueada"]),
    ("reprogramar", ["reprogram", "cambiar mi cita", "cambiar la cita", "mover mi cita", "mover la cita", "otro dia"]),
    ("cancelar", ["cancel", "anular", "no puedo ir", "no voy a ir"]),
    (
        "agendar",
        [
            "agendar",
            "agendo",
            "pedir cita",
            "pedir una cita",
            "pido cita",
            "pido una cita",
            "sacar cita",
            "sacar una cita",
            "saco una cita",
            "solicitar",
            "necesito una cita",
            "quiero una cita",
            "reservar",
            "separar",
        ],
    ),
    ("disponibilidad", ["hay cita", "hay citas", "disponib", "cupo", "cupos", "primera cita", "cuando hay"]),
    ("proxima_cita", ["mi cita", "mis citas", "proxima cita", "cuando es mi", "tengo cita", "tengo citas"]),
    ("agenda_medico", ["mi agenda", "pacientes de hoy", "mis pacientes", "agenda de hoy"]),
    ("bloqueo", ["bloque", "incapacidad", "no puedo atender"]),
    ("resumen", ["resumen", "estadistic", "indicador", "ocupacion", "reporte"]),
    ("especialidades", ["especialidad", "especialidades", "que medicos", "doctores", "medicos hay"]),
    ("horario", ["horario", "a que hora", "atienden", "abren"]),
    ("ayuda", ["ayuda", "que puedes", "que haces", "como funciona", "opciones"]),
    ("saludo", ["hola", "buenas", "buenos dias", "buen dia", "hey"]),
]


@dataclass
class Respuesta:
    respuesta: str
    accion: dict | None = None
    sugerencias: list[str] = field(default_factory=list)

    def como_dict(self):
        return {"respuesta": self.respuesta, "accion": self.accion, "sugerencias": self.sugerencias}


def normalizar(texto: str) -> str:
    """Minúsculas, sin tildes ni signos, con espacios simples."""
    sin_tildes = unicodedata.normalize("NFD", texto.lower())
    sin_tildes = "".join(c for c in sin_tildes if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", sin_tildes)).strip()


def detectar_intencion(texto: str) -> str:
    for intencion, claves in INTENCIONES:
        if any(clave in texto for clave in claves):
            return intencion
    return "desconocida"


def detectar_especialidad(texto: str) -> Especialidad | None:
    for especialidad in Especialidad.objects.all():
        nombre = normalizar(especialidad.nombre)
        palabras = [nombre, *SINONIMOS_ESPECIALIDAD.get(nombre, [])]
        if any(re.search(rf"\b{re.escape(p)}\b", texto) for p in palabras):
            return especialidad
    return None


def _fecha(fecha):
    # Los nombres de días y meses van en minúscula en español.
    return formats.date_format(fecha, "l j \\d\\e F").lower()


def _accion(etiqueta, destino):
    return {"etiqueta": etiqueta, "destino": destino}


def _sugerencias(rol):
    return {
        Rol.PACIENTE: ["¿Cuándo es mi próxima cita?", "¿Hay citas de pediatría?", "¿Cómo cancelo una cita?"],
        Rol.DOCTOR: ["¿Cómo está mi agenda de hoy?", "¿Cómo bloqueo un horario?"],
        Rol.ADMIN: ["Dame el resumen de hoy", "¿Qué especialidades hay?"],
    }.get(rol, ["¿Qué especialidades hay?", "¿Hay citas de odontología?", "¿Cómo pido una cita?"])


# --- Respuestas por intención ---


def _saludo(usuario, texto):
    nombre = f", {usuario.first_name or usuario.username}" if usuario else ""
    return Respuesta(f"¡Hola{nombre}! Soy el asistente de Citas EPS. ¿En qué te ayudo?")


def _ayuda(usuario, texto):
    if usuario is None:
        detalle = "Puedo mostrarte las especialidades, buscar la primera cita libre y explicarte cómo agendar."
    elif usuario.rol == Rol.DOCTOR:
        detalle = "Puedo resumirte tu agenda del día y explicarte cómo bloquear un horario."
    elif usuario.rol == Rol.ADMIN:
        detalle = "Puedo darte los indicadores del día y llevarte a los reportes."
    else:
        detalle = (
            "Puedo decirte cuándo es tu próxima cita, buscar cupos por especialidad "
            "y guiarte para agendar, cancelar o reprogramar."
        )
    return Respuesta(detalle)


def _despedida(usuario, texto):
    return Respuesta("¡Con gusto! Aquí estaré si necesitas algo más.", sugerencias=[])


def _proxima_cita(usuario, texto):
    if usuario is None or usuario.rol != Rol.PACIENTE:
        if usuario is None:
            return Respuesta("Para ver tus citas necesitas iniciar sesión.", _accion("Ingresar", "ingresar"))
        return Respuesta("Esa consulta es para pacientes. Prueba con «mi agenda de hoy».")
    ahora = timezone.localtime()
    citas = [
        c
        for c in Cita.objects.filter(paciente=usuario.paciente, estado=EstadoCita.AGENDADA, fecha__gte=ahora.date())
        .select_related("doctor__especialidad")
        .order_by("fecha", "hora")
        if c.fecha > ahora.date() or c.hora > ahora.time()
    ]
    if not citas:
        return Respuesta("No tienes citas próximas.", _accion("Agendar una cita", "agendar"))
    primera = citas[0]
    texto_respuesta = (
        f"Tu próxima cita es el {_fecha(primera.fecha)} a las {primera.hora:%H:%M}, "
        f"{primera.doctor.especialidad.nombre} con {primera.doctor.nombres} {primera.doctor.apellidos}."
    )
    if len(citas) > 1:
        texto_respuesta += f" Tienes {len(citas)} citas agendadas en total."
    return Respuesta(texto_respuesta, _accion("Ver mis citas", "mis-citas"))


def _disponibilidad(usuario, texto):
    especialidad = detectar_especialidad(texto)
    if especialidad is None:
        nombres = ", ".join(e.nombre for e in Especialidad.objects.all())
        return Respuesta(
            f"¿De qué especialidad? Tenemos: {nombres}.",
            sugerencias=[f"¿Hay citas de {e.nombre.lower()}?" for e in Especialidad.objects.all()[:3]],
        )
    ahora = timezone.localtime()
    opciones = []
    for doctor in especialidad.doctores.filter(activo=True):
        libre = agenda.siguiente_franja_libre(doctor, ahora.date(), ahora.time())
        if libre:
            opciones.append((libre["fecha"], libre["hora"], doctor))
    if not opciones:
        return Respuesta(f"Por ahora no hay cupos de {especialidad.nombre} en los próximos 30 días.")
    fecha, hora, doctor = min(opciones, key=lambda o: (o[0], o[1]))
    destino = "agendar" if usuario and usuario.rol == Rol.PACIENTE else "ingresar"
    return Respuesta(
        f"La primera cita libre de {especialidad.nombre} es el {_fecha(date.fromisoformat(fecha))} "
        f"a las {hora} con {doctor.nombres} {doctor.apellidos}.",
        _accion("Agendar ahora" if destino == "agendar" else "Ingresar para agendar", destino),
    )


def _agendar(usuario, texto):
    pasos = "1) Elige la especialidad, 2) el médico, 3) el día y la hora, 4) confirma."
    destino = "agendar" if usuario and usuario.rol == Rol.PACIENTE else "ingresar"
    return Respuesta(f"Es muy fácil: {pasos}", _accion("Ir a agendar" if destino == "agendar" else "Ingresar", destino))


def _cancelar(usuario, texto):
    horas = settings.EPS_PARAMETROS["HORAS_MINIMAS_CANCELACION"]
    return Respuesta(
        f"En «Mis citas» pulsa Cancelar. Debes hacerlo con al menos {horas} horas de antelación para liberar el cupo.",
        _accion("Ver mis citas", "mis-citas") if usuario and usuario.rol == Rol.PACIENTE else None,
    )


def _reprogramar(usuario, texto):
    return Respuesta(
        "En «Mis citas» pulsa Reprogramar y elige otro día u hora, "
        "con el mismo médico u otro de la misma especialidad.",
        _accion("Ver mis citas", "mis-citas") if usuario and usuario.rol == Rol.PACIENTE else None,
    )


def _especialidades(usuario, texto):
    especialidades = list(Especialidad.objects.all())
    if not especialidades:
        return Respuesta("Aún no hay especialidades registradas.")
    lineas = [f"{e.nombre} ({e.doctores.filter(activo=True).count()} médicos)" for e in especialidades]
    return Respuesta(
        "Estas son nuestras especialidades: " + "; ".join(lineas) + ".",
        sugerencias=[f"¿Hay citas de {e.nombre.lower()}?" for e in especialidades[:3]],
    )


def _horario(usuario, texto):
    bloques = HorarioBase.objects.filter(doctor__activo=True)
    if not bloques.exists():
        return Respuesta("Aún no hay horarios de atención configurados.")
    dias = sorted({b.dia_semana for b in bloques})
    inicio = min(b.hora_inicio for b in bloques)
    fin = max(b.hora_fin for b in bloques)
    nombres_dias = (
        f"{DiaSemana(dias[0]).label} a {DiaSemana(dias[-1]).label}".lower()
        if len(dias) > 1
        else DiaSemana(dias[0]).label
    )
    return Respuesta(
        f"Atendemos de {nombres_dias}, entre las {inicio:%H:%M} y las {fin:%H:%M}. Cada médico tiene su propio horario."
    )


def _clave(usuario, texto):
    minutos = settings.EPS_PARAMETROS["MINUTOS_BLOQUEO_SESION"]
    if usuario:
        return Respuesta("Puedes cambiar tu contraseña en «Mi perfil».", _accion("Ir a mi perfil", "perfil"))
    return Respuesta(
        f"Si olvidaste tu contraseña, solicita al área administrativa que la restablezca. "
        f"Si fallaste varias veces, la cuenta se desbloquea sola en {minutos} minutos."
    )


def _agenda_medico(usuario, texto):
    if usuario is None or usuario.rol != Rol.DOCTOR:
        return (
            Respuesta("Esa consulta es para médicos.")
            if usuario
            else Respuesta("Inicia sesión como médico para ver tu agenda.", _accion("Ingresar", "ingresar"))
        )
    resumen = agenda.agenda_del_dia(usuario.doctor, timezone.localdate())["resumen"]
    if resumen["franjas"] == 0:
        return Respuesta("Hoy no tienes horario de atención.", _accion("Ver mi agenda", "agenda"))
    return Respuesta(
        f"Hoy tienes {resumen['citas']} citas ({resumen['agendadas']} por atender), "
        f"{resumen['libres']} franjas libres y {resumen['bloqueadas']} bloqueadas.",
        _accion("Ver mi agenda", "agenda"),
    )


def _bloqueo(usuario, texto):
    if usuario and usuario.rol == Rol.DOCTOR:
        return Respuesta(
            "En «Bloqueos» elige la fecha, el intervalo y el motivo. "
            "Si había citas, te aviso y le escribimos al paciente.",
            _accion("Ir a bloqueos", "bloqueos"),
        )
    return Respuesta("Los bloqueos de agenda los registra cada médico desde su panel.")


def _resumen(usuario, texto):
    if usuario is None or usuario.rol != Rol.ADMIN:
        return Respuesta("Los indicadores del sistema están disponibles para el administrador.")
    r = administracion.resumen()
    return Respuesta(
        f"Hoy hay {r['citas_hoy']} citas y {r['citas_proximos_7_dias']} en los próximos 7 días. "
        f"{r['medicos_activos']} médicos activos y {r['pacientes']} pacientes. "
        f"Accesos denegados en la semana: {r['accesos_denegados_ultimos_7_dias']}.",
        _accion("Ver reporte de ocupación", "reporte"),
    )


def _desconocida(usuario, texto):
    return Respuesta("No entendí bien. Prueba con alguna de estas preguntas:")


RESPUESTAS = {
    "saludo": _saludo,
    "ayuda": _ayuda,
    "despedida": _despedida,
    "proxima_cita": _proxima_cita,
    "disponibilidad": _disponibilidad,
    "agendar": _agendar,
    "cancelar": _cancelar,
    "reprogramar": _reprogramar,
    "especialidades": _especialidades,
    "horario": _horario,
    "clave": _clave,
    "agenda_medico": _agenda_medico,
    "bloqueo": _bloqueo,
    "resumen": _resumen,
    "desconocida": _desconocida,
}


def responder(usuario, mensaje: str) -> dict:
    """Respuesta del asistente para `mensaje`. `usuario` es None para visitantes sin sesión."""
    texto = normalizar(mensaje)
    intencion = detectar_intencion(texto)
    # Una pregunta por especialidad sin otra intención clara se interpreta como búsqueda de cupos.
    if intencion in ("desconocida", "especialidades") and detectar_especialidad(texto):
        intencion = "disponibilidad"
    respuesta = RESPUESTAS[intencion](usuario, texto)
    if not respuesta.sugerencias and intencion != "despedida":
        respuesta.sugerencias = _sugerencias(usuario.rol if usuario else None)
    return {**respuesta.como_dict(), "intencion": intencion}
