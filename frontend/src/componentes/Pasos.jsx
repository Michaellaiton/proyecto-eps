// Guía visual de pasos: muestra en qué paso va el usuario sin necesidad de texto largo.
import { Check } from 'lucide-react'

export default function Pasos({ pasos, actual }) {
  return (
    <ol className="pasos" aria-label="Progreso">
      {pasos.map(({ texto, icono: Icono }, indice) => {
        const estado = indice < actual ? 'hecho' : indice === actual ? 'activo' : ''
        return (
          <li key={texto} className={`paso ${estado ? `paso--${estado}` : ''}`} aria-current={indice === actual ? 'step' : undefined}>
            <span className="paso__numero">{indice < actual ? <Check size={16} /> : <Icono size={16} />}</span>
            <span className="paso__texto">{texto}</span>
          </li>
        )
      })}
    </ol>
  )
}
