// Bloqueos de la agenda por contingencias (REQ-05). Las citas existentes no se cancelan: se informan.
import { useState } from 'react'

import MensajeError from '../../componentes/MensajeError.jsx'
import { usarConsulta } from '../../controladores/usarConsulta.js'
import { crearBloqueo, eliminarBloqueo, listarMisBloqueos } from '../../servicios/medicoServicio.js'
import { formatearFecha, hoyIso } from '../../utilidades/fechas.js'

const FORMULARIO_VACIO = { fecha: '', hora_inicio: '', hora_fin: '', motivo: '' }

export default function VistaBloqueos() {
  const bloqueos = usarConsulta(listarMisBloqueos)
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState(null)

  const cambiar = (campo) => (e) => setFormulario((f) => ({ ...f, [campo]: e.target.value }))

  async function enviar(evento) {
    evento.preventDefault()
    setError(null)
    setResultado(null)
    try {
      setResultado(await crearBloqueo(formulario))
      setFormulario(FORMULARIO_VACIO)
      bloqueos.recargar()
    } catch (e) {
      setError(e)
    }
  }

  async function eliminar(idBloqueo) {
    setError(null)
    try {
      await eliminarBloqueo(idBloqueo)
      bloqueos.recargar()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <section className="tarjeta">
      <h2>Bloqueos de agenda</h2>
      <p className="subtitulo">
        Use un bloqueo cuando no pueda atender en un intervalo (reunión, incapacidad, capacitación). Esas franjas dejan de
        ofrecerse a los pacientes.
      </p>

      <form className="filtros" onSubmit={enviar}>
        <div className="campo">
          <label htmlFor="bloqueo-fecha">Fecha</label>
          <input id="bloqueo-fecha" type="date" min={hoyIso()} value={formulario.fecha} onChange={cambiar('fecha')} required />
        </div>
        <div className="campo">
          <label htmlFor="bloqueo-desde">Desde</label>
          <input id="bloqueo-desde" type="time" value={formulario.hora_inicio} onChange={cambiar('hora_inicio')} required />
        </div>
        <div className="campo">
          <label htmlFor="bloqueo-hasta">Hasta</label>
          <input id="bloqueo-hasta" type="time" value={formulario.hora_fin} onChange={cambiar('hora_fin')} required />
        </div>
        <div className="campo campo--ancho">
          <label htmlFor="bloqueo-motivo">Motivo</label>
          <input id="bloqueo-motivo" maxLength={200} value={formulario.motivo} onChange={cambiar('motivo')} required />
        </div>
        <button type="submit" className="boton">Bloquear</button>
      </form>

      <MensajeError error={error || bloqueos.error} />
      {resultado && (
        <div className={`mensaje ${resultado.citas_existentes_en_intervalo ? 'mensaje--error' : 'mensaje--exito'}`} role="status">
          Bloqueo registrado.{' '}
          {resultado.citas_existentes_en_intervalo > 0 ? (
            <>
              Atención: hay {resultado.citas_existentes_en_intervalo} cita(s) agendada(s) en ese intervalo que siguen activas:{' '}
              {resultado.citas_afectadas.map((c) => `${c.hora} ${c.paciente}`).join(', ')}. Coordine con el área administrativa
              para reprogramarlas.
            </>
          ) : (
            'No había citas en ese intervalo.'
          )}
        </div>
      )}

      <h3>Próximos bloqueos</h3>
      {bloqueos.datos?.length === 0 && <p>No tiene bloqueos programados.</p>}
      {bloqueos.datos?.length > 0 && (
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Intervalo</th>
              <th>Motivo</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {bloqueos.datos.map((b) => (
              <tr key={b.id_bloqueo}>
                <td>{formatearFecha(b.fecha)}</td>
                <td>
                  {b.hora_inicio} – {b.hora_fin}
                </td>
                <td>{b.motivo}</td>
                <td>
                  <button type="button" className="boton boton--peligro" onClick={() => eliminar(b.id_bloqueo)}>
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
