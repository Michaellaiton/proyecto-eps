// Formulario para crear o editar un usuario. Los campos de perfil cambian según el rol.
import { useState } from 'react'
import { BadgeCheck, CalendarDays, IdCard, KeyRound, Mail, Phone, Save, ShieldCheck, Stethoscope, UserRound } from 'lucide-react'

import Boton from '../../componentes/Boton.jsx'
import Campo from '../../componentes/Campo.jsx'
import CampoSeleccion from '../../componentes/CampoSeleccion.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import MensajeError from '../../componentes/MensajeError.jsx'
import SelectorTarjetas from '../../componentes/SelectorTarjetas.jsx'

const ROLES = [
  { valor: 'PACIENTE', titulo: 'Paciente', icono: UserRound },
  { valor: 'DOCTOR', titulo: 'Médico', icono: Stethoscope },
  { valor: 'ADMIN', titulo: 'Administrador', icono: ShieldCheck },
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
    id_especialidad: String(perfil.id_especialidad ?? ''),
    registro_medico: perfil.registro_medico ?? '',
  }
}

export default function FormularioUsuario({ usuario, especialidades, alGuardar, alCerrar }) {
  const editando = Boolean(usuario)
  const [valores, setValores] = useState(() => valoresIniciales(usuario))
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const rol = editando ? usuario.rol : valores.rol

  const cambiar = (campo) => (e) => setValores((v) => ({ ...v, [campo]: e.target.value }))
  const fijar = (campo) => (valor) => setValores((v) => ({ ...v, [campo]: valor }))

  function datosAEnviar() {
    const porRol = {
      PACIENTE: editando ? ['telefono'] : ['tipo_documento', 'numero_documento', 'telefono', 'fecha_nacimiento'],
      DOCTOR: ['id_especialidad', 'registro_medico'],
      ADMIN: [],
    }
    const campos = ['email', 'nombres', 'apellidos', ...porRol[rol], ...(editando ? [] : ['username', 'password', 'rol'])]
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
    <Dialogo titulo={editando ? 'Editar usuario' : 'Nuevo usuario'} alCerrar={alCerrar} ancho>
      <form className="grupo-franjas" onSubmit={enviar}>
        <h2>{editando ? `Editar ${usuario.username}` : 'Nuevo usuario'}</h2>

        {!editando && <SelectorTarjetas etiqueta="Rol" valor={valores.rol} alElegir={fijar('rol')} opciones={ROLES} />}

        <div className="rejilla">
          {!editando && (
            <>
              <Campo id="f-username" etiqueta="Usuario" icono={UserRound} value={valores.username} onChange={cambiar('username')} required />
              <Campo
                id="f-password"
                etiqueta="Contraseña inicial"
                icono={KeyRound}
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
          <Campo id="f-email" etiqueta="Correo" icono={Mail} type="email" value={valores.email} onChange={cambiar('email')} />

          {rol === 'PACIENTE' && !editando && (
            <>
              <CampoSeleccion id="f-tipo-doc" etiqueta="Tipo de documento" valor={valores.tipo_documento} alCambiar={fijar('tipo_documento')} opciones={TIPOS_DOCUMENTO} />
              <Campo id="f-num-doc" etiqueta="Número de documento" icono={IdCard} value={valores.numero_documento} onChange={cambiar('numero_documento')} required />
              <Campo id="f-nacimiento" etiqueta="Fecha de nacimiento" icono={CalendarDays} type="date" value={valores.fecha_nacimiento} onChange={cambiar('fecha_nacimiento')} />
            </>
          )}
          {rol === 'PACIENTE' && (
            <Campo id="f-telefono" etiqueta="Teléfono" icono={Phone} inputMode="tel" value={valores.telefono} onChange={cambiar('telefono')} required />
          )}
          {rol === 'DOCTOR' && (
            <>
              <CampoSeleccion
                id="f-especialidad"
                etiqueta="Especialidad"
                valor={valores.id_especialidad}
                alCambiar={fijar('id_especialidad')}
                textoVacio="Seleccione"
                opciones={especialidades.map((e) => ({ valor: String(e.id_especialidad), texto: e.nombre }))}
              />
              <Campo id="f-registro" etiqueta="Registro médico" icono={BadgeCheck} value={valores.registro_medico} onChange={cambiar('registro_medico')} required />
            </>
          )}
        </div>

        <MensajeError error={error} />
        <div className="acciones">
          <Boton type="submit" icono={Save} cargando={guardando}>
            Guardar
          </Boton>
          <Boton variante="fantasma" onClick={alCerrar}>
            Cancelar
          </Boton>
        </div>
      </form>
    </Dialogo>
  )
}
