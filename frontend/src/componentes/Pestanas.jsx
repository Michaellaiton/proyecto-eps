// Navegación por pestañas. Recibe [{id, texto, Vista}] y muestra la vista activa.
import { useState } from 'react'

export default function Pestanas({ pestanas, etiqueta }) {
  const [activa, setActiva] = useState(pestanas[0].id)
  const { Vista } = pestanas.find((p) => p.id === activa)

  return (
    <>
      <nav className="pestanas" aria-label={etiqueta}>
        {pestanas.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`pestana ${p.id === activa ? 'pestana--activa' : ''}`}
            aria-current={p.id === activa ? 'page' : undefined}
            onClick={() => setActiva(p.id)}
          >
            {p.texto}
          </button>
        ))}
      </nav>
      {/* La clave fuerza a recargar los datos al volver a una pestaña. */}
      <Vista key={activa} />
    </>
  )
}
