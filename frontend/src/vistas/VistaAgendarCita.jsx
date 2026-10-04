// Pantalla de agendamiento. Recorre el diagrama de flujo del informe: especialidad → médico → fecha
// → disponibilidad → franja → confirmación (CU-01, CU-02).
import CampoSeleccion from '../componentes/CampoSeleccion.jsx'
import MensajeError from '../componentes/MensajeError.jsx'
import SugerenciaFranja from '../componentes/SugerenciaFranja.jsx'
import { usarAgendamiento } from '../controladores/usarAgendamiento.js'
import { formatearFecha, hoyIso } from '../utilidades/fechas.js'

export default function VistaAgendarCita() {
  const {
    especialidades, doctores, franjas, seleccion, elegir, consultar, confirmar,
    citaConfirmada, sugerencia, aceptarSugerencia, error, ocupado,
  } = usarAgendamiento()

  const puedeConsultar = seleccion.idDoctor && seleccion.fecha && !ocupado

  return (
    <section className="tarjeta">
      <h2>Agendar cita</h2>

      <div className="rejilla">
        <CampoSeleccion
          id="especialidad"
          etiqueta="Especialidad"
          valor={seleccion.idEspecialidad}
          alCambiar={(v) => elegir('idEspecialidad', v)}
          textoVacio="Seleccione una especialidad"
          opciones={especialidades.map((e) => ({ valor: e.id_especialidad, texto: e.nombre }))}
        />
        <CampoSeleccion
          id="doctor"
          etiqueta="Médico"
          valor={seleccion.idDoctor}
          alCambiar={(v) => elegir('idDoctor', v)}
          textoVacio={seleccion.idEspecialidad ? 'Seleccione un médico' : 'Primero elija la especialidad'}
          deshabilitado={!seleccion.idEspecialidad}
          opciones={doctores.map((d) => ({ valor: d.id_doctor, texto: `${d.nombres} ${d.apellidos}` }))}
        />
        <div className="campo">
          <label htmlFor="fecha">Fecha</label>
          <input id="fecha" type="date" min={hoyIso()} value={seleccion.fecha} onChange={(e) => elegir('fecha', e.target.value)} />
        </div>
      </div>

      <button type="button" className="boton" disabled={!puedeConsultar} onClick={consultar}>
        Consultar disponibilidad
      </button>

      {franjas && (
        <fieldset className="franjas">
          <legend>Franjas disponibles el {formatearFecha(seleccion.fecha)}</legend>
          {franjas.length === 0 && <p>No hay franjas disponibles para esta fecha. Pruebe con otro día.</p>}
          {franjas.map((hora) => (
            <button
              key={hora}
              type="button"
              className={`franja ${seleccion.hora === hora ? 'franja--elegida' : ''}`}
              aria-pressed={seleccion.hora === hora}
              onClick={() => elegir('hora', hora)}
            >
              {hora}
            </button>
          ))}
        </fieldset>
      )}

      {seleccion.hora && (
        <button type="button" className="boton" disabled={ocupado} onClick={confirmar}>
          Confirmar cita a las {seleccion.hora}
        </button>
      )}

      <MensajeError error={error} />
      <SugerenciaFranja sugerencia={sugerencia} alAceptar={aceptarSugerencia} ocupado={ocupado} />
      {citaConfirmada && (
        <p className="mensaje mensaje--exito" role="status">
          Cita agendada: {citaConfirmada.especialidad} con {citaConfirmada.doctor}, el{' '}
          {formatearFecha(citaConfirmada.fecha)} a las {citaConfirmada.hora}.
        </p>
      )}
    </section>
  )
}
