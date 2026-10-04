import { solicitarApi } from './clienteApi.js'

export function consultarSalud() {
  return solicitarApi('/salud/')
}
