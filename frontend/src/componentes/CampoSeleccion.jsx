// Lista desplegable con etiqueta asociada (accesibilidad, REQ-09).
export default function CampoSeleccion({ id, etiqueta, valor, alCambiar, opciones, textoVacio, deshabilitado }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      <select id={id} value={valor} onChange={(e) => alCambiar(e.target.value)} disabled={deshabilitado}>
        <option value="">{textoVacio}</option>
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.texto}
          </option>
        ))}
      </select>
    </div>
  )
}
