// Gestión de usuarios y roles: crear, editar, activar/desactivar y restablecer contraseña.
import { useState } from 'react'

import CampoSeleccion from '../../componentes/CampoSeleccion.jsx'
import MensajeError from '../../componentes/MensajeError.jsx'
import { usarConsulta } from '../../controladores/usarConsulta.js'
import {
  actualizarUsuario,
  crearUsuario,
  listarEspecialidadesAdmin,
  listarUsuarios,
  restablecerClave,
} from '../../servicios/administracionServicio.js'
import { formatearFechaHora } from '../../utilidades/fechas.js'
import FormularioUsuario from './FormularioUsuario.jsx'

const NOMBRES_ROL = { PACIENTE: 'Paciente', DOCTOR: 'Médico', ADMIN: 'Administrador' }
const FILTROS_VACIOS = { rol: '', activo: '', buscar: '' }

function FormularioClave({ usuario, alCerrar }) {
  const [clave, setClave] = useState('')
  const [error, setError] = useState(null)
  const [hecho, setHecho] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    setError(null)
    try {
      await restablecerClave(usuario.id_usuario, clave)
      setHecho(true)
      setClave('')
    } catch (e) {
      setError(e)
    }
  }

  return (
    <form className="tarjeta tarjeta--resaltada" onSubmit={enviar}>
      <h3>Restablecer contraseña de {usuario.username}</h3>
      <div className="campo">
        <label htmlFor="nueva-clave">Nueva contraseña</label>
        <input
          id="nueva-clave"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          required
        />
      </div>
      <MensajeError error={error} />
      {hecho && <p className="mensaje mensaje--exito">Contraseña actualizada.</p>}
      <div className="acciones">
        <button type="submit" className="boton">Restablecer</button>
        <button type="button" className="boton boton--secundario" onClick={alCerrar}>Cerrar</button>
      </div>
    </form>
  )
}

export default function VistaUsuarios() {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [filtrosAplicados, setFiltrosAplicados] = useState(FILTROS_VACIOS)
  const [panel, setPanel] = useState(null) // {tipo: 'crear' | 'editar' | 'clave', usuario?}
  const [errorAccion, setErrorAccion] = useState(null)
  const usuarios = usarConsulta(() => listarUsuarios(filtrosAplicados), [filtrosAplicados])
  const { datos: especialidades } = usarConsulta(listarEspecialidadesAdmin)

  async function guardar(datos) {
    if (panel.tipo === 'crear') await crearUsuario(datos)
    else await actualizarUsuario(panel.usuario.id_usuario, datos)
    setPanel(null)
    usuarios.recargar()
  }

  async function alternarActivo(usuario) {
    setErrorAccion(null)
    try {
      await actualizarUsuario(usuario.id_usuario, { activo: !usuario.activo })
      usuarios.recargar()
    } catch (e) {
      setErrorAccion(e)
    }
  }

  return (
    <section className="tarjeta">
      <div className="encabezado">
        <h2>Usuarios</h2>
        <button type="button" className="boton" onClick={() => setPanel({ tipo: 'crear' })}>
          Nuevo usuario
        </button>
      </div>

      {(panel?.tipo === 'crear' || panel?.tipo === 'editar') && (
        <FormularioUsuario
          key={panel.usuario?.id_usuario ?? 'nuevo'}
          usuario={panel.usuario}
          especialidades={especialidades ?? []}
          alGuardar={guardar}
          alCancelar={() => setPanel(null)}
        />
      )}
      {panel?.tipo === 'clave' && <FormularioClave usuario={panel.usuario} alCerrar={() => setPanel(null)} />}

      <form
        className="filtros"
        onSubmit={(e) => {
          e.preventDefault()
          setFiltrosAplicados(filtros)
        }}
      >
        <CampoSeleccion
          id="filtro-rol"
          etiqueta="Rol"
          valor={filtros.rol}
          alCambiar={(v) => setFiltros((f) => ({ ...f, rol: v }))}
          opciones={Object.entries(NOMBRES_ROL).map(([valor, texto]) => ({ valor, texto }))}
          textoVacio="Todos"
        />
        <CampoSeleccion
          id="filtro-activo"
          etiqueta="Estado"
          valor={filtros.activo}
          alCambiar={(v) => setFiltros((f) => ({ ...f, activo: v }))}
          opciones={[
            { valor: 'true', texto: 'Activos' },
            { valor: 'false', texto: 'Inactivos' },
          ]}
          textoVacio="Todos"
        />
        <div className="campo">
          <label htmlFor="filtro-buscar">Buscar</label>
          <input
            id="filtro-buscar"
            placeholder="Nombre, usuario o documento"
            value={filtros.buscar}
            onChange={(e) => setFiltros((f) => ({ ...f, buscar: e.target.value }))}
          />
        </div>
        <button type="submit" className="boton">Filtrar</button>
      </form>

      <MensajeError error={usuarios.error || errorAccion} />
      {usuarios.cargando && <p>Cargando…</p>}
      {usuarios.datos && (
        <table className="tabla">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Detalle</th>
              <th>Último acceso</th>
              <th>Estado</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {usuarios.datos.map((u) => (
              <tr key={u.id_usuario} className={u.activo ? '' : 'fila--inactiva'}>
                <td>{u.username}</td>
                <td>{`${u.nombres} ${u.apellidos}`.trim() || '—'}</td>
                <td>{NOMBRES_ROL[u.rol]}</td>
                <td>
                  {u.perfil?.numero_documento && `${u.perfil.tipo_documento} ${u.perfil.numero_documento}`}
                  {u.perfil?.especialidad && `${u.perfil.especialidad} · ${u.perfil.registro_medico}`}
                </td>
                <td>{formatearFechaHora(u.ultimo_acceso)}</td>
                <td>
                  <span className={`estado ${u.activo ? 'estado--agendada' : 'estado--cancelada'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="acciones">
                  <button type="button" className="boton boton--secundario" onClick={() => setPanel({ tipo: 'editar', usuario: u })}>
                    Editar
                  </button>
                  <button type="button" className="boton boton--secundario" onClick={() => setPanel({ tipo: 'clave', usuario: u })}>
                    Clave
                  </button>
                  <button type="button" className="boton boton--secundario" onClick={() => alternarActivo(u)}>
                    {u.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {usuarios.datos?.length === 0 && <p>No hay usuarios con esos filtros.</p>}
    </section>
  )
}
