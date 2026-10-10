import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, Lock, LogIn, Stethoscope, UserRound } from 'lucide-react'

import Boton from '../componentes/Boton.jsx'
import Campo from '../componentes/Campo.jsx'
import MensajeError from '../componentes/MensajeError.jsx'
import { usarNavegacion } from '../controladores/ContextoNavegacion.jsx'
import { usarSesion } from '../controladores/ContextoSesion.jsx'
import { usarSalud } from '../controladores/usarSalud.js'

export default function VistaIniciarSesion() {
  const { iniciar } = usarSesion()
  const { irA } = usarNavegacion()
  const { salud } = usarSalud()
  const [nombreUsuario, setNombreUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [verContrasena, setVerContrasena] = useState(false)
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      await iniciar(nombreUsuario.trim(), contrasena)
      irA('')
    } catch (e) {
      setError(e)
      setEnviando(false)
    }
  }

  return (
    <main className="acceso">
      <form className="acceso__tarjeta" onSubmit={enviar}>
        <div className="acceso__encabezado">
          <span className="marca__logo marca__logo--grande">
            <Stethoscope size={28} />
          </span>
          <h2>Bienvenido</h2>
          <p className="texto-suave">Ingresa para gestionar tus citas</p>
        </div>

        <Campo
          id="nombre-usuario"
          etiqueta="Usuario"
          icono={UserRound}
          autoComplete="username"
          value={nombreUsuario}
          onChange={(e) => setNombreUsuario(e.target.value)}
          required
          autoFocus
        />
        <Campo
          id="contrasena"
          etiqueta="Contraseña"
          icono={Lock}
          type={verContrasena ? 'text' : 'password'}
          autoComplete="current-password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          required
          accion={
            <Boton
              variante="fantasma"
              soloIcono
              icono={verContrasena ? EyeOff : Eye}
              ayuda={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onClick={() => setVerContrasena((v) => !v)}
            />
          }
        />

        <MensajeError error={error} />
        <Boton type="submit" tamano="grande" icono={LogIn} cargando={enviando}>
          Ingresar
        </Boton>
        <Boton variante="fantasma" icono={ArrowLeft} onClick={() => irA('')}>
          Volver al inicio
        </Boton>

        <div className="estado-servicios" aria-label="Estado de los servicios">
          <span className={`punto-estado ${salud ? 'punto-estado--ok' : ''}`}>Servidor</span>
          <span className={`punto-estado ${salud?.base_datos === 'disponible' ? 'punto-estado--ok' : ''}`}>Base de datos</span>
        </div>
      </form>
    </main>
  )
}
