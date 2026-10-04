// Cliente HTTP único para hablar con la API de Django. Todos los servicios lo usan.
import { URL_API } from '../configuracion/entorno.js'
import { leerSesion } from './almacenamientoSesion.js'

let alExpirarSesion = () => {}

// El controlador de sesión registra aquí qué hacer cuando la API responde 401 (token vencido o inválido).
export function registrarAlExpirarSesion(funcion) {
  alExpirarSesion = funcion
}

function mensajeDeError(datos, estado) {
  if (!datos) return `Error ${estado}`
  if (typeof datos.detail === 'string') return datos.detail
  const primerCampo = Object.values(datos)[0]
  return Array.isArray(primerCampo) ? primerCampo[0] : `Error ${estado}`
}

// Convierte {a: 1, b: ''} en "?a=1", omitiendo los filtros vacíos.
export function construirConsulta(parametros = {}) {
  const limpios = Object.entries(parametros).filter(([, valor]) => valor !== '' && valor !== null && valor !== undefined)
  return limpios.length ? `?${new URLSearchParams(limpios)}` : ''
}

export async function solicitarApi(ruta, opciones = {}) {
  const token = leerSesion()?.token
  const respuesta = await fetch(`${URL_API}${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opciones.headers,
    },
    body: opciones.cuerpo ? JSON.stringify(opciones.cuerpo) : undefined,
  })
  const datos = await respuesta.json().catch(() => null)

  if (respuesta.status === 401 && token) alExpirarSesion()
  if (!respuesta.ok) {
    const error = new Error(mensajeDeError(datos, respuesta.status))
    error.estado = respuesta.status
    error.datos = datos // Datos adicionales del error, por ejemplo la franja sugerida en un 409.
    throw error
  }
  return datos
}
