// Controlador de "Mis citas": lista las citas del paciente, permite cancelarlas y reprogramarlas (CU-03).
import { useCallback, useEffect, useState } from 'react'

import { cancelarCita, listarMisCitas } from '../servicios/citasServicio.js'

export function usarMisCitas() {
  const [citas, setCitas] = useState(null)
  const [error, setError] = useState(null)
  const [mensaje, setMensaje] = useState(null)

  const recargar = useCallback(() => {
    listarMisCitas().then(setCitas).catch(setError)
  }, [])

  useEffect(recargar, [recargar])

  async function cancelar(idCita) {
    setError(null)
    setMensaje(null)
    try {
      const cancelada = await cancelarCita(idCita)
      setCitas((actuales) => actuales.map((cita) => (cita.id_cita === idCita ? cancelada : cita)))
      setMensaje('La cita fue cancelada y el cupo quedó libre para otro paciente.')
    } catch (e) {
      setError(e)
    }
  }

  function alReprogramar(nueva) {
    setError(null)
    setMensaje(`Cita reprogramada para las ${nueva.hora} con ${nueva.doctor}.`)
    recargar()
  }

  return { citas, error, mensaje, cancelar, alReprogramar }
}
