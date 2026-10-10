// Franjas horarias agrupadas en mañana y tarde.
import { Moon, Sun } from 'lucide-react'

export default function SelectorFranjas({ franjas, valor, alElegir }) {
  const grupos = [
    { titulo: 'Mañana', icono: Sun, horas: franjas.filter((h) => h < '12:00') },
    { titulo: 'Tarde', icono: Moon, horas: franjas.filter((h) => h >= '12:00') },
  ].filter((g) => g.horas.length > 0)

  return grupos.map(({ titulo, icono: Icono, horas }) => (
    <div key={titulo} className="grupo-franjas">
      <span className="grupo-franjas__titulo">
        <Icono size={16} />
        {titulo} · {horas.length}
      </span>
      <div className="franjas" role="radiogroup" aria-label={`Horas de la ${titulo.toLowerCase()}`}>
        {horas.map((hora) => (
          <button
            key={hora}
            type="button"
            role="radio"
            aria-checked={hora === valor}
            className={`franja ${hora === valor ? 'franja--elegida' : ''}`}
            onClick={() => alElegir(hora)}
          >
            {hora}
          </button>
        ))}
      </div>
    </div>
  ))
}
