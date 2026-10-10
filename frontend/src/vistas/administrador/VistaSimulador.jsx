// Simulador de concurrencia: muestra cómo responde la base de datos ante reservas simultáneas
// sobre una misma franja y ante consultas masivas (problema central de los informes).
import { useState } from 'react'
import {
  Activity,
  CircleAlert,
  CircleCheck,
  Database,
  Gauge,
  History,
  Lock,
  Play,
  ShieldCheck,
  ShieldOff,
  Target,
  Timer,
  TriangleAlert,
  Users,
  Zap,
} from 'lucide-react'

import Boton from '../../componentes/Boton.jsx'
import Consola from '../../componentes/Consola.jsx'
import { Vacio } from '../../componentes/Estados.jsx'
import { GraficaBarras, GraficaLinea } from '../../componentes/Graficas.jsx'
import Insignia from '../../componentes/Insignia.jsx'
import MensajeError from '../../componentes/MensajeError.jsx'
import SelectorTarjetas from '../../componentes/SelectorTarjetas.jsx'
import TarjetaIndicador from '../../componentes/TarjetaIndicador.jsx'
import { usarSimulacion } from '../../controladores/usarSimulacion.js'
import { formatearFechaHora } from '../../utilidades/fechas.js'

const ESCENARIOS = [
  { valor: 'RAFAGA', titulo: 'Ráfaga sobre una franja', detalle: 'Muchos pacientes, mismo médico y misma hora', icono: Target },
  { valor: 'CARGA', titulo: 'Consultas masivas', detalle: 'Alta demanda sobre toda la EPS', icono: Activity },
]
const MODOS = [
  { valor: 'true', titulo: 'Con controles', detalle: 'Bloqueo + índice único', icono: ShieldCheck },
  { valor: 'false', titulo: 'Sin controles', detalle: 'Línea base: consultar y luego insertar', icono: ShieldOff },
]

function Deslizador({ id, etiqueta, valor, min, max, alCambiar, sufijo = '' }) {
  return (
    <div className="campo deslizador">
      <label htmlFor={id}>
        {etiqueta} <strong>{valor}{sufijo}</strong>
      </label>
      <input id={id} type="range" min={min} max={max} value={valor} onChange={(e) => alCambiar(Number(e.target.value))} />
    </div>
  )
}

function ResultadoRafaga({ resultados, proteccion }) {
  const integridad = resultados.integridad
  if (!integridad?.reservas_en_la_franja && integridad?.reservas_en_la_franja !== 0) return null
  const correcto = !integridad.sobreagendamiento
  return (
    <div className={`resultado-destacado ${correcto ? 'resultado-destacado--ok' : 'resultado-destacado--falla'}`}>
      {correcto ? <CircleCheck size={40} /> : <TriangleAlert size={40} />}
      <div>
        <strong>{integridad.reservas_en_la_franja}</strong>
        <span>
          reserva(s) para una sola franja ·{' '}
          {correcto
            ? 'la base de datos atendió las solicitudes en fila y rechazó el resto'
            : `${integridad.reservas_en_la_franja} de ${resultados.solicitudes} pacientes quedaron con la misma cita (sobreagendamiento)`}
        </span>
        <small>{proteccion ? 'Con bloqueo pesimista e índice único parcial' : 'Lógica ingenua sin controles de concurrencia'}</small>
      </div>
    </div>
  )
}

