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
