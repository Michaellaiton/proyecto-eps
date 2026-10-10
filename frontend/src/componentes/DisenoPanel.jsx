// Estructura común de los paneles por rol: menú lateral con íconos y contenido de la sección activa.
import { useState } from 'react'
import { LogOut, Menu, X } from 'lucide-react'

import { usarNavegacion } from '../controladores/ContextoNavegacion.jsx'
import { usarSesion } from '../controladores/ContextoSesion.jsx'
import { usarNotificaciones } from '../controladores/usarNotificaciones.js'
import Avatar from './Avatar.jsx'
import Boton from './Boton.jsx'
import CampanaNotificaciones from './CampanaNotificaciones.jsx'
import Marca from './Marca.jsx'

const NOMBRES_ROL = { PACIENTE: 'Paciente', DOCTOR: 'Médico', ADMIN: 'Administrador' }

export default function DisenoPanel({ secciones }) {
  const { usuario, cerrar } = usarSesion()
  const { ruta, irA } = usarNavegacion()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const notificaciones = usarNotificaciones()
  const activa = secciones.find((s) => s.id === ruta) ?? secciones[0]
  const { Vista } = activa

  function elegir(id) {
    irA(id)
    setMenuAbierto(false)
  }

  return (
    <div className="panel">
      {menuAbierto && <div className="velo-menu" aria-hidden="true" onClick={() => setMenuAbierto(false)} />}
      <aside className={`barra-lateral ${menuAbierto ? 'barra-lateral--abierta' : ''}`}>
        <Marca alPulsar={() => elegir(secciones[0].id)} />
        <nav className="barra-lateral__menu" aria-label="Secciones">
          {secciones.map(({ id, texto, icono: Icono }) => (
            <button
              key={id}
              type="button"
              className={`enlace-menu ${id === activa.id ? 'enlace-menu--activo' : ''}`}
              aria-current={id === activa.id ? 'page' : undefined}
              onClick={() => elegir(id)}
            >
              <Icono size={19} />
              {texto}
            </button>
          ))}
        </nav>
        <div className="barra-lateral__usuario">
          <Avatar nombre={usuario.nombre} />
          <div>
            <strong>{usuario.nombre}</strong>
            <small>{NOMBRES_ROL[usuario.rol]}</small>
          </div>
          <Boton variante="fantasma" soloIcono icono={LogOut} ayuda="Cerrar sesión" onClick={cerrar} />
        </div>
      </aside>

      <div>
        <div className="panel__barra-movil">
          <Boton variante="fantasma" soloIcono icono={menuAbierto ? X : Menu} ayuda="Menú" onClick={() => setMenuAbierto((a) => !a)} />
          <Marca alPulsar={() => elegir(secciones[0].id)} />
          <Avatar nombre={usuario.nombre} />
        </div>
        {/* La clave hace que título y vista se monten de nuevo al cambiar de sección. */}
        <main className="panel__contenido" key={activa.id}>
          <header className="panel__encabezado">
            <div className="aparecer">
              <h1>{activa.texto}</h1>
              {activa.guia && <p className="texto-suave">{activa.guia}</p>}
            </div>
            <CampanaNotificaciones notificaciones={notificaciones} />
          </header>
          <Vista />
        </main>
      </div>
    </div>
  )
}
