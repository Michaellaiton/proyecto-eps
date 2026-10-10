import { describe, expect, it, vi } from 'vitest'

import { colorDeTexto, iniciales } from '../utilidades/colores.js'
import { iconoDeEspecialidad } from '../utilidades/especialidades.js'
import { formatearFechaCorta, haceTiempo, hoyIso, rangoMesActual, sumarDias, yaLlego } from '../utilidades/fechas.js'
import { Baby, Smile, Stethoscope } from 'lucide-react'

describe('fechas', () => {
  it('hoyIso devuelve la fecha local en formato AAAA-MM-DD', () => {
    expect(hoyIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('sumarDias cruza meses y años', () => {
    expect(sumarDias('2026-10-31', 1)).toBe('2026-11-01')
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01')
    expect(sumarDias('2026-10-09', -7)).toBe('2026-10-02')
  })

  it('formatearFechaCorta no deja puntos de abreviatura', () => {
    expect(formatearFechaCorta('2026-10-12')).not.toContain('.')
    expect(formatearFechaCorta('2026-10-12')).toContain('12')
  })

  it('rangoMesActual va del primer al último día del mes', () => {
    const { desde, hasta } = rangoMesActual()
    expect(desde.endsWith('-01')).toBe(true)
    expect(sumarDias(hasta, 1).endsWith('-01')).toBe(true)
  })

  it('yaLlego compara contra el reloj actual', () => {
    expect(yaLlego('2000-01-01', '08:00')).toBe(true)
    expect(yaLlego('2999-01-01', '08:00')).toBe(false)
  })

  it('haceTiempo describe el tiempo transcurrido en frases cortas', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-09T12:00:00Z'))
    expect(haceTiempo('2026-10-09T11:59:40Z')).toBe('ahora')
    expect(haceTiempo('2026-10-09T11:55:00Z')).toBe('hace 5 min')
    expect(haceTiempo('2026-10-09T09:00:00Z')).toBe('hace 3 h')
    expect(haceTiempo('2026-10-08T12:00:00Z')).toBe('hace 1 día')
    expect(haceTiempo('2026-10-06T12:00:00Z')).toBe('hace 3 días')
    vi.useRealTimers()
  })
})

describe('colores e iniciales', () => {
  it('toma las iniciales de los dos primeros nombres', () => {
    expect(iniciales('Laura Prueba Gómez')).toBe('LP')
    expect(iniciales('admin')).toBe('A')
    expect(iniciales('')).toBe('?')
  })

  it('asigna siempre el mismo color al mismo nombre', () => {
    expect(colorDeTexto('Ana Rojas')).toBe(colorDeTexto('Ana Rojas'))
    expect(colorDeTexto('Ana Rojas')).toMatch(/^hsl\(\d+, 52%, 46%\)$/)
  })
})

describe('íconos de especialidad', () => {
  it('reconoce la especialidad por palabras de su nombre', () => {
    expect(iconoDeEspecialidad('Pediatría')).toBe(Baby)
    expect(iconoDeEspecialidad('Odontología')).toBe(Smile)
    expect(iconoDeEspecialidad('Medicina general')).toBe(Stethoscope)
  })
})
