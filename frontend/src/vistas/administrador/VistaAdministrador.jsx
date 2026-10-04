// Panel del superadministrador (rol ADMIN).
import Pestanas from '../../componentes/Pestanas.jsx'
import VistaAuditoria from './VistaAuditoria.jsx'
import VistaCitasAdmin from './VistaCitasAdmin.jsx'
import VistaEspecialidades from './VistaEspecialidades.jsx'
import VistaHorarios from './VistaHorarios.jsx'
import VistaReporteOcupacion from './VistaReporteOcupacion.jsx'
import VistaResumen from './VistaResumen.jsx'
import VistaUsuarios from './VistaUsuarios.jsx'

const PESTANAS = [
  { id: 'resumen', texto: 'Resumen', Vista: VistaResumen },
  { id: 'usuarios', texto: 'Usuarios', Vista: VistaUsuarios },
  { id: 'especialidades', texto: 'Especialidades', Vista: VistaEspecialidades },
  { id: 'horarios', texto: 'Horarios', Vista: VistaHorarios },
  { id: 'citas', texto: 'Citas', Vista: VistaCitasAdmin },
  { id: 'reporte', texto: 'Reporte de ocupación', Vista: VistaReporteOcupacion },
  { id: 'auditoria', texto: 'Auditoría', Vista: VistaAuditoria },
]

export default function VistaAdministrador() {
  return <Pestanas pestanas={PESTANAS} etiqueta="Secciones de administración" />
}
