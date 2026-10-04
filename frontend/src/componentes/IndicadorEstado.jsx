export default function IndicadorEstado({ etiqueta, correcto, texto }) {
  return (
    <div className="indicador">
      <span className={`indicador__punto ${correcto ? 'indicador__punto--ok' : 'indicador__punto--falla'}`} />
      <span className="indicador__etiqueta">{etiqueta}</span>
      <span className="indicador__texto">{texto}</span>
    </div>
  )
}
