// Utilidades compartidas por las pruebas de pantallas: API simulada y sesión iniciada.
import { vi } from 'vitest'

/**
 * Reemplaza fetch por respuestas fijas por "MÉTODO /ruta/" (sin /api/v1 ni parámetros de consulta).
 * Cada respuesta es {estado, cuerpo, cabeceras?} o una función que la devuelve.
 * Devuelve la lista de llamadas hechas, para comprobar qué envió la pantalla.
 */
export function simularApi(rutas) {
  const llamadas = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, opciones = {}) => {
    const ruta = new URL(url).pathname.replace('/api/v1', '')
    const metodo = opciones.method ?? 'GET'
    const cuerpo = opciones.body ? JSON.parse(opciones.body) : undefined
    llamadas.push({ metodo, ruta, cuerpo })
    let respuesta = rutas[`${metodo} ${ruta}`]
    if (typeof respuesta === 'function') respuesta = respuesta(cuerpo)
    respuesta ??= { estado: 404, cuerpo: { detail: `Ruta no simulada: ${metodo} ${ruta}` } }
    return {
      ok: respuesta.estado < 400,
      status: respuesta.estado,
      json: async () => respuesta.cuerpo,
      blob: async () => new Blob(['contenido']),
      headers: new Headers(respuesta.cabeceras ?? {}),
    }
  })
  return llamadas
}

export const USUARIOS = {
  paciente: { id_usuario: 1, username: 'paciente1', rol: 'PACIENTE', nombre: 'Paciente Uno', email: 'p1@eps.test', telefono: '3000000000' },
  doctor: { id_usuario: 2, username: 'medico3', rol: 'DOCTOR', nombre: 'Laura Gómez', email: '', especialidad: 'Pediatría' },
  admin: { id_usuario: 3, username: 'admin', rol: 'ADMIN', nombre: 'Administrador del sistema', email: '' },
}

/** Deja la sesión iniciada y la URL en la sección indicada, antes de montar la aplicación. */
export function iniciarSesionComo(usuario, seccion) {
  localStorage.setItem('eps_sesion', JSON.stringify({ token: 'token-de-prueba', usuario }))
  window.location.hash = `/${seccion}`
}

export const CONTADOR = { 'GET /notificaciones/contador/': { estado: 200, cuerpo: { no_leidas: 0 } } }
