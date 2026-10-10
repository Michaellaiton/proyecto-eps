"""
Servicios de usuarios: protección del inicio de sesión contra fuerza bruta (riesgo R5) y perfil propio.

Se cuentan los intentos fallidos por nombre de usuario. Al llegar al máximo, la cuenta queda bloqueada
durante unos minutos y la API responde 429. El contador vive en la caché de Django: en un despliegue con
varios procesos debe configurarse una caché compartida (por ejemplo Redis) para que el límite sea global.
"""

from django.conf import settings
from django.core.cache import cache
from django.db import transaction

from aplicaciones.auditoria import servicios as auditoria
from aplicaciones.notificaciones import servicios as notificaciones


def _clave(nombre_usuario):
    return f"eps:intentos_sesion:{nombre_usuario.strip().lower()}"


def _parametro(nombre):
    return settings.EPS_PARAMETROS[nombre]


def esta_bloqueado(nombre_usuario):
    return cache.get(_clave(nombre_usuario), 0) >= _parametro("INTENTOS_MAXIMOS_SESION")


def registrar_intento_fallido(nombre_usuario):
    """Suma un intento fallido y devuelve cuántos intentos quedan antes del bloqueo."""
    clave = _clave(nombre_usuario)
    intentos = cache.get(clave, 0) + 1
    cache.set(clave, intentos, timeout=_parametro("MINUTOS_BLOQUEO_SESION") * 60)
    return max(_parametro("INTENTOS_MAXIMOS_SESION") - intentos, 0)


def limpiar_intentos(nombre_usuario):
    cache.delete(_clave(nombre_usuario))


def segundos_de_bloqueo():
    return _parametro("MINUTOS_BLOQUEO_SESION") * 60


# --- Perfil del usuario autenticado ---


@transaction.atomic
def actualizar_perfil(usuario, datos):
    if "email" in datos:
        usuario.email = datos["email"]
        usuario.save(update_fields=["email"])
    paciente = getattr(usuario, "paciente", None)
    if paciente and "telefono" in datos:
        paciente.telefono = datos["telefono"]
        paciente.save(update_fields=["telefono"])
    auditoria.registrar(usuario, "ACTUALIZAR_PERFIL", "usuarios", usuario.id_usuario, detalle=", ".join(sorted(datos)))
    return usuario


def cambiar_clave(usuario, clave_nueva):
    usuario.set_password(clave_nueva)
    usuario.save(update_fields=["password"])
    auditoria.registrar(usuario, "CAMBIAR_CLAVE", "usuarios", usuario.id_usuario)
    notificaciones.clave_cambiada(usuario)
