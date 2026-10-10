// Pantallas del administrador con la aplicación completa y la API simulada.
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import Aplicacion from '../Aplicacion.jsx'
import { CONTADOR, iniciarSesionComo, simularApi, USUARIOS } from './apoyo.js'

const MEDICO = {
  id_usuario: 8, username: 'medico3', rol: 'DOCTOR', activo: true, nombres: 'Laura', apellidos: 'Gómez',
  perfil: { id_doctor: 3, especialidad: 'Pediatría', registro_medico: 'RM-3', id_especialidad: 1 }, ultimo_acceso: null,
}
const PACIENTE = {
  id_usuario: 9, username: 'paciente1', rol: 'PACIENTE', activo: true, nombres: 'Ana', apellidos: 'Rojas',
  perfil: { tipo_documento: 'CC', numero_documento: '900000001', telefono: '3000000000' }, ultimo_acceso: null,
}
const CITA = {
  id_cita: 9, id_doctor: 3, doctor: 'Laura Gómez', especialidad: 'Pediatría', fecha: '2099-01-12', hora: '08:00',
  estado: 'Agendada', paciente: 'Ana Rojas', documento_paciente: 'CC 900000001',
}

describe('Administrador', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:prueba')
    URL.revokeObjectURL = vi.fn()
  })

  it('el resumen muestra los indicadores y lleva al simulador', async () => {
    simularApi({
      ...CONTADOR,
      'GET /administracion/resumen/': {
        estado: 200,
        cuerpo: { citas_hoy: 4, citas_proximos_7_dias: 12, cancelaciones_ultimos_30_dias: 3, accesos_denegados_ultimos_7_dias: 1, pacientes: 30, medicos_activos: 6, especialidades: 4, usuarios_inactivos: 0 },
      },
      'GET /simulacion/': { estado: 200, cuerpo: [] },
    })
    iniciarSesionComo(USUARIOS.admin, 'resumen')
    render(<Aplicacion />)

    expect(await screen.findByText('Citas hoy')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Simulador de concurrencia' }))
    expect(await screen.findByRole('button', { name: 'Iniciar simulación' })).toBeInTheDocument()
  })

  it('crea un usuario y desactiva otro con confirmación', async () => {
    const llamadas = simularApi({
      ...CONTADOR,
      'GET /administracion/usuarios/': { estado: 200, cuerpo: [PACIENTE] },
      'GET /administracion/especialidades/': { estado: 200, cuerpo: [{ id_especialidad: 1, nombre: 'Pediatría' }] },
      'POST /administracion/usuarios/': { estado: 201, cuerpo: PACIENTE },
      'PATCH /administracion/usuarios/9/': { estado: 200, cuerpo: { ...PACIENTE, activo: false } },
    })
    iniciarSesionComo(USUARIOS.admin, 'usuarios')
    render(<Aplicacion />)

    expect(await screen.findByText('Ana Rojas')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Nuevo' }))
    const dialogo = screen.getByRole('dialog')
    await userEvent.type(within(dialogo).getByLabelText('Usuario'), 'nuevo')
    await userEvent.type(within(dialogo).getByLabelText('Contraseña inicial'), 'Clave-Segura-2026')
    await userEvent.type(within(dialogo).getByLabelText('Nombres'), 'María')
    await userEvent.type(within(dialogo).getByLabelText('Apellidos'), 'López')
    await userEvent.type(within(dialogo).getByLabelText('Número de documento'), '123')
    await userEvent.type(within(dialogo).getByLabelText('Teléfono'), '3001234567')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Usuario creado')).toBeInTheDocument()
    expect(llamadas.find((l) => l.metodo === 'POST').cuerpo).toMatchObject({ username: 'nuevo', rol: 'PACIENTE', numero_documento: '123' })

    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Desactivar' }))
    expect(await screen.findByText('paciente1 desactivado')).toBeInTheDocument()
  })

  it('gestiona especialidades e informa cuando no se puede eliminar', async () => {
    const llamadas = simularApi({
      ...CONTADOR,
      'GET /administracion/especialidades/': { estado: 200, cuerpo: [{ id_especialidad: 1, nombre: 'Pediatría' }] },
      'POST /administracion/especialidades/': { estado: 201, cuerpo: { id_especialidad: 2, nombre: 'Dermatología' } },
      'DELETE /administracion/especialidades/1/': { estado: 409, cuerpo: { detail: 'No se puede eliminar: hay médicos con esta especialidad.' } },
    })
    iniciarSesionComo(USUARIOS.admin, 'especialidades')
    render(<Aplicacion />)

    await userEvent.type(await screen.findByLabelText('Nueva especialidad'), 'Dermatología')
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(await screen.findByText('Especialidad creada')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByText('No se puede eliminar: hay médicos con esta especialidad.')).toBeInTheDocument()
    expect(llamadas.some((l) => l.metodo === 'DELETE')).toBe(true)
  })

  it('edita el horario de un médico', async () => {
    const llamadas = simularApi({
      ...CONTADOR,
      'GET /administracion/usuarios/': { estado: 200, cuerpo: [MEDICO] },
      'GET /administracion/medicos/3/horario/': { estado: 200, cuerpo: { bloques: [] } },
      'PUT /administracion/medicos/3/horario/': (cuerpo) => ({ estado: 200, cuerpo }),
    })
    iniciarSesionComo(USUARIOS.admin, 'horarios')
    render(<Aplicacion />)

    await userEvent.click(await screen.findByRole('radio', { name: 'Laura Gómez: Pediatría' }))
    expect(await screen.findByText('Sin horario')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Agregar bloque' }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar horario' }))

    expect(await screen.findByText('Horario guardado')).toBeInTheDocument()
    expect(llamadas.find((l) => l.metodo === 'PUT').cuerpo.bloques).toHaveLength(1)
  })

  it('lista citas, exporta a CSV y cancela con confirmación', async () => {
    const llamadas = simularApi({
      ...CONTADOR,
      'GET /administracion/citas/': { estado: 200, cuerpo: { count: 1, results: [CITA] } },
      'GET /administracion/usuarios/': { estado: 200, cuerpo: [MEDICO] },
      'GET /administracion/citas/exportar/': { estado: 200, cabeceras: { 'Content-Disposition': 'attachment; filename="citas.csv"' } },
      'PATCH /citas/9/cancelar/': { estado: 200, cuerpo: { ...CITA, estado: 'Cancelada' } },
    })
    iniciarSesionComo(USUARIOS.admin, 'citas')
    render(<Aplicacion />)

    expect(await screen.findByText('Ana Rojas')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'CSV' }))
    expect(URL.createObjectURL).toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar cita' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sí, cancelar' }))
    expect(await screen.findByText('Cita cancelada. Se notificó al paciente.')).toBeInTheDocument()
    expect(llamadas.some((l) => l.ruta === '/citas/9/cancelar/')).toBe(true)
  })

  it('muestra el reporte de ocupación con sus totales (CU-05)', async () => {
    const fila = { franjas_ofertadas: 100, agendadas: 10, atendidas: 5, no_asistio: 1, canceladas: 2, porcentaje_ocupacion: 16 }
    simularApi({
      ...CONTADOR,
      'GET /administracion/reportes/ocupacion/': {
        estado: 200,
        cuerpo: { desde: '2026-10-01', hasta: '2026-10-31', medicos: [{ id_doctor: 3, doctor: 'Laura Gómez', especialidad: 'Pediatría', activo: true, ...fila }], totales: fila },
      },
    })
    iniciarSesionComo(USUARIOS.admin, 'reporte')
    render(<Aplicacion />)

    expect(await screen.findByText('Laura Gómez')).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: '16 % de ocupación' }).length).toBeGreaterThan(0)
  })

  it('muestra la auditoría con operaciones legibles', async () => {
    simularApi({
      ...CONTADOR,
      'GET /administracion/auditoria/': {
        estado: 200,
        cuerpo: { count: 1, results: [{ id_auditoria: 1, fecha: '2026-10-09T15:00:00Z', usuario: 'admin', operacion: 'CREAR_USUARIO', tabla: 'usuarios', id_registro: 5, resultado: 'DENEGADO', detalle: 'rol=PACIENTE' }] },
      },
    })
    iniciarSesionComo(USUARIOS.admin, 'auditoria')
    render(<Aplicacion />)

    expect(await screen.findByText('crear usuario')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('DENEGADO')).toBeInTheDocument()
  })

  it('lanza una simulación y muestra el resultado y los registros en vivo', async () => {
    const terminada = {
      id_simulacion: 4, tipo: 'RAFAGA', parametros: { usuarios: 3, proteccion: true }, estado: 'TERMINADA',
      resultados: {
        solicitudes: 3, exitos: 1, conflictos: 2, errores: 0, ops_por_segundo: 10, latencia_ms: { p50: 50, p95: 90, max: 95 },
        bd: { conexiones_max: 5, esperas_bloqueo_max: 2 }, latencias: [20, 50, 90], resultados_por_solicitud: ['exito', 'conflicto', 'conflicto'],
        integridad: { reservas_en_la_franja: 1, sobreagendamiento: false }, serie: [],
      },
    }
    const llamadas = simularApi({
      ...CONTADOR,
      'GET /simulacion/': { estado: 200, cuerpo: [] },
      'POST /simulacion/': { estado: 202, cuerpo: { ...terminada, estado: 'EN_CURSO', resultados: {} } },
      'GET /simulacion/4/': {
        estado: 200,
        cuerpo: { simulacion: terminada, eventos: [{ id_evento: 1, momento: '2026-10-09T15:00:00Z', nivel: 'OK', mensaje: 'Paciente 1: reserva registrada' }] },
      },
    })
    iniciarSesionComo(USUARIOS.admin, 'simulador')
    render(<Aplicacion />)

    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar simulación' }))

    expect(await screen.findByText(/reserva\(s\) para una sola franja/, {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByText('Paciente 1: reserva registrada')).toBeInTheDocument()
    expect(screen.getByText('Reservó')).toBeInTheDocument()
    expect(llamadas.find((l) => l.metodo === 'POST').cuerpo).toEqual({ tipo: 'RAFAGA', usuarios: 30, proteccion: true })
  })
})
