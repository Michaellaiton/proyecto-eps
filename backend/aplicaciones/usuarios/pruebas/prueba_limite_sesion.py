"""Pruebas del bloqueo temporal tras intentos fallidos de inicio de sesión (riesgo R5, REQ-07)."""
import pytest
from rest_framework.test import APIClient

from aplicaciones.auditoria.models import Auditoria
from conftest import CLAVE_PRUEBA

pytestmark = pytest.mark.django_db

URL = "/api/v1/usuarios/iniciar-sesion/"


def _iniciar(clave, usuario="paciente1"):
    return APIClient().post(URL, {"username": usuario, "password": clave}, format="json")


@pytest.fixture(autouse=True)
def limite_de_tres(settings):
    settings.EPS_PARAMETROS = {**settings.EPS_PARAMETROS, "INTENTOS_MAXIMOS_SESION": 3, "MINUTOS_BLOQUEO_SESION": 15}


def prueba_tras_el_maximo_de_fallos_responde_429_aun_con_la_clave_correcta(crear_paciente):
    crear_paciente(1)
    fallos = [_iniciar("incorrecta").status_code for _ in range(3)]

    respuesta = _iniciar(CLAVE_PRUEBA)

    assert fallos == [401, 401, 401]
    assert respuesta.status_code == 429
    assert "Retry-After" in respuesta.headers


def prueba_inicio_exitoso_reinicia_el_contador(crear_paciente):
    crear_paciente(1)
    _iniciar("incorrecta")
    _iniciar("incorrecta")
    assert _iniciar(CLAVE_PRUEBA).status_code == 200

    fallos = [_iniciar("incorrecta").status_code for _ in range(2)]

    assert fallos == [401, 401]
    assert _iniciar(CLAVE_PRUEBA).status_code == 200


def prueba_el_bloqueo_es_por_usuario(crear_paciente):
    crear_paciente(1)
    crear_paciente(2)
    for _ in range(3):
        _iniciar("incorrecta", "paciente1")

    assert _iniciar(CLAVE_PRUEBA, "paciente2").status_code == 200


def prueba_el_contador_no_distingue_mayusculas(crear_paciente):
    crear_paciente(1)
    for usuario in ("paciente1", "PACIENTE1", "Paciente1"):
        _iniciar("incorrecta", usuario)

    assert _iniciar(CLAVE_PRUEBA).status_code == 429


def prueba_los_intentos_fallidos_quedan_en_la_auditoria(crear_paciente):
    crear_paciente(1)
    _iniciar("incorrecta")

    registro = Auditoria.objects.get(operacion="INICIAR_SESION")
    assert registro.resultado == "DENEGADO"
    assert "paciente1" in registro.detalle
