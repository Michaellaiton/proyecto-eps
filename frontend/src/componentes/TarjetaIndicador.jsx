// Indicador numérico con ícono (KPI).
export default function TarjetaIndicador({ titulo, valor, icono: Icono, variante }) {
  return (
    <div className={`indicador ${variante ? `indicador--${variante}` : ''}`}>
      {Icono && (
        <span className="indicador__icono">
          <Icono size={22} />
        </span>
      )}
      <div>
        <div className="indicador__valor">{valor}</div>
        <div className="indicador__titulo">{titulo}</div>
      </div>
    </div>
  )
}
