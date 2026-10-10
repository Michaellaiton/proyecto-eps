"""
Motor del simulador de concurrencia.

Ataca directamente la base de datos con hilos reales (cada uno con su propia conexión a PostgreSQL) usando
los mismos servicios del agendamiento, y mide lo que ocurre:

- Ráfaga: N pacientes intentan la MISMA franja con el MISMO médico al mismo tiempo (barrera de sincronía).
  · Con controles: servicio real (bloqueo pesimista + índice único parcial) → debe quedar 1 cita.
  · Sin controles: lógica ingenua "consultar y luego insertar" en una tabla sin restricciones → duplicados.
- Carga: varios hilos durante X segundos con 85 % consultas de disponibilidad y 15 % reservas.

Un hilo monitor vuelca los registros por lotes, toma muestras de PostgreSQL (conexiones, esperas por
bloqueo, deadlocks) y publica resultados parciales para verlos en vivo. Todo se ejecuta sobre médicos y
pacientes ficticios (prefijo sim_) que se crean al inicio y se eliminan al final.
"""

import logging
import queue
import random
import threading
import time
from collections import defaultdict
from datetime import time as Hora
from datetime import timedelta

from django.contrib.auth.hashers import make_password
from django.db import connection, connections
from django.db.models import Count
from django.utils import timezone

from aplicaciones.auditoria.models import Auditoria
from aplicaciones.citas import servicios as citas
from aplicaciones.citas.models import Cita, EstadoCita
from aplicaciones.medicos import servicios as agenda
from aplicaciones.medicos.models import Doctor, Especialidad, HorarioBase
from aplicaciones.pacientes.models import Paciente
from aplicaciones.usuarios.models import Rol, Usuario
from configuracion.excepciones import Conflicto, ReglaInvalida

from .models import EstadoSimulacion, EventoSimulacion, NivelEvento, ReservaSinControl, Simulacion, TipoSimulacion

registro_aplicacion = logging.getLogger(__name__)

PREFIJO = "sim_"
ESPECIALIDAD = "Simulación de carga"
HORA_RAFAGA = Hora(10, 0)
JORNADA = (Hora(6, 0), Hora(20, 0), 20)  # inicio, fin, minutos por franja → 42 franjas
INTERVALO_MONITOR_S = 0.3
PROPORCION_CONSULTAS = 0.85
MAXIMO_EVENTOS_POR_TIPO = 25  # en la carga se registran los primeros casos de cada tipo; el resto se resume
MAXIMO_LATENCIAS = 100  # solo se guarda el detalle por solicitud en simulaciones pequeñas (ráfagas)


# --- Registro de eventos y métricas (seguros entre hilos) ---


class Registro:
    """Acumula eventos en memoria; el monitor los guarda por lotes para no cargar la BD con cada línea."""

    def __init__(self, simulacion):
        self.simulacion = simulacion
        self.cola = queue.SimpleQueue()

    def evento(self, nivel, mensaje):
        self.cola.put(
            EventoSimulacion(simulacion=self.simulacion, momento=timezone.now(), nivel=nivel, mensaje=mensaje[:300])
        )

    def volcar(self):
        lote = []
        while not self.cola.empty():
            lote.append(self.cola.get_nowait())
        if lote:
            EventoSimulacion.objects.bulk_create(lote)


def _percentil(valores, fraccion):
    if not valores:
        return 0.0
    ordenados = sorted(valores)
    return round(ordenados[int(fraccion * (len(ordenados) - 1))], 1)


