// Pantalla "Mis citas": lista, cancelación y reprogramación (CU-03, REQ-04).
import { useState } from 'react'

import MensajeError from '../componentes/MensajeError.jsx'
import { usarMisCitas } from '../controladores/usarMisCitas.js'
import { formatearFecha } from '../utilidades/fechas.js'
import PanelReprogramar from './PanelReprogramar.jsx'

export default function VistaMisCitas() {
  const { citas, error, mensaje, cancelar, alReprogramar } = usarMisCitas()
  const [enReprogramacion, setEnReprogramacion] = useState(null)

  return (
    <section className="tarjeta">
      <h2>Mis citas</h2>
      <MensajeError error={error} />
      {mensaje && (
        <p className="mensaje mensaje--exito" role="status">
          {mensaje}
        </p>
      )}

      {enReprogramacion && (
        <PanelReprogramar
          key={enReprogramacion.id_cita}
          cita={enReprogramacion}
          alCerrar={() => setEnReprogramacion(null)}
          alTerminar={(nueva) => {
            setEnReprogramacion(null)
            alReprogramar(nueva)
          }}
        />
      )}

      {citas === null && !error && <p>Cargando…</p>}
      {citas?.length === 0 && <p>Aún no tiene citas.</p>}
      {citas?.length > 0 && (
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Especialidad</th>
              <th>Médico</th>
              <th>Estado</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {citas.map((cita) => (
              <tr key={cita.id_cita}>
                <td>{formatearFecha(cita.fecha)}</td>
                <td>{cita.hora}</td>
                <td>{cita.especialidad}</td>
                <td>{cita.doctor}</td>
                <td>
                  <span className={`estado estado--${cita.estado.replace(' ', '-').toLowerCase()}`}>{cita.estado}</span>
                </td>
                <td className="acciones">
                  {cita.estado === 'Agendada' && (
                    <>
                      <button type="button" className="boton boton--secundario" onClick={() => setEnReprogramacion(cita)}>
                        Reprogramar
                      </button>
                      <button type="button" className="boton boton--peligro" onClick={() => cancelar(cita.id_cita)}>
                        Cancelar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
