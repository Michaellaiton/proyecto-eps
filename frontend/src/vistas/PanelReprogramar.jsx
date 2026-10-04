// Panel para reprogramar una cita: mismo médico u otro de la misma especialidad (CU-03, REQ-04).
import { useEffect, useState } from 'react'

import CampoSeleccion from '../componentes/CampoSeleccion.jsx'
import MensajeError from '../componentes/MensajeError.jsx'
import SugerenciaFranja from '../componentes/SugerenciaFranja.jsx'
import { reprogramarCita } from '../servicios/citasServicio.js'
import { consultarDisponibilidad, listarDoctores } from '../servicios/medicosServicio.js'
import { formatearFecha, hoyIso } from '../utilidades/fechas.js'

export default function PanelReprogramar({ cita, alTerminar, alCerrar }) {
  const [doctores, setDoctores] = useState([])
  const [idDoctor, setIdDoctor] = useState(String(cita.id_doctor))
  const [fecha, setFecha] = useState(cita.fecha)
  const [franjas, setFranjas] = useState(null)
  const [hora, setHora] = useState('')
  const [sugerencia, setSugerencia] = useState(null)
  const [error, setError] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    listarDoctores(cita.id_especialidad).then(setDoctores).catch(setError)
  }, [cita.id_especialidad])

  useEffect(() => {
    setFranjas(null)
    setHora('')
    setSugerencia(null)
    if (!idDoctor || !fecha) return
    consultarDisponibilidad(idDoctor, fecha).then((r) => setFranjas(r.franjas)).catch(setError)
  }, [idDoctor, fecha])

  async function confirmar(destino) {
    setOcupado(true)
    setError(null)
    setSugerencia(null)
    try {
      const nueva = await reprogramarCita(cita.id_cita, destino)
      alTerminar(nueva)
    } catch (e) {
      setError(e)
      if (e.estado === 409) setSugerencia(e.datos?.sugerencia ?? null)
      setOcupado(false)
    }
  }

  return (
    <div className="tarjeta tarjeta--resaltada">
      <h3>Reprogramar cita</h3>
      <p className="subtitulo">
        Actual: {cita.especialidad} con {cita.doctor}, {formatearFecha(cita.fecha)} a las {cita.hora}.
      </p>

      <div className="rejilla">
        <CampoSeleccion
          id="reprogramar-doctor"
          etiqueta="Médico"
          valor={idDoctor}
          alCambiar={setIdDoctor}
          textoVacio="Seleccione un médico"
          opciones={doctores.map((d) => ({ valor: String(d.id_doctor), texto: `${d.nombres} ${d.apellidos}` }))}
        />
        <div className="campo">
          <label htmlFor="reprogramar-fecha">Nueva fecha</label>
          <input id="reprogramar-fecha" type="date" min={hoyIso()} value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
      </div>

      {franjas && (
        <fieldset className="franjas">
          <legend>Franjas disponibles el {formatearFecha(fecha)}</legend>
          {franjas.length === 0 && <p>No hay franjas disponibles para esta fecha.</p>}
          {franjas.map((h) => (
            <button
              key={h}
              type="button"
              className={`franja ${hora === h ? 'franja--elegida' : ''}`}
              aria-pressed={hora === h}
              onClick={() => setHora(h)}
            >
              {h}
            </button>
          ))}
        </fieldset>
      )}

      <MensajeError error={error} />
      <SugerenciaFranja
        sugerencia={sugerencia}
        ocupado={ocupado}
        alAceptar={(s) => confirmar({ fecha: s.fecha, hora: s.hora, idDoctor: s.id_doctor })}
      />

      <div className="acciones">
        <button type="button" className="boton" disabled={!hora || ocupado} onClick={() => confirmar({ fecha, hora, idDoctor })}>
          {hora ? `Mover la cita a las ${hora}` : 'Elija una franja'}
        </button>
        <button type="button" className="boton boton--secundario" onClick={alCerrar}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
