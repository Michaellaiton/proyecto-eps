export default function TarjetaIndicador({ titulo, valor, detalle, alerta = false }) {
  return (
    <div className={`indicador-tarjeta ${alerta ? 'indicador-tarjeta--alerta' : ''}`}>
      <span className="indicador-tarjeta__titulo">{titulo}</span>
      <strong className="indicador-tarjeta__valor">{valor}</strong>
      {detalle && <span className="indicador-tarjeta__detalle">{detalle}</span>}
    </div>
  )
}
