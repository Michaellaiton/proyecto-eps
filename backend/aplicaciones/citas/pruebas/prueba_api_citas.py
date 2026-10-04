"""
Pruebas de la API del flujo del paciente contra PostgreSQL real.
Los identificadores CP-* siguen la numeración del informe de Calidad de Software (Anexo B).
"""
from datetime import time, timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from aplicaciones.auditoria.models import Auditoria
from aplicaciones.citas.models import Cita, EstadoCita
from aplicaciones.medicos.models import BloqueoAgenda
from conftest import CLAVE_PRUEBA, proximo_dia_habil

pytestmark = pytest.mark.django_db


def _disponibilidad(cliente, doctor, fecha):
    return cliente.get(f"/api/v1/medicos/{doctor.id_doctor}/disponibilidad/", {"fecha": fecha.isoformat()})


def _agendar(cliente, doctor, fecha, hora="08:00"):
    return cliente.post(
        "/api/v1/citas/", {"id_doctor": doctor.id_doctor, "fecha": fecha.isoformat(), "hora": hora}, format="json"
    )


# --- Autenticación (REQ-07) ---

def prueba_CP_A01_inicio_de_sesion_devuelve_token_y_rol(crear_paciente):
    crear_paciente(1)

    respuesta = APIClient().post(
        "/api/v1/usuarios/iniciar-sesion/", {"username": "paciente1", "password": CLAVE_PRUEBA}, format="json"
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["rol"] == "PACIENTE"
    assert "access" in respuesta.json()


def prueba_CP_A02_credenciales_incorrectas_responden_401(crear_paciente):
    crear_paciente(1)

    respuesta = APIClient().post(
        "/api/v1/usuarios/iniciar-sesion/", {"username": "paciente1", "password": "incorrecta"}, format="json"
    )

    assert respuesta.status_code == 401


def prueba_CP_A03_sin_token_responde_401(doctor):
    assert APIClient().get("/api/v1/medicos/especialidades/").status_code == 401


# --- CU-01 Consultar disponibilidad (REQ-01) ---

def prueba_CP_CU01_01_disponibilidad_en_dia_habil(doctor, crear_paciente, cliente_de):
    cliente = cliente_de(crear_paciente(1).usuario)

    respuesta = _disponibilidad(cliente, doctor, proximo_dia_habil())

    assert respuesta.status_code == 200
    assert len(respuesta.json()["franjas"]) == 15
    assert respuesta.json()["franjas"][0] == "07:00"


def prueba_CP_CU01_02_fin_de_semana_sin_franjas(doctor, crear_paciente, cliente_de):
    cliente = cliente_de(crear_paciente(1).usuario)
    sabado = proximo_dia_habil() + timedelta(days=(5 - proximo_dia_habil().weekday()) % 7)

    assert _disponibilidad(cliente, doctor, sabado).json()["franjas"] == []


def prueba_CP_CU01_03_medico_inexistente_404(crear_paciente, cliente_de):
    cliente = cliente_de(crear_paciente(1).usuario)

    assert cliente.get("/api/v1/medicos/999/disponibilidad/", {"fecha": "2030-01-07"}).status_code == 404


def prueba_CP_CU01_04_fecha_malformada_422(doctor, crear_paciente, cliente_de):
    cliente = cliente_de(crear_paciente(1).usuario)

    respuesta = cliente.get(f"/api/v1/medicos/{doctor.id_doctor}/disponibilidad/", {"fecha": "07/01/2030"})

    assert respuesta.status_code == 422


def prueba_CP_CU04_01_bloqueo_excluye_franjas_de_la_disponibilidad(doctor, crear_paciente, cliente_de):
    fecha = proximo_dia_habil()
    BloqueoAgenda.objects.create(doctor=doctor, fecha=fecha, hora_inicio=time(7, 0), hora_fin=time(8, 0), motivo="Junta")
    cliente = cliente_de(crear_paciente(1).usuario)

    franjas = _disponibilidad(cliente, doctor, fecha).json()["franjas"]

    assert "07:40" not in franjas and "08:00" in franjas
    assert _agendar(cliente, doctor, fecha, "07:20").status_code == 409


# --- CU-02 Agendar cita (REQ-02, REQ-03) ---

def prueba_CP_CU02_01_agendar_franja_libre_201(doctor, crear_paciente, cliente_de):
    cliente = cliente_de(crear_paciente(1).usuario)
    fecha = proximo_dia_habil()

    respuesta = _agendar(cliente, doctor, fecha)

    assert respuesta.status_code == 201
    assert respuesta.json()["estado"] == "Agendada"
    assert "08:00" not in _disponibilidad(cliente, doctor, fecha).json()["franjas"]


def prueba_CP_CU02_02_franja_ocupada_409(doctor, crear_paciente, cliente_de):
    fecha = proximo_dia_habil()
    _agendar(cliente_de(crear_paciente(1).usuario), doctor, fecha)

    respuesta = _agendar(cliente_de(crear_paciente(2).usuario), doctor, fecha)

    assert respuesta.status_code == 409
    assert Cita.objects.filter(doctor=doctor, fecha=fecha).count() == 1


def prueba_CP_CU02_04_fecha_pasada_422(doctor, crear_paciente, cliente_de):
    ayer = timezone.localdate() - timedelta(days=1)

    assert _agendar(cliente_de(crear_paciente(1).usuario), doctor, ayer).status_code == 422


def prueba_CP_CU02_05_hora_fuera_del_horario_422(doctor, crear_paciente, cliente_de):
    cliente = cliente_de(crear_paciente(1).usuario)
    fecha = proximo_dia_habil()

    assert _agendar(cliente, doctor, fecha, "12:20").status_code == 422
    assert _agendar(cliente, doctor, fecha, "08:10").status_code == 422


def prueba_CP_CU02_06_medico_no_puede_agendar_403(doctor, cliente_de):
    assert _agendar(cliente_de(doctor.usuario), doctor, proximo_dia_habil()).status_code == 403


def prueba_CP_CU02_08_limite_de_citas_activas(doctor, crear_paciente, cliente_de, settings):
    settings.EPS_PARAMETROS = {**settings.EPS_PARAMETROS, "MAXIMO_CITAS_ACTIVAS_PACIENTE": 2}
    cliente = cliente_de(crear_paciente(1).usuario)
    fecha = proximo_dia_habil()

    assert _agendar(cliente, doctor, fecha, "07:00").status_code == 201
    assert _agendar(cliente, doctor, fecha, "07:20").status_code == 201
    assert _agendar(cliente, doctor, fecha, "07:40").status_code == 409


# --- CU-03 Cancelar cita (REQ-04, REQ-07) ---

def prueba_CP_CU03_01_cancelar_libera_la_franja(doctor, crear_paciente, cliente_de):
    fecha = proximo_dia_habil()
    cliente1 = cliente_de(crear_paciente(1).usuario)
    id_cita = _agendar(cliente1, doctor, fecha).json()["id_cita"]

    cancelada = cliente1.patch(f"/api/v1/citas/{id_cita}/cancelar/")

    assert cancelada.status_code == 200
    assert cancelada.json()["estado"] == "Cancelada"
    assert _agendar(cliente_de(crear_paciente(2).usuario), doctor, fecha).status_code == 201


def prueba_CP_CU03_02_cancelar_cita_ajena_403_y_queda_auditado(doctor, crear_paciente, cliente_de):
    id_cita = _agendar(cliente_de(crear_paciente(1).usuario), doctor, proximo_dia_habil()).json()["id_cita"]

    respuesta = cliente_de(crear_paciente(2).usuario).patch(f"/api/v1/citas/{id_cita}/cancelar/")

    assert respuesta.status_code == 403
    assert Auditoria.objects.filter(operacion="CANCELAR", id_registro=id_cita, resultado="DENEGADO").exists()


def prueba_CP_CU03_03_cancelar_dos_veces_409(doctor, crear_paciente, cliente_de):
    cliente = cliente_de(crear_paciente(1).usuario)
    id_cita = _agendar(cliente, doctor, proximo_dia_habil()).json()["id_cita"]
    cliente.patch(f"/api/v1/citas/{id_cita}/cancelar/")

    assert cliente.patch(f"/api/v1/citas/{id_cita}/cancelar/").status_code == 409


def prueba_CP_CU03_06_cancelacion_tardia_422(doctor, crear_paciente, cliente_de):
    paciente = crear_paciente(1)
    pronto = timezone.localtime() + timedelta(minutes=30)
    cita = Cita.objects.create(paciente=paciente, doctor=doctor, fecha=pronto.date(), hora=pronto.time())

    respuesta = cliente_de(paciente.usuario).patch(f"/api/v1/citas/{cita.id_cita}/cancelar/")

    assert respuesta.status_code == 422
    cita.refresh_from_db()
    assert cita.estado == EstadoCita.AGENDADA


def prueba_mis_citas_solo_devuelve_las_propias(doctor, crear_paciente, cliente_de):
    fecha = proximo_dia_habil()
    cliente1 = cliente_de(crear_paciente(1).usuario)
    _agendar(cliente1, doctor, fecha, "07:00")
    _agendar(cliente_de(crear_paciente(2).usuario), doctor, fecha, "07:20")

    citas = cliente1.get("/api/v1/citas/mias/").json()

    assert [c["hora"] for c in citas] == ["07:00"]
