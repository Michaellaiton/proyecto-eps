// Selector visual: cada opción es una tarjeta con ícono (o avatar), título y detalle.
export default function SelectorTarjetas({ opciones, valor, alElegir, etiqueta }) {
  return (
    <div className="selector-tarjetas" role="radiogroup" aria-label={etiqueta}>
      {opciones.map(({ valor: valorOpcion, titulo, detalle, icono: Icono, figura }) => {
        const elegida = String(valorOpcion) === String(valor)
        return (
          <button
            key={valorOpcion}
            type="button"
            role="radio"
            aria-checked={elegida}
            aria-label={detalle ? `${titulo}: ${detalle}` : titulo}
            className={`opcion-tarjeta ${elegida ? 'opcion-tarjeta--elegida' : ''}`}
            onClick={() => alElegir(String(valorOpcion))}
          >
            {figura ?? (Icono && (
              <span className="opcion-tarjeta__icono">
                <Icono size={22} />
              </span>
            ))}
            <span className="opcion-tarjeta__texto">
              <span className="opcion-tarjeta__titulo">{titulo}</span>
              {detalle && <span className="opcion-tarjeta__detalle">{detalle}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
