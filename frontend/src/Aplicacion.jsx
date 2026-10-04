import BarraSuperior from './componentes/BarraSuperior.jsx'
import { ProveedorSesion, usarSesion } from './controladores/ContextoSesion.jsx'
import VistaAdministrador from './vistas/administrador/VistaAdministrador.jsx'
import VistaDoctor from './vistas/doctor/VistaDoctor.jsx'
import VistaIniciarSesion from './vistas/VistaIniciarSesion.jsx'
import VistaPaciente from './vistas/VistaPaciente.jsx'

// Cada rol ve solo sus pantallas (REQ-07).
const VISTAS_POR_ROL = {
  PACIENTE: () => <VistaPaciente />,
  DOCTOR: () => <VistaDoctor />,
  ADMIN: () => <VistaAdministrador />,
}

function Contenido() {
  const { usuario } = usarSesion()
  if (!usuario) return <VistaIniciarSesion />

  const VistaDelRol = VISTAS_POR_ROL[usuario.rol]
  return (
    <>
      <BarraSuperior />
      <main className="contenedor">
        <VistaDelRol />
      </main>
    </>
  )
}

export default function Aplicacion() {
  return (
    <ProveedorSesion>
      <Contenido />
    </ProveedorSesion>
  )
}
