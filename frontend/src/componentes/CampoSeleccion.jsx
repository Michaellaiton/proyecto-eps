// Lista desplegable con etiqueta asociada (accesibilidad, REQ-09).
export default function CampoSeleccion({ id, etiqueta, valor, alCambiar, opciones, textoVacio, deshabilitado, className = '' }) {
  return (
    <div className={`campo ${className}`}>
      {etiqueta && <label htmlFor={id}>{etiqueta}</label>}
      <select
        id={id}
        className="entrada"
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        disabled={deshabilitado}
        aria-label={etiqueta ? undefined : textoVacio}
      >
        {textoVacio !== undefined && <option value="">{textoVacio}</option>}
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.texto}
          </option>
        ))}
      </select>
    </div>
  )
}