function Graficas({ simulacion }) {
  const r = simulacion.resultados
  if (simulacion.tipo === 'RAFAGA') {
    if (!r.latencias?.length) return null
    const destacadas = r.resultados_por_solicitud.map((res, i) => (res === 'exito' ? i : -1)).filter((i) => i >= 0)
    return (
      <GraficaBarras
        titulo="Latencia de cada solicitud, en orden de llegada"
        valores={r.latencias}
        destacadas={destacadas}
        etiquetaDestacada={destacadas.length === 1 ? 'Reserva' : undefined}
        leyenda={[
          { texto: 'Reservó', destacada: true },
          { texto: 'Rechazada (409)', destacada: false },
        ]}
        unidad="ms"
        etiquetaX="solicitudes →"
        describir={(i) => `Solicitud ${i + 1} · ${r.latencias[i].toLocaleString('es-CO')} ms · ${r.resultados_por_solicitud[i] === 'exito' ? 'reservó' : 'rechazada (409)'}`}
      />
    )
  }
  if (!r.serie?.length) return null
  const serie = r.serie
  return (
    <div className="graficas-pequenas">
      <GraficaLinea
        titulo="Operaciones por segundo"
        puntos={serie.map((s) => ({ x: s.segundo, y: s.ops }))}
        unidad="ops/s"
        etiquetaX="segundos"
        describir={(p) => `t=${p.x} s · ${p.y} ops/s`}
      />
      <GraficaLinea
        titulo="Latencia p95"
        puntos={serie.map((s) => ({ x: s.segundo, y: s.p95 }))}
        unidad="ms"
        etiquetaX="segundos"
        describir={(p) => `t=${p.x} s · p95 ${p.y} ms`}
      />
      <GraficaLinea
        titulo="Sesiones esperando un bloqueo en PostgreSQL"
        puntos={serie.map((s) => ({ x: s.segundo, y: s.esperas }))}
        unidad="sesiones"
        etiquetaX="segundos"
        describir={(p) => `t=${p.x} s · ${p.y} esperando`}
      />
    </div>
  )
}

