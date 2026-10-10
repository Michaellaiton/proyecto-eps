// Asistente virtual flotante. Disponible en todas las pantallas, con o sin sesión.
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Bot, MessageCircle, Send, X } from 'lucide-react'

import { usarAsistente } from '../controladores/usarAsistente.js'
import { usarNavegacion } from '../controladores/ContextoNavegacion.jsx'
import Boton from './Boton.jsx'

export default function Asistente() {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const { mensajes, sugerencias, escribiendo, enviar, iniciar } = usarAsistente()
  const { irA } = usarNavegacion()
  const final = useRef(null)

  useEffect(() => {
    if (abierto) iniciar()
  }, [abierto, iniciar])

  useEffect(() => {
    final.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, escribiendo])

  function enviarFormulario(evento) {
    evento.preventDefault()
    enviar(texto)
    setTexto('')
  }

  function seguirAccion(accion) {
    irA(accion.destino)
    if (window.innerWidth < 700) setAbierto(false)
  }

  return (
    <>
      {abierto && (
        <section className="asistente" aria-label="Asistente virtual">
          <header className="asistente__encabezado">
            <Bot size={26} />
            <div>
              <strong>Asistente Citas EPS</strong>
              <small>Responde al instante</small>
            </div>
            <Boton variante="fantasma" soloIcono icono={X} ayuda="Cerrar" onClick={() => setAbierto(false)} />
          </header>

          <div className="asistente__mensajes" aria-live="polite">
            {mensajes.map((m, i) => (
              <div key={i} className={`burbuja burbuja--${m.autor}`}>
                {m.texto}
                {m.accion && (
                  <div>
                    <Boton tamano="pequeno" onClick={() => seguirAccion(m.accion)}>
                      {m.accion.etiqueta}
                      <ArrowRight size={16} />
                    </Boton>
                  </div>
                )}
              </div>
            ))}
            {escribiendo && (
              <div className="burbuja burbuja--asistente" aria-label="Escribiendo">
                <span className="escribiendo">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            )}
            <div ref={final} />
          </div>

          {sugerencias.length > 0 && (
            <div className="asistente__sugerencias">
              {sugerencias.map((s) => (
                <button key={s} type="button" className="chip" onClick={() => enviar(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <form className="asistente__formulario" onSubmit={enviarFormulario}>
            <input
              className="entrada"
              placeholder="Escribe tu pregunta…"
              aria-label="Mensaje para el asistente"
              maxLength={300}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <Boton type="submit" soloIcono icono={Send} ayuda="Enviar" disabled={!texto.trim() || escribiendo} />
          </form>
        </section>
      )}

      <button
        type="button"
        className="asistente-boton"
        aria-label={abierto ? 'Cerrar asistente' : 'Abrir asistente virtual'}
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
      >
        {abierto ? <X size={26} /> : <MessageCircle size={26} />}
      </button>
    </>
  )
}
