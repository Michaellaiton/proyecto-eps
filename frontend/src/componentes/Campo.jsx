// Campo de formulario con etiqueta, ícono opcional y un botón interno opcional (p. ej. mostrar contraseña).
export default function Campo({ id, etiqueta, icono: Icono, accion, className = '', ...propiedades }) {
  return (
    <div className={`campo ${className}`}>
      {etiqueta && <label htmlFor={id}>{etiqueta}</label>}
      <div className={Icono || accion ? 'campo__control' : undefined}>
        {Icono && <Icono size={18} className="campo__icono" />}
        <input id={id} className="entrada" {...propiedades} />
        {accion && <span className="campo__accion">{accion}</span>}
      </div>
    </div>
  )
}
