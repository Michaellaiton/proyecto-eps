// Campana de notificaciones internas con panel desplegable.
import { useEffect, useRef, useState } from 'react'
import { Bell, BellRing, CalendarCheck, CalendarDays, CheckCheck, Info, ShieldAlert } from 'lucide-react'

import { usarNavegacion } from '../controladores/ContextoNavegacion.jsx'
import { haceTiempo } from '../utilidades/fechas.js'
import Boton from './Boton.jsx'
import { Cargando, Vacio } from './Estados.jsx'

const ICONO_POR_TIPO = {
  CITA: CalendarCheck,
  RECORDATORIO: BellRing,
  AGENDA: CalendarDays,
  SEGURIDAD: ShieldAlert,
  SISTEMA: Info,
}

export default function CampanaNotificaciones({ notificaciones }) {
  const { noLeidas, lista, cargar, leer, leerTodas } = notificaciones
  const { irA } = usarNavegacion()
  const [abierta, setAbierta] = useState(false)
  const contenedor = useRef(null)

  useEffect(() => {
    if (!abierta) return
    cargar()
    const alPulsarFuera = (e) => !contenedor.current?.contains(e.target) && setAbierta(false)
    const alPresionar = (e) => e.key === 'Escape' && setAbierta(false)
    document.addEventListener('mousedown', alPulsarFuera)
    document.addEventListener('keydown', alPresionar)
    return () => {
      document.removeEventListener('mousedown', alPulsarFuera)
      document.removeEventListener('keydown', alPresionar)
    }
  }, [abierta, cargar])

  async function abrir(notificacion) {
    await leer(notificacion)
    setAbierta(false)
    if (notificacion.destino) irA(notificacion.destino)
  }

  return (
    <div className="campana" ref={contenedor}>
      <button
        type="button"
        className="campana__boton"
        aria-label={noLeidas ? `Notificaciones: ${noLeidas} sin leer` : 'Notificaciones'}
        aria-expanded={abierta}
        onClick={() => setAbierta((a) => !a)}
      >
        <Bell size={20} />
        {noLeidas > 0 && <span className="campana__contador">{noLeidas > 9 ? '9+' : noLeidas}</span>}
      </button>

      {abierta && (
        <section className="campana__panel" aria-label="Notificaciones">
          <header className="campana__encabezado">
            <strong>Notificaciones</strong>
            {noLeidas > 0 && (
              <Boton variante="fantasma" tamano="pequeno" icono={CheckCheck} onClick={leerTodas}>
                Marcar todas
              </Boton>
            )}
          </header>
          <div className="campana__lista">
            {lista === null ? (
              <Cargando />
            ) : lista.length === 0 ? (
              <Vacio icono={Bell}>Sin notificaciones</Vacio>
            ) : (
              lista.map((n) => {
                const Icono = ICONO_POR_TIPO[n.tipo] ?? Info
                return (
                  <button
                    key={n.id_notificacion}
                    type="button"
                    className={`notificacion ${n.leida ? '' : 'notificacion--nueva'} notificacion--${n.tipo.toLowerCase()}`}
                    onClick={() => abrir(n)}
                  >
                    <span className="notificacion__icono">
                      <Icono size={18} />
                    </span>
                    <span className="notificacion__texto">
                      <strong>{n.titulo}</strong>
                      <span>{n.mensaje}</span>
                      <small>{haceTiempo(n.creada_en)}</small>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </section>
      )}
    </div>
  )
}
