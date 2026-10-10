import Asistente from './componentes/Asistente.jsx'
import FondoAnimado from './componentes/FondoAnimado.jsx'
import { ProveedorAvisos } from './controladores/ContextoAvisos.jsx'
import { ProveedorNavegacion, usarNavegacion } from './controladores/ContextoNavegacion.jsx'
import { ProveedorSesion, usarSesion } from './controladores/ContextoSesion.jsx'
import VistaAdministrador from './vistas/administrador/VistaAdministrador.jsx'
import VistaDoctor from './vistas/doctor/VistaDoctor.jsx'
import VistaInicio from './vistas/VistaInicio.jsx'
import VistaIniciarSesion from './vistas/VistaIniciarSesion.jsx'
import VistaPaciente from './vistas/VistaPaciente.jsx'

// Cada rol ve solo sus pantallas (REQ-07).
const PANEL_POR_ROL = {
  PACIENTE: VistaPaciente,
  DOCTOR: VistaDoctor,
  ADMIN: VistaAdministrador,
}

function Contenido() {
  const { usuario } = usarSesion()
  const { ruta } = usarNavegacion()

  if (!usuario) return ruta === 'ingresar' ? <VistaIniciarSesion /> : <VistaInicio />
  const Panel = PANEL_POR_ROL[usuario.rol]
  return <Panel />
}

export default function Aplicacion() {
  return (
    <ProveedorAvisos>
      <ProveedorNavegacion>
        <ProveedorSesion>
          <FondoAnimado />
          <Contenido />
          <Asistente />
        </ProveedorSesion>
      </ProveedorNavegacion>
    </ProveedorAvisos>
  )
}
