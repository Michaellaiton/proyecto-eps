import { solicitarApi } from './clienteApi.js'

export function iniciarSesion(nombreUsuario, contrasena) {
  return solicitarApi('/usuarios/iniciar-sesion/', {
    method: 'POST',
    cuerpo: { username: nombreUsuario, password: contrasena },
  })
}

export function consultarUsuarioActual() {
  return solicitarApi('/usuarios/yo/')
}

export function actualizarPerfil(cambios) {
  return solicitarApi('/usuarios/yo/', { method: 'PATCH', cuerpo: cambios })
}

export function cambiarClave(claveActual, claveNueva) {
  return solicitarApi('/usuarios/cambiar-clave/', {
    method: 'POST',
    cuerpo: { clave_actual: claveActual, clave_nueva: claveNueva },
  })
}
