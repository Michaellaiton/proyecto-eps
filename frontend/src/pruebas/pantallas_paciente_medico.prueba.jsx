// Pantallas del paciente y del médico con la aplicación completa y la API simulada.
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import Aplicacion from '../Aplicacion.jsx'
import { CONTADOR, iniciarSesionComo, simularApi, USUARIOS } from './apoyo.js'

const PROXIMA = { id_cita: 5, id_doctor: 3, doctor: 'Laura Gómez', id_especialidad: 1, especialidad: 'Pediatría', fecha: '2099-01-12', hora: '08:00', estado: 'Agendada' }
const PASADA = { ...PROXIMA, id_cita: 4, fecha: '2020-01-10', estado: 'Cancelada' }
const DOCTORES = [{ id_doctor: 3, nombres: 'Laura', apellidos: 'Gómez', especialidad: { nombre: 'Pediatría' } }]

describe('Paciente', () => {
  it('agenda una cita recorriendo los pasos hasta la pantalla de éxito (CU-01, CU-02)', async () => {
    const llamadas = simularApi({
      ...CONTADOR,
      'GET /medicos/especialidades/': { estado: 200, cuerpo: [{ id_especialidad: 1, nombre: 'Pediatría' }] },
      'GET /medicos/': { estado: 200, cuerpo: DOCTORES },
      'GET /medicos/3/disponibilidad/': { estado: 200, cuerpo: { franjas: ['08:00', '14:20'] } },
      'POST /citas/': { estado: 201, cuerpo: PROXIMA },
    })
    iniciarSesionComo(USUARIOS.paciente, 'agendar')
    render(<Aplicacion />)

    await userEvent.click(await screen.findByRole('radio', { name: 'Pediatría' }))
    await userEvent.click(await screen.findByRole('radio', { name: 'Laura Gómez: Pediatría' }))
    await userEvent.click(await screen.findByRole('radio', { name: '08:00' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar cita' }))

    expect(await screen.findByRole('heading', { name: '¡Cita agendada!' })).toBeInTheDocument()
    expect(llamadas.find((l) => l.metodo === 'POST').cuerpo).toMatchObject({ id_doctor: 3, hora: '08:00' })
  })

  it('separa próximas e historial y cancela con confirmación (CU-03)', async () => {
    const llamadas = simularApi({
      ...CONTADOR,
      'GET /citas/mias/': { estado: 200, cuerpo: [PROXIMA, PASADA] },
      'PATCH /citas/5/cancelar/': { estado: 200, cuerpo: { ...PROXIMA, estado: 'Cancelada' } },
    })
    iniciarSesionComo(USUARIOS.paciente, 'mis-citas')
    render(<Aplicacion />)

    expect(await screen.findByRole('heading', { name: 'Historial' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    const dialogo = screen.getByRole('dialog')
    expect(within(dialogo).getByText('¿Cancelar esta cita?')).toBeInTheDocument()
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Sí, cancelar' }))

    expect(await screen.findByText('Cita cancelada. El cupo quedó libre.')).toBeInTheDocument()
    expect(llamadas.some((l) => l.metodo === 'PATCH' && l.ruta === '/citas/5/cancelar/')).toBe(true)
  })

  it('reprograma una cita eligiendo una nueva hora', async () => {
    const llamadas = simularApi({
      ...CONTADOR,
      'GET /citas/mias/': { estado: 200, cuerpo: [PROXIMA] },
      'GET /medicos/': { estado: 200, cuerpo: DOCTORES },
      'GET /medicos/3/disponibilidad/': { estado: 200, cuerpo: { franjas: ['09:00'] } },
      'PATCH /citas/5/reprogramar/': { estado: 200, cuerpo: { ...PROXIMA, id_cita: 6, hora: '09:00' } },
    })
    iniciarSesionComo(USUARIOS.paciente, 'mis-citas')
    render(<Aplicacion />)

    await userEvent.click(await screen.findByRole('button', { name: 'Reprogramar' }))
    await userEvent.click(await screen.findByRole('radio', { name: '09:00' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mover a las 09:00' }))

    expect(await screen.findByText(/Cita movida al/)).toBeInTheDocument()
    expect(llamadas.find((l) => l.ruta === '/citas/5/reprogramar/').cuerpo).toMatchObject({ hora: '09:00', id_doctor: 3 })
  })

  it('actualiza su contacto y valida que las contraseñas coincidan', async () => {
    simularApi({ ...CONTADOR, 'PATCH /usuarios/yo/': { estado: 200, cuerpo: { ...USUARIOS.paciente, telefono: '3110000000' } } })
    iniciarSesionComo(USUARIOS.paciente, 'perfil')
    render(<Aplicacion />)

    const telefono = await screen.findByLabelText('Teléfono')
    await userEvent.clear(telefono)
    await userEvent.type(telefono, '3110000000')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Datos actualizados')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Actual'), 'clave-actual-1')
    await userEvent.type(screen.getByLabelText('Nueva'), 'Clave-Nueva-2026')
    await userEvent.type(screen.getByLabelText('Repetir nueva'), 'Otra-Distinta-2026')
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
    expect(await screen.findByText('Las contraseñas nuevas no coinciden.')).toBeInTheDocument()
  })

  it('la campana lista las notificaciones y las marca como leídas', async () => {
    const llamadas = simularApi({
      'GET /notificaciones/contador/': { estado: 200, cuerpo: { no_leidas: 1 } },
      'GET /notificaciones/': {
        estado: 200,
        cuerpo: { no_leidas: 1, resultados: [{ id_notificacion: 1, tipo: 'CITA', titulo: 'Cita agendada', mensaje: 'Pediatría', destino: 'mis-citas', leida: false, creada_en: new Date().toISOString() }] },
      },
      'POST /notificaciones/marcar-todas/': { estado: 200, cuerpo: { actualizadas: 1 } },
      'GET /medicos/especialidades/': { estado: 200, cuerpo: [] },
    })
    iniciarSesionComo(USUARIOS.paciente, 'agendar')
    render(<Aplicacion />)

    await userEvent.click(await screen.findByRole('button', { name: 'Notificaciones: 1 sin leer' }))
    expect(await screen.findByText('Cita agendada')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Marcar todas' }))

    expect(llamadas.some((l) => l.ruta === '/notificaciones/marcar-todas/')).toBe(true)
    expect(screen.getByRole('button', { name: 'Notificaciones' })).toBeInTheDocument()
  })
})

describe('Médico', () => {
  it('ve su agenda y registra la atención de una cita (CU-04)', async () => {
    const llamadas = simularApi({
      ...CONTADOR,
      'GET /medicos/agenda/': {
        estado: 200,
        cuerpo: {
          fecha: '2000-01-03',
          franjas: [
            { hora: '08:00', estado: 'cita', cita: { id_cita: 7, paciente: 'Ana Rojas', documento: 'CC 1', estado: 'Agendada' }, bloqueo: null },
            { hora: '08:20', estado: 'bloqueada', cita: null, bloqueo: { id_bloqueo: 1, motivo: 'Junta médica' } },
          ],
          resumen: { franjas: 2, citas: 1, agendadas: 1, atendidas: 0, no_asistio: 0, libres: 0, bloqueadas: 1 },
        },
      },
      'PATCH /citas/7/atencion/': { estado: 200, cuerpo: { id_cita: 7, estado: 'Atendida' } },
    })
    iniciarSesionComo(USUARIOS.doctor, 'agenda')
    render(<Aplicacion />)

    expect(await screen.findByText('Ana Rojas')).toBeInTheDocument()
    expect(screen.getByText('Junta médica')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Atendida' }))

    expect(await screen.findByText('Atención registrada')).toBeInTheDocument()
    expect(llamadas.find((l) => l.ruta === '/citas/7/atencion/').cuerpo).toEqual({ estado: 'Atendida' })
  })

  it('crea un bloqueo que avisa las citas afectadas y quita otro con confirmación (REQ-05)', async () => {
    const llamadas = simularApi({
      ...CONTADOR,
      'GET /medicos/bloqueos/': { estado: 200, cuerpo: [{ id_bloqueo: 1, fecha: '2099-01-10', hora_inicio: '07:00', hora_fin: '08:00', motivo: 'Capacitación' }] },
      'POST /medicos/bloqueos/': { estado: 201, cuerpo: { id_bloqueo: 2, citas_existentes_en_intervalo: 1, citas_afectadas: [{ id_cita: 9, hora: '09:20', paciente: 'Ana Rojas' }] } },
      'DELETE /medicos/bloqueos/1/': { estado: 204 },
    })
    iniciarSesionComo(USUARIOS.doctor, 'bloqueos')
    render(<Aplicacion />)

    fireEvent.change(await screen.findByLabelText('Fecha'), { target: { value: '2099-01-11' } })
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '10:00' } })
    await userEvent.type(screen.getByLabelText('Motivo'), 'Incapacidad')
    await userEvent.click(screen.getByRole('button', { name: 'Bloquear' }))
    expect(await screen.findByText(/1 cita\(s\) siguen activas/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Quitar' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sí, quitar' }))
    expect(await screen.findByText('Bloqueo eliminado')).toBeInTheDocument()
    expect(llamadas.some((l) => l.metodo === 'DELETE' && l.ruta === '/medicos/bloqueos/1/')).toBe(true)
  })
})
