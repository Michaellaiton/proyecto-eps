import Pestanas from '../componentes/Pestanas.jsx'
import VistaAgendarCita from './VistaAgendarCita.jsx'
import VistaMisCitas from './VistaMisCitas.jsx'

const PESTANAS = [
  { id: 'agendar', texto: 'Agendar cita', Vista: VistaAgendarCita },
  { id: 'mis-citas', texto: 'Mis citas', Vista: VistaMisCitas },
]

export default function VistaPaciente() {
  return <Pestanas pestanas={PESTANAS} etiqueta="Secciones del paciente" />
}
