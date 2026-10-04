"""Pruebas de las notificaciones por correo al paciente. Los correos se envían al confirmar la transacción."""
from datetime import time

import pytest

from aplicaciones.citas.models import Cita
from conftest import proximo_dia_habil

pytestmark = pytest.mark.django_db


@pytest.fixture
def paciente(crear_paciente):
    paciente = crear_paciente(1)
    paciente.usuario.email = "paciente1@eps.test"
    paciente.usuario.save()
    return paciente


def _agendar(cliente, doctor, fecha, hora="08:00"):
    return cliente.post(
        "/api/v1/citas/", {"id_doctor": doctor.id_doctor, "fecha": fecha.isoformat(), "hora": hora}, format="json"
    )


def prueba_agendar_envia_confirmacion(doctor, paciente, cliente_de, mailoutbox, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        _agendar(cliente_de(paciente.usuario), doctor, proximo_dia_habil())

    assert len(mailoutbox) == 1
    correo = mailoutbox[0]
    assert correo.to == ["paciente1@eps.test"]
    assert "Cita agendada" in correo.subject
    assert "08:00" in correo.body and "Medicina general" in correo.body


def prueba_cancelar_envia_aviso(doctor, paciente, cliente_de, mailoutbox, django_capture_on_commit_callbacks):
    cliente = cliente_de(paciente.usuario)
    id_cita = _agendar(cliente, doctor, proximo_dia_habil()).json()["id_cita"]

    with django_capture_on_commit_callbacks(execute=True):
        cliente.patch(f"/api/v1/citas/{id_cita}/cancelar/")

    assert [c.subject for c in mailoutbox] == ["[Citas EPS] Cita cancelada"]


def prueba_reprogramar_envia_antes_y_despues(doctor, paciente, cliente_de, mailoutbox, django_capture_on_commit_callbacks):
    cliente = cliente_de(paciente.usuario)
    fecha = proximo_dia_habil()
    id_cita = _agendar(cliente, doctor, fecha).json()["id_cita"]

    with django_capture_on_commit_callbacks(execute=True):
        cliente.patch(f"/api/v1/citas/{id_cita}/reprogramar/", {"fecha": fecha.isoformat(), "hora": "10:00"}, format="json")

    assert len(mailoutbox) == 1
    assert "Antes:" in mailoutbox[0].body and "10:00" in mailoutbox[0].body


def prueba_operacion_fallida_no_envia_correo(doctor, paciente, crear_paciente, cliente_de, mailoutbox, django_capture_on_commit_callbacks):
    fecha = proximo_dia_habil()
    Cita.objects.create(paciente=crear_paciente(2), doctor=doctor, fecha=fecha, hora=time(8, 0))

    with django_capture_on_commit_callbacks(execute=True):
        respuesta = _agendar(cliente_de(paciente.usuario), doctor, fecha)

    assert respuesta.status_code == 409
    assert mailoutbox == []


def prueba_bloqueo_avisa_a_los_pacientes_afectados(doctor, paciente, cliente_de, mailoutbox, django_capture_on_commit_callbacks):
    fecha = proximo_dia_habil()
    Cita.objects.create(paciente=paciente, doctor=doctor, fecha=fecha, hora=time(7, 20))

    with django_capture_on_commit_callbacks(execute=True):
        cliente_de(doctor.usuario).post(
            "/api/v1/medicos/bloqueos/",
            {"fecha": fecha.isoformat(), "hora_inicio": "07:00", "hora_fin": "08:00", "motivo": "Incapacidad"},
            format="json",
        )

    assert len(mailoutbox) == 1
    assert "Incapacidad" in mailoutbox[0].body


def prueba_paciente_sin_correo_no_genera_envio(doctor, crear_paciente, cliente_de, mailoutbox, django_capture_on_commit_callbacks):
    sin_correo = crear_paciente(2)

    with django_capture_on_commit_callbacks(execute=True):
        respuesta = _agendar(cliente_de(sin_correo.usuario), doctor, proximo_dia_habil())

    assert respuesta.status_code == 201
    assert mailoutbox == []
