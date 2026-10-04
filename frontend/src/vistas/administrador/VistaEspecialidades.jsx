// Catálogo de especialidades: crear, renombrar y eliminar (solo si no tiene médicos).
import { useState } from 'react'

import MensajeError from '../../componentes/MensajeError.jsx'
import { usarConsulta } from '../../controladores/usarConsulta.js'
import {
  crearEspecialidad,
  eliminarEspecialidad,
  listarEspecialidadesAdmin,
  renombrarEspecialidad,
} from '../../servicios/administracionServicio.js'

export default function VistaEspecialidades() {
  const especialidades = usarConsulta(listarEspecialidadesAdmin)
  const [nueva, setNueva] = useState('')
  const [edicion, setEdicion] = useState(null) // {id, nombre}
  const [error, setError] = useState(null)

  async function ejecutar(accion) {
    setError(null)
    try {
      await accion()
      especialidades.recargar()
      return true
    } catch (e) {
      setError(e)
      return false
    }
  }

  async function agregar(evento) {
    evento.preventDefault()
    if (await ejecutar(() => crearEspecialidad(nueva.trim()))) setNueva('')
  }

  async function guardarEdicion() {
    if (await ejecutar(() => renombrarEspecialidad(edicion.id, edicion.nombre.trim()))) setEdicion(null)
  }

  return (
    <section className="tarjeta">
      <h2>Especialidades</h2>

      <form className="filtros" onSubmit={agregar}>
        <div className="campo">
          <label htmlFor="nueva-especialidad">Nueva especialidad</label>
          <input id="nueva-especialidad" value={nueva} onChange={(e) => setNueva(e.target.value)} required maxLength={80} />
        </div>
        <button type="submit" className="boton">Agregar</button>
      </form>

      <MensajeError error={especialidades.error || error} />
      {especialidades.datos && (
        <table className="tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {especialidades.datos.map((e) => (
              <tr key={e.id_especialidad}>
                <td>
                  {edicion?.id === e.id_especialidad ? (
                    <input
                      aria-label={`Nuevo nombre para ${e.nombre}`}
                      value={edicion.nombre}
                      onChange={(ev) => setEdicion({ ...edicion, nombre: ev.target.value })}
                      maxLength={80}
                    />
                  ) : (
                    e.nombre
                  )}
                </td>
                <td className="acciones">
                  {edicion?.id === e.id_especialidad ? (
                    <>
                      <button type="button" className="boton boton--secundario" onClick={guardarEdicion}>Guardar</button>
                      <button type="button" className="boton boton--secundario" onClick={() => setEdicion(null)}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="boton boton--secundario"
                        onClick={() => setEdicion({ id: e.id_especialidad, nombre: e.nombre })}
                      >
                        Renombrar
                      </button>
                      <button
                        type="button"
                        className="boton boton--peligro"
                        onClick={() => ejecutar(() => eliminarEspecialidad(e.id_especialidad))}
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
