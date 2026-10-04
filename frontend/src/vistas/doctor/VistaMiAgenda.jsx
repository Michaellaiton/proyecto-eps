// Agenda del día del médico: franjas libres, bloqueadas y citas, con registro de atención (CU-04).
import { useState } from 'react'

import MensajeError from '../../componentes/MensajeError.jsx'
import TarjetaIndicador from '../../componentes/TarjetaIndicador.jsx'
import { usarConsulta } from '../../controladores/usarConsulta.js'
import { consultarMiAgenda, registrarAtencion } from '../../servicios/medicoServicio.js'
import { formatearFecha, hoyIso, sumarDias, yaLlego } from '../../utilidades/fechas.js'

const TEXTO_ESTADO_FRANJA = { libre: 'Libre', bloqueada: 'Bloqueada' }

export default function VistaMiAgenda() {
  const [fecha, setFecha] = useState(hoyIso)
  const [errorAccion, setErrorAccion] = useState(null)
  const agenda = usarConsulta(() => consultarMiAgenda(fecha), [fecha])
  const a = agenda.datos

  async function registrar(idCita, estado) {
    setErrorAccion(null)
    try {
      await registrarAtencion(idCita, estado)
      agenda.recargar()
    } catch (e) {
      setErrorAccion(e)
    }
  }

  return (
    <section className="tarjeta">
      <div className="encabezado">
        <h2>Mi agenda</h2>
        <div className="acciones">
          <button type="button" className="boton boton--secundario" onClick={() => setFecha((f) => sumarDias(f, -1))}>
            ← Día anterior
          </button>
          <button type="button" className="boton boton--secundario" onClick={() => setFecha(hoyIso())}>
            Hoy
          </button>
          <button type="button" className="boton boton--secundario" onClick={() => setFecha((f) => sumarDias(f, 1))}>
            Día siguiente →
          </button>
          <input aria-label="Fecha de la agenda" type="date" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} />
        </div>
      </div>
      <p className="subtitulo">{formatearFecha(fecha)}</p>

      <MensajeError error={agenda.error || errorAccion} />
      {agenda.cargando && <p>Cargando…</p>}
      {a && !agenda.cargando && (
        <>
          <div className="indicadores">
            <TarjetaIndicador titulo="Citas" valor={a.resumen.citas} />
            <TarjetaIndicador titulo="Por atender" valor={a.resumen.agendadas} />
            <TarjetaIndicador titulo="Atendidas" valor={a.resumen.atendidas} />
            <TarjetaIndicador titulo="No asistió" valor={a.resumen.no_asistio} />
            <TarjetaIndicador titulo="Franjas libres" valor={a.resumen.libres} />
            <TarjetaIndicador titulo="Bloqueadas" valor={a.resumen.bloqueadas} />
          </div>

          {a.franjas.length === 0 ? (
            <p>No tiene horario de atención este día.</p>
          ) : (
            <table className="tabla">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Estado</th>
                  <th>Paciente</th>
                  <th>Documento</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {a.franjas.map((f) => (
                  <tr key={f.hora} className={f.estado === 'cita' ? '' : 'fila--inactiva'}>
                    <td>
                      <strong>{f.hora}</strong>
                    </td>
                    <td>
                      {f.cita ? (
                        <span className={`estado estado--${f.cita.estado.replace(' ', '-').toLowerCase()}`}>{f.cita.estado}</span>
                      ) : (
                        <span className="estado">{TEXTO_ESTADO_FRANJA[f.estado]}</span>
                      )}
                    </td>
                    <td>{f.cita?.paciente ?? (f.bloqueo ? `Bloqueo: ${f.bloqueo.motivo}` : '—')}</td>
                    <td>{f.cita?.documento ?? ''}</td>
                    <td className="acciones">
                      {f.cita?.estado === 'Agendada' &&
                        (yaLlego(a.fecha, f.hora) ? (
                          <>
                            <button type="button" className="boton boton--secundario" onClick={() => registrar(f.cita.id_cita, 'Atendida')}>
                              Atendida
                            </button>
                            <button type="button" className="boton boton--peligro" onClick={() => registrar(f.cita.id_cita, 'No asistio')}>
                              No asistió
                            </button>
                          </>
                        ) : (
                          <small>Pendiente</small>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  )
}
