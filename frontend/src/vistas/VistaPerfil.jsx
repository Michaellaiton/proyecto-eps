// «Mi perfil»: datos de contacto y cambio de contraseña. Común a todos los roles.
import { useState } from 'react'
import { KeyRound, Lock, Mail, Phone, Save, Stethoscope, UserRound } from 'lucide-react'

import Avatar from '../componentes/Avatar.jsx'
import Boton from '../componentes/Boton.jsx'
import Campo from '../componentes/Campo.jsx'
import MensajeError from '../componentes/MensajeError.jsx'
import { usarAvisos } from '../controladores/ContextoAvisos.jsx'
import { usarSesion } from '../controladores/ContextoSesion.jsx'
import { actualizarPerfil, cambiarClave } from '../servicios/autenticacionServicio.js'

const NOMBRES_ROL = { PACIENTE: 'Paciente', DOCTOR: 'Médico', ADMIN: 'Administrador' }

function FormularioContacto() {
  const { usuario, actualizarUsuario } = usarSesion()
  const avisar = usarAvisos()
  const [email, setEmail] = useState(usuario.email ?? '')
  const [telefono, setTelefono] = useState(usuario.telefono ?? '')
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar(evento) {
    evento.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      const cambios = usuario.rol === 'PACIENTE' ? { email, telefono } : { email }
      actualizarUsuario(await actualizarPerfil(cambios))
      avisar.exito('Datos actualizados')
    } catch (e) {
      setError(e)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="tarjeta" onSubmit={guardar}>
      <div className="tarjeta__titulo">
        <Mail size={20} />
        <h2>Contacto</h2>
      </div>
      <div className="rejilla">
        <Campo id="perfil-email" etiqueta="Correo" icono={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {usuario.rol === 'PACIENTE' && (
          <Campo id="perfil-telefono" etiqueta="Teléfono" icono={Phone} inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        )}
      </div>
      <MensajeError error={error} />
      <div>
        <Boton type="submit" icono={Save} cargando={guardando}>
          Guardar
        </Boton>
      </div>
    </form>
  )
}

function FormularioClave() {
  const avisar = usarAvisos()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar(evento) {
    evento.preventDefault()
    setError(null)
    if (nueva !== confirmacion) {
      setError(new Error('Las contraseñas nuevas no coinciden.'))
      return
    }
    setGuardando(true)
    try {
      await cambiarClave(actual, nueva)
      setActual('')
      setNueva('')
      setConfirmacion('')
      avisar.exito('Contraseña cambiada')
    } catch (e) {
      setError(e)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="tarjeta" onSubmit={guardar}>
      <div className="tarjeta__titulo">
        <KeyRound size={20} />
        <h2>Contraseña</h2>
      </div>
      <div className="rejilla">
        <Campo id="clave-actual" etiqueta="Actual" icono={Lock} type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} required />
        <Campo id="clave-nueva" etiqueta="Nueva" icono={KeyRound} type="password" autoComplete="new-password" minLength={8} value={nueva} onChange={(e) => setNueva(e.target.value)} required />
        <Campo id="clave-confirmacion" etiqueta="Repetir nueva" icono={KeyRound} type="password" autoComplete="new-password" minLength={8} value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} required />
      </div>
      <MensajeError error={error} />
      <div>
        <Boton type="submit" icono={Save} cargando={guardando}>
          Cambiar contraseña
        </Boton>
      </div>
    </form>
  )
}

export default function VistaPerfil() {
  const { usuario } = usarSesion()

  return (
    <>
      <section className="tarjeta">
        <div className="celda-persona">
          <Avatar nombre={usuario.nombre} grande />
          <div>
            <h2>{usuario.nombre}</h2>
            <div className="cita__linea">
              <span>
                <UserRound size={15} /> {usuario.username} · {NOMBRES_ROL[usuario.rol]}
              </span>
              {usuario.especialidad && (
                <span>
                  <Stethoscope size={15} /> {usuario.especialidad}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>
      <FormularioContacto />
      <FormularioClave />
    </>
  )
}
