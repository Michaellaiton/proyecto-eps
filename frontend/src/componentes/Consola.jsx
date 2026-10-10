// Consola de registros en vivo (estilo terminal), con color por nivel y desplazamiento automático.
import { useEffect, useRef } from 'react'
import { Terminal } from 'lucide-react'

const ETIQUETAS = { INFO: 'INFO', OK: 'OK', CONFLICTO: '409', ERROR: 'ERROR', METRICA: 'BD' }

export default function Consola({ eventos, enCurso }) {
  const final = useRef(null)
  const contenedor = useRef(null)

  useEffect(() => {
    const caja = contenedor.current
    // Solo se baja sola si el usuario no subió a leer registros anteriores.
    if (caja && caja.scrollHeight - caja.scrollTop - caja.clientHeight < 80) final.current?.scrollIntoView({ block: 'nearest' })
  }, [eventos])

  return (
    <div className="consola">
      <div className="consola__barra">
        <Terminal size={16} />
        <span>Registro de la simulación</span>
        {enCurso && <span className="consola__vivo">EN VIVO</span>}
      </div>
      <div className="consola__cuerpo" ref={contenedor} role="log" aria-live="off">
        {eventos.length === 0 && <span className="consola__vacia">Esperando eventos…</span>}
        {eventos.map((e) => (
          <div key={e.id_evento} className={`consola__linea consola__linea--${e.nivel.toLowerCase()}`}>
            <span className="consola__hora">{new Date(e.momento).toLocaleTimeString('es-CO', { hour12: false })}</span>
            <span className="consola__nivel">{ETIQUETAS[e.nivel] ?? e.nivel}</span>
            <span>{e.mensaje}</span>
          </div>
        ))}
        <div ref={final} />
      </div>
    </div>
  )
}
