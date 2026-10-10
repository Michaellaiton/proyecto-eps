// Controlador de "Mis citas": lista las citas del paciente, permite cancelarlas y reprogramarlas (CU-03).
import { useCallback, useEffect, useState } from 'react'

import { cancelarCita, listarMisCitas } from '../servicios/citasServicio.js'
import { hoyIso } from '../utilidades/fechas.js'

export function usarMisCitas() {
  const [citas, setCitas] = useState(null)
  const [error, setError] = useState(null)

  const recargar = useCallback(() => {
    listarMisCitas().then(setCitas).catch(setError)
  }, [])

  useEffect(recargar, [recargar])

  async function cancelar(idCita) {
    const cancelada = await cancelarCita(idCita)
    setCitas((actuales) => actuales.map((cita) => (cita.id_cita === idCita ? cancelada : cita)))
  }

  // Próximas: agendadas desde hoy, de la más cercana a la más lejana. El resto es historial.
  const hoy = hoyIso()
  const proximas = (citas ?? []).filter((c) => c.estado === 'Agendada' && c.fecha >= hoy).reverse()
  const historial = (citas ?? []).filter((c) => !proximas.includes(c))

  return { citas, proximas, historial, error, cancelar, recargar }
}
