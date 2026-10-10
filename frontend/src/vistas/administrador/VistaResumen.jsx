import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  CalendarX,
  FlaskConical,
  ShieldAlert,
  Stethoscope,
  UserPlus,
  UserRound,
  Users,
  UserX,
} from 'lucide-react'

import Boton from '../../componentes/Boton.jsx'
import { Cargando } from '../../componentes/Estados.jsx'
import MensajeError from '../../componentes/MensajeError.jsx'
import TarjetaIndicador from '../../componentes/TarjetaIndicador.jsx'
import { usarConsulta } from '../../controladores/usarConsulta.js'
import { usarNavegacion } from '../../controladores/ContextoNavegacion.jsx'
import { consultarResumen } from '../../servicios/administracionServicio.js'

export default function VistaResumen() {
  const { datos: r, error } = usarConsulta(consultarResumen)
  const { irA } = usarNavegacion()

  if (error) return <MensajeError error={error} />
  if (!r) return <Cargando />

  return (
    <>
      <section className="tarjeta">
        <div className="tarjeta__titulo">
          <CalendarDays size={20} />
          <h2>Agenda</h2>
        </div>
        <div className="indicadores">
          <TarjetaIndicador titulo="Citas hoy" valor={r.citas_hoy} icono={CalendarDays} />
          <TarjetaIndicador titulo="Próximos 7 días" valor={r.citas_proximos_7_dias} icono={CalendarClock} variante="info" />
          <TarjetaIndicador titulo="Cancelaciones (30 días)" valor={r.cancelaciones_ultimos_30_dias} icono={CalendarX} variante="aviso" />
          <TarjetaIndicador
            titulo="Accesos denegados (7 días)"
            valor={r.accesos_denegados_ultimos_7_dias}
            icono={ShieldAlert}
            variante={r.accesos_denegados_ultimos_7_dias > 0 ? 'alerta' : undefined}
          />
        </div>
      </section>

      <section className="tarjeta">
        <div className="tarjeta__titulo">
          <Users size={20} />
          <h2>Personas</h2>
        </div>
        <div className="indicadores">
          <TarjetaIndicador titulo="Pacientes" valor={r.pacientes} icono={UserRound} />
          <TarjetaIndicador titulo="Médicos activos" valor={r.medicos_activos} icono={Stethoscope} variante="info" />
          <TarjetaIndicador titulo="Especialidades" valor={r.especialidades} icono={Stethoscope} />
          <TarjetaIndicador titulo="Usuarios inactivos" valor={r.usuarios_inactivos} icono={UserX} variante="aviso" />
        </div>
      </section>

      <section className="tarjeta">
        <h2>Accesos rápidos</h2>
        <div className="acciones">
          <Boton icono={UserPlus} onClick={() => irA('usuarios')}>
            Nuevo usuario
          </Boton>
          <Boton variante="secundario" icono={BarChart3} onClick={() => irA('reporte')}>
            Ver ocupación
          </Boton>
          <Boton variante="secundario" icono={FlaskConical} onClick={() => irA('simulador')}>
            Simulador de concurrencia
          </Boton>
          <Boton variante="secundario" icono={ShieldAlert} onClick={() => irA('auditoria')}>
            Revisar auditoría
          </Boton>
        </div>
      </section>
    </>
  )
}
