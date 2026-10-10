// Todas las citas del sistema con filtros; el administrador puede cancelar cualquiera (CU-03).
import { useState } from 'react'
import { CalendarRange, CalendarX, Download, Filter, Search } from 'lucide-react'

import Avatar from '../../componentes/Avatar.jsx'
import Boton from '../../componentes/Boton.jsx'
import Campo from '../../componentes/Campo.jsx'
import CampoSeleccion from '../../componentes/CampoSeleccion.jsx'
import { DialogoConfirmacion } from '../../componentes/Dialogo.jsx'
import { Cargando, Vacio } from '../../componentes/Estados.jsx'
import { EstadoCita } from '../../componentes/Insignia.jsx'
import MensajeError from '../../componentes/MensajeError.jsx'
import Paginacion from '../../componentes/Paginacion.jsx'
import { usarAvisos } from '../../controladores/ContextoAvisos.jsx'
import { usarConsulta } from '../../controladores/usarConsulta.js'
import { exportarCitas, listarCitasAdmin, listarUsuarios } from '../../servicios/administracionServicio.js'
import { cancelarCita } from '../../servicios/citasServicio.js'
import { formatearFecha } from '../../utilidades/fechas.js'

const ESTADOS = [
  { valor: 'Agendada', texto: 'Agendada' },
  { valor: 'Cancelada', texto: 'Cancelada' },
  { valor: 'Atendida', texto: 'Atendida' },
  { valor: 'No asistio', texto: 'No asistió' },
]
const FILTROS_VACIOS = { desde: '', hasta: '', id_doctor: '', estado: '', buscar: '' }

export default function VistaCitasAdmin() {
  const avisar = usarAvisos()
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [aplicados, setAplicados] = useState(FILTROS_VACIOS)
  const [pagina, setPagina] = useState(1)
  const [porCancelar, setPorCancelar] = useState(null)
  const [exportando, setExportando] = useState(false)
  const citas = usarConsulta(() => listarCitasAdmin({ ...aplicados, pagina }), [aplicados, pagina])
  const { datos: medicos } = usarConsulta(() => listarUsuarios({ rol: 'DOCTOR' }))

  const fijar = (campo) => (valor) => setFiltros((f) => ({ ...f, [campo]: valor }))

  async function exportar() {
    setExportando(true)
    try {
      await exportarCitas(aplicados)
    } catch (e) {
      avisar.error(e)
    } finally {
      setExportando(false)
    }
  }

  async function cancelar() {
    try {
      await cancelarCita(porCancelar.id_cita)
      avisar.exito('Cita cancelada. Se notificó al paciente.')
      citas.recargar()
    } catch (e) {
      avisar.error(e)
    } finally {
      setPorCancelar(null)
    }
  }

  return (
    <section className="tarjeta">
      <form
        className="filtros"
        onSubmit={(e) => {
          e.preventDefault()
          setPagina(1)
          setAplicados(filtros)
        }}
      >
        <Campo id="citas-buscar" icono={Search} placeholder="Paciente o documento" aria-label="Paciente" value={filtros.buscar} onChange={(e) => fijar('buscar')(e.target.value)} />
        <Campo id="citas-desde" etiqueta="Desde" type="date" value={filtros.desde} onChange={(e) => fijar('desde')(e.target.value)} />
        <Campo id="citas-hasta" etiqueta="Hasta" type="date" value={filtros.hasta} onChange={(e) => fijar('hasta')(e.target.value)} />
        <CampoSeleccion
          id="citas-medico"
          etiqueta="Médico"
          valor={filtros.id_doctor}
          alCambiar={fijar('id_doctor')}
          textoVacio="Todos"
          opciones={(medicos ?? []).map((m) => ({ valor: m.perfil.id_doctor, texto: `${m.nombres} ${m.apellidos}` }))}
        />
        <CampoSeleccion id="citas-estado" etiqueta="Estado" valor={filtros.estado} alCambiar={fijar('estado')} textoVacio="Todos" opciones={ESTADOS} />
        <Boton type="submit" variante="secundario" icono={Filter}>
          Filtrar
        </Boton>
        <Boton variante="secundario" icono={Download} cargando={exportando} onClick={exportar}>
          CSV
        </Boton>
      </form>

      <MensajeError error={citas.error} />
      {citas.cargando ? (
        <Cargando />
      ) : citas.datos?.count === 0 ? (
        <Vacio icono={CalendarRange} titulo="No hay citas con esos filtros" />
      ) : (
        citas.datos && (
          <>
            <div className="tabla-contenedor">
              <table className="tabla tabla--adaptable">
                <thead>
                  <tr>
                    <th>Fecha y hora</th>
                    <th>Paciente</th>
                    <th>Médico</th>
                    <th>Estado</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {citas.datos.results.map((c) => (
                    <tr key={c.id_cita}>
                      <td>
                        <strong>{c.hora}</strong>
                        <div className="texto-suave">{formatearFecha(c.fecha)}</div>
                      </td>
                      <td>
                        <div className="celda-persona">
                          <Avatar nombre={c.paciente} />
                          <div>
                            {c.paciente}
                            <small>{c.documento_paciente}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {c.doctor}
                        <div className="texto-suave">{c.especialidad}</div>
                      </td>
                      <td>
                        <EstadoCita estado={c.estado} />
                      </td>
                      <td>
                        {c.estado === 'Agendada' && (
                          <Boton variante="fantasma" soloIcono icono={CalendarX} ayuda="Cancelar cita" onClick={() => setPorCancelar(c)} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion pagina={pagina} total={citas.datos.count} alCambiar={setPagina} />
          </>
        )
      )}

      {porCancelar && (
        <DialogoConfirmacion
          titulo="¿Cancelar esta cita?"
          mensaje={`${porCancelar.paciente} · ${formatearFecha(porCancelar.fecha)} a las ${porCancelar.hora}. Se notificará al paciente.`}
          textoConfirmar="Sí, cancelar"
          alConfirmar={cancelar}
          alCerrar={() => setPorCancelar(null)}
        />
      )}
    </section>
  )
}
