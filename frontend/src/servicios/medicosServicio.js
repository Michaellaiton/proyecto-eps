import { solicitarApi } from './clienteApi.js'

export function listarEspecialidades() {
  return solicitarApi('/medicos/especialidades/')
}

export function listarDoctores(idEspecialidad) {
  return solicitarApi(`/medicos/?especialidad=${encodeURIComponent(idEspecialidad)}`)
}

export function consultarDisponibilidad(idDoctor, fecha) {
  return solicitarApi(`/medicos/${idDoctor}/disponibilidad/?fecha=${encodeURIComponent(fecha)}`)
}
