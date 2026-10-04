import { useState } from 'react'

import IndicadorEstado from '../componentes/IndicadorEstado.jsx'
import MensajeError from '../componentes/MensajeError.jsx'
import { usarSesion } from '../controladores/ContextoSesion.jsx'
import { usarSalud } from '../controladores/usarSalud.js'

export default function VistaIniciarSesion() {
  const { iniciar } = usarSesion()
  const { salud, error: errorSalud } = usarSalud()
  const [nombreUsuario, setNombreUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      await iniciar(nombreUsuario, contrasena)
    } catch (e) {
      setError(e)
      setEnviando(false)
    }
  }

  return (
    <main className="contenedor contenedor--angosto">
      <h1>Sistema de agendamiento de citas EPS</h1>
      <form className="tarjeta" onSubmit={enviar}>
        <h2>Iniciar sesión</h2>
        <div className="campo">
          <label htmlFor="nombre-usuario">Usuario</label>
          <input
            id="nombre-usuario"
            autoComplete="username"
            value={nombreUsuario}
            onChange={(e) => setNombreUsuario(e.target.value)}
            required
          />
        </div>
        <div className="campo">
          <label htmlFor="contrasena">Contraseña</label>
          <input
            id="contrasena"
            type="password"
            autoComplete="current-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
          />
        </div>
        <MensajeError error={error} />
        <button type="submit" className="boton" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>

      <section className="estado-servicios" aria-label="Estado de los servicios">
        <IndicadorEstado etiqueta="API" correcto={!!salud} texto={salud ? `Versión ${salud.version}` : errorSalud ? 'Sin conexión' : '…'} />
        <IndicadorEstado
          etiqueta="Base de datos"
          correcto={salud?.base_datos === 'disponible'}
          texto={salud?.base_datos ?? '…'}
        />
      </section>
    </main>
  )
}
