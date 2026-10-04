// Llamadas a la API del módulo de administración (rol ADMIN).
import { construirConsulta, solicitarApi } from './clienteApi.js'

const BASE = '/administracion'

export const consultarResumen = () => solicitarApi(`${BASE}/resumen/`)

// Usuarios
export const listarUsuarios = (filtros) => solicitarApi(`${BASE}/usuarios/${construirConsulta(filtros)}`)
export const crearUsuario = (datos) => solicitarApi(`${BASE}/usuarios/`, { method: 'POST', cuerpo: datos })
export const actualizarUsuario = (idUsuario, cambios) =>
  solicitarApi(`${BASE}/usuarios/${idUsuario}/`, { method: 'PATCH', cuerpo: cambios })
export const restablecerClave = (idUsuario, password) =>
  solicitarApi(`${BASE}/usuarios/${idUsuario}/restablecer-clave/`, { method: 'POST', cuerpo: { password } })

// Especialidades
export const listarEspecialidadesAdmin = () => solicitarApi(`${BASE}/especialidades/`)
export const crearEspecialidad = (nombre) => solicitarApi(`${BASE}/especialidades/`, { method: 'POST', cuerpo: { nombre } })
export const renombrarEspecialidad = (id, nombre) =>
  solicitarApi(`${BASE}/especialidades/${id}/`, { method: 'PATCH', cuerpo: { nombre } })
export const eliminarEspecialidad = (id) => solicitarApi(`${BASE}/especialidades/${id}/`, { method: 'DELETE' })

// Horario base de los médicos
export const consultarHorario = (idDoctor) => solicitarApi(`${BASE}/medicos/${idDoctor}/horario/`)
export const guardarHorario = (idDoctor, bloques) =>
  solicitarApi(`${BASE}/medicos/${idDoctor}/horario/`, { method: 'PUT', cuerpo: { bloques } })

// Citas, reportes y auditoría
export const listarCitasAdmin = (filtros) => solicitarApi(`${BASE}/citas/${construirConsulta(filtros)}`)
export const consultarReporteOcupacion = (desde, hasta) =>
  solicitarApi(`${BASE}/reportes/ocupacion/${construirConsulta({ desde, hasta })}`)
export const listarAuditoria = (filtros) => solicitarApi(`${BASE}/auditoria/${construirConsulta(filtros)}`)
