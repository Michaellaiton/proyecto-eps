// Controlador del simulador: inicia una simulación y sigue su avance (eventos y métricas) mientras corre.
import { useCallback, useEffect, useRef, useState } from 'react'

import { consultarSimulacion, iniciarSimulacion, listarSimulaciones } from '../servicios/simulacionServicio.js'

const INTERVALO_MS = 700

export function usarSimulacion() {
  const [simulacion, setSimulacion] = useState(null)
  const [eventos, setEventos] = useState([])
  const [historial, setHistorial] = useState([])
  const [error, setError] = useState(null)
  const ultimoEvento = useRef(0)

  const cargarHistorial = useCallback(() => {
    listarSimulaciones().then(setHistorial).catch(() => {})
  }, [])

  useEffect(cargarHistorial, [cargarHistorial])

  // Mientras la simulación está en curso se piden solo los eventos nuevos y los resultados parciales.
  useEffect(() => {
    if (simulacion?.estado !== 'EN_CURSO') return
    let vigente = true
    const temporizador = setInterval(async () => {
      try {
        const datos = await consultarSimulacion(simulacion.id_simulacion, ultimoEvento.current)
        if (!vigente) return
        if (datos.eventos.length) {
          ultimoEvento.current = datos.eventos.at(-1).id_evento
          setEventos((actuales) => [...actuales, ...datos.eventos])
        }
        setSimulacion(datos.simulacion)
        if (datos.simulacion.estado !== 'EN_CURSO') cargarHistorial()
      } catch (e) {
        setError(e)
      }
    }, INTERVALO_MS)
    return () => {
      vigente = false
      clearInterval(temporizador)
    }
  }, [simulacion?.id_simulacion, simulacion?.estado, cargarHistorial])

  async function iniciar(datos) {
    setError(null)
    setEventos([])
    ultimoEvento.current = 0
    try {
      setSimulacion(await iniciarSimulacion(datos))
    } catch (e) {
      setError(e)
    }
  }

  async function ver(id) {
    setError(null)
    const datos = await consultarSimulacion(id, 0)
    ultimoEvento.current = datos.eventos.at(-1)?.id_evento ?? 0
    setEventos(datos.eventos)
    setSimulacion(datos.simulacion)
  }

  return { simulacion, eventos, historial, error, iniciar, ver, enCurso: simulacion?.estado === 'EN_CURSO' }
}
