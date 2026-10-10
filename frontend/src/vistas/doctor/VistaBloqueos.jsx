// Bloqueos de la agenda por contingencias (REQ-05). Las citas existentes no se cancelan: se informan.
import { useState } from 'react'
import { CalendarCheck, CalendarOff, Clock, MessageSquareText, Plus, Trash2 } from 'lucide-react'

import Boton from '../../componentes/Boton.jsx'
import Campo from '../../componentes/Campo.jsx'
import { DialogoConfirmacion } from '../../componentes/Dialogo.jsx'
import { Cargando, Vacio } from '../../componentes/Estados.jsx'
import MensajeError from '../../componentes/MensajeError.jsx'
import { usarAvisos } from '../../controladores/ContextoAvisos.jsx'
import { usarConsulta } from '../../controladores/usarConsulta.js'
import { crearBloqueo, eliminarBloqueo, listarMisBloqueos } from '../../servicios/medicoServicio.js'
import { formatearFechaCorta, hoyIso } from '../../utilidades/fechas.js'

const FORMULARIO_VACIO = { fecha: '', hora_inicio: '', hora_fin: '', motivo: '' }
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export default function VistaBloqueos() {
  const bloqueos = usarConsulta(listarMisBloqueos)
  const avisar = usarAvisos()
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO)
  const [afectadas, setAfectadas] = useState(null)
  const [porQuitar, setPorQuitar] = useState(null)
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const cambiar = (campo) => (e) => setFormulario((f) => ({ ...f, [campo]: e.target.value }))

  async function enviar(evento) {
    evento.preventDefault()
    setError(null)
    setGuardando(true)
    try {
      const resultado = await crearBloqueo(formulario)
      setFormulario(FORMULARIO_VACIO)
      setAfectadas(resultado.citas_afectadas)
      avisar.exito('Horario bloqueado')
      bloqueos.recargar()
    } catch (e) {
      setError(e)
    } finally {
      setGuardando(false)
    }
  }

  async function quitar() {
    try {
      await eliminarBloqueo(porQuitar.id_bloqueo)
      avisar.exito('Bloqueo eliminado')
      bloqueos.recargar()
    } catch (e) {
      avisar.error(e)
    } finally {
      setPorQuitar(null)
    }
  }

  return (
    <>
      <form className="tarjeta" onSubmit={enviar}>
        <div className="tarjeta__titulo">
          <Plus size={20} />
          <h2>Nuevo bloqueo</h2>
        </div>
        <div className="filtros">
          <Campo id="bloqueo-fecha" etiqueta="Fecha" type="date" min={hoyIso()} value={formulario.fecha} onChange={cambiar('fecha')} required />
          <Campo id="bloqueo-desde" etiqueta="Desde" type="time" value={formulario.hora_inicio} onChange={cambiar('hora_inicio')} required />
          <Campo id="bloqueo-hasta" etiqueta="Hasta" type="time" value={formulario.hora_fin} onChange={cambiar('hora_fin')} required />
          <Campo
            id="bloqueo-motivo"
            etiqueta="Motivo"
            icono={MessageSquareText}
            placeholder="Reunión, incapacidad…"
            maxLength={200}
            value={formulario.motivo}
            onChange={cambiar('motivo')}
            required
            className="campo--ancho"
          />
          <Boton type="submit" icono={CalendarOff} cargando={guardando}>
            Bloquear
          </Boton>
        </div>
        <MensajeError error={error} />
        {afectadas?.length > 0 && (
          <p className="mensaje mensaje--aviso" role="status">
            {afectadas.length} cita(s) siguen activas en ese horario: {afectadas.map((c) => `${c.hora} ${c.paciente}`).join(', ')}.
            Les avisamos por correo para que reprogramen.
          </p>
        )}
      </form>

      <section className="tarjeta">
        <div className="tarjeta__titulo">
          <CalendarOff size={20} />
          <h2>Próximos bloqueos</h2>
        </div>
        {bloqueos.cargando ? (
          <Cargando />
        ) : bloqueos.datos?.length === 0 ? (
          <Vacio icono={CalendarCheck} titulo="Sin bloqueos programados" />
        ) : (
          <div className="lista-citas">
            {bloqueos.datos?.map((b) => {
              const [, mes, dia] = b.fecha.split('-').map(Number)
              return (
                <article key={b.id_bloqueo} className="cita">
                  <div className="calendario-mini" aria-hidden="true">
                    <span className="calendario-mini__mes">{MESES[mes - 1]}</span>
                    <span className="calendario-mini__dia">{dia}</span>
                  </div>
                  <div className="cita__detalle">
                    <strong>{b.motivo}</strong>
                    <div className="cita__linea">
                      <span>
                        <Clock size={15} /> {formatearFechaCorta(b.fecha)} · {b.hora_inicio} – {b.hora_fin}
                      </span>
                    </div>
                  </div>
                  <Boton variante="peligro" tamano="pequeno" icono={Trash2} onClick={() => setPorQuitar(b)}>
                    Quitar
                  </Boton>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {porQuitar && (
        <DialogoConfirmacion
          titulo="¿Quitar este bloqueo?"
          mensaje="Esas franjas volverán a ofrecerse a los pacientes."
          textoConfirmar="Sí, quitar"
          alConfirmar={quitar}
          alCerrar={() => setPorQuitar(null)}
        />
      )}
    </>
  )
}
