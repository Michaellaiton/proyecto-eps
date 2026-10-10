"""Pruebas de la exportación a CSV y de la selección de base de datos para reportes."""

from datetime import time
from unittest.mock import patch

import pytest

from aplicaciones.citas.models import Cita
from configuracion.bd import alias_lectura
from conftest import proximo_dia_habil

pytestmark = pytest.mark.django_db

URL = "/api/v1/administracion"


def _texto(respuesta):
    return b"".join(respuesta.streaming_content if respuesta.streaming else [respuesta.content]).decode("utf-8-sig")


def prueba_exportar_ocupacion_en_csv(administrador, doctor, crear_paciente, cliente_de):
    fecha = proximo_dia_habil()
    Cita.objects.create(paciente=crear_paciente(1), doctor=doctor, fecha=fecha, hora=time(7, 0))

    respuesta = cliente_de(administrador).get(f"{URL}/reportes/ocupacion/exportar/", {"desde": fecha, "hasta": fecha})
    lineas = _texto(respuesta).splitlines()

    assert respuesta.status_code == 200
    assert respuesta["Content-Type"].startswith("text/csv")
    assert "attachment" in respuesta["Content-Disposition"]
    assert lineas[0].startswith("Médico;Especialidad")
    assert lineas[1].startswith("Ana Prueba;Medicina general;Sí;15;1")
    assert lineas[-1].startswith("Total;")


def prueba_exportar_citas_respeta_los_filtros(administrador, doctor, crear_paciente, cliente_de):
    fecha = proximo_dia_habil()
    Cita.objects.create(paciente=crear_paciente(1), doctor=doctor, fecha=fecha, hora=time(7, 0))
    Cita.objects.create(paciente=crear_paciente(2), doctor=doctor, fecha=fecha, hora=time(7, 20), estado="Cancelada")

    lineas = _texto(cliente_de(administrador).get(f"{URL}/citas/exportar/", {"estado": "Cancelada"})).splitlines()

    assert len(lineas) == 2
    assert "Paciente 2 Prueba" in lineas[1] and lineas[1].endswith("Cancelada")


def prueba_exportar_exige_administrador(crear_paciente, cliente_de):
    respuesta = cliente_de(crear_paciente(1).usuario).get(f"{URL}/citas/exportar/")

    assert respuesta.status_code == 403


def prueba_reportes_leen_de_la_principal_si_no_hay_replica():
    assert alias_lectura() == "default"


def prueba_reportes_leen_de_la_replica_si_esta_configurada():
    with patch("configuracion.bd.settings") as ajustes:
        ajustes.DATABASES = {"default": {}, "replica": {}}

        assert alias_lectura() == "replica"