export default function VistaSimulador() {
  const s = usarSimulacion()
  const [tipo, setTipo] = useState('RAFAGA')
  const [usuarios, setUsuarios] = useState(30)
  const [proteccion, setProteccion] = useState('true')
  const [hilos, setHilos] = useState(20)
  const [duracion, setDuracion] = useState(15)
  const [medicos, setMedicos] = useState(5)

  const iniciar = () =>
    s.iniciar(tipo === 'RAFAGA' ? { tipo, usuarios, proteccion: proteccion === 'true' } : { tipo, hilos, duracion, medicos })

  const r = s.simulacion?.resultados ?? {}
  const latencia = r.latencia_ms ?? {}
  const bd = r.bd ?? {}

  return (
    <>
      <section className="tarjeta">
        <div className="tarjeta__titulo">
          <Zap size={20} />
          <h2>Escenario</h2>
        </div>
        <SelectorTarjetas etiqueta="Escenario" valor={tipo} alElegir={setTipo} opciones={ESCENARIOS} />

        {tipo === 'RAFAGA' ? (
          <div className="rejilla">
            <Deslizador id="sim-usuarios" etiqueta="Pacientes simultáneos" valor={usuarios} min={2} max={60} alCambiar={setUsuarios} />
            <SelectorTarjetas etiqueta="Controles" valor={proteccion} alElegir={setProteccion} opciones={MODOS} />
          </div>
        ) : (
          <div className="rejilla">
            <Deslizador id="sim-hilos" etiqueta="Usuarios concurrentes" valor={hilos} min={2} max={40} alCambiar={setHilos} />
            <Deslizador id="sim-duracion" etiqueta="Duración" valor={duracion} min={3} max={60} sufijo=" s" alCambiar={setDuracion} />
            <Deslizador id="sim-medicos" etiqueta="Médicos" valor={medicos} min={1} max={10} alCambiar={setMedicos} />
          </div>
        )}

        <div className="acciones">
          <Boton tamano="grande" icono={Play} cargando={s.enCurso} onClick={iniciar}>
            {s.enCurso ? 'Simulando…' : 'Iniciar simulación'}
          </Boton>
          <span className="texto-suave">Usa datos ficticios que se borran al terminar.</span>
        </div>
        <MensajeError error={s.error} />
      </section>

      {s.simulacion && (
        <section className="tarjeta">
          <div className="tarjeta__encabezado">
            <div className="tarjeta__titulo">
              <Gauge size={20} />
              <h2>Resultado {s.enCurso ? 'en vivo' : ''}</h2>
            </div>
            <EstadoSimulacion estado={s.simulacion.estado} />
          </div>
          {s.simulacion.tipo === 'RAFAGA' && !s.enCurso && (
            <ResultadoRafaga resultados={r} proteccion={s.simulacion.parametros.proteccion} />
          )}
          {s.simulacion.tipo === 'CARGA' && !s.enCurso && r.integridad && (
            <div className={`resultado-destacado ${r.integridad.franjas_duplicadas === 0 ? 'resultado-destacado--ok' : 'resultado-destacado--falla'}`}>
              {r.integridad.franjas_duplicadas === 0 ? <CircleCheck size={40} /> : <TriangleAlert size={40} />}
              <div>
                <strong>{r.integridad.franjas_duplicadas}</strong>
                <span>franjas duplicadas entre {r.integridad.citas_creadas} citas creadas bajo carga</span>
                <small>{r.ops_por_segundo.toLocaleString('es-CO')} operaciones por segundo sostenidas</small>
              </div>
            </div>
          )}
          <div className="indicadores">
            <TarjetaIndicador titulo="Solicitudes" valor={r.solicitudes ?? 0} icono={Users} variante="info" />
            <TarjetaIndicador titulo="Reservas exitosas" valor={r.exitos ?? 0} icono={CircleCheck} />
            <TarjetaIndicador titulo="Rechazadas (409)" valor={r.conflictos ?? 0} icono={CircleAlert} variante="aviso" />
            <TarjetaIndicador titulo="Errores" valor={r.errores ?? 0} icono={TriangleAlert} variante={r.errores ? 'alerta' : undefined} />
            <TarjetaIndicador titulo="Latencia p95" valor={`${Math.round(latencia.p95 ?? 0).toLocaleString('es-CO')} ms`} icono={Timer} />
            <TarjetaIndicador titulo="Operaciones/s" valor={Math.round(r.ops_por_segundo ?? 0).toLocaleString('es-CO')} icono={Activity} />
            <TarjetaIndicador titulo="Conexiones BD (máx.)" valor={bd.conexiones_max ?? 0} icono={Database} variante="info" />
            <TarjetaIndicador titulo="Esperando bloqueo (máx.)" valor={bd.esperas_bloqueo_max ?? 0} icono={Lock} variante="aviso" />
          </div>
          <Graficas simulacion={s.simulacion} />
          <Consola eventos={s.eventos} enCurso={s.enCurso} />
        </section>
      )}

      <section className="tarjeta">
        <div className="tarjeta__titulo">
          <History size={20} />
          <h2>Simulaciones anteriores</h2>
        </div>
        {s.historial.length === 0 ? (
          <Vacio icono={History}>Aún no hay simulaciones.</Vacio>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla tabla--adaptable">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Escenario</th>
                  <th>Resultado</th>
                  <th>p95</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {s.historial.map((h) => (
                  <tr key={h.id_simulacion}>
                    <td className="texto-suave sin-salto">{formatearFechaHora(h.iniciada_en)}</td>
                    <td>
                      {h.tipo === 'RAFAGA'
                        ? `Ráfaga · ${h.parametros.usuarios} pacientes · ${h.parametros.proteccion ? 'con' : 'sin'} controles`
                        : `Carga · ${h.parametros.hilos} usuarios · ${h.parametros.duracion} s`}
                    </td>
                    <td>
                      <ResumenHistorial simulacion={h} />
                    </td>
                    <td className="sin-salto">{h.resultados?.latencia_ms ? `${h.resultados.latencia_ms.p95} ms` : '—'}</td>
                    <td>
                      <Boton variante="fantasma" tamano="pequeno" onClick={() => s.ver(h.id_simulacion)} disabled={s.enCurso}>
                        Ver
                      </Boton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

function EstadoSimulacion({ estado }) {
  const estados = {
    EN_CURSO: { tono: 'info', icono: Activity, texto: 'En curso' },
    TERMINADA: { tono: 'exito', icono: CircleCheck, texto: 'Terminada' },
    FALLIDA: { tono: 'peligro', icono: TriangleAlert, texto: 'Fallida' },
  }
  const { tono, icono, texto } = estados[estado]
  return (
    <Insignia tono={tono} icono={icono}>
      {texto}
    </Insignia>
  )
}

function ResumenHistorial({ simulacion }) {
  const integridad = simulacion.resultados?.integridad
  if (simulacion.estado !== 'TERMINADA' || !integridad) return <EstadoSimulacion estado={simulacion.estado} />
  const problema = integridad.sobreagendamiento || integridad.franjas_duplicadas > 0
  const texto =
    simulacion.tipo === 'RAFAGA'
      ? `${integridad.reservas_en_la_franja} reserva(s) en la franja`
      : `${integridad.franjas_duplicadas} duplicadas · ${integridad.citas_creadas} citas`
  return (
    <Insignia tono={problema ? 'peligro' : 'exito'} icono={problema ? TriangleAlert : CircleCheck}>
      {texto}
    </Insignia>
  )
}
