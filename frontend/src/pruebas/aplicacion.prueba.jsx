// Pruebas de integración de la aplicación completa (proveedores reales, API simulada con fetch).
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import Aplicacion from '../Aplicacion.jsx'

// Respuestas simuladas de la API por ruta.
function simularApi(rutas) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, opciones = {}) => {
    const ruta = new URL(url).pathname.replace('/api/v1', '')
    const respuesta = rutas[`${opciones.method ?? 'GET'} ${ruta}`] ?? { estado: 404, cuerpo: { detail: 'No encontrado' } }
    return { ok: respuesta.estado < 400, status: respuesta.estado, json: async () => respuesta.cuerpo }
  })
}

const BASE = {
  'GET /salud/': { estado: 200, cuerpo: { estado: 'ok', base_datos: 'disponible', version: '0.1.0' } },
  'GET /medicos/especialidades/': { estado: 200, cuerpo: [{ id_especialidad: 1, nombre: 'Pediatría' }] },
  'GET /notificaciones/contador/': { estado: 200, cuerpo: { no_leidas: 2 } },
}

describe('Aplicación', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('un visitante ve la página de inicio con las especialidades reales', async () => {
    simularApi(BASE)
    render(<Aplicacion />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tu cita médica')
    expect(await screen.findByText('Pediatría')).toBeInTheDocument()
  })

  it('credenciales incorrectas muestran el error de la API', async () => {
    simularApi({ ...BASE, 'POST /usuarios/iniciar-sesion/': { estado: 401, cuerpo: { detail: 'Usuario o contraseña incorrectos.' } } })
    window.location.hash = '/ingresar'
    render(<Aplicacion />)

    await userEvent.type(screen.getByLabelText('Usuario'), 'paciente1')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'mala')
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos.')
  })

  it('un paciente que inicia sesión llega a su panel con la campana de notificaciones', async () => {
    simularApi({
      ...BASE,
      'POST /usuarios/iniciar-sesion/': { estado: 200, cuerpo: { access: 'token', rol: 'PACIENTE' } },
      'GET /usuarios/yo/': { estado: 200, cuerpo: { id_usuario: 1, username: 'paciente1', rol: 'PACIENTE', nombre: 'Paciente Uno' } },
    })
    window.location.hash = '/ingresar'
    render(<Aplicacion />)

    await userEvent.type(screen.getByLabelText('Usuario'), 'paciente1')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'clave-correcta')
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('heading', { name: 'Agendar cita' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Notificaciones: 2 sin leer' })).toBeInTheDocument())
    // El menú del paciente no ofrece secciones de otros roles (REQ-07).
    expect(screen.queryByRole('button', { name: /Simulador/ })).not.toBeInTheDocument()
  })

  it('el asistente responde desde la página de inicio', async () => {
    simularApi({ ...BASE, 'POST /asistente/': { estado: 200, cuerpo: { respuesta: '¡Hola! ¿En qué te ayudo?', sugerencias: [] } } })
    render(<Aplicacion />)

    await userEvent.click(screen.getByRole('button', { name: 'Abrir asistente virtual' }))

    expect(await screen.findByText('¡Hola! ¿En qué te ayudo?')).toBeInTheDocument()
  })
})
