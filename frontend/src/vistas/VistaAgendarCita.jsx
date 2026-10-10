// Agendamiento en pasos visuales (CU-01, CU-02). Mantiene el flujo del diagrama del informe:
// especialidad → médico → fecha → disponibilidad → franja → confirmación.
import {
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  CalendarSearch,
  Check,
  Clock,
  ListChecks,
  Stethoscope,
  UserRound,
} from 'lucide-react'

import Avatar from '../componentes/Avatar.jsx'
import Boton from '../componentes/Boton.jsx'
import { Cargando, Vacio } from '../componentes/Estados.jsx'
import MensajeError from '../componentes/MensajeError.jsx'
import Pasos from '../componentes/Pasos.jsx'
import SelectorDias from '../componentes/SelectorDias.jsx'
import SelectorFranjas from '../componentes/SelectorFranjas.jsx'
import SelectorTarjetas from '../componentes/SelectorTarjetas.jsx'
import SugerenciaFranja from '../componentes/SugerenciaFranja.jsx'
import { usarAgendamiento } from '../controladores/usarAgendamiento.js'
import { usarNavegacion } from '../controladores/ContextoNavegacion.jsx'
import { iconoDeEspecialidad } from '../utilidades/especialidades.js'
import { formatearFecha } from '../utilidades/fechas.js'

const PASOS = [
  { texto: 'Especialidad', icono: Stethoscope },
  { texto: 'Médico', icono: UserRound },
  { texto: 'Día y hora', icono: CalendarDays },
  { texto: 'Confirmar', icono: CalendarCheck },
]

function Exito({ cita, alReiniciar }) {
  const { irA } = usarNavegacion()
  return (
    <section className="tarjeta">
      <div className="exito">
        <span className="exito__icono">
          <Check size={44} strokeWidth={3} />
        </span>
        <h2>¡Cita agendada!</h2>
        <p className="texto-suave">
          {cita.especialidad} con {cita.doctor}
          <br />
          <strong>
            {formatearFecha(cita.fecha)} · {cita.hora}
          </strong>
        </p>
        <div className="acciones">
          <Boton icono={ListChecks} onClick={() => irA('mis-citas')}>
            Ver mis citas
          </Boton>
          <Boton variante="secundario" icono={CalendarPlus} onClick={alReiniciar}>
            Agendar otra
          </Boton>
        </div>
      </div>
    </section>
  )
}

export default function VistaAgendarCita() {
  const a = usarAgendamiento()
  const { seleccion, elegir } = a

  if (a.citaConfirmada) return <Exito cita={a.citaConfirmada} alReiniciar={a.reiniciar} />

  return (
    <section className="tarjeta">
      <Pasos pasos={PASOS} actual={a.pasoActual} />

      <div className="grupo-franjas">
        <span className="grupo-franjas__titulo">
          <Stethoscope size={16} /> Especialidad
        </span>
        {a.especialidades === null ? (
          <Cargando />
        ) : (
          <SelectorTarjetas
            etiqueta="Especialidad"
            valor={seleccion.idEspecialidad}
            alElegir={(v) => elegir('idEspecialidad', v)}
            opciones={a.especialidades.map((e) => ({ valor: e.id_especialidad, titulo: e.nombre, icono: iconoDeEspecialidad(e.nombre) }))}
          />
        )}
      </div>

      {seleccion.idEspecialidad && (
        <div className="grupo-franjas aparecer">
          <span className="grupo-franjas__titulo">
            <UserRound size={16} /> Médico
          </span>
          {a.doctores === null ? (
            <Cargando />
          ) : a.doctores.length === 0 ? (
            <Vacio icono={UserRound}>No hay médicos disponibles en esta especialidad.</Vacio>
          ) : (
            <SelectorTarjetas
              etiqueta="Médico"
              valor={seleccion.idDoctor}
              alElegir={(v) => elegir('idDoctor', v)}
              opciones={a.doctores.map((d) => {
                const nombre = `${d.nombres} ${d.apellidos}`
                return { valor: d.id_doctor, titulo: nombre, detalle: d.especialidad.nombre, figura: <Avatar nombre={nombre} /> }
              })}
            />
          )}
        </div>
      )}

      {seleccion.idDoctor && (
        <div className="grupo-franjas aparecer">
          <span className="grupo-franjas__titulo">
            <CalendarDays size={16} /> Día
          </span>
          <SelectorDias valor={seleccion.fecha} alElegir={(v) => elegir('fecha', v)} />
          {a.franjas === null ? (
            <Cargando texto="Buscando horarios…" />
          ) : a.franjas.length === 0 ? (
            <Vacio icono={CalendarSearch}>Sin horarios libres este día. Prueba otro.</Vacio>
          ) : (
            <SelectorFranjas franjas={a.franjas} valor={seleccion.hora} alElegir={(v) => elegir('hora', v)} />
          )}
        </div>
      )}

      <MensajeError error={a.error} />
      <SugerenciaFranja sugerencia={a.sugerencia} alAceptar={a.aceptarSugerencia} ocupado={a.ocupado} />

      {seleccion.hora && (
        <div className="grupo-franjas aparecer">
          <div className="resumen-cita">
            <div className="resumen-cita__dato">
              <Stethoscope size={20} />
              <div>
                <small>Especialidad</small>
                {a.especialidad?.nombre}
              </div>
            </div>
            <div className="resumen-cita__dato">
              <UserRound size={20} />
              <div>
                <small>Médico</small>
                {a.doctor && `${a.doctor.nombres} ${a.doctor.apellidos}`}
              </div>
            </div>
            <div className="resumen-cita__dato">
              <CalendarDays size={20} />
              <div>
                <small>Día</small>
                {formatearFecha(seleccion.fecha)}
              </div>
            </div>
            <div className="resumen-cita__dato">
              <Clock size={20} />
              <div>
                <small>Hora</small>
                {seleccion.hora}
              </div>
            </div>
          </div>
          <div>
            <Boton tamano="grande" icono={CalendarCheck} cargando={a.ocupado} onClick={a.confirmar}>
              Confirmar cita
            </Boton>
          </div>
        </div>
      )}
    </section>
  )
}
