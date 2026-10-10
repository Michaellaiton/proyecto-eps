// Gestión de usuarios y roles: crear, editar, activar/desactivar y restablecer contraseña.
import { useState } from 'react'
import { KeyRound, Pencil, Save, Search, ShieldCheck, Stethoscope, UserCheck, UserPlus, UserRound, Users, UserX } from 'lucide-react'

import Avatar from '../../componentes/Avatar.jsx'
import Boton from '../../componentes/Boton.jsx'
import Campo from '../../componentes/Campo.jsx'
import CampoSeleccion from '../../componentes/CampoSeleccion.jsx'
import Dialogo, { DialogoConfirmacion } from '../../componentes/Dialogo.jsx'
import { Cargando, Vacio } from '../../componentes/Estados.jsx'
import Insignia from '../../componentes/Insignia.jsx'
import MensajeError from '../../componentes/MensajeError.jsx'
import { usarAvisos } from '../../controladores/ContextoAvisos.jsx'
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

const ROLES = {
  PACIENTE: { texto: 'Paciente', icono: UserRound, tono: undefined },
  DOCTOR: { texto: 'Médico', icono: Stethoscope, tono: 'info' },
  ADMIN: { texto: 'Administrador', icono: ShieldCheck, tono: 'aviso' },
}
const FILTROS_VACIOS = { rol: '', activo: '', buscar: '' }

function DialogoClave({ usuario, alCerrar }) {
  const avisar = usarAvisos()
  const [clave, setClave] = useState('')
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      await restablecerClave(usuario.id_usuario, clave)
      avisar.exito(`Contraseña de ${usuario.username} restablecida`)
      alCerrar()
    } catch (e) {
      setError(e)
      setGuardando(false)
    }
  }

  return (
    <Dialogo titulo="Restablecer contraseña" alCerrar={alCerrar}>
      <form className="grupo-franjas" onSubmit={enviar}>
        <span className="dialogo__icono dialogo__icono--info">
          <KeyRound size={24} />
        </span>
        <h3>Nueva contraseña para {usuario.username}</h3>
        <Campo id="nueva-clave" etiqueta="Nueva contraseña" icono={KeyRound} type="password" autoComplete="new-password" minLength={8} value={clave} onChange={(e) => setClave(e.target.value)} required autoFocus />
        <MensajeError error={error} />
        <div className="acciones">
          <Boton type="submit" icono={Save} cargando={guardando}>
            Restablecer
          </Boton>
          <Boton variante="fantasma" onClick={alCerrar}>
            Cancelar
          </Boton>
        </div>
      </form>
    </Dialogo>
  )
}

