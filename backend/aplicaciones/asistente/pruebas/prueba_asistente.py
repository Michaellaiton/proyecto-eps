"""Pruebas del asistente virtual: detección de intenciones y respuestas con datos reales por rol."""

from datetime import time

import pytest
from rest_framework.test import APIClient

from aplicaciones.asistente.servicios import detectar_intencion, normalizar
from aplicaciones.citas.models import Cita
from conftest import proximo_dia_habil

URL = "/api/v1/asistente/"


def _preguntar(cliente, mensaje):
    return cliente.post(URL, {"mensaje": mensaje}, format="json")


# --- Detección (sin base de datos) ---


def prueba_normalizar_quita_tildes_signos_y_mayusculas():
    assert normalizar("¿Cuándo es MI próxima   cita?") == "cuando es mi proxima cita"


@pytest.mark.parametrize(
    "mensaje, intencion",
    [
        ("Hola", "saludo"),
        ("¿Cómo cancelo mi cita?", "cancelar"),
        ("Necesito reprogramar la cita", "reprogramar"),
        ("¿Cuándo es mi próxima cita?", "proxima_cita"),
        ("¿Hay citas disponibles?", "disponibilidad"),
        ("Quiero pedir una cita", "agendar"),
        ("¿Cómo pido una cita?", "agendar"),
        ("Necesito una cita", "agendar"),
        ("Olvidé mi contraseña", "clave"),
        ("¿A qué hora atienden?", "horario"),
        ("Muchas gracias", "despedida"),
        ("asdfgh", "desconocida"),
    ],
)
def prueba_detecta_la_intencion(mensaje, intencion):
    assert detectar_intencion(normalizar(mensaje)) == intencion


# --- Respuestas con datos ---


@pytest.mark.django_db
def prueba_visitante_puede_conversar_sin_sesion():
    respuesta = _preguntar(APIClient(), "hola")

    assert respuesta.status_code == 200
    assert respuesta.json()["intencion"] == "saludo"
    assert respuesta.json()["sugerencias"]


@pytest.mark.django_db
def prueba_disponibilidad_por_especialidad_con_sinonimo(doctor):
    datos = _preguntar(APIClient(), "¿hay cupo con el médico general?").json()

    assert datos["intencion"] == "disponibilidad"
    assert "Medicina general" in datos["respuesta"]
    assert "Ana Prueba" in datos["respuesta"]
    assert datos["accion"]["destino"] == "ingresar"


@pytest.mark.django_db
def prueba_nombrar_solo_la_especialidad_busca_cupos(doctor, crear_paciente, cliente_de):
    datos = _preguntar(cliente_de(crear_paciente(1).usuario), "medicina general").json()

    assert datos["intencion"] == "disponibilidad"
    assert datos["accion"]["destino"] == "agendar"


@pytest.mark.django_db
def prueba_proxima_cita_del_paciente(doctor, crear_paciente, cliente_de):
    paciente = crear_paciente(1)
    Cita.objects.create(paciente=paciente, doctor=doctor, fecha=proximo_dia_habil(), hora=time(9, 20))

    datos = _preguntar(cliente_de(paciente.usuario), "¿cuándo es mi próxima cita?").json()

    assert "09:20" in datos["respuesta"]
    assert datos["accion"]["destino"] == "mis-citas"


@pytest.mark.django_db
def prueba_proxima_cita_sin_sesion_invita_a_ingresar():
    datos = _preguntar(APIClient(), "mis citas").json()

    assert datos["accion"]["destino"] == "ingresar"


@pytest.mark.django_db
def prueba_paciente_sin_citas_recibe_invitacion_a_agendar(crear_paciente, cliente_de):
    datos = _preguntar(cliente_de(crear_paciente(1).usuario), "mis citas").json()

    assert datos["accion"]["destino"] == "agendar"


@pytest.mark.django_db
def prueba_medico_consulta_su_agenda(doctor, cliente_de):
    datos = _preguntar(cliente_de(doctor.usuario), "¿cómo está mi agenda de hoy?").json()

    assert datos["intencion"] == "agenda_medico"
    assert datos["accion"]["destino"] == "agenda"


@pytest.mark.django_db
def prueba_resumen_solo_para_administrador(administrador, crear_paciente, cliente_de):
    del_admin = _preguntar(cliente_de(administrador), "dame el resumen").json()
    del_paciente = _preguntar(cliente_de(crear_paciente(1).usuario), "dame el resumen").json()

    assert "citas" in del_admin["respuesta"] and del_admin["accion"]["destino"] == "reporte"
    assert "administrador" in del_paciente["respuesta"]


@pytest.mark.django_db
def prueba_mensaje_demasiado_largo_422():
    assert _preguntar(APIClient(), "a" * 301).status_code == 422


@pytest.mark.django_db
def prueba_limite_de_mensajes_429(settings):
    settings.REST_FRAMEWORK = {**settings.REST_FRAMEWORK, "DEFAULT_THROTTLE_RATES": {"asistente": "3/min"}}
    from rest_framework.throttling import ScopedRateThrottle

    ScopedRateThrottle.THROTTLE_RATES = settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]
    try:
        codigos = [_preguntar(APIClient(), "hola").status_code for _ in range(4)]
    finally:
        from rest_framework.settings import api_settings

        ScopedRateThrottle.THROTTLE_RATES = api_settings.DEFAULT_THROTTLE_RATES

    assert codigos == [200, 200, 200, 429]


@pytest.mark.django_db
@pytest.mark.parametrize(
    "mensaje, texto_esperado",
    [
        ("¿Qué especialidades hay?", "Medicina general (1 médicos)"),
        ("¿A qué hora atienden?", "Atendemos de lunes a viernes"),
        ("¿Cómo cancelo?", "2 horas de antelación"),
        ("Quiero reprogramar", "Reprogramar"),
        ("¿Cómo pido una cita?", "1) Elige la especialidad"),
        ("Olvidé mi contraseña", "restablezca"),
        ("¿Cómo bloqueo un horario?", "cada médico"),
        ("ayuda", "especialidades"),
        ("gracias", "Con gusto"),
        ("¿hay citas?", "¿De qué especialidad?"),
    ],
)
def prueba_respuestas_para_visitantes(doctor, mensaje, texto_esperado):
    assert texto_esperado in _preguntar(APIClient(), mensaje).json()["respuesta"]


@pytest.mark.django_db
def prueba_ayuda_y_clave_cambian_segun_el_rol(doctor, administrador, crear_paciente, cliente_de):
    paciente = cliente_de(crear_paciente(1).usuario)

    assert "próxima cita" in _preguntar(paciente, "ayuda").json()["respuesta"]
    assert "agenda" in _preguntar(cliente_de(doctor.usuario), "ayuda").json()["respuesta"]
    assert "indicadores" in _preguntar(cliente_de(administrador), "ayuda").json()["respuesta"]
    assert _preguntar(paciente, "cambiar contraseña").json()["accion"]["destino"] == "perfil"


@pytest.mark.django_db
def prueba_medico_recibe_guia_de_bloqueos(doctor, cliente_de):
    datos = _preguntar(cliente_de(doctor.usuario), "¿cómo bloqueo un horario?").json()

    assert datos["accion"]["destino"] == "bloqueos"


@pytest.mark.django_db
def prueba_sin_cupos_en_la_especialidad(doctor, cliente_de, crear_paciente):
    doctor.horarios.all().delete()

    datos = _preguntar(APIClient(), "¿hay citas de medicina general?").json()

    assert "no hay cupos" in datos["respuesta"]
