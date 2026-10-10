import { solicitarApi } from './clienteApi.js'

export const listarNotificaciones = () => solicitarApi('/notificaciones/')
export const contarNoLeidas = () => solicitarApi('/notificaciones/contador/')
export const marcarLeida = (id) => solicitarApi(`/notificaciones/${id}/leida/`, { method: 'PATCH' })
export const marcarTodasLeidas = () => solicitarApi('/notificaciones/marcar-todas/', { method: 'POST' })
