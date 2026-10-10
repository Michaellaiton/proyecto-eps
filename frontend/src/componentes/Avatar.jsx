import { colorDeTexto, iniciales } from '../utilidades/colores.js'

export default function Avatar({ nombre, grande = false }) {
  return (
    <span className={`avatar ${grande ? 'avatar--grande' : ''}`} style={{ background: colorDeTexto(nombre) }} aria-hidden="true">
      {iniciales(nombre)}
    </span>
  )
}
