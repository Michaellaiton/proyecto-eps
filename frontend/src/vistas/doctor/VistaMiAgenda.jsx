// Agenda del día del médico en línea de tiempo, con registro de atención (CU-04).
import { useState } from 'react'
import { CalendarCheck, CalendarOff, CalendarX2, CircleCheck, CircleX, Clock, Hourglass, Users } from 'lucide-react'

import Boton from '../../componentes/Boton.jsx'
import { Cargando, Vacio } from '../../componentes/Estados.jsx'
import Insignia, { EstadoCita } from '../../componentes/Insignia.jsx'
import MensajeError from '../../componentes/MensajeError.jsx'
import SelectorDias from '../../componentes/SelectorDias.jsx'
import TarjetaIndicador from '../../componentes/TarjetaIndicador.jsx'
import { usarAvisos } from '../../controladores/ContextoAvisos.jsx'
import { usarConsulta } from '../../controladores/usarConsulta.js'
import { consultarMiAgenda, registrarAtencion } from '../../servicios/medicoServicio.js'
import { formatearFecha, hoyIso, sumarDias, yaLlego } from '../../utilidades/fechas.js'

const CLASE_POR_ESTADO = { Agendada: 'cita', Atendida: 'atendida', 'No asistio': 'ausente' }

function FranjaAgenda({ franja, fecha, alRegistrar, ocupado }) {
  const { cita, bloqueo } = franja
  const tipo = cita ? CLASE_POR_ESTADO[cita.estado] : franja.estado
  return (
    <div className={`franja-agenda franja-agenda--${tipo}`}>
      <span className="franja-agenda__hora">{franja.hora}</span>
      <span className="franja-agenda__punto" aria-hidden="true" />
      <div>
        {cita ? (
          <>
            <strong>{cita.paciente}</strong>
            <div className="texto-suave">{cita.documento}</div>
          </>
        ) : bloqueo ? (
          <span className="texto-suave">{bloqueo.motivo}</span>
        ) : (
          <span className="texto-suave">Libre</span>
        )}
      </div>
      <div className="acciones">
        {cita && cita.estado !== 'Agendada' && <EstadoCita estado={cita.estado} />}
        {bloqueo && !cita && (
          <Insignia tono="aviso" icono={CalendarOff}>
            Bloqueada
          </Insignia>
        )}
        {cita?.estado === 'Agendada' &&
          (yaLlego(fecha, franja.hora) ? (
            <>
              <Boton tamano="pequeno" icono={CircleCheck} disabled={ocupado} onClick={() => alRegistrar(cita.id_cita, 'Atendida')}>
                Atendida
              </Boton>
              <Boton variante="peligro" tamano="pequeno" icono={CircleX} disabled={ocupado} onClick={() => alRegistrar(cita.id_cita, 'No asistio')}>
                No asistió
              </Boton>
            </>
          ) : (
            <Insignia tono="info" icono={Hourglass}>
              Pendiente
            </Insignia>
          ))}
      </div>
    </div>
  )
}

export default function VistaMiAgenda() {
  const [fecha, setFecha] = useState(hoyIso)
  const [ocupado, setOcupado] = useState(false)
  const avisar = usarAvisos()
  const agenda = usarConsulta(() => consultarMiAgenda(fecha), [fecha])
  const a = agenda.datos

  async function registrar(idCita, estado) {
    setOcupado(true)
    try {
      await registrarAtencion(idCita, estado)
      avisar.exito(estado === 'Atendida' ? 'Atención registrada' : 'Inasistencia registrada')
      agenda.recargar()
    } catch (e) {
      avisar.error(e)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      <section className="tarjeta">
        <SelectorDias valor={fecha} alElegir={setFecha} desde={sumarDias(hoyIso(), -7)} dias={28} />
        <p className="texto-suave">{formatearFecha(fecha)}</p>
        <MensajeError error={agenda.error} />
        {a && (
          <div className="indicadores">
            <TarjetaIndicador titulo="Citas" valor={a.resumen.citas} icono={Users} variante="info" />
            <TarjetaIndicador titulo="Por atender" valor={a.resumen.agendadas} icono={Clock} />
            <TarjetaIndicador titulo="Atendidas" valor={a.resumen.atendidas} icono={CalendarCheck} />
            <TarjetaIndicador titulo="No asistió" valor={a.resumen.no_asistio} icono={CalendarX2} variante="alerta" />
          </div>
        )}
      </section>

      <section className="tarjeta">
        {agenda.cargando ? (
          <Cargando />
        ) : a?.franjas.length === 0 ? (
          <Vacio icono={CalendarOff} titulo="Sin horario de atención este día" />
        ) : (
          <div className="linea-tiempo">
            {a?.franjas.map((f) => (
              <FranjaAgenda key={f.hora} franja={f} fecha={a.fecha} alRegistrar={registrar} ocupado={ocupado} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