export default function VistaUsuarios() {
  const avisar = usarAvisos()
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [aplicados, setAplicados] = useState(FILTROS_VACIOS)
  const [dialogo, setDialogo] = useState(null) // {tipo: 'crear' | 'editar' | 'clave' | 'estado', usuario?}
  const usuarios = usarConsulta(() => listarUsuarios(aplicados), [aplicados])
  const { datos: especialidades } = usarConsulta(listarEspecialidadesAdmin)
  const cerrar = () => setDialogo(null)

  async function guardar(datos) {
    if (dialogo.tipo === 'crear') await crearUsuario(datos)
    else await actualizarUsuario(dialogo.usuario.id_usuario, datos)
    avisar.exito(dialogo.tipo === 'crear' ? 'Usuario creado' : 'Cambios guardados')
    cerrar()
    usuarios.recargar()
  }

  async function alternarActivo() {
    const { usuario } = dialogo
    try {
      await actualizarUsuario(usuario.id_usuario, { activo: !usuario.activo })
      avisar.exito(usuario.activo ? `${usuario.username} desactivado` : `${usuario.username} activado`)
      usuarios.recargar()
    } catch (e) {
      avisar.error(e)
    } finally {
      cerrar()
    }
  }

  return (
    <section className="tarjeta">
      <div className="tarjeta__encabezado">
        <form
          className="filtros filtros--expandir"
          onSubmit={(e) => {
            e.preventDefault()
            setAplicados(filtros)
          }}
        >
          <Campo
            id="filtro-buscar"
            icono={Search}
            placeholder="Nombre, usuario o documento"
            aria-label="Buscar"
            value={filtros.buscar}
            onChange={(e) => setFiltros((f) => ({ ...f, buscar: e.target.value }))}
          />
          <CampoSeleccion
            id="filtro-rol"
            valor={filtros.rol}
            alCambiar={(v) => setFiltros((f) => ({ ...f, rol: v }))}
            opciones={Object.entries(ROLES).map(([valor, { texto }]) => ({ valor, texto }))}
            textoVacio="Todos los roles"
          />
          <CampoSeleccion
            id="filtro-activo"
            valor={filtros.activo}
            alCambiar={(v) => setFiltros((f) => ({ ...f, activo: v }))}
            opciones={[
              { valor: 'true', texto: 'Activos' },
              { valor: 'false', texto: 'Inactivos' },
            ]}
            textoVacio="Todos los estados"
          />
          <Boton type="submit" variante="secundario" icono={Search}>
            Buscar
          </Boton>
        </form>
        <Boton icono={UserPlus} onClick={() => setDialogo({ tipo: 'crear' })}>
          Nuevo
        </Boton>
      </div>

      <MensajeError error={usuarios.error} />
      {usuarios.cargando ? (
        <Cargando />
      ) : usuarios.datos?.length === 0 ? (
        <Vacio icono={Users} titulo="Sin resultados" />
      ) : (
        <div className="tabla-contenedor">
          <table className="tabla tabla--adaptable">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Último acceso</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {usuarios.datos?.map((u) => {
                const nombre = `${u.nombres} ${u.apellidos}`.trim() || u.username
                const rol = ROLES[u.rol]
                return (
                  <tr key={u.id_usuario} className={u.activo ? '' : 'fila--inactiva'}>
                    <td>
                      <div className="celda-persona">
                        <Avatar nombre={nombre} />
                        <div>
                          <strong>{nombre}</strong>
                          <small>
                            {u.username}
                            {u.perfil?.numero_documento && ` · ${u.perfil.tipo_documento} ${u.perfil.numero_documento}`}
                            {u.perfil?.especialidad && ` · ${u.perfil.especialidad}`}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td className="sin-salto">
                      <Insignia tono={rol.tono} icono={rol.icono}>
                        {rol.texto}
                      </Insignia>
                    </td>
                    <td className="texto-suave sin-salto">{formatearFechaHora(u.ultimo_acceso)}</td>
                    <td>
                      <Insignia tono={u.activo ? 'exito' : 'peligro'}>{u.activo ? 'Activo' : 'Inactivo'}</Insignia>
                    </td>
                    <td>
                      <div className="acciones acciones--compactas">
                        <Boton variante="fantasma" soloIcono icono={Pencil} ayuda="Editar" onClick={() => setDialogo({ tipo: 'editar', usuario: u })} />
                        <Boton variante="fantasma" soloIcono icono={KeyRound} ayuda="Restablecer contraseña" onClick={() => setDialogo({ tipo: 'clave', usuario: u })} />
                        <Boton
                          variante="fantasma"
                          soloIcono
                          icono={u.activo ? UserX : UserCheck}
                          ayuda={u.activo ? 'Desactivar' : 'Activar'}
                          onClick={() => setDialogo({ tipo: 'estado', usuario: u })}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {(dialogo?.tipo === 'crear' || dialogo?.tipo === 'editar') && (
        <FormularioUsuario usuario={dialogo.usuario} especialidades={especialidades ?? []} alGuardar={guardar} alCerrar={cerrar} />
      )}
      {dialogo?.tipo === 'clave' && <DialogoClave usuario={dialogo.usuario} alCerrar={cerrar} />}
      {dialogo?.tipo === 'estado' && (
        <DialogoConfirmacion
          titulo={dialogo.usuario.activo ? `¿Desactivar a ${dialogo.usuario.username}?` : `¿Activar a ${dialogo.usuario.username}?`}
          mensaje={dialogo.usuario.activo ? 'No podrá iniciar sesión. Su historial se conserva.' : 'Podrá volver a iniciar sesión.'}
          textoConfirmar={dialogo.usuario.activo ? 'Desactivar' : 'Activar'}
          peligroso={dialogo.usuario.activo}
          alConfirmar={alternarActivo}
          alCerrar={cerrar}
        />
      )}
    </section>
  )
}
