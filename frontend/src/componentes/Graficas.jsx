// Gráficas SVG livianas con tooltip al pasar el mouse. Una serie por gráfica (sin doble eje).
import { useState } from 'react'

const ANCHO = 600
const ALTO = 190
const MARGEN = { arriba: 26, derecha: 12, abajo: 26, izquierda: 46 }
const AREA_ANCHO = ANCHO - MARGEN.izquierda - MARGEN.derecha
const AREA_ALTO = ALTO - MARGEN.arriba - MARGEN.abajo

function formatear(valor) {
  return Number(valor).toLocaleString('es-CO', { maximumFractionDigits: 1 })
}

function Ejes({ maximo, unidad, etiquetaX }) {
  const marcas = [0, maximo / 2, maximo]
  return (
    <g className="grafica__ejes">
      {marcas.map((m) => {
        const y = MARGEN.arriba + AREA_ALTO - (m / maximo) * AREA_ALTO
        return (
          <g key={m}>
            <line x1={MARGEN.izquierda} x2={ANCHO - MARGEN.derecha} y1={y} y2={y} />
            <text x={MARGEN.izquierda - 6} y={y + 4} textAnchor="end">
              {formatear(m)}
            </text>
          </g>
        )
      })}
      <text x={0} y={11} textAnchor="start" className="grafica__unidad">
        {unidad}
      </text>
      <text x={ANCHO - MARGEN.derecha} y={ALTO - 6} textAnchor="end" className="grafica__unidad">
        {etiquetaX}
      </text>
    </g>
  )
}

function Tooltip({ visible, x, texto }) {
  if (!visible) return null
  const izquierda = `${Math.min(Math.max((x / ANCHO) * 100, 8), 92)}%`
  return (
    <div className="grafica__tooltip" style={{ left: izquierda }} role="status">
      {texto}
    </div>
  )
}

/**
 * Barras verticales. `valores`: números; `destacadas`: índices a resaltar (con su etiqueta);
 * `describir(i)`: texto del tooltip.
 */
export function GraficaBarras({ titulo, valores, destacadas = [], etiquetaDestacada, leyenda, unidad, etiquetaX, describir }) {
  const [activa, setActiva] = useState(null)
  if (!valores.length) return null
  const maximo = Math.max(...valores) * 1.1 || 1
  const paso = AREA_ANCHO / valores.length
  const grosor = Math.max(Math.min(paso - 2, 28), 2)

  return (
    <figure className="grafica">
      <figcaption>{titulo}</figcaption>
      <div className="grafica__lienzo">
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} role="img" aria-label={titulo} onMouseLeave={() => setActiva(null)}>
          <Ejes maximo={maximo} unidad={unidad} etiquetaX={etiquetaX} />
          {valores.map((valor, i) => {
            const alto = Math.max((valor / maximo) * AREA_ALTO, 1)
            const x = MARGEN.izquierda + i * paso + (paso - grosor) / 2
            const y = MARGEN.arriba + AREA_ALTO - alto
            const destacada = destacadas.includes(i)
            return (
              <g key={i} onMouseEnter={() => setActiva(i)}>
                <rect className="grafica__zona" x={MARGEN.izquierda + i * paso} y={MARGEN.arriba} width={paso} height={AREA_ALTO} />
                <rect
                  className={`grafica__barra ${destacada ? 'grafica__barra--destacada' : ''} ${activa === i ? 'grafica__barra--activa' : ''}`}
                  x={x}
                  y={y}
                  width={grosor}
                  height={alto}
                  rx={Math.min(4, grosor / 2)}
                />
                {destacada && etiquetaDestacada && (
                  <text className="grafica__etiqueta" x={x + grosor / 2} y={y - 6} textAnchor="middle">
                    {etiquetaDestacada}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
        <Tooltip visible={activa !== null} x={MARGEN.izquierda + (activa ?? 0) * paso + paso / 2} texto={activa !== null && describir(activa)} />
      </div>
      {leyenda && (
        <div className="grafica__leyenda">
          {leyenda.map(({ texto, destacada }) => (
            <span key={texto}>
              <i className={`grafica__muestra ${destacada ? 'grafica__muestra--destacada' : ''}`} aria-hidden="true" />
              {texto}
            </span>
          ))}
        </div>
      )}
    </figure>
  )
}

/** Línea con cruz de seguimiento. `puntos`: [{x, y}] con x creciente. */
export function GraficaLinea({ titulo, puntos, unidad, etiquetaX, describir }) {
  const [activo, setActivo] = useState(null)
  if (!puntos.length) return null
  const maximo = Math.max(...puntos.map((p) => p.y)) * 1.15 || 1
  const xMin = puntos[0].x
  const xMax = Math.max(puntos.at(-1).x, xMin + 1)
  const escalaX = (x) => MARGEN.izquierda + ((x - xMin) / (xMax - xMin)) * AREA_ANCHO
  const escalaY = (y) => MARGEN.arriba + AREA_ALTO - (y / maximo) * AREA_ALTO
  const trazo = puntos.map((p, i) => `${i ? 'L' : 'M'}${escalaX(p.x)},${escalaY(p.y)}`).join(' ')

  function alMover(evento) {
    const caja = evento.currentTarget.getBoundingClientRect()
    const x = ((evento.clientX - caja.left) / caja.width) * ANCHO
    const indice = puntos.reduce((mejor, p, i) => (Math.abs(escalaX(p.x) - x) < Math.abs(escalaX(puntos[mejor].x) - x) ? i : mejor), 0)
    setActivo(indice)
  }

  const punto = activo !== null ? puntos[activo] : null
  return (
    <figure className="grafica">
      <figcaption>{titulo}</figcaption>
      <div className="grafica__lienzo">
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} role="img" aria-label={titulo} onMouseMove={alMover} onMouseLeave={() => setActivo(null)}>
          <Ejes maximo={maximo} unidad={unidad} etiquetaX={etiquetaX} />
          <path className="grafica__area" d={`${trazo} L${escalaX(puntos.at(-1).x)},${MARGEN.arriba + AREA_ALTO} L${escalaX(xMin)},${MARGEN.arriba + AREA_ALTO} Z`} />
          <path className="grafica__linea" d={trazo} />
          {punto && (
            <g>
              <line className="grafica__cruz" x1={escalaX(punto.x)} x2={escalaX(punto.x)} y1={MARGEN.arriba} y2={MARGEN.arriba + AREA_ALTO} />
              <circle className="grafica__punto" cx={escalaX(punto.x)} cy={escalaY(punto.y)} r={5} />
            </g>
          )}
        </svg>
        <Tooltip visible={punto !== null} x={punto ? escalaX(punto.x) : 0} texto={punto && describir(punto)} />
      </div>
    </figure>
  )
}
