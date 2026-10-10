// Panel del médico (rol DOCTOR, CU-04).
import { CalendarDays, CalendarOff, UserRound } from 'lucide-react'

import DisenoPanel from '../../componentes/DisenoPanel.jsx'
import VistaPerfil from '../VistaPerfil.jsx'
import VistaBloqueos from './VistaBloqueos.jsx'
import VistaMiAgenda from './VistaMiAgenda.jsx'

const SECCIONES = [
  { id: 'agenda', texto: 'Mi agenda', icono: CalendarDays, guia: 'Tus citas del día y su atención.', Vista: VistaMiAgenda },
  { id: 'bloqueos', texto: 'Bloqueos', icono: CalendarOff, guia: 'Horarios en los que no atenderás.', Vista: VistaBloqueos },
  { id: 'perfil', texto: 'Mi perfil', icono: UserRound, Vista: VistaPerfil },
]

export default function VistaDoctor() {
  return <DisenoPanel secciones={SECCIONES} />
}