class Metricas:
    def __init__(self):
        self._candado = threading.Lock()
        self.inicio = time.perf_counter()
        self.latencias = []
        self.resultados_en_orden = []
        self.contadores = defaultdict(int)
        self.por_segundo = defaultdict(lambda: {"ops": 0, "latencias": [], "conflictos": 0, "errores": 0})
        self.bd = defaultdict(lambda: {"conexiones": 0, "esperas": 0})
        self.deadlocks_iniciales = None
        self.deadlocks = 0
        self.transacciones = 0

    def _segundo(self):
        return int(time.perf_counter() - self.inicio) + 1

    def registrar(self, resultado, milisegundos):
        with self._candado:
            self.latencias.append(milisegundos)
            self.resultados_en_orden.append(resultado)
            self.contadores[resultado] += 1
            casilla = self.por_segundo[self._segundo()]
            casilla["ops"] += 1
            casilla["latencias"].append(milisegundos)
            if resultado in ("conflicto", "errores"):
                casilla[resultado if resultado == "errores" else "conflictos"] += 1

    def registrar_bd(self, muestra):
        with self._candado:
            casilla = self.bd[self._segundo()]
            casilla["conexiones"] = max(casilla["conexiones"], muestra["conexiones"])
            casilla["esperas"] = max(casilla["esperas"], muestra["esperando_bloqueo"])
            if self.deadlocks_iniciales is None:
                self.deadlocks_iniciales = muestra["deadlocks"]
                self.transacciones_iniciales = muestra["transacciones"]
            self.deadlocks = muestra["deadlocks"] - self.deadlocks_iniciales
            self.transacciones = muestra["transacciones"] - self.transacciones_iniciales

    def resumen(self):
        with self._candado:
            duracion = max(time.perf_counter() - self.inicio, 0.001)
            segundos = sorted(set(self.por_segundo) | set(self.bd))
            serie = [
                {
                    "segundo": s,
                    "ops": self.por_segundo[s]["ops"] if s in self.por_segundo else 0,
                    "p95": _percentil(self.por_segundo[s]["latencias"], 0.95) if s in self.por_segundo else 0,
                    "conflictos": self.por_segundo[s]["conflictos"] if s in self.por_segundo else 0,
                    "conexiones": self.bd[s]["conexiones"] if s in self.bd else 0,
                    "esperas": self.bd[s]["esperas"] if s in self.bd else 0,
                }
                for s in segundos
            ]
            return {
                "solicitudes": len(self.latencias),
                "exitos": self.contadores["exito"],
                "consultas": self.contadores["consulta"],
                "conflictos": self.contadores["conflicto"],
                "errores": self.contadores["errores"],
                "duracion_s": round(duracion, 2),
                "ops_por_segundo": round(len(self.latencias) / duracion, 1),
                "latencia_ms": {
                    "p50": _percentil(self.latencias, 0.5),
                    "p95": _percentil(self.latencias, 0.95),
                    "max": round(max(self.latencias), 1) if self.latencias else 0.0,
                },
                "bd": {
                    "conexiones_max": max((b["conexiones"] for b in self.bd.values()), default=0),
                    "esperas_bloqueo_max": max((b["esperas"] for b in self.bd.values()), default=0),
                    "deadlocks": self.deadlocks,
                    "transacciones": self.transacciones,
                },
                "serie": serie,
                # En la ráfaga se guardan las latencias en orden de llegada: muestran cómo el bloqueo
                # pone las reservas en fila (escalera) frente a la línea base (todas a la vez).
                "latencias": [round(x, 1) for x in self.latencias] if len(self.latencias) <= MAXIMO_LATENCIAS else [],
                "resultados_por_solicitud": list(self.resultados_en_orden)
                if len(self.latencias) <= MAXIMO_LATENCIAS
                else [],
            }


