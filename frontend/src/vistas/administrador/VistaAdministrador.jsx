// Panel del superadministrador (rol ADMIN).
import { BarChart3, CalendarRange, Clock, FlaskConical, LayoutDashboard, ScrollText, Stethoscope, UserRound, Users } from 'lucide-react'

import DisenoPanel from '../../componentes/DisenoPanel.jsx'
import VistaPerfil from '../VistaPerfil.jsx'
import VistaAuditoria from './VistaAuditoria.jsx'
import VistaCitasAdmin from './VistaCitasAdmin.jsx'
import VistaEspecialidades from './VistaEspecialidades.jsx'
import VistaHorarios from './VistaHorarios.jsx'
import VistaReporteOcupacion from './VistaReporteOcupacion.jsx'
import VistaResumen from './VistaResumen.jsx'
import VistaSimulador from './VistaSimulador.jsx'
import VistaUsuarios from './VistaUsuarios.jsx'

const SECCIONES = [
  { id: 'resumen', texto: 'Resumen', icono: LayoutDashboard, guia: 'El sistema de un vistazo.', Vista: VistaResumen },
  { id: 'usuarios', texto: 'Usuarios', icono: Users, guia: 'Pacientes, médicos y administradores.', Vista: VistaUsuarios },
  { id: 'especialidades', texto: 'Especialidades', icono: Stethoscope, Vista: VistaEspecialidades },
  { id: 'horarios', texto: 'Horarios', icono: Clock, guia: 'Bloques de atención de cada médico.', Vista: VistaHorarios },
  { id: 'citas', texto: 'Citas', icono: CalendarRange, Vista: VistaCitasAdmin },
  { id: 'reporte', texto: 'Ocupación', icono: BarChart3, guia: 'Citas no canceladas frente a franjas ofrecidas.', Vista: VistaReporteOcupacion },
  {
    id: 'simulador',
    texto: 'Simulador',
    icono: FlaskConical,
    guia: 'Pon a prueba la base de datos con reservas simultáneas y alta demanda.',
    Vista: VistaSimulador,
  },
  { id: 'auditoria', texto: 'Auditoría', icono: ScrollText, guia: 'Quién hizo qué y cuándo.', Vista: VistaAuditoria },
  { id: 'perfil', texto: 'Mi perfil', icono: UserRound, Vista: VistaPerfil },
]

export default function VistaAdministrador() {
  return <DisenoPanel secciones={SECCIONES} />
}
