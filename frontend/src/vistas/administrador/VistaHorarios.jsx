// Horario base de cada médico: bloques por día de la semana con su duración de franja.
import { useEffect, useState } from 'react'

import CampoSeleccion from '../../componentes/CampoSeleccion.jsx'
import MensajeError from '../../componentes/MensajeError.jsx'
import { usarConsulta } from '../../controladores/usarConsulta.js'
import { consultarHorario, guardarHorario, listarUsuarios } from '../../servicios/administracionServicio.js'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const BLOQUE_NUEVO = { dia_semana: 0, hora_inicio: '07:00', hora_fin: '12:00', duracion_minutos: 20 }

export default function VistaHorarios() {
  const { datos: medicos } = usarConsulta(() => listarUsuarios({ rol: 'DOCTOR', activo: 'true' }))
  const [idDoctor, setIdDoctor] = useState('')
  const [bloques, setBloques] = useState(null)
  const [error, setError] = useState(null)
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    setBloques(null)
    setGuardado(false)
    setError(null)
    if (idDoctor) consultarHorario(idDoctor).then((r) => setBloques(r.bloques)).catch(setError)
  }, [idDoctor])

  function cambiar(indice, campo, valor) {
    setGuardado(false)
    setBloques((actuales) => actuales.map((b, i) => (i === indice ? { ...b, [campo]: valor } : b)))
  }

  async function guardar() {
    setError(null)
    try {
      const ordenados = [...bloques].sort((a, b) => a.dia_semana - b.dia_semana || a.hora_inicio.localeCompare(b.hora_inicio))
      const respuesta = await guardarHorario(idDoctor, ordenados)
      setBloques(respuesta.bloques)
      setGuardado(true)
    } catch (e) {
      setError(e)
    }
  }

  return (
    <section className="tarjeta">
      <h2>Horarios de los médicos</h2>
      <CampoSeleccion
        id="horario-medico"
        etiqueta="Médico"
        valor={idDoctor}
        alCambiar={setIdDoctor}
        textoVacio="Seleccione un médico"
        opciones={(medicos ?? []).map((m) => ({
          valor: m.perfil.id_doctor,
          texto: `${m.nombres} ${m.apellidos} · ${m.perfil.especialidad}`,
        }))}
      />

      {bloques && (
        <>
          <table className="tabla">
            <thead>
              <tr>
                <th>Día</th>
                <th>Desde</th>
                <th>Hasta</th>
                <th>Duración de la cita (min)</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {bloques.map((b, i) => (
                <tr key={i}>
                  <td>
                    <select aria-label="Día" value={b.dia_semana} onChange={(e) => cambiar(i, 'dia_semana', Number(e.target.value))}>
                      {DIAS.map((dia, numero) => (
                        <option key={dia} value={numero}>{dia}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input aria-label="Desde" type="time" value={b.hora_inicio} onChange={(e) => cambiar(i, 'hora_inicio', e.target.value)} />
                  </td>
                  <td>
                    <input aria-label="Hasta" type="time" value={b.hora_fin} onChange={(e) => cambiar(i, 'hora_fin', e.target.value)} />
                  </td>
                  <td>
                    <input
                      aria-label="Duración en minutos"
                      type="number"
                      min={10}
                      max={120}
                      step={5}
                      value={b.duracion_minutos}
                      onChange={(e) => cambiar(i, 'duracion_minutos', Number(e.target.value))}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="boton boton--peligro"
                      onClick={() => {
                        setGuardado(false)
                        setBloques((actuales) => actuales.filter((_, j) => j !== i))
                      }}
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bloques.length === 0 && <p>Este médico no tiene horario: no ofrecerá franjas.</p>}

          <MensajeError error={error} />
          {guardado && <p className="mensaje mensaje--exito">Horario guardado.</p>}
          <div className="acciones">
            <button type="button" className="boton boton--secundario" onClick={() => setBloques((a) => [...a, BLOQUE_NUEVO])}>
              Agregar bloque
            </button>
            <button type="button" className="boton" onClick={guardar}>
              Guardar horario
            </button>
          </div>
        </>
      )}
      {!bloques && <MensajeError error={error} />}
    </section>
  )
}
