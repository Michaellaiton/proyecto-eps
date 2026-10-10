// Catálogo de especialidades en tarjetas: crear, renombrar y eliminar (solo si no tiene médicos).
import { useState } from 'react'
import { Check, Pencil, Plus, Stethoscope, Trash2, X } from 'lucide-react'

import Boton from '../../componentes/Boton.jsx'
import Campo from '../../componentes/Campo.jsx'
import { DialogoConfirmacion } from '../../componentes/Dialogo.jsx'
import { Cargando, Vacio } from '../../componentes/Estados.jsx'
import MensajeError from '../../componentes/MensajeError.jsx'
import { usarAvisos } from '../../controladores/ContextoAvisos.jsx'
import { usarConsulta } from '../../controladores/usarConsulta.js'
import {
  crearEspecialidad,
  eliminarEspecialidad,
  listarEspecialidadesAdmin,
  renombrarEspecialidad,
} from '../../servicios/administracionServicio.js'
import { iconoDeEspecialidad } from '../../utilidades/especialidades.js'

export default function VistaEspecialidades() {
  const especialidades = usarConsulta(listarEspecialidadesAdmin)
  const avisar = usarAvisos()
  const [nueva, setNueva] = useState('')
  const [edicion, setEdicion] = useState(null) // {id, nombre}
  const [porEliminar, setPorEliminar] = useState(null)

  async function ejecutar(accion, mensaje) {
    try {
      await accion()
      avisar.exito(mensaje)
      especialidades.recargar()
      return true
    } catch (e) {
      avisar.error(e)
      return false
    }
  }

  async function agregar(evento) {
    evento.preventDefault()
    if (await ejecutar(() => crearEspecialidad(nueva.trim()), 'Especialidad creada')) setNueva('')
  }

  async function guardarEdicion() {
    if (await ejecutar(() => renombrarEspecialidad(edicion.id, edicion.nombre.trim()), 'Nombre actualizado')) setEdicion(null)
  }

  return (
    <section className="tarjeta">
      <form className="filtros" onSubmit={agregar}>
        <Campo
          id="nueva-especialidad"
          icono={Stethoscope}
          placeholder="Nueva especialidad"
          aria-label="Nueva especialidad"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          required
          maxLength={80}
        />
        <Boton type="submit" icono={Plus}>
          Agregar
        </Boton>
      </form>

      <MensajeError error={especialidades.error} />
      {especialidades.cargando ? (
        <Cargando />
      ) : especialidades.datos?.length === 0 ? (
        <Vacio icono={Stethoscope} titulo="Aún no hay especialidades" />
      ) : (
        <div className="selector-tarjetas">
          {especialidades.datos?.map((e) => {
            const Icono = iconoDeEspecialidad(e.nombre)
            const editando = edicion?.id === e.id_especialidad
            return (
              <div key={e.id_especialidad} className="opcion-tarjeta opcion-tarjeta--estatica">
                <span className="opcion-tarjeta__icono">
                  <Icono size={22} />
                </span>
                {editando ? (
                  <input
                    className="entrada"
                    aria-label={`Nuevo nombre para ${e.nombre}`}
                    value={edicion.nombre}
                    onChange={(ev) => setEdicion({ ...edicion, nombre: ev.target.value })}
                    maxLength={80}
                    autoFocus
                  />
                ) : (
                  <span className="opcion-tarjeta__titulo">{e.nombre}</span>
                )}
                <div className="acciones">
                  {editando ? (
                    <>
                      <Boton variante="secundario" soloIcono icono={Check} ayuda="Guardar" onClick={guardarEdicion} />
                      <Boton variante="fantasma" soloIcono icono={X} ayuda="Cancelar" onClick={() => setEdicion(null)} />
                    </>
                  ) : (
                    <>
                      <Boton variante="fantasma" soloIcono icono={Pencil} ayuda="Renombrar" onClick={() => setEdicion({ id: e.id_especialidad, nombre: e.nombre })} />
                      <Boton variante="fantasma" soloIcono icono={Trash2} ayuda="Eliminar" onClick={() => setPorEliminar(e)} />
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {porEliminar && (
        <DialogoConfirmacion
          titulo={`¿Eliminar ${porEliminar.nombre}?`}
          mensaje="Solo es posible si no tiene médicos asignados."
          textoConfirmar="Eliminar"
          alConfirmar={async () => {
            await ejecutar(() => eliminarEspecialidad(porEliminar.id_especialidad), 'Especialidad eliminada')
            setPorEliminar(null)
          }}
          alCerrar={() => setPorEliminar(null)}
        />
      )}
    </section>
  )
}
