import { solicitarApi } from './clienteApi.js'

export function agendarCita(idDoctor, fecha, hora) {
  return solicitarApi('/citas/', { method: 'POST', cuerpo: { id_doctor: idDoctor, fecha, hora } })
}

export function listarMisCitas() {
  return solicitarApi('/citas/mias/')
}

export function cancelarCita(idCita) {
  return solicitarApi(`/citas/${idCita}/cancelar/`, { method: 'PATCH' })
}

export function reprogramarCita(idCita, { fecha, hora, idDoctor }) {
  return solicitarApi(`/citas/${idCita}/reprogramar/`, {
    method: 'PATCH',
    cuerpo: { fecha, hora, id_doctor: Number(idDoctor) },
  })
}
