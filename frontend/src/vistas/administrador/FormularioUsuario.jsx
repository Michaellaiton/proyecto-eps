// Formulario para crear un usuario o editar uno existente. Los campos de perfil cambian según el rol.
import { useState } from 'react'

import CampoSeleccion from '../../componentes/CampoSeleccion.jsx'
import MensajeError from '../../componentes/MensajeError.jsx'

const ROLES = [
  { valor: 'PACIENTE', texto: 'Paciente' },
  { valor: 'DOCTOR', texto: 'Médico' },
  { valor: 'ADMIN', texto: 'Administrador' },
]
const TIPOS_DOCUMENTO = [
  { valor: 'CC', texto: 'Cédula de ciudadanía' },
  { valor: 'TI', texto: 'Tarjeta de identidad' },
  { valor: 'CE', texto: 'Cédula de extranjería' },
  { valor: 'PA', texto: 'Pasaporte' },
  { valor: 'RC', texto: 'Registro civil' },
]

function valoresIniciales(usuario) {
  if (!usuario) {
    return {
      username: '', email: '', password: '', rol: 'PACIENTE', nombres: '', apellidos: '',
      tipo_documento: 'CC', numero_documento: '', telefono: '', fecha_nacimiento: '',
      id_especialidad: '', registro_medico: '',
    }
  }
  const perfil = usuario.perfil ?? {}
  return {
    email: usuario.email ?? '',
    nombres: usuario.nombres ?? '',
    apellidos: usuario.apellidos ?? '',
    telefono: perfil.telefono ?? '',
    id_especialidad: perfil.id_especialidad ?? '',
    registro_medico: perfil.registro_medico ?? '',
  }
}

function Campo({ id, etiqueta, ...propiedades }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      <input id={id} {...propiedades} />
    </div>
  )
}

export default function FormularioUsuario({ usuario, especialidades, alGuardar, alCancelar }) {
  const editando = Boolean(usuario)
  const rol = editando ? usuario.rol : null
  const [valores, setValores] = useState(() => valoresIniciales(usuario))
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const rolActual = rol ?? valores.rol

  const cambiar = (campo) => (e) => setValores((v) => ({ ...v, [campo]: e.target.value }))

  function datosAEnviar() {
    const comunes = ['email', 'nombres', 'apellidos']
    const porRol = {
      PACIENTE: editando ? ['telefono'] : ['tipo_documento', 'numero_documento', 'telefono', 'fecha_nacimiento'],
      DOCTOR: ['id_especialidad', 'registro_medico'],
      ADMIN: [],
    }
    const campos = [...comunes, ...porRol[rolActual], ...(editando ? [] : ['username', 'password', 'rol'])]
    const datos = Object.fromEntries(campos.map((c) => [c, valores[c]]))
    if (datos.id_especialidad) datos.id_especialidad = Number(datos.id_especialidad)
    if (datos.fecha_nacimiento === '') datos.fecha_nacimiento = null
    return datos
  }

  async function enviar(evento) {
    evento.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      await alGuardar(datosAEnviar())
    } catch (e) {
      setError(e)
      setGuardando(false)
    }
  }

  return (
    <form className="tarjeta tarjeta--resaltada" onSubmit={enviar}>
      <h3>{editando ? `Editar usuario ${usuario.username}` : 'Nuevo usuario'}</h3>

      <div className="rejilla">
        {!editando && (
          <>
            <CampoSeleccion
              id="f-rol"
              etiqueta="Rol"
              valor={valores.rol}
              alCambiar={(v) => setValores((x) => ({ ...x, rol: v || 'PACIENTE' }))}
              opciones={ROLES}
              textoVacio="Seleccione"
            />
            <Campo id="f-username" etiqueta="Usuario" value={valores.username} onChange={cambiar('username')} required />
            <Campo
              id="f-password"
              etiqueta="Contraseña inicial"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={valores.password}
              onChange={cambiar('password')}
              required
            />
          </>
        )}
        <Campo id="f-nombres" etiqueta="Nombres" value={valores.nombres} onChange={cambiar('nombres')} required />
        <Campo id="f-apellidos" etiqueta="Apellidos" value={valores.apellidos} onChange={cambiar('apellidos')} required />
        <Campo id="f-email" etiqueta="Correo" type="email" value={valores.email} onChange={cambiar('email')} />

        {rolActual === 'PACIENTE' && !editando && (
          <>
            <CampoSeleccion
              id="f-tipo-doc"
              etiqueta="Tipo de documento"
              valor={valores.tipo_documento}
              alCambiar={(v) => setValores((x) => ({ ...x, tipo_documento: v }))}
              opciones={TIPOS_DOCUMENTO}
              textoVacio="Seleccione"
            />
            <Campo
              id="f-num-doc"
              etiqueta="Número de documento"
              value={valores.numero_documento}
              onChange={cambiar('numero_documento')}
              required
            />
            <Campo
              id="f-nacimiento"
              etiqueta="Fecha de nacimiento"
              type="date"
              value={valores.fecha_nacimiento}
              onChange={cambiar('fecha_nacimiento')}
            />
          </>
        )}
        {rolActual === 'PACIENTE' && (
          <Campo id="f-telefono" etiqueta="Teléfono" value={valores.telefono} onChange={cambiar('telefono')} required />
        )}
        {rolActual === 'DOCTOR' && (
          <>
            <CampoSeleccion
              id="f-especialidad"
              etiqueta="Especialidad"
              valor={valores.id_especialidad}
              alCambiar={(v) => setValores((x) => ({ ...x, id_especialidad: v }))}
              opciones={especialidades.map((e) => ({ valor: e.id_especialidad, texto: e.nombre }))}
              textoVacio="Seleccione una especialidad"
            />
            <Campo
              id="f-registro"
              etiqueta="Registro médico"
              value={valores.registro_medico}
              onChange={cambiar('registro_medico')}
              required
            />
          </>
        )}
      </div>

      <MensajeError error={error} />
      <div className="acciones">
        <button type="submit" className="boton" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" className="boton boton--secundario" onClick={alCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
