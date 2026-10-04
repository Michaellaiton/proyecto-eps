import { usarSesion } from '../controladores/ContextoSesion.jsx'

const NOMBRES_ROL = { PACIENTE: 'Paciente', DOCTOR: 'Doctor', ADMIN: 'Administrador' }

export default function BarraSuperior() {
  const { usuario, cerrar } = usarSesion()

  return (
    <header className="barra">
      <strong className="barra__marca">Citas EPS</strong>
      <span className="barra__usuario">
        {usuario.nombre} · {NOMBRES_ROL[usuario.rol]}
      </span>
      <button type="button" className="boton boton--secundario" onClick={cerrar}>
        Cerrar sesión
      </button>
    </header>
  )
}
