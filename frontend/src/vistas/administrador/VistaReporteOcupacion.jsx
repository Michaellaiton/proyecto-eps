// Reporte de ocupación por médico en un rango de fechas (CU-05).
import { useState } from 'react'
import { BarChart3, CalendarCheck, CalendarX, Download, Gauge, Grid3x3 } from 'lucide-react'

import Boton from '../../componentes/Boton.jsx'
import Campo from '../../componentes/Campo.jsx'
import { Cargando } from '../../componentes/Estados.jsx'
import MensajeError from '../../componentes/MensajeError.jsx'
import TarjetaIndicador from '../../componentes/TarjetaIndicador.jsx'
import { usarAvisos } from '../../controladores/ContextoAvisos.jsx'
import { usarConsulta } from '../../controladores/usarConsulta.js'
import { consultarReporteOcupacion, exportarOcupacion } from '../../servicios/administracionServicio.js'
import { rangoMesActual } from '../../utilidades/fechas.js'

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
  const [exportando, setExportando] = useState(false)
  const avisar = usarAvisos()
  const reporte = usarConsulta(() => consultarReporteOcupacion(aplicado.desde, aplicado.hasta), [aplicado])
  const r = reporte.datos

  async function exportar() {
    setExportando(true)
    try {
      await exportarOcupacion(aplicado.desde, aplicado.hasta)
    } catch (e) {
      avisar.error(e)
    } finally {
      setExportando(false)
    }
  }

  return (
    <>
      <section className="tarjeta">
        <form
          className="filtros"
          onSubmit={(e) => {
            e.preventDefault()
            setAplicado(rango)
          }}
        >
          <Campo id="reporte-desde" etiqueta="Desde" type="date" value={rango.desde} onChange={(e) => setRango({ ...rango, desde: e.target.value })} required />
          <Campo id="reporte-hasta" etiqueta="Hasta" type="date" value={rango.hasta} onChange={(e) => setRango({ ...rango, hasta: e.target.value })} required />
          <Boton type="submit" icono={BarChart3}>
            Generar
          </Boton>
          <Boton variante="secundario" icono={Download} cargando={exportando} disabled={!r} onClick={exportar}>
            Exportar CSV
          </Boton>
        </form>
        <MensajeError error={reporte.error} />
        {r && !reporte.cargando && (
          <div className="indicadores">
            <TarjetaIndicador titulo="Ocupación total" valor={`${r.totales.porcentaje_ocupacion.toLocaleString('es-CO')} %`} icono={Gauge} />
            <TarjetaIndicador titulo="Franjas ofrecidas" valor={r.totales.franjas_ofertadas} icono={Grid3x3} variante="info" />
            <TarjetaIndicador titulo="Atendidas" valor={r.totales.atendidas} icono={CalendarCheck} />
            <TarjetaIndicador titulo="Canceladas" valor={r.totales.canceladas} icono={CalendarX} variante="aviso" />
          </div>
        )}
      </section>

      <section className="tarjeta">
        {reporte.cargando ? (
          <Cargando texto="Generando reporte…" />
        ) : (
          r && (
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Médico</th>
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
                      <td>
                        <strong>{m.doctor}</strong>
                        <div className="texto-suave">{m.especialidad}</div>
                      </td>
                      <td>{m.franjas_ofertadas}</td>
                      <td>{m.agendadas}</td>
                      <td>{m.atendidas}</td>
                      <td>{m.no_asistio}</td>
                      <td>{m.canceladas}</td>
                      <td>
                        <BarraOcupacion porcentaje={m.porcentaje_ocupacion} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Total</th>
                    <th>{r.totales.franjas_ofertadas}</th>
                    <th>{r.totales.agendadas}</th>
                    <th>{r.totales.atendidas}</th>
                    <th>{r.totales.no_asistio}</th>
                    <th>{r.totales.canceladas}</th>
                    <th>
                      <BarraOcupacion porcentaje={r.totales.porcentaje_ocupacion} />
                    </th>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        )}
      </section>
    </>
  )
}
