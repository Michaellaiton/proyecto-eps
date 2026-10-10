// Panel del paciente.
import { CalendarPlus, ListChecks, UserRound } from 'lucide-react'

import DisenoPanel from '../componentes/DisenoPanel.jsx'
import VistaAgendarCita from './VistaAgendarCita.jsx'
import VistaMisCitas from './VistaMisCitas.jsx'
import VistaPerfil from './VistaPerfil.jsx'

const SECCIONES = [
  { id: 'agendar', texto: 'Agendar cita', icono: CalendarPlus, guia: 'Elige especialidad, médico y hora.', Vista: VistaAgendarCita },
  { id: 'mis-citas', texto: 'Mis citas', icono: ListChecks, guia: 'Consulta, reprograma o cancela.', Vista: VistaMisCitas },
  { id: 'perfil', texto: 'Mi perfil', icono: UserRound, Vista: VistaPerfil },
]

export default function VistaPaciente() {
  return <DisenoPanel secciones={SECCIONES} />
}
