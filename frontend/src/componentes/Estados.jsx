// Estados de pantalla reutilizables: cargando y vacío.
import { LoaderCircle } from 'lucide-react'

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="cargando" role="status">
      <LoaderCircle size={22} />
      {texto}
    </div>
  )
}

export function Vacio({ icono: Icono, titulo, children }) {
  return (
    <div className="vacio">
      {Icono && (
        <span className="vacio__icono">
          <Icono size={30} />
        </span>
      )}
      {titulo && <strong>{titulo}</strong>}
      {children}
    </div>
  )
}
