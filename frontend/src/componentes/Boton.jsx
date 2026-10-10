// Botón con variantes, ícono opcional y estado de carga.
import { LoaderCircle } from 'lucide-react'

export default function Boton({
  variante = 'primario',
  tamano,
  icono: Icono,
  cargando = false,
  soloIcono = false,
  ayuda,
  className = '',
  children,
  disabled,
  type = 'button',
  ...propiedades
}) {
  const clases = [
    'boton',
    variante !== 'primario' && `boton--${variante}`,
    tamano && `boton--${tamano}`,
    soloIcono && 'boton--icono',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  const tamanoIcono = tamano === 'pequeno' ? 16 : 18

  return (
    <button
      type={type}
      className={clases}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      aria-label={soloIcono ? ayuda : undefined}
      data-ayuda={soloIcono ? ayuda : undefined}
      {...propiedades}
    >
      {cargando ? <LoaderCircle size={tamanoIcono} className="boton__giro" /> : Icono && <Icono size={tamanoIcono} />}
      {!soloIcono && children}
    </button>
  )
}
