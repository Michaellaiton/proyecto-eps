// Controlador del flujo de agendamiento (CU-01 y CU-02), tal como el diagrama de flujo del informe:
// especialidad → médico → fecha → disponibilidad → franja → confirmación.
import { useEffect, useState } from 'react'

import { agendarCita } from '../servicios/citasServicio.js'
import { consultarDisponibilidad, listarDoctores, listarEspecialidades } from '../servicios/medicosServicio.js'
import { hoyIso } from '../utilidades/fechas.js'

const SELECCION_INICIAL = { idEspecialidad: '', idDoctor: '', fecha: hoyIso(), hora: '' }

export function usarAgendamiento() {
  const [especialidades, setEspecialidades] = useState(null)
  const [doctores, setDoctores] = useState(null)
  const [franjas, setFranjas] = useState(null)
  const [seleccion, setSeleccion] = useState(SELECCION_INICIAL)
  const [citaConfirmada, setCitaConfirmada] = useState(null)
  const [sugerencia, setSugerencia] = useState(null)
  const [error, setError] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    listarEspecialidades().then(setEspecialidades).catch(setError)
  }, [])

  useEffect(() => {
    setDoctores(null)
    if (seleccion.idEspecialidad) listarDoctores(seleccion.idEspecialidad).then(setDoctores).catch(setError)
  }, [seleccion.idEspecialidad])

  // La disponibilidad se consulta sola al elegir médico y día.
  useEffect(() => {
    setFranjas(null)
    if (!seleccion.idDoctor || !seleccion.fecha) return
    let vigente = true
    consultarDisponibilidad(seleccion.idDoctor, seleccion.fecha)
      .then((r) => vigente && setFranjas(r.franjas))
      .catch((e) => vigente && setError(e))
    return () => {
      vigente = false
    }
  }, [seleccion.idDoctor, seleccion.fecha])

  function elegir(campo, valor) {
    const dependientes = {
      idEspecialidad: { idDoctor: '', hora: '' },
      idDoctor: { hora: '' },
      fecha: { hora: '' },
      hora: {},
    }
    setSeleccion((anterior) => ({ ...anterior, [campo]: valor, ...dependientes[campo] }))
    setSugerencia(null)
    setError(null)
  }

  async function reservar(idDoctor, fecha, hora) {
    setOcupado(true)
    setError(null)
    setSugerencia(null)
    try {
      setCitaConfirmada(await agendarCita(Number(idDoctor), fecha, hora))
    } catch (e) {
      setError(e)
      // Si otro paciente tomó la franja (409), se refresca la disponibilidad y se ofrece la siguiente libre.
      if (e.estado === 409) {
        setSugerencia(e.datos?.sugerencia ?? null)
        setSeleccion((anterior) => ({ ...anterior, hora: '' }))
        consultarDisponibilidad(idDoctor, fecha).then((r) => setFranjas(r.franjas)).catch(() => {})
      }
    } finally {
      setOcupado(false)
    }
  }

  function reiniciar() {
    setSeleccion(SELECCION_INICIAL)
    setCitaConfirmada(null)
    setSugerencia(null)
    setError(null)
  }

  const pasoActual = !seleccion.idEspecialidad ? 0 : !seleccion.idDoctor ? 1 : !seleccion.hora ? 2 : 3
  const especialidad = especialidades?.find((e) => String(e.id_especialidad) === seleccion.idEspecialidad)
  const doctor = doctores?.find((d) => String(d.id_doctor) === seleccion.idDoctor)

  return {
    especialidades, doctores, franjas, seleccion, elegir, pasoActual, especialidad, doctor,
    confirmar: () => reservar(seleccion.idDoctor, seleccion.fecha, seleccion.hora),
    aceptarSugerencia: (s) => reservar(s.id_doctor, s.fecha, s.hora),
    citaConfirmada, sugerencia, error, ocupado, reiniciar,
  }
}
