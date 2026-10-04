// Controlador genérico de lectura: ejecuta `consultar` cuando cambian las dependencias
// y expone datos, error, estado de carga y una función para recargar.
import { useCallback, useEffect, useState } from 'react'

export function usarConsulta(consultar, dependencias = []) {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError(null)
    consultar()
      .then((resultado) => vigente && setDatos(resultado))
      .catch((e) => vigente && setError(e))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, version])

  const recargar = useCallback(() => setVersion((v) => v + 1), [])

  return { datos, error, cargando, recargar }
}
