import { solicitarApi } from './clienteApi.js'

export function enviarMensaje(mensaje) {
  return solicitarApi('/asistente/', { method: 'POST', cuerpo: { mensaje } })
}
