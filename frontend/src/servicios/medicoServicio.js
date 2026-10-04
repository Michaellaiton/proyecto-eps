// Llamadas a la API del rol DOCTOR (CU-04).
import { construirConsulta, solicitarApi } from './clienteApi.js'

export const consultarMiAgenda = (fecha) => solicitarApi(`/medicos/agenda/${construirConsulta({ fecha })}`)

export const listarMisBloqueos = () => solicitarApi('/medicos/bloqueos/')
export const crearBloqueo = (datos) => solicitarApi('/medicos/bloqueos/', { method: 'POST', cuerpo: datos })
export const eliminarBloqueo = (idBloqueo) => solicitarApi(`/medicos/bloqueos/${idBloqueo}/`, { method: 'DELETE' })

export const registrarAtencion = (idCita, estado) =>
  solicitarApi(`/citas/${idCita}/atencion/`, { method: 'PATCH', cuerpo: { estado } })
