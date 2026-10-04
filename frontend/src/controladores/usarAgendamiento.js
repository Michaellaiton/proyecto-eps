// Controlador del flujo de agendamiento (CU-01 y CU-02):
// especialidad → médico → fecha → franja → confirmación.
import { useEffect, useState } from 'react'

import { agendarCita } from '../servicios/citasServicio.js'
import { consultarDisponibilidad, listarDoctores, listarEspecialidades } from '../servicios/medicosServicio.js'

export function usarAgendamiento() {
  const [especialidades, setEspecialidades] = useState([])
  const [doctores, setDoctores] = useState([])
  const [franjas, setFranjas] = useState(null)
  const [seleccion, setSeleccion] = useState({ idEspecialidad: '', idDoctor: '', fecha: '', hora: '' })
  const [citaConfirmada, setCitaConfirmada] = useState(null)
  const [sugerencia, setSugerencia] = useState(null)
  const [error, setError] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    listarEspecialidades().then(setEspecialidades).catch(setError)
  }, [])

  useEffect(() => {
    setDoctores([])
    if (seleccion.idEspecialidad) listarDoctores(seleccion.idEspecialidad).then(setDoctores).catch(setError)
  }, [seleccion.idEspecialidad])

  function limpiarMensajes() {
    setCitaConfirmada(null)
    setSugerencia(null)
    setError(null)
  }

  function elegir(campo, valor) {
    const dependientes = {
      idEspecialidad: { idDoctor: '', hora: '' },
      idDoctor: { hora: '' },
      fecha: { hora: '' },
      hora: {},
    }
    setSeleccion((anterior) => ({ ...anterior, [campo]: valor, ...dependientes[campo] }))
    if (campo !== 'hora') setFranjas(null)
    limpiarMensajes()
  }

  async function cargarFranjas(idDoctor, fecha) {
    const respuesta = await consultarDisponibilidad(idDoctor, fecha)
    setFranjas(respuesta.franjas)
  }

  async function consultar() {
    setOcupado(true)
    limpiarMensajes()
    try {
      await cargarFranjas(seleccion.idDoctor, seleccion.fecha)
    } catch (e) {
      setError(e)
    } finally {
      setOcupado(false)
    }
  }

  async function reservar(idDoctor, fecha, hora) {
    setOcupado(true)
    limpiarMensajes()
    try {
      const cita = await agendarCita(Number(idDoctor), fecha, hora)
      setCitaConfirmada(cita)
      setSeleccion((anterior) => ({ ...anterior, fecha, hora: '' }))
      await cargarFranjas(idDoctor, fecha)
    } catch (e) {
      setError(e)
      // Si otro paciente tomó la franja (409), se refresca la disponibilidad y se ofrece la siguiente libre.
      if (e.estado === 409) {
        setSugerencia(e.datos?.sugerencia ?? null)
        setSeleccion((anterior) => ({ ...anterior, hora: '' }))
        await cargarFranjas(idDoctor, fecha).catch(() => {})
      }
    } finally {
      setOcupado(false)
    }
  }

  const confirmar = () => reservar(seleccion.idDoctor, seleccion.fecha, seleccion.hora)
  const aceptarSugerencia = (s) => reservar(s.id_doctor, s.fecha, s.hora)

  return {
    especialidades, doctores, franjas, seleccion, elegir, consultar, confirmar,
    citaConfirmada, sugerencia, aceptarSugerencia, error, ocupado,
  }
}
