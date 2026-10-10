// Etiqueta de estado con color e ícono. `EstadoCita` traduce los estados de una cita.
import { Ban, CalendarCheck, CircleCheck, CircleX, Clock } from 'lucide-react'

export default function Insignia({ tono, icono: Icono, children }) {
  return (
    <span className={`insignia ${tono ? `insignia--${tono}` : ''}`}>
      {Icono && <Icono size={14} />}
      {children}
    </span>
  )
}

const ESTADOS_CITA = {
  Agendada: { tono: 'info', icono: CalendarCheck, texto: 'Agendada' },
  Atendida: { tono: 'exito', icono: CircleCheck, texto: 'Atendida' },
  Cancelada: { tono: 'peligro', icono: Ban, texto: 'Cancelada' },
  'No asistio': { tono: 'aviso', icono: CircleX, texto: 'No asistió' },
}

export function EstadoCita({ estado }) {
  const { tono, icono, texto } = ESTADOS_CITA[estado] ?? { icono: Clock, texto: estado }
  return (
    <Insignia tono={tono} icono={icono}>
      {texto}
    </Insignia>
  )
}
