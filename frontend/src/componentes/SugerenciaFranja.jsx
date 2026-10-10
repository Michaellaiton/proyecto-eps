// Ofrece la siguiente franja libre cuando la elegida ya fue tomada (409 con sugerencia).
import { Sparkles } from 'lucide-react'

import { formatearFecha } from '../utilidades/fechas.js'
import Boton from './Boton.jsx'

export default function SugerenciaFranja({ sugerencia, alAceptar, ocupado }) {
  if (!sugerencia) return null
  return (
    <div className="mensaje mensaje--aviso" role="status">
      <span>
        <Sparkles size={16} /> Siguiente disponible: <strong>{formatearFecha(sugerencia.fecha)}</strong> a las{' '}
        <strong>{sugerencia.hora}</strong>
      </span>
      <Boton tamano="pequeno" cargando={ocupado} onClick={() => alAceptar(sugerencia)}>
        Tomar esa
      </Boton>
    </div>
  )
}
