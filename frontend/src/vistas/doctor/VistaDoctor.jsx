// Panel del médico (rol DOCTOR, CU-04).
import Pestanas from '../../componentes/Pestanas.jsx'
import VistaBloqueos from './VistaBloqueos.jsx'
import VistaMiAgenda from './VistaMiAgenda.jsx'

const PESTANAS = [
  { id: 'agenda', texto: 'Mi agenda', Vista: VistaMiAgenda },
  { id: 'bloqueos', texto: 'Bloqueos', Vista: VistaBloqueos },
]

export default function VistaDoctor() {
  return <Pestanas pestanas={PESTANAS} etiqueta="Secciones del médico" />
}
