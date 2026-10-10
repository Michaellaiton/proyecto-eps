// Avisos flotantes (éxito / error) que desaparecen solos. Uso: const avisar = usarAvisos(); avisar.exito('…')
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { CircleAlert, CircleCheck, X } from 'lucide-react'

const ContextoAvisos = createContext(null)
const DURACION_MS = 4500

export function ProveedorAvisos({ children }) {
  const [avisos, setAvisos] = useState([])

  const quitar = useCallback((id) => setAvisos((actuales) => actuales.filter((a) => a.id !== id)), [])

  const agregar = useCallback(
    (tipo, texto) => {
      const id = crypto.randomUUID()
      setAvisos((actuales) => [...actuales.slice(-2), { id, tipo, texto }])
      setTimeout(() => quitar(id), DURACION_MS)
    },
    [quitar],
  )

  const avisar = useMemo(
    () => ({
      exito: (texto) => agregar('exito', texto),
      error: (error) => agregar('error', typeof error === 'string' ? error : error.message),
    }),
    [agregar],
  )

  return (
    <ContextoAvisos.Provider value={avisar}>
      {children}
      <div className="avisos" aria-live="polite">
        {avisos.map(({ id, tipo, texto }) => (
          <div key={id} className={`aviso aviso--${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
            {tipo === 'error' ? <CircleAlert size={20} /> : <CircleCheck size={20} />}
            <span className="aviso__texto">{texto}</span>
            <button type="button" className="boton boton--fantasma boton--icono" aria-label="Cerrar aviso" onClick={() => quitar(id)}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ContextoAvisos.Provider>
  )
}

export function usarAvisos() {
  return useContext(ContextoAvisos)
}
