"""
Protección del inicio de sesión contra fuerza bruta (riesgo R5 del informe de Calidad).

Se cuentan los intentos fallidos por nombre de usuario. Al llegar al máximo, la cuenta queda bloqueada
durante unos minutos y la API responde 429. El contador vive en la caché de Django: en un despliegue con
varios procesos debe configurarse una caché compartida (por ejemplo Redis) para que el límite sea global.
"""
from django.conf import settings
from django.core.cache import cache


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
