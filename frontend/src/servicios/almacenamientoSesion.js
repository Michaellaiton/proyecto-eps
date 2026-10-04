// Guarda la sesión (token y datos básicos del usuario) en el navegador.
const CLAVE = 'eps_sesion'

export function leerSesion() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE))
  } catch {
    return null
  }
}

export function guardarSesion(sesion) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(sesion))
  } catch {
    // Sin almacenamiento disponible (modo privado): la sesión dura mientras la pestaña esté abierta.
  }
}

export function borrarSesion() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // Nada que borrar.
  }
}
