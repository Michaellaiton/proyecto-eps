import { construirConsulta, solicitarApi } from './clienteApi.js'

export const iniciarSimulacion = (datos) => solicitarApi('/simulacion/', { method: 'POST', cuerpo: datos })
export const listarSimulaciones = () => solicitarApi('/simulacion/')
export const consultarSimulacion = (id, desdeEvento) =>
  solicitarApi(`/simulacion/${id}/${construirConsulta({ desde_evento: desdeEvento })}`)