def muestrear_bd():
    """Estado de PostgreSQL visto desde la propia base: conexiones, sesiones esperando un bloqueo y deadlocks."""
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
              (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()),
              (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'),
              (SELECT deadlocks FROM pg_stat_database WHERE datname = current_database()),
              (SELECT xact_commit + xact_rollback FROM pg_stat_database WHERE datname = current_database())
            """
        )
        conexiones, esperando, deadlocks, transacciones = cursor.fetchone()
    return {
        "conexiones": conexiones,
        "esperando_bloqueo": esperando,
        "deadlocks": deadlocks,
        "transacciones": transacciones,
    }


class Monitor(threading.Thread):
    """Vuelca eventos, toma muestras de la BD y publica resultados parciales mientras dura la simulación."""

    def __init__(self, simulacion, registro, metricas, resumen_por_segundo):
        super().__init__(daemon=True)
        self.simulacion, self.registro, self.metricas = simulacion, registro, metricas
        self.resumen_por_segundo = resumen_por_segundo
        self.detener = threading.Event()
        self.ultimo_segundo_informado = 0

    def run(self):
        try:
            while not self.detener.wait(INTERVALO_MONITOR_S):
                self._ciclo()
            self._ciclo()
        finally:
            connections.close_all()

    def _ciclo(self):
        try:
            self.metricas.registrar_bd(muestrear_bd())
        except Exception:
            registro_aplicacion.exception("No se pudo muestrear PostgreSQL")
        resumen = self.metricas.resumen()
        if self.resumen_por_segundo:
            self._informar_segundos(resumen["serie"])
        self.registro.volcar()
        Simulacion.objects.filter(pk=self.simulacion.pk).update(resultados=resumen)

    def _informar_segundos(self, serie):
        for fila in serie[:-1]:  # el último segundo aún está en curso
            if fila["segundo"] > self.ultimo_segundo_informado:
                self.ultimo_segundo_informado = fila["segundo"]
                self.registro.evento(
                    NivelEvento.METRICA,
                    f"t={fila['segundo']} s · {fila['ops']} ops/s · p95 {fila['p95']} ms · "
                    f"conflictos {fila['conflictos']} · conexiones {fila['conexiones']} · "
                    f"esperando bloqueo {fila['esperas']}",
                )


# --- Entorno ficticio ---


def limpiar_entorno():
    """Elimina todo lo creado por simulaciones (también restos de una ejecución interrumpida)."""
    usuarios = Usuario.objects.filter(username__startswith=PREFIJO)
    Cita.objects.filter(doctor__usuario__in=usuarios).delete()
    Cita.objects.filter(paciente__usuario__in=usuarios).delete()
    ReservaSinControl.objects.all().delete()
    Auditoria.objects.filter(usuario__in=usuarios).delete()
    Doctor.objects.filter(usuario__in=usuarios).delete()
    Paciente.objects.filter(usuario__in=usuarios).delete()
    usuarios.delete()
    Especialidad.objects.filter(nombre=ESPECIALIDAD, doctores__isnull=True).delete()


def preparar_entorno(cantidad_medicos, cantidad_pacientes, fecha):
    especialidad, _ = Especialidad.objects.get_or_create(nombre=ESPECIALIDAD)
    clave = make_password(None)  # clave inutilizable: estas cuentas no pueden iniciar sesión
    usuarios_medicos = Usuario.objects.bulk_create(
        Usuario(username=f"{PREFIJO}medico_{n}", password=clave, rol=Rol.DOCTOR, is_active=False)
        for n in range(1, cantidad_medicos + 1)
    )
    doctores = Doctor.objects.bulk_create(
        Doctor(
            usuario=u,
            especialidad=especialidad,
            nombres="Médico",
            apellidos=f"Simulado {n}",
            registro_medico=f"SIM-{n}",
        )
        for n, u in enumerate(usuarios_medicos, start=1)
    )
    inicio, fin, minutos = JORNADA
    HorarioBase.objects.bulk_create(
        HorarioBase(doctor=d, dia_semana=fecha.weekday(), hora_inicio=inicio, hora_fin=fin, duracion_minutos=minutos)
        for d in doctores
    )
    usuarios_pacientes = Usuario.objects.bulk_create(
        Usuario(username=f"{PREFIJO}paciente_{n}", password=clave, rol=Rol.PACIENTE, is_active=False)
        for n in range(1, cantidad_pacientes + 1)
    )
    Paciente.objects.bulk_create(
        Paciente(
            usuario=u,
            tipo_documento="CC",
            numero_documento=f"SIM{n:06d}",
            nombres="Paciente",
            apellidos=f"Simulado {n}",
            telefono="0",
        )
        for n, u in enumerate(usuarios_pacientes, start=1)
    )
    # Se recargan con su perfil para que los servicios encuentren usuario.paciente sin consultas extra.
    return doctores, list(Usuario.objects.filter(pk__in=[u.pk for u in usuarios_pacientes]).select_related("paciente"))


# --- Escenarios ---


def _medir(funcion):
    inicio = time.perf_counter()
    try:
        return funcion(), (time.perf_counter() - inicio) * 1000, None
    except (Conflicto, ReglaInvalida) as error:
        return None, (time.perf_counter() - inicio) * 1000, error


def _reservar_sin_control(doctor, usuario, fecha, hora):
    """Lógica ingenua: consulta si la franja está libre y luego inserta, sin bloqueo ni restricción única."""
    if ReservaSinControl.objects.filter(id_doctor=doctor.pk, fecha=fecha, hora=hora).exists():
        raise Conflicto("La franja aparecía ocupada")
    time.sleep(0.01)  # latencia típica de una aplicación web entre la consulta y el registro
    return ReservaSinControl.objects.create(
        id_doctor=doctor.pk, id_paciente=usuario.paciente.pk, fecha=fecha, hora=hora
    )


def escenario_rafaga(simulacion, registro, metricas, doctor, pacientes, fecha):
    con_controles = simulacion.parametros["proteccion"]
    barrera = threading.Barrier(len(pacientes))
    registro.evento(
        NivelEvento.INFO,
        f"{len(pacientes)} pacientes listos para reservar el {fecha:%d/%m} a las {HORA_RAFAGA:%H:%M} "
        f"{'CON' if con_controles else 'SIN'} controles de concurrencia.",
    )

    def intentar(numero, usuario):
        try:
            # La conexión se abre ANTES de la barrera: así todos los hilos golpean la base al mismo tiempo,
            # en lugar de escalonarse por el tiempo de autenticación de cada conexión nueva.
            connection.ensure_connection()
            barrera.wait(timeout=30)
            if con_controles:
                resultado, ms, error = _medir(lambda: citas.agendar_cita(usuario, doctor.pk, fecha, HORA_RAFAGA))
            else:
                resultado, ms, error = _medir(lambda: _reservar_sin_control(doctor, usuario, fecha, HORA_RAFAGA))
            if error is None:
                metricas.registrar("exito", ms)
                registro.evento(NivelEvento.OK, f"Paciente {numero:>3}: reserva registrada ({ms:.1f} ms)")
            else:
                metricas.registrar("conflicto", ms)
                registro.evento(
                    NivelEvento.CONFLICTO, f"Paciente {numero:>3}: rechazada · {_texto(error)} ({ms:.1f} ms)"
                )
        except Exception as error:
            metricas.registrar("errores", 0)
            registro.evento(NivelEvento.ERROR, f"Paciente {numero:>3}: error inesperado · {error}")
        finally:
            connections.close_all()

    _en_paralelo([(intentar, (n, u)) for n, u in enumerate(pacientes, start=1)])

    if con_controles:
        registradas = (
            Cita.objects.filter(doctor=doctor, fecha=fecha, hora=HORA_RAFAGA)
            .exclude(estado=EstadoCita.CANCELADA)
            .count()
        )
    else:
        registradas = ReservaSinControl.objects.filter(id_doctor=doctor.pk, fecha=fecha, hora=HORA_RAFAGA).count()
    correcto = registradas == 1
    registro.evento(
        NivelEvento.OK if correcto else NivelEvento.ERROR,
        f"Verificación en la base de datos: {registradas} reserva(s) para una sola franja "
        f"{'✔ sin sobreagendamiento' if correcto else '✘ SOBREAGENDAMIENTO'}",
    )
    return {"reservas_en_la_franja": registradas, "sobreagendamiento": not correcto}


def escenario_carga(simulacion, registro, metricas, doctores, pacientes, fecha):
    hilos = simulacion.parametros["hilos"]
    duracion = simulacion.parametros["duracion"]
    inicio, fin, minutos = JORNADA
    horas = agenda.generar_franjas(inicio, fin, minutos)
    calientes = [(doctores[0], h) for h in horas[:3]]
    limite = time.perf_counter() + duracion
    registrados = defaultdict(int)
    candado = threading.Lock()
    registro.evento(
        NivelEvento.INFO,
        f"{hilos} hilos durante {duracion} s sobre {len(doctores)} médicos y {len(pacientes)} pacientes "
        f"({int(PROPORCION_CONSULTAS * 100)} % consultas, el resto reservas; 3 franjas calientes).",
    )

    def anotar(tipo, nivel, mensaje):
        with candado:
            registrados[tipo] += 1
            if registrados[tipo] <= MAXIMO_EVENTOS_POR_TIPO:
                registro.evento(nivel, mensaje)

    def trabajar(numero):
        try:
            while time.perf_counter() < limite:
                if random.random() < PROPORCION_CONSULTAS:
                    doctor = random.choice(doctores)
                    _, ms, _ = _medir(lambda d=doctor: agenda.franjas_disponibles(d, fecha))
                    metricas.registrar("consulta", ms)
                    continue
                doctor, hora = (
                    random.choice(calientes)
                    if random.random() < 0.5
                    else (random.choice(doctores), random.choice(horas))
                )
                usuario = random.choice(pacientes)
                resultado, ms, error = _medir(lambda d=doctor, h=hora, u=usuario: citas.agendar_cita(u, d.pk, fecha, h))
                if error is None:
                    metricas.registrar("exito", ms)
                    anotar(
                        "exito",
                        NivelEvento.OK,
                        f"Hilo {numero:>2}: cita {hora:%H:%M} con {doctor.apellidos} ({ms:.1f} ms)",
                    )
                else:
                    metricas.registrar("conflicto", ms)
                    anotar(
                        "conflicto",
                        NivelEvento.CONFLICTO,
                        f"Hilo {numero:>2}: {hora:%H:%M} rechazada · {_texto(error)}",
                    )
        except Exception as error:
            metricas.registrar("errores", 0)
            registro.evento(NivelEvento.ERROR, f"Hilo {numero:>2}: error inesperado · {error}")
        finally:
            connections.close_all()

    _en_paralelo([(trabajar, (n,)) for n in range(1, hilos + 1)])

    duplicados = (
        Cita.objects.filter(doctor__in=doctores)
        .exclude(estado=EstadoCita.CANCELADA)
        .values("doctor", "fecha", "hora")
        .annotate(total=Count("id_cita"))
        .filter(total__gt=1)
        .count()
    )
    creadas = Cita.objects.filter(doctor__in=doctores).count()
    registro.evento(
        NivelEvento.OK if duplicados == 0 else NivelEvento.ERROR,
        f"Verificación en la base de datos: {creadas} citas creadas, {duplicados} franjas duplicadas "
        f"{'✔' if duplicados == 0 else '✘'}",
    )
    return {"citas_creadas": creadas, "franjas_duplicadas": duplicados}


def _texto(error):
    detalle = error.detail
    return str(detalle.get("detail", detalle)) if isinstance(detalle, dict) else str(detalle)


def _en_paralelo(tareas):
    hilos = [threading.Thread(target=funcion, args=argumentos, daemon=True) for funcion, argumentos in tareas]
    for hilo in hilos:
        hilo.start()
    for hilo in hilos:
        hilo.join()


# --- Orquestación ---


def ejecutar(id_simulacion):
    """Ejecuta la simulación completa. Pensado para correr en un hilo aparte (o directo desde el comando)."""
    simulacion = Simulacion.objects.get(pk=id_simulacion)
    registro, metricas = Registro(simulacion), Metricas()
    parametros = simulacion.parametros
    fecha = timezone.localdate() + timedelta(days=1)
    es_carga = simulacion.tipo == TipoSimulacion.CARGA
    monitor = Monitor(simulacion, registro, metricas, resumen_por_segundo=es_carga)
    estado, integridad = EstadoSimulacion.TERMINADA, {}
    try:
        limpiar_entorno()
        medicos = parametros.get("medicos", 1) if es_carga else 1
        cantidad_pacientes = parametros.get("pacientes", 50) if es_carga else parametros["usuarios"]
        doctores, pacientes = preparar_entorno(medicos, cantidad_pacientes, fecha)
        registro.evento(
            NivelEvento.INFO, f"Entorno ficticio listo: {len(doctores)} médico(s), {len(pacientes)} paciente(s)."
        )
        metricas.inicio = time.perf_counter()
        monitor.start()
        if es_carga:
            integridad = escenario_carga(simulacion, registro, metricas, doctores, pacientes, fecha)
        else:
            integridad = escenario_rafaga(simulacion, registro, metricas, doctores[0], pacientes, fecha)
    except Exception as error:
        estado = EstadoSimulacion.FALLIDA
        registro_aplicacion.exception("La simulación %s falló", id_simulacion)
        registro.evento(NivelEvento.ERROR, f"La simulación se detuvo: {error}")
    finally:
        monitor.detener.set()
        if monitor.is_alive():
            monitor.join()
        try:
            limpiar_entorno()
            registro.evento(NivelEvento.INFO, "Entorno ficticio eliminado.")
        except Exception:
            registro_aplicacion.exception("No se pudo limpiar el entorno de simulación")
            registro.evento(NivelEvento.ERROR, "No se pudo limpiar el entorno ficticio (ver registros del servidor).")
        registro.volcar()
        resultados = {**metricas.resumen(), "integridad": integridad}
        Simulacion.objects.filter(pk=id_simulacion).update(
            estado=estado, resultados=resultados, terminada_en=timezone.now()
        )
