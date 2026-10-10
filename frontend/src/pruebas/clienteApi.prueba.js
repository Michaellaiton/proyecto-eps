import { describe, expect, it, vi } from 'vitest'

import { construirConsulta, registrarAlExpirarSesion, solicitarApi } from '../servicios/clienteApi.js'
import { guardarSesion } from '../servicios/almacenamientoSesion.js'

function responder(estado, cuerpo) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: estado < 400,
    status: estado,
    json: () => Promise.resolve(cuerpo),
  })
}

describe('construirConsulta', () => {
  it('omite los filtros vacíos', () => {
    expect(construirConsulta({ a: 1, b: '', c: null, d: undefined, e: 'x y' })).toBe('?a=1&e=x+y')
    expect(construirConsulta({})).toBe('')
  })
})

describe('solicitarApi', () => {
  it('envía el token de la sesión y el cuerpo en JSON', async () => {
    guardarSesion({ token: 'token-de-prueba' })
    const fetch = responder(200, { ok: true })

    await solicitarApi('/citas/', { method: 'POST', cuerpo: { hora: '08:00' } })

    const [url, opciones] = fetch.mock.calls[0]
    expect(url).toMatch(/\/citas\/$/)
    expect(opciones.headers.Authorization).toBe('Bearer token-de-prueba')
    expect(opciones.body).toBe('{"hora":"08:00"}')
  })

  it('convierte el error de la API en un mensaje legible con su estado y datos', async () => {
    responder(409, { detail: 'La franja ya fue asignada.', sugerencia: { hora: '08:20' } })

    await expect(solicitarApi('/citas/')).rejects.toMatchObject({
      message: 'La franja ya fue asignada.',
      estado: 409,
      datos: { sugerencia: { hora: '08:20' } },
    })
  })

  it('usa el primer error de campo cuando no hay detalle', async () => {
    responder(422, { telefono: ['Use solo números.'] })

    await expect(solicitarApi('/usuarios/yo/')).rejects.toThrow('Use solo números.')
  })

  it('cierra la sesión si la API responde 401 con un token guardado', async () => {
    guardarSesion({ token: 'vencido' })
    const alExpirar = vi.fn()
    registrarAlExpirarSesion(alExpirar)
    responder(401, { detail: 'Token inválido' })

    await expect(solicitarApi('/citas/mias/')).rejects.toThrow()
    expect(alExpirar).toHaveBeenCalledOnce()
  })
})
