// Todas las citas del sistema con filtros; el administrador puede cancelar cualquiera (CU-03).
import { useState } from 'react'

import CampoSeleccion from '../../componentes/CampoSeleccion.jsx'
import MensajeError from '../../componentes/MensajeError.jsx'
import Paginacion from '../../componentes/Paginacion.jsx'
import { usarConsulta } from '../../controladores/usarConsulta.js'
import { listarCitasAdmin, listarUsuarios } from '../../servicios/administracionServicio.js'
import { cancelarCita } from '../../servicios/citasServicio.js'
import { formatearFecha } from '../../utilidades/fechas.js'

const ESTADOS = ['Agendada', 'Cancelada', 'Atendida', 'No asistio']
const FILTROS_VACIOS = { desde: '', hasta: '', id_doctor: '', estado: '', buscar: '' }

export default function VistaCitasAdmin() {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [aplicados, setAplicados] = useState(FILTROS_VACIOS)
  const [pagina, setPagina] = useState(1)
  const [errorAccion, setErrorAccion] = useState(null)
  const citas = usarConsulta(() => listarCitasAdmin({ ...aplicados, pagina }), [aplicados, pagina])
  const { datos: medicos } = usarConsulta(() => listarUsuarios({ rol: 'DOCTOR' }))

  const cambiar = (campo) => (valor) => setFiltros((f) => ({ ...f, [campo]: valor }))

  async function cancelar(idCita) {
    setErrorAccion(null)
    try {
      await cancelarCita(idCita)
      citas.recargar()
    } catch (e) {
      setErrorAccion(e)
    }
  }

  return (
    <section className="tarjeta">
      <h2>Citas</h2>
      <form
        className="filtros"
        onSubmit={(e) => {
          e.preventDefault()
          setPagina(1)
          setAplicados(filtros)
        }}
      >
        <div className="campo">
          <label htmlFor="citas-desde">Desde</label>
          <input id="citas-desde" type="date" value={filtros.desde} onChange={(e) => cambiar('desde')(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="citas-hasta">Hasta</label>
          <input id="citas-hasta" type="date" value={filtros.hasta} onChange={(e) => cambiar('hasta')(e.target.value)} />
        </div>
        <CampoSeleccion
          id="citas-medico"
          etiqueta="Médico"
          valor={filtros.id_doctor}
          alCambiar={cambiar('id_doctor')}
          textoVacio="Todos"
          opciones={(medicos ?? []).map((m) => ({ valor: m.perfil.id_doctor, texto: `${m.nombres} ${m.apellidos}` }))}
        />
        <CampoSeleccion
          id="citas-estado"
          etiqueta="Estado"
          valor={filtros.estado}
          alCambiar={cambiar('estado')}
          textoVacio="Todos"
          opciones={ESTADOS.map((e) => ({ valor: e, texto: e }))}
        />
        <div className="campo">
          <label htmlFor="citas-buscar">Paciente</label>
          <input
            id="citas-buscar"
            placeholder="Nombre o documento"
            value={filtros.buscar}
            onChange={(e) => cambiar('buscar')(e.target.value)}
          />
        </div>
        <button type="submit" className="boton">Filtrar</button>
      </form>

      <MensajeError error={citas.error || errorAccion} />
      {citas.cargando && <p>Cargando…</p>}
      {citas.datos && (
        <>
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Paciente</th>
                <th>Médico</th>
                <th>Especialidad</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {citas.datos.results.map((c) => (
                <tr key={c.id_cita}>
                  <td>{formatearFecha(c.fecha)}</td>
                  <td>{c.hora}</td>
                  <td>
                    {c.paciente}
                    <br />
                    <small>{c.documento_paciente}</small>
                  </td>
                  <td>{c.doctor}</td>
                  <td>{c.especialidad}</td>
                  <td>
                    <span className={`estado estado--${c.estado.replace(' ', '-').toLowerCase()}`}>{c.estado}</span>
                  </td>
                  <td>
                    {c.estado === 'Agendada' && (
                      <button type="button" className="boton boton--secundario" onClick={() => cancelar(c.id_cita)}>
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {citas.datos.count === 0 && <p>No hay citas con esos filtros.</p>}
          <Paginacion pagina={pagina} total={citas.datos.count} alCambiar={setPagina} />
        </>
      )}
    </section>
  )
}
