// Ventana para reprogramar una cita: mismo médico u otro de la misma especialidad (CU-03, REQ-04).
import { useEffect, useState } from 'react'
import { CalendarSearch, Repeat, UserRound } from 'lucide-react'

import Avatar from '../componentes/Avatar.jsx'
import Boton from '../componentes/Boton.jsx'
import Dialogo from '../componentes/Dialogo.jsx'
import { Cargando, Vacio } from '../componentes/Estados.jsx'
import MensajeError from '../componentes/MensajeError.jsx'
import SelectorDias from '../componentes/SelectorDias.jsx'
import SelectorFranjas from '../componentes/SelectorFranjas.jsx'
import SelectorTarjetas from '../componentes/SelectorTarjetas.jsx'
import SugerenciaFranja from '../componentes/SugerenciaFranja.jsx'
import { reprogramarCita } from '../servicios/citasServicio.js'
import { consultarDisponibilidad, listarDoctores } from '../servicios/medicosServicio.js'
import { formatearFecha } from '../utilidades/fechas.js'

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
    consultarDisponibilidad(idDoctor, fecha).then((r) => setFranjas(r.franjas)).catch(setError)
  }, [idDoctor, fecha])

  async function confirmar(destino) {
    setOcupado(true)
    setError(null)
    setSugerencia(null)
    try {
      alTerminar(await reprogramarCita(cita.id_cita, destino))
    } catch (e) {
      setError(e)
      if (e.estado === 409) setSugerencia(e.datos?.sugerencia ?? null)
      setOcupado(false)
    }
  }

  return (
    <Dialogo titulo="Reprogramar cita" alCerrar={alCerrar} ancho>
      <div className="tarjeta__titulo">
        <Repeat size={22} />
        <h2>Reprogramar</h2>
      </div>
      <p className="texto-suave">
        Actual: {formatearFecha(cita.fecha)} · {cita.hora} con {cita.doctor}
      </p>

      {doctores.length > 1 && (
        <div className="grupo-franjas">
          <span className="grupo-franjas__titulo">
            <UserRound size={16} /> Médico
          </span>
          <SelectorTarjetas
            etiqueta="Médico"
            valor={idDoctor}
            alElegir={setIdDoctor}
            opciones={doctores.map((d) => {
              const nombre = `${d.nombres} ${d.apellidos}`
              return { valor: d.id_doctor, titulo: nombre, figura: <Avatar nombre={nombre} /> }
            })}
          />
        </div>
      )}

      <SelectorDias valor={fecha} alElegir={setFecha} />
      {franjas === null ? (
        <Cargando texto="Buscando horarios…" />
      ) : franjas.length === 0 ? (
        <Vacio icono={CalendarSearch}>Sin horarios libres este día.</Vacio>
      ) : (
        <SelectorFranjas franjas={franjas} valor={hora} alElegir={setHora} />
      )}

      <MensajeError error={error} />
      <SugerenciaFranja
        sugerencia={sugerencia}
        ocupado={ocupado}
        alAceptar={(s) => confirmar({ fecha: s.fecha, hora: s.hora, idDoctor: s.id_doctor })}
      />

      <div className="acciones">
        <Boton icono={Repeat} disabled={!hora} cargando={ocupado} onClick={() => confirmar({ fecha, hora, idDoctor })}>
          {hora ? `Mover a las ${hora}` : 'Elige una hora'}
        </Boton>
        <Boton variante="fantasma" onClick={alCerrar}>
          Cancelar
        </Boton>
      </div>
    </Dialogo>
  )
}
