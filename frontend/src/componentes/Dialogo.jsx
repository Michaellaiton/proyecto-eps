// Ventana modal. Se cierra con Escape o al hacer clic fuera. `DialogoConfirmacion` pide confirmar una acción.
import { useEffect } from 'react'
import { TriangleAlert } from 'lucide-react'

import Boton from './Boton.jsx'

export default function Dialogo({ titulo, alCerrar, ancho = false, children }) {
  useEffect(() => {
    const alPresionar = (e) => e.key === 'Escape' && alCerrar()
    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  }, [alCerrar])

  return (
    <div className="velo" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <div className={`dialogo ${ancho ? 'dialogo--ancho' : ''}`} role="dialog" aria-modal="true" aria-label={titulo}>
        {children}
      </div>
    </div>
  )
}

export function DialogoConfirmacion({ titulo, mensaje, textoConfirmar = 'Confirmar', peligroso = true, cargando, alConfirmar, alCerrar }) {
  return (
    <Dialogo titulo={titulo} alCerrar={alCerrar}>
      <span className={`dialogo__icono ${peligroso ? '' : 'dialogo__icono--info'}`}>
        <TriangleAlert size={24} />
      </span>
      <h3>{titulo}</h3>
      {mensaje && <p className="texto-suave">{mensaje}</p>}
      <div className="acciones">
        <Boton variante={peligroso ? 'peligro-solido' : 'primario'} cargando={cargando} onClick={alConfirmar}>
          {textoConfirmar}
        </Boton>
        <Boton variante="fantasma" onClick={alCerrar}>
          Volver
        </Boton>
      </div>
    </Dialogo>
  )
}
