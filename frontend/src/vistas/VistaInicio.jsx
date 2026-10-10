// Página de inicio pública: presenta el servicio y lleva a ingresar o a hablar con el asistente.
import {
  ArrowRight,
  BellRing,
  CalendarCheck,
  CalendarDays,
  Clock,
  LogIn,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  Zap,
} from 'lucide-react'

import Boton from '../componentes/Boton.jsx'
import Marca from '../componentes/Marca.jsx'
import { usarConsulta } from '../controladores/usarConsulta.js'
import { usarNavegacion } from '../controladores/ContextoNavegacion.jsx'
import { listarEspecialidades } from '../servicios/medicosServicio.js'
import { iconoDeEspecialidad } from '../utilidades/especialidades.js'

const CARACTERISTICAS = [
  { icono: Zap, titulo: 'Disponibilidad al instante', texto: 'Ves solo los horarios realmente libres.' },
  { icono: ShieldCheck, titulo: 'Tu cupo es tuyo', texto: 'Nadie más puede tomar la misma franja.' },
  { icono: BellRing, titulo: 'Confirmación por correo', texto: 'Te avisamos al agendar, cancelar o reprogramar.' },
]

const PASOS = [
  { icono: Stethoscope, texto: 'Especialidad' },
  { icono: UserRound, texto: 'Médico' },
  { icono: CalendarDays, texto: 'Día y hora' },
  { icono: CalendarCheck, texto: 'Confirmar' },
]

export default function VistaInicio() {
  const { irA } = usarNavegacion()
  const { datos: especialidades } = usarConsulta(listarEspecialidades)
  const ingresar = () => irA('ingresar')

  return (
    <div className="inicio">
      <nav className="inicio__navegacion">
        <Marca alPulsar={() => irA('')} />
        <Boton variante="secundario" icono={LogIn} onClick={ingresar}>
          Ingresar
        </Boton>
      </nav>

      <section className="portada">
        <div className="portada__texto aparecer">
          <span className="portada__etiqueta">
            <Sparkles size={15} /> Agenda en línea, 24/7
          </span>
          <h1>
            Tu cita médica, <span>en menos de un minuto</span>
          </h1>
          <p>Elige especialidad, médico y hora. Sin filas ni llamadas.</p>
          <div className="acciones">
            <Boton tamano="grande" onClick={ingresar}>
              Agendar mi cita
              <ArrowRight size={20} />
            </Boton>
          </div>
        </div>

        <div className="portada__ilustracion" aria-hidden="true">
          <div className="tarjeta-flotante">
            <span className="indicador__icono">
              <CalendarCheck size={22} />
            </span>
            <div>
              <strong>Cita confirmada</strong>
              <div className="texto-suave">Pediatría · lunes 8:20</div>
            </div>
          </div>
          <div className="tarjeta-flotante">
            <span className="indicador__icono indicador__icono--info">
              <Clock size={22} />
            </span>
            <div>
              <strong>24 horarios libres</strong>
              <div className="texto-suave">Medicina general hoy</div>
            </div>
          </div>
          <div className="tarjeta-flotante">
            <span className="indicador__icono indicador__icono--aviso">
              <BellRing size={22} />
            </span>
            <div>
              <strong>Recordatorio enviado</strong>
              <div className="texto-suave">Revisa tu correo</div>
            </div>
          </div>
        </div>
      </section>

      <section className="seccion">
        <div className="caracteristicas">
          {CARACTERISTICAS.map(({ icono: Icono, titulo, texto }) => (
            <article key={titulo} className="caracteristica">
              <span className="indicador__icono">
                <Icono size={22} />
              </span>
              <h3>{titulo}</h3>
              <p className="texto-suave">{texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="seccion">
        <div className="seccion__encabezado">
          <h2>Así de fácil</h2>
          <p className="texto-suave">Cuatro pasos y listo.</p>
        </div>
        <div className="pasos-inicio">
          {PASOS.map(({ icono: Icono, texto }) => (
            <div key={texto} className="paso-inicio">
              <span className="paso-inicio__icono">
                <Icono size={28} />
              </span>
              <strong>{texto}</strong>
            </div>
          ))}
        </div>
      </section>

      {especialidades?.length > 0 && (
        <section className="seccion">
          <div className="seccion__encabezado">
            <h2>Especialidades</h2>
          </div>
          <div className="selector-tarjetas">
            {especialidades.map((e) => {
              const Icono = iconoDeEspecialidad(e.nombre)
              return (
                <button key={e.id_especialidad} type="button" className="opcion-tarjeta" onClick={ingresar}>
                  <span className="opcion-tarjeta__icono">
                    <Icono size={22} />
                  </span>
                  <span className="opcion-tarjeta__titulo">{e.nombre}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <section className="seccion">
        <div className="llamado">
          <div>
            <h2>¿Tienes dudas?</h2>
            <p>Pregúntale al asistente, abajo a la derecha.</p>
          </div>
          <Boton tamano="grande" icono={LogIn} onClick={ingresar}>
            Ingresar
          </Boton>
        </div>
      </section>

      <footer className="pie">Citas EPS · Proyecto académico de Ingeniería de Sistemas · CUN</footer>
    </div>
  )
}
