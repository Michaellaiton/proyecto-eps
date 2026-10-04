// Reporte de ocupación por médico en un rango de fechas (CU-05).
import { useState } from 'react'

import MensajeError from '../../componentes/MensajeError.jsx'
import { usarConsulta } from '../../controladores/usarConsulta.js'
import { consultarReporteOcupacion } from '../../servicios/administracionServicio.js'
import { formatearFecha, rangoMesActual } from '../../utilidades/fechas.js'

function BarraOcupacion({ porcentaje }) {
  return (
    <div className="barra-ocupacion" role="img" aria-label={`${porcentaje} % de ocupación`}>
      <div className="barra-ocupacion__relleno" style={{ width: `${Math.min(porcentaje, 100)}%` }} />
      <span>{porcentaje.toLocaleString('es-CO')} %</span>
    </div>
  )
}

export default function VistaReporteOcupacion() {
  const [rango, setRango] = useState(rangoMesActual)
  const [aplicado, setAplicado] = useState(rango)
  const reporte = usarConsulta(() => consultarReporteOcupacion(aplicado.desde, aplicado.hasta), [aplicado])
  const r = reporte.datos

  return (
    <section className="tarjeta">
      <h2>Reporte de ocupación</h2>
      <form
        className="filtros"
        onSubmit={(e) => {
          e.preventDefault()
          setAplicado(rango)
        }}
      >
        <div className="campo">
          <label htmlFor="reporte-desde">Desde</label>
          <input id="reporte-desde" type="date" value={rango.desde} onChange={(e) => setRango({ ...rango, desde: e.target.value })} required />
        </div>
        <div className="campo">
          <label htmlFor="reporte-hasta">Hasta</label>
          <input id="reporte-hasta" type="date" value={rango.hasta} onChange={(e) => setRango({ ...rango, hasta: e.target.value })} required />
        </div>
        <button type="submit" className="boton">Generar</button>
      </form>

      <MensajeError error={reporte.error} />
      {reporte.cargando && <p>Generando…</p>}
      {r && !reporte.cargando && (
        <>
          <p className="subtitulo">
            Del {formatearFecha(r.desde)} al {formatearFecha(r.hasta)}. Ocupación = citas no canceladas / franjas del horario.
          </p>
          <table className="tabla">
            <thead>
              <tr>
                <th>Médico</th>
                <th>Especialidad</th>
                <th>Franjas</th>
                <th>Agendadas</th>
                <th>Atendidas</th>
                <th>No asistió</th>
                <th>Canceladas</th>
                <th>Ocupación</th>
              </tr>
            </thead>
            <tbody>
              {r.medicos.map((m) => (
                <tr key={m.id_doctor} className={m.activo ? '' : 'fila--inactiva'}>
                  <td>{m.doctor}</td>
                  <td>{m.especialidad}</td>
                  <td>{m.franjas_ofertadas}</td>
                  <td>{m.agendadas}</td>
                  <td>{m.atendidas}</td>
                  <td>{m.no_asistio}</td>
                  <td>{m.canceladas}</td>
                  <td><BarraOcupacion porcentaje={m.porcentaje_ocupacion} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={2}>Total</th>
                <th>{r.totales.franjas_ofertadas}</th>
                <th>{r.totales.agendadas}</th>
                <th>{r.totales.atendidas}</th>
                <th>{r.totales.no_asistio}</th>
                <th>{r.totales.canceladas}</th>
                <th><BarraOcupacion porcentaje={r.totales.porcentaje_ocupacion} /></th>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </section>
  )
}
