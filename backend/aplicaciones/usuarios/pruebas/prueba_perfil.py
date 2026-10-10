"""Pruebas de «Mi perfil»: datos de contacto y cambio de contraseña del usuario autenticado."""

import pytest
from rest_framework.test import APIClient

from aplicaciones.auditoria.models import Auditoria
from conftest import CLAVE_PRUEBA

pytestmark = pytest.mark.django_db

CLAVE_NUEVA = "Clave-Nueva-Segura-2026"


def prueba_perfil_del_paciente_incluye_telefono(crear_paciente, cliente_de):
    perfil = cliente_de(crear_paciente(1).usuario).get("/api/v1/usuarios/yo/").json()

    assert perfil["rol"] == "PACIENTE"
    assert perfil["telefono"] == "3000000000"
    assert perfil["especialidad"] is None


def prueba_perfil_del_medico_incluye_especialidad(doctor, cliente_de):
    assert cliente_de(doctor.usuario).get("/api/v1/usuarios/yo/").json()["especialidad"] == "Medicina general"


def prueba_paciente_actualiza_correo_y_telefono(crear_paciente, cliente_de):
    paciente = crear_paciente(1)

    respuesta = cliente_de(paciente.usuario).patch(
        "/api/v1/usuarios/yo/", {"email": "nuevo@eps.test", "telefono": "3109998877"}, format="json"
    )
    paciente.refresh_from_db()

    assert respuesta.status_code == 200
    assert respuesta.json()["email"] == "nuevo@eps.test"
    assert paciente.telefono == "3109998877"
    assert Auditoria.objects.filter(operacion="ACTUALIZAR_PERFIL").exists()


def prueba_telefono_invalido_422(crear_paciente, cliente_de):
    respuesta = cliente_de(crear_paciente(1).usuario).patch("/api/v1/usuarios/yo/", {"telefono": "abc"}, format="json")

    assert respuesta.status_code == 422


def prueba_cambiar_clave_y_entrar_con_la_nueva(crear_paciente, cliente_de):
    paciente = crear_paciente(1)

    respuesta = cliente_de(paciente.usuario).post(
        "/api/v1/usuarios/cambiar-clave/", {"clave_actual": CLAVE_PRUEBA, "clave_nueva": CLAVE_NUEVA}, format="json"
    )
    inicio = APIClient().post(
        "/api/v1/usuarios/iniciar-sesion/", {"username": "paciente1", "password": CLAVE_NUEVA}, format="json"
    )

    assert respuesta.status_code == 204
    assert inicio.status_code == 200


def prueba_cambiar_clave_exige_la_actual(crear_paciente, cliente_de):
    respuesta = cliente_de(crear_paciente(1).usuario).post(
        "/api/v1/usuarios/cambiar-clave/", {"clave_actual": "otra", "clave_nueva": CLAVE_NUEVA}, format="json"
    )

    assert respuesta.status_code == 422
    assert "clave_actual" in respuesta.json()


def prueba_clave_nueva_debil_se_rechaza(crear_paciente, cliente_de):
    respuesta = cliente_de(crear_paciente(1).usuario).post(
        "/api/v1/usuarios/cambiar-clave/", {"clave_actual": CLAVE_PRUEBA, "clave_nueva": "12345678"}, format="json"
    )

    assert respuesta.status_code == 422
