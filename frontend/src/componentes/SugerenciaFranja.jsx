// Ofrece la siguiente franja libre cuando la elegida ya fue tomada (409 con sugerencia).
import { formatearFecha } from '../utilidades/fechas.js'

export default function SugerenciaFranja({ sugerencia, alAceptar, ocupado }) {
  if (!sugerencia) return null
  return (
    <div className="mensaje mensaje--aviso" role="status">
      <span>
        La siguiente franja disponible con este médico es el <strong>{formatearFecha(sugerencia.fecha)}</strong> a las{' '}
        <strong>{sugerencia.hora}</strong>.
      </span>
      <button type="button" className="boton" disabled={ocupado} onClick={() => alAceptar(sugerencia)}>
        Tomar esa franja
      </button>
    </div>
  )
}
