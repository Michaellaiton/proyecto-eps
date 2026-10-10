// Horario base de cada médico: bloques por día de la semana con su duración de franja.
import { useEffect, useState } from 'react'
import { CalendarOff, Plus, Save, Trash2, UserRound } from 'lucide-react'

import Avatar from '../../componentes/Avatar.jsx'
import Boton from '../../componentes/Boton.jsx'
import { Cargando, Vacio } from '../../componentes/Estados.jsx'
import MensajeError from '../../componentes/MensajeError.jsx'
import SelectorTarjetas from '../../componentes/SelectorTarjetas.jsx'
import { usarAvisos } from '../../controladores/ContextoAvisos.jsx'
import { usarConsulta } from '../../controladores/usarConsulta.js'
import { consultarHorario, guardarHorario, listarUsuarios } from '../../servicios/administracionServicio.js'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const BLOQUE_NUEVO = { dia_semana: 0, hora_inicio: '07:00', hora_fin: '12:00', duracion_minutos: 20 }

export default function VistaHorarios() {
  const { datos: medicos } = usarConsulta(() => listarUsuarios({ rol: 'DOCTOR', activo: 'true' }))
  const avisar = usarAvisos()
  const [idDoctor, setIdDoctor] = useState('')
  const [bloques, setBloques] = useState(null)
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    setBloques(null)
    setError(null)
    if (idDoctor) consultarHorario(idDoctor).then((r) => setBloques(r.bloques)).catch(setError)
  }, [idDoctor])

  const cambiar = (indice, campo, valor) =>
    setBloques((actuales) => actuales.map((b, i) => (i === indice ? { ...b, [campo]: valor } : b)))

  async function guardar() {
    setError(null)
    setGuardando(true)
    try {
      const ordenados = [...bloques].sort((a, b) => a.dia_semana - b.dia_semana || a.hora_inicio.localeCompare(b.hora_inicio))
      setBloques((await guardarHorario(idDoctor, ordenados)).bloques)
      avisar.exito('Horario guardado')
    } catch (e) {
      setError(e)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <section className="tarjeta">
        <div className="tarjeta__titulo">
          <UserRound size={20} />
          <h2>Médico</h2>
        </div>
        {medicos === null ? (
          <Cargando />
        ) : (
          <SelectorTarjetas
            etiqueta="Médico"
            valor={idDoctor}
            alElegir={setIdDoctor}
            opciones={medicos.map((m) => {
              const nombre = `${m.nombres} ${m.apellidos}`
              return { valor: m.perfil.id_doctor, titulo: nombre, detalle: m.perfil.especialidad, figura: <Avatar nombre={nombre} /> }
            })}
          />
        )}
      </section>

      {idDoctor && (
        <section className="tarjeta">
          {bloques === null ? (
            <Cargando />
          ) : (
            <>
              {bloques.length === 0 ? (
                <Vacio icono={CalendarOff} titulo="Sin horario">
                  Este médico no ofrecerá citas hasta que agregues bloques.
                </Vacio>
              ) : (
                <div className="tabla-contenedor">
                  <table className="tabla tabla--adaptable">
                    <thead>
                      <tr>
                        <th>Día</th>
                        <th>Desde</th>
                        <th>Hasta</th>
                        <th>Minutos por cita</th>
                        <th aria-label="Acciones" />
                      </tr>
                    </thead>
                    <tbody>
                      {bloques.map((b, i) => (
                        <tr key={i}>
                          <td>
                            <select aria-label="Día" value={b.dia_semana} onChange={(e) => cambiar(i, 'dia_semana', Number(e.target.value))}>
                              {DIAS.map((dia, numero) => (
                                <option key={dia} value={numero}>
                                  {dia}
                                </option>
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
                              aria-label="Minutos por cita"
                              type="number"
                              min={10}
                              max={120}
                              step={5}
                              value={b.duracion_minutos}
                              onChange={(e) => cambiar(i, 'duracion_minutos', Number(e.target.value))}
                            />
                          </td>
                          <td>
                            <Boton
                              variante="fantasma"
                              soloIcono
                              icono={Trash2}
                              ayuda="Quitar bloque"
                              onClick={() => setBloques((actuales) => actuales.filter((_, j) => j !== i))}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <MensajeError error={error} />
              <div className="acciones">
                <Boton variante="secundario" icono={Plus} onClick={() => setBloques((a) => [...a, BLOQUE_NUEVO])}>
                  Agregar bloque
                </Boton>
                <Boton icono={Save} cargando={guardando} onClick={guardar}>
                  Guardar horario
                </Boton>
              </div>
            </>
          )}
        </section>
      )}
    </>
  )
}
