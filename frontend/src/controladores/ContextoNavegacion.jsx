// Navegación por secciones usando el fragmento de la URL (#/agendar), sin dependencias externas.
// Permite usar los botones Atrás/Adelante del navegador y que el asistente lleve a una pantalla.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const ContextoNavegacion = createContext(null)

const rutaActual = () => window.location.hash.replace(/^#\/?/, '')

export function ProveedorNavegacion({ children }) {
  const [ruta, setRuta] = useState(rutaActual)

  useEffect(() => {
    const alCambiar = () => setRuta(rutaActual())
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])

  const irA = useCallback((destino) => {
    window.location.hash = destino ? `/${destino}` : ''
    setRuta(destino)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return <ContextoNavegacion.Provider value={{ ruta, irA }}>{children}</ContextoNavegacion.Provider>
}

export function usarNavegacion() {
  return useContext(ContextoNavegacion)
}
