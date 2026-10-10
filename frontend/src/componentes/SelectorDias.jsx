// Tira horizontal de días: reemplaza el calendario por un selector de un toque.
import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { hoyIso, sumarDias } from '../utilidades/fechas.js'
import Boton from './Boton.jsx'

const SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export default function SelectorDias({ valor, alElegir, dias = 21, desde = hoyIso() }) {
  const lista = useRef(null)
  const fechas = Array.from({ length: dias }, (_, i) => sumarDias(desde, i))
  const desplazar = (sentido) => lista.current?.scrollBy({ left: sentido * 280, behavior: 'smooth' })

  // Mantiene visible el día elegido (p. ej. "hoy" cuando la tira empieza días atrás).
  useEffect(() => {
    // Se espera al siguiente cuadro para medir cuando la tira ya tiene su ancho final.
    const cuadro = requestAnimationFrame(() => {
      const contenedor = lista.current
      const elegido = contenedor?.querySelector('[aria-checked="true"]')
      if (!elegido) return
      const posicion = elegido.getBoundingClientRect().left - contenedor.getBoundingClientRect().left + contenedor.scrollLeft
      contenedor.scrollTo({ left: posicion - contenedor.clientWidth / 2 + elegido.offsetWidth / 2, behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(cuadro)
  }, [valor])

  return (
    <div className="selector-dias">
      <Boton variante="fantasma" soloIcono icono={ChevronLeft} ayuda="Días anteriores" onClick={() => desplazar(-1)} />
      <div className="selector-dias__lista" ref={lista} role="radiogroup" aria-label="Día de la cita">
        {fechas.map((fecha) => {
          const [anio, mes, dia] = fecha.split('-').map(Number)
          const diaSemana = new Date(anio, mes - 1, dia).getDay()
          const elegido = fecha === valor
          const clases = ['dia', elegido && 'dia--elegido', (diaSemana === 0 || diaSemana === 6) && 'dia--fin-semana']
          return (
            <button
              key={fecha}
              type="button"
              role="radio"
              aria-checked={elegido}
              className={clases.filter(Boolean).join(' ')}
              onClick={() => alElegir(fecha)}
            >
              <span className="dia__semana">{fecha === hoyIso() ? 'hoy' : SEMANA[diaSemana]}</span>
              <span className="dia__numero">{dia}</span>
              <span className="dia__mes">{MESES[mes - 1]}</span>
            </button>
          )
        })}
      </div>
      <Boton variante="fantasma" soloIcono icono={ChevronRight} ayuda="Días siguientes" onClick={() => desplazar(1)} />
    </div>
  )
}
