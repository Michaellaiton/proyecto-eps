// Controles de paginación para respuestas {count, next, previous, results}.
export default function Paginacion({ pagina, total, tamano = 25, alCambiar }) {
  const paginas = Math.max(1, Math.ceil(total / tamano))
  if (paginas === 1) return null

  return (
    <div className="paginacion">
      <button type="button" className="boton boton--secundario" disabled={pagina <= 1} onClick={() => alCambiar(pagina - 1)}>
        Anterior
      </button>
      <span>
        Página {pagina} de {paginas} · {total} registros
      </span>
      <button
        type="button"
        className="boton boton--secundario"
        disabled={pagina >= paginas}
        onClick={() => alCambiar(pagina + 1)}
      >
        Siguiente
      </button>
    </div>
  )
}
