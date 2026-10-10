// Controles de paginación para respuestas {count, next, previous, results}.
import { ChevronLeft, ChevronRight } from 'lucide-react'

import Boton from './Boton.jsx'

export default function Paginacion({ pagina, total, tamano = 25, alCambiar }) {
  const paginas = Math.max(1, Math.ceil(total / tamano))
  if (paginas === 1) return null

  return (
    <div className="paginacion">
      <Boton variante="secundario" tamano="pequeno" icono={ChevronLeft} disabled={pagina <= 1} onClick={() => alCambiar(pagina - 1)}>
        Anterior
      </Boton>
      <span>
        {pagina} / {paginas} · {total} registros
      </span>
      <Boton variante="secundario" tamano="pequeno" disabled={pagina >= paginas} onClick={() => alCambiar(pagina + 1)}>
        Siguiente
        <ChevronRight size={16} />
      </Boton>
    </div>
  )
}
