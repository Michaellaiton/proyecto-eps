// Controlador de sesión: guarda quién está conectado y lo comparte con todas las vistas.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import { borrarSesion, guardarSesion, leerSesion } from '../servicios/almacenamientoSesion.js'
import { consultarUsuarioActual, iniciarSesion } from '../servicios/autenticacionServicio.js'
import { registrarAlExpirarSesion } from '../servicios/clienteApi.js'

const ContextoSesion = createContext(null)

export function ProveedorSesion({ children }) {
  const [sesion, setSesion] = useState(leerSesion)

  const cerrar = useCallback(() => {
    borrarSesion()
    setSesion(null)
  }, [])

  useEffect(() => registrarAlExpirarSesion(cerrar), [cerrar])

  const iniciar = useCallback(async (nombreUsuario, contrasena) => {
    const { access } = await iniciarSesion(nombreUsuario, contrasena)
    guardarSesion({ token: access })
    const usuario = await consultarUsuarioActual()
    const nueva = { token: access, usuario }
    guardarSesion(nueva)
    setSesion(nueva)
  }, [])

  return (
    <ContextoSesion.Provider value={{ usuario: sesion?.usuario ?? null, iniciar, cerrar }}>
      {children}
    </ContextoSesion.Provider>
  )
}

export function usarSesion() {
  return useContext(ContextoSesion)
}
