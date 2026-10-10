// "Mis citas": próximas e historial en tarjetas, con reprogramar y cancelar (CU-03, REQ-04).
import { useState } from 'react'
import { CalendarClock, CalendarPlus, CalendarX, Clock, History, Repeat, UserRound } from 'lucide-react'

import Boton from '../componentes/Boton.jsx'
import { DialogoConfirmacion } from '../componentes/Dialogo.jsx'
import { Cargando, Vacio } from '../componentes/Estados.jsx'
import { EstadoCita } from '../componentes/Insignia.jsx'
import MensajeError from '../componentes/MensajeError.jsx'
import { usarAvisos } from '../controladores/ContextoAvisos.jsx'
import { usarNavegacion } from '../controladores/ContextoNavegacion.jsx'
import { usarMisCitas } from '../controladores/usarMisCitas.js'
import { formatearFecha, formatearFechaCorta } from '../utilidades/fechas.js'
import PanelReprogramar from './PanelReprogramar.jsx'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function TarjetaCita({ cita, alReprogramar, alCancelar }) {
  const [, mes, dia] = cita.fecha.split('-').map(Number)
  // Solo las próximas tienen acciones; una cita pasada sin registrar queda como historial.
  const conAcciones = Boolean(alReprogramar)
  return (
    <article className={`cita ${conAcciones ? '' : 'cita--pasada'}`}>
      <div className="calendario-mini" aria-hidden="true">
        <span className="calendario-mini__mes">{MESES[mes - 1]}</span>
        <span className="calendario-mini__dia">{dia}</span>
      </div>
      <div className="cita__detalle">
        <strong>{cita.especialidad}</strong>
        <div className="cita__linea">
          <span>
            <Clock size={15} /> {formatearFechaCorta(cita.fecha)} · {cita.hora}
          </span>
          <span>
            <UserRound size={15} /> {cita.doctor}
          </span>
        </div>
      </div>
      <EstadoCita estado={cita.estado} />
      {conAcciones && (
        <div className="acciones">
          <Boton variante="secundario" tamano="pequeno" icono={Repeat} onClick={() => alReprogramar(cita)}>
            Reprogramar
          </Boton>
          <Boton variante="peligro" tamano="pequeno" icono={CalendarX} onClick={() => alCancelar(cita)}>
            Cancelar
          </Boton>
        </div>
      )}
    </article>
  )
}

export default function VistaMisCitas() {
  const { citas, proximas, historial, error, cancelar, recargar } = usarMisCitas()
  const { irA } = usarNavegacion()
  const avisar = usarAvisos()
  const [enReprogramacion, setEnReprogramacion] = useState(null)
  const [porCancelar, setPorCancelar] = useState(null)
  const [cancelando, setCancelando] = useState(false)

  async function confirmarCancelacion() {
    setCancelando(true)
    try {
      await cancelar(porCancelar.id_cita)
      avisar.exito('Cita cancelada. El cupo quedó libre.')
      setPorCancelar(null)
    } catch (e) {
      avisar.error(e)
    } finally {
      setCancelando(false)
    }
  }

  if (citas === null && !error) return <Cargando />

  return (
    <>
      <MensajeError error={error} />

      <section className="tarjeta">
        <div className="tarjeta__encabezado">
          <div className="tarjeta__titulo">
            <CalendarClock size={20} />
            <h2>Próximas</h2>
          </div>
          <Boton tamano="pequeno" icono={CalendarPlus} onClick={() => irA('agendar')}>
            Nueva cita
          </Boton>
        </div>
        {proximas.length === 0 ? (
          <Vacio icono={CalendarPlus} titulo="No tienes citas próximas">
            <Boton icono={CalendarPlus} onClick={() => irA('agendar')}>
              Agendar ahora
            </Boton>
          </Vacio>
        ) : (
          <div className="lista-citas">
            {proximas.map((cita) => (
              <TarjetaCita key={cita.id_cita} cita={cita} alReprogramar={setEnReprogramacion} alCancelar={setPorCancelar} />
            ))}
          </div>
        )}
      </section>

      {historial.length > 0 && (
        <section className="tarjeta">
          <div className="tarjeta__titulo">
            <History size={20} />
            <h2>Historial</h2>
          </div>
          <div className="lista-citas">
            {historial.map((cita) => (
              <TarjetaCita key={cita.id_cita} cita={cita} />
            ))}
          </div>
        </section>
      )}

      {enReprogramacion && (
        <PanelReprogramar
          cita={enReprogramacion}
          alCerrar={() => setEnReprogramacion(null)}
          alTerminar={(nueva) => {
            setEnReprogramacion(null)
            avisar.exito(`Cita movida al ${formatearFecha(nueva.fecha)} a las ${nueva.hora}`)
            recargar()
          }}
        />
      )}

      {porCancelar && (
        <DialogoConfirmacion
          titulo="¿Cancelar esta cita?"
          mensaje={`${porCancelar.especialidad} · ${formatearFecha(porCancelar.fecha)} a las ${porCancelar.hora}`}
          textoConfirmar="Sí, cancelar"
          cargando={cancelando}
          alConfirmar={confirmarCancelacion}
          alCerrar={() => setPorCancelar(null)}
        />
      )}
    </>
  )
}
