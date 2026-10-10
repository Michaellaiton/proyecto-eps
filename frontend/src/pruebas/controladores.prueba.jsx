import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { usarAgendamiento } from '../controladores/usarAgendamiento.js'
import { usarAsistente } from '../controladores/usarAsistente.js'
import * as asistente from '../servicios/asistenteServicio.js'
import * as citas from '../servicios/citasServicio.js'
import * as medicos from '../servicios/medicosServicio.js'

vi.mock('../servicios/medicosServicio.js')
vi.mock('../servicios/citasServicio.js')
vi.mock('../servicios/asistenteServicio.js')

describe('usarAgendamiento (CU-01, CU-02)', () => {
  beforeEach(() => {
    medicos.listarEspecialidades.mockResolvedValue([{ id_especialidad: 1, nombre: 'Pediatría' }])
    medicos.listarDoctores.mockResolvedValue([
      { id_doctor: 3, nombres: 'Laura', apellidos: 'Gómez', especialidad: { nombre: 'Pediatría' } },
    ])
    medicos.consultarDisponibilidad.mockResolvedValue({ franjas: ['08:00', '08:20'] })
  })

  it('avanza por los pasos y consulta la disponibilidad sola al elegir médico', async () => {
    const { result } = renderHook(() => usarAgendamiento())
    await waitFor(() => expect(result.current.especialidades).toHaveLength(1))
    expect(result.current.pasoActual).toBe(0)

    act(() => result.current.elegir('idEspecialidad', '1'))
    await waitFor(() => expect(result.current.doctores).toHaveLength(1))
    expect(result.current.pasoActual).toBe(1)

    act(() => result.current.elegir('idDoctor', '3'))
    await waitFor(() => expect(result.current.franjas).toEqual(['08:00', '08:20']))
    expect(medicos.consultarDisponibilidad).toHaveBeenCalledWith('3', result.current.seleccion.fecha)

    act(() => result.current.elegir('hora', '08:20'))
    expect(result.current.pasoActual).toBe(3)
  })

  it('cambiar de especialidad reinicia médico y hora', async () => {
    const { result } = renderHook(() => usarAgendamiento())
    act(() => {
      result.current.elegir('idEspecialidad', '1')
      result.current.elegir('idDoctor', '3')
      result.current.elegir('hora', '08:00')
    })

    act(() => result.current.elegir('idEspecialidad', '2'))

    expect(result.current.seleccion).toMatchObject({ idEspecialidad: '2', idDoctor: '', hora: '' })
  })

  it('confirma la cita y la guarda como confirmada', async () => {
    citas.agendarCita.mockResolvedValue({ id_cita: 9, hora: '08:20' })
    const { result } = renderHook(() => usarAgendamiento())
    act(() => {
      result.current.elegir('idDoctor', '3')
      result.current.elegir('hora', '08:20')
    })

    await act(() => result.current.confirmar())

    expect(citas.agendarCita).toHaveBeenCalledWith(3, result.current.seleccion.fecha, '08:20')
    expect(result.current.citaConfirmada).toEqual({ id_cita: 9, hora: '08:20' })
  })

  it('ante un 409 ofrece la siguiente franja y quita la hora elegida (Tabla 29)', async () => {
    const error = Object.assign(new Error('La franja ya fue asignada.'), {
      estado: 409,
      datos: { sugerencia: { id_doctor: '3', fecha: '2026-10-12', hora: '08:40' } },
    })
    citas.agendarCita.mockRejectedValue(error)
    const { result } = renderHook(() => usarAgendamiento())
    act(() => {
      result.current.elegir('idDoctor', '3')
      result.current.elegir('hora', '08:20')
    })

    await act(() => result.current.confirmar())

    expect(result.current.error.message).toBe('La franja ya fue asignada.')
    expect(result.current.sugerencia.hora).toBe('08:40')
    expect(result.current.seleccion.hora).toBe('')
  })
})

describe('usarAsistente', () => {
  it('agrega la pregunta y la respuesta con sus sugerencias', async () => {
    asistente.enviarMensaje.mockResolvedValue({ respuesta: 'Hola', accion: null, sugerencias: ['¿Hay citas?'] })
    const { result } = renderHook(() => usarAsistente())

    await act(() => result.current.enviar('hola'))

    expect(result.current.mensajes).toEqual([
      { autor: 'usuario', texto: 'hola' },
      { autor: 'asistente', texto: 'Hola', accion: null },
    ])
    expect(result.current.sugerencias).toEqual(['¿Hay citas?'])
  })

  it('el saludo inicial no muestra un mensaje del usuario', async () => {
    asistente.enviarMensaje.mockResolvedValue({ respuesta: '¡Hola!', sugerencias: [] })
    const { result } = renderHook(() => usarAsistente())

    await act(() => result.current.iniciar())

    expect(result.current.mensajes.map((m) => m.autor)).toEqual(['asistente'])
  })

  it('explica el límite de mensajes (429) con lenguaje claro', async () => {
    asistente.enviarMensaje.mockRejectedValue(Object.assign(new Error('Throttled'), { estado: 429 }))
    const { result } = renderHook(() => usarAsistente())

    await act(() => result.current.enviar('hola'))

    expect(result.current.mensajes.at(-1).texto).toMatch(/Espera un momento/)
  })

  it('no envía mensajes vacíos', async () => {
    const { result } = renderHook(() => usarAsistente())

    await act(() => result.current.enviar('   '))

    expect(asistente.enviarMensaje).not.toHaveBeenCalled()
  })
})
