// Controlador: une la vista con el servicio y maneja estados de carga y error.
import { useEffect, useState } from 'react'

import { consultarSalud } from '../servicios/saludServicio.js'

export function usarSalud() {
  const [salud, setSalud] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    consultarSalud().then(setSalud).catch(setError)
  }, [])

  return { salud, error, cargando: !salud && !error }
}
