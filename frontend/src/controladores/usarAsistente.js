// Controlador de la conversación con el asistente virtual.
import { useCallback, useState } from 'react'

import { enviarMensaje } from '../servicios/asistenteServicio.js'

export function usarAsistente() {
  const [mensajes, setMensajes] = useState([])
  const [sugerencias, setSugerencias] = useState([])
  const [escribiendo, setEscribiendo] = useState(false)

  const enviar = useCallback(async (texto, { mostrar = true } = {}) => {
    const limpio = texto.trim()
    if (!limpio) return
    if (mostrar) setMensajes((actuales) => [...actuales, { autor: 'usuario', texto: limpio }])
    setSugerencias([])
    setEscribiendo(true)
    try {
      const respuesta = await enviarMensaje(limpio)
      setMensajes((actuales) => [...actuales, { autor: 'asistente', texto: respuesta.respuesta, accion: respuesta.accion }])
      setSugerencias(respuesta.sugerencias ?? [])
    } catch (e) {
      const texto = e.estado === 429 ? 'Vas muy rápido. Espera un momento y vuelve a intentarlo.' : 'No pude responder ahora. Intenta de nuevo.'
      setMensajes((actuales) => [...actuales, { autor: 'asistente', texto }])
    } finally {
      setEscribiendo(false)
    }
  }, [])

  // Al abrir por primera vez, el asistente saluda sin mostrar un mensaje del usuario.
  const iniciar = useCallback(() => {
    if (mensajes.length === 0) enviar('hola', { mostrar: false })
  }, [mensajes.length, enviar])

  return { mensajes, sugerencias, escribiendo, enviar, iniciar }
}
