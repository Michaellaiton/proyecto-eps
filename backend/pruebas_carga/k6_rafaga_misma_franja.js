// Ráfaga: N pacientes intentan reservar EXACTAMENTE la misma franja al mismo tiempo (REQ-03).
// Resultado esperado: 1 respuesta 201 y N-1 respuestas 409, y una sola cita activa en la base de datos.
//
// Uso (desde backend/):
//   k6 run -e CLAVE=<EPS_CLAVE_USUARIOS_DEMO> -e FECHA=2026-10-13 -e MEDICO=1 -e HORA=10:00 pruebas_carga/k6_rafaga_misma_franja.js
import http from 'k6/http'
import { check } from 'k6'
import { Counter } from 'k6/metrics'

const API = __ENV.API ?? 'http://localhost:8000/api/v1'
const PACIENTES = Number(__ENV.PACIENTES ?? 30)
const reservas201 = new Counter('reservas_201')
const reservas409 = new Counter('reservas_409')

export const options = {
  scenarios: {
    rafaga: { executor: 'per-vu-iterations', vus: PACIENTES, iterations: 1, maxDuration: '30s' },
  },
  thresholds: {
    reservas_201: ['count==1'],
    reservas_409: [`count==${PACIENTES - 1}`],
  },
}

export function setup() {
  return {
    tokens: Array.from({ length: PACIENTES }, (_, i) => {
      const r = http.post(`${API}/usuarios/iniciar-sesion/`, JSON.stringify({ username: `paciente${i + 1}`, password: __ENV.CLAVE }), {
        headers: { 'Content-Type': 'application/json' },
      })
      return r.json('access')
    }),
  }
}

export default function ({ tokens }) {
  const r = http.post(
    `${API}/citas/`,
    JSON.stringify({ id_doctor: Number(__ENV.MEDICO ?? 1), fecha: __ENV.FECHA, hora: __ENV.HORA ?? '10:00' }),
    { headers: { Authorization: `Bearer ${tokens[__VU - 1]}`, 'Content-Type': 'application/json' } },
  )
  check(r, { 'respuesta 201 o 409': (x) => x.status === 201 || x.status === 409 })
  if (r.status === 201) reservas201.add(1)
  if (r.status === 409) reservas409.add(1)
}
