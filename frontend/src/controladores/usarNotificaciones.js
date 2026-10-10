// Controlador de las notificaciones internas: revisa el contador cada 30 s y avisa cuando llega algo nuevo.
import { useCallback, useEffect, useRef, useState } from 'react'

import { contarNoLeidas, listarNotificaciones, marcarLeida, marcarTodasLeidas } from '../servicios/notificacionesServicio.js'
import { usarAvisos } from './ContextoAvisos.jsx'

const INTERVALO_MS = 30000

export function usarNotificaciones() {
  const avisar = usarAvisos()
  const [noLeidas, setNoLeidas] = useState(0)
  const [lista, setLista] = useState(null)
  const anterior = useRef(null)

  const actualizarContador = useCallback(async () => {
    try {
      const { no_leidas } = await contarNoLeidas()
      if (anterior.current !== null && no_leidas > anterior.current) {
        const nuevas = no_leidas - anterior.current
        avisar.exito(nuevas === 1 ? 'Tienes una notificación nueva' : `Tienes ${nuevas} notificaciones nuevas`)
      }
      anterior.current = no_leidas
      setNoLeidas(no_leidas)
    } catch {
      // Si falla una revisión periódica no se interrumpe al usuario; se reintenta en el siguiente ciclo.
    }
  }, [avisar])

  useEffect(() => {
    actualizarContador()
    const temporizador = setInterval(() => document.visibilityState === 'visible' && actualizarContador(), INTERVALO_MS)
    return () => clearInterval(temporizador)
  }, [actualizarContador])

  const cargar = useCallback(async () => {
    const datos = await listarNotificaciones()
    setLista(datos.resultados)
    setNoLeidas(datos.no_leidas)
    anterior.current = datos.no_leidas
  }, [])

  async function leer(notificacion) {
    if (notificacion.leida) return
    await marcarLeida(notificacion.id_notificacion)
    setLista((actual) => actual.map((n) => (n.id_notificacion === notificacion.id_notificacion ? { ...n, leida: true } : n)))
    setNoLeidas((n) => Math.max(0, n - 1))
    anterior.current = Math.max(0, anterior.current - 1)
  }

  async function leerTodas() {
    await marcarTodasLeidas()
    setLista((actual) => actual?.map((n) => ({ ...n, leida: true })) ?? actual)
    setNoLeidas(0)
    anterior.current = 0
  }

  return { noLeidas, lista, cargar, leer, leerTodas }
}
