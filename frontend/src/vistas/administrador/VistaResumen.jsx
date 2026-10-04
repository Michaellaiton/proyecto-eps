import MensajeError from '../../componentes/MensajeError.jsx'
import TarjetaIndicador from '../../componentes/TarjetaIndicador.jsx'
import { usarConsulta } from '../../controladores/usarConsulta.js'
import { consultarResumen } from '../../servicios/administracionServicio.js'

export default function VistaResumen() {
  const { datos: r, error } = usarConsulta(consultarResumen)

  return (
    <section className="tarjeta">
      <h2>Resumen del sistema</h2>
      <MensajeError error={error} />
      {!r && !error && <p>Cargando…</p>}
      {r && (
        <div className="indicadores">
          <TarjetaIndicador titulo="Citas hoy" valor={r.citas_hoy} />
          <TarjetaIndicador titulo="Citas próximos 7 días" valor={r.citas_proximos_7_dias} />
          <TarjetaIndicador titulo="Cancelaciones (30 días)" valor={r.cancelaciones_ultimos_30_dias} />
          <TarjetaIndicador
            titulo="Accesos denegados (7 días)"
            valor={r.accesos_denegados_ultimos_7_dias}
            detalle="Ver pestaña Auditoría"
            alerta={r.accesos_denegados_ultimos_7_dias > 0}
          />
          <TarjetaIndicador titulo="Pacientes" valor={r.pacientes} />
          <TarjetaIndicador titulo="Médicos activos" valor={r.medicos_activos} />
          <TarjetaIndicador titulo="Especialidades" valor={r.especialidades} />
          <TarjetaIndicador titulo="Usuarios inactivos" valor={r.usuarios_inactivos} />
        </div>
      )}
    </section>
  )
}
