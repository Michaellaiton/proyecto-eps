import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Plus, Stethoscope, UserRound } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'

import Boton from '../componentes/Boton.jsx'
import { EstadoCita } from '../componentes/Insignia.jsx'
import Pasos from '../componentes/Pasos.jsx'
import SelectorDias from '../componentes/SelectorDias.jsx'
import SelectorFranjas from '../componentes/SelectorFranjas.jsx'
import SelectorTarjetas from '../componentes/SelectorTarjetas.jsx'
import { GraficaBarras } from '../componentes/Graficas.jsx'

describe('Boton', () => {
  it('ejecuta la acción al pulsarlo', async () => {
    const alPulsar = vi.fn()
    render(<Boton onClick={alPulsar}>Guardar</Boton>)

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(alPulsar).toHaveBeenCalledOnce()
  })

  it('se desactiva mientras carga', () => {
    render(<Boton cargando>Guardar</Boton>)

    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
  })

  it('un botón de solo ícono tiene nombre accesible', () => {
    render(<Boton soloIcono icono={Plus} ayuda="Agregar bloque" />)

    expect(screen.getByRole('button', { name: 'Agregar bloque' })).toBeInTheDocument()
  })
})

describe('SelectorFranjas', () => {
  it('agrupa las horas en mañana y tarde y marca la elegida', async () => {
    const alElegir = vi.fn()
    render(<SelectorFranjas franjas={['07:00', '07:20', '14:00']} valor="07:20" alElegir={alElegir} />)

    expect(screen.getByText(/Mañana · 2/)).toBeInTheDocument()
    expect(screen.getByText(/Tarde · 1/)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '07:20' })).toHaveAttribute('aria-checked', 'true')

    await userEvent.click(screen.getByRole('radio', { name: '14:00' }))
    expect(alElegir).toHaveBeenCalledWith('14:00')
  })
})

describe('SelectorTarjetas', () => {
  it('cada opción tiene nombre accesible y avisa la elegida', async () => {
    const alElegir = vi.fn()
    const opciones = [
      { valor: 1, titulo: 'Medicina general', icono: Stethoscope },
      { valor: 2, titulo: 'Pediatría', detalle: '2 médicos', icono: UserRound },
    ]
    render(<SelectorTarjetas etiqueta="Especialidad" valor="1" opciones={opciones} alElegir={alElegir} />)

    expect(screen.getByRole('radio', { name: 'Medicina general' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(screen.getByRole('radio', { name: 'Pediatría: 2 médicos' }))
    expect(alElegir).toHaveBeenCalledWith('2')
  })
})

describe('SelectorDias', () => {
  it('muestra la cantidad de días pedida y marca hoy', async () => {
    const alElegir = vi.fn()
    render(<SelectorDias valor="2026-10-12" alElegir={alElegir} desde="2026-10-09" dias={7} />)

    expect(screen.getAllByRole('radio')).toHaveLength(7)
    expect(screen.getByRole('radio', { checked: true })).toHaveTextContent('12')

    await userEvent.click(screen.getByRole('radio', { name: /13/ }))
    expect(alElegir).toHaveBeenCalledWith('2026-10-13')
  })
})

describe('Pasos', () => {
  it('marca el paso actual para lectores de pantalla', () => {
    const pasos = [
      { texto: 'Especialidad', icono: Stethoscope },
      { texto: 'Médico', icono: UserRound },
    ]
    render(<Pasos pasos={pasos} actual={1} />)

    expect(screen.getByText('Médico').closest('li')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByText('Especialidad').closest('li')).toHaveClass('paso--hecho')
  })
})

describe('EstadoCita', () => {
  it('muestra el estado con texto legible', () => {
    render(<EstadoCita estado="No asistio" />)

    expect(screen.getByText('No asistió')).toBeInTheDocument()
  })
})

describe('GraficaBarras', () => {
  it('dibuja una barra por valor, con leyenda y tooltip', async () => {
    const { container } = render(
      <GraficaBarras
        titulo="Latencia"
        valores={[10, 20, 30]}
        destacadas={[0]}
        leyenda={[{ texto: 'Reservó', destacada: true }]}
        unidad="ms"
        describir={(i) => `Solicitud ${i + 1}`}
      />,
    )

    expect(container.querySelectorAll('.grafica__barra')).toHaveLength(3)
    expect(container.querySelectorAll('.grafica__barra--destacada')).toHaveLength(1)
    expect(screen.getByText('Reservó')).toBeInTheDocument()

    await userEvent.hover(container.querySelectorAll('.grafica__zona')[2])
    expect(screen.getByRole('status')).toHaveTextContent('Solicitud 3')
  })
})
