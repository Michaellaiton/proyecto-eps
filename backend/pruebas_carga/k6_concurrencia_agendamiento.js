// Prueba de carga con perfil mixto (respuesta a OBS-01 del informe de Calidad de Software).
//
// 85 % consultas de disponibilidad y 15 % reservas; la mitad de las reservas apunta a 3 franjas
// "calientes" para forzar colisiones. Tasa constante de solicitudes durante el tiempo indicado.
//
// Requisitos: backend corriendo con datos de `python manage.py sembrar_datos` y k6 instalado (https://k6.io).
// Uso (desde backend/):
//   k6 run -e CLAVE=<EPS_CLAVE_USUARIOS_DEMO> -e TASA=50 -e DURACION=60s -e FECHA=2026-10-13 pruebas_carga/k6_concurrencia_agendamiento.js
// Después de cada corrida:  psql -U eps_app -d eps_citas -f scripts/bd/03_verificar_integridad.sql
import http from 'k6/http'
import { check } from 'k6'
import { Counter, Trend } from 'k6/metrics'

const API = __ENV.API ?? 'http://localhost:8000/api/v1'
const CLAVE = __ENV.CLAVE
const TASA = Number(__ENV.TASA ?? 50)
const DURACION = __ENV.DURACION ?? '60s'
const FECHA = __ENV.FECHA // Día hábil futuro, AAAA-MM-DD
const PACIENTES = Number(__ENV.PACIENTES ?? 30)
const MEDICOS = [1, 2, 3, 4, 5, 6]
const FRANJAS = ['07:00', '07:20', '07:40', '08:00', '08:20', '08:40', '09:00', '09:20', '09:40', '10:00', '10:20', '10:40', '11:00', '11:20', '11:40']
const CALIENTES = [
  { medico: 1, hora: '08:00' },
  { medico: 1, hora: '08:20' },
  { medico: 3, hora: '09:00' },
]

const latenciaDisponibilidad = new Trend('latencia_disponibilidad', true)
const latenciaReserva = new Trend('latencia_reserva', true)
const reservas201 = new Counter('reservas_201')
const reservas409 = new Counter('reservas_409')
const erroresNoControlados = new Counter('errores_no_controlados')

export const options = {
  scenarios: {
    perfil_mixto: {
      executor: 'constant-arrival-rate',
      rate: TASA,
      timeUnit: '1s',
      duration: DURACION,
      preAllocatedVUs: Math.max(20, TASA),
      maxVUs: TASA * 4,
    },
  },
  thresholds: {
    latencia_disponibilidad: ['p(95)<800'], // REQ-06
    errores_no_controlados: ['count<1'],
  },
}

const elegir = (lista) => lista[Math.floor(Math.random() * lista.length)]

export function setup() {
  if (!CLAVE || !FECHA) throw new Error('Defina -e CLAVE=... y -e FECHA=AAAA-MM-DD')
  const tokens = []
  for (let n = 1; n <= PACIENTES; n++) {
    const respuesta = http.post(`${API}/usuarios/iniciar-sesion/`, JSON.stringify({ username: `paciente${n}`, password: CLAVE }), {
      headers: { 'Content-Type': 'application/json' },
    })
    check(respuesta, { 'inicio de sesión 200': (r) => r.status === 200 })
    tokens.push(respuesta.json('access'))
  }
  return { tokens }
}

export default function ({ tokens }) {
  const cabeceras = { headers: { Authorization: `Bearer ${elegir(tokens)}`, 'Content-Type': 'application/json' } }

  if (Math.random() < 0.85) {
    const r = http.get(`${API}/medicos/${elegir(MEDICOS)}/disponibilidad/?fecha=${FECHA}`, cabeceras)
    latenciaDisponibilidad.add(r.timings.duration)
    if (r.status !== 200) erroresNoControlados.add(1)
    return
  }

  const destino = Math.random() < 0.5 ? elegir(CALIENTES) : { medico: elegir(MEDICOS), hora: elegir(FRANJAS) }
  const r = http.post(`${API}/citas/`, JSON.stringify({ id_doctor: destino.medico, fecha: FECHA, hora: destino.hora }), cabeceras)
  latenciaReserva.add(r.timings.duration)
  if (r.status === 201) reservas201.add(1)
  else if (r.status === 409) reservas409.add(1) // Conflicto esperado: franja tomada o límite de citas.
  else erroresNoControlados.add(1)
}
