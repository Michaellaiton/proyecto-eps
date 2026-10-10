"""Pruebas de reprogramación (CU-03, REQ-04) y de la sugerencia de franja ante un 409 (Tabla 29 del informe)."""

from datetime import time, timedelta

import pytest
from django.utils import timezone

from aplicaciones.auditoria.models import Auditoria
from aplicaciones.citas.models import Cita, EstadoCita
from aplicaciones.medicos.models import Doctor, Especialidad, HorarioBase
from aplicaciones.usuarios.models import Rol, Usuario
from conftest import CLAVE_PRUEBA, proximo_dia_habil

pytestmark = pytest.mark.django_db


def _reprogramar(cliente, id_cita, fecha, hora, id_doctor=None):
    datos = {"fecha": fecha.isoformat(), "hora": hora}
    if id_doctor:
        datos["id_doctor"] = id_doctor
    return cliente.patch(f"/api/v1/citas/{id_cita}/reprogramar/", datos, format="json")


def _crear_doctor(numero, especialidad):
    usuario = Usuario.objects.create_user(username=f"medico{numero}", password=CLAVE_PRUEBA, rol=Rol.DOCTOR)
    doctor = Doctor.objects.create(
        usuario=usuario, especialidad=especialidad, nombres="Otro", apellidos="Prueba", registro_medico=f"RM-{numero}"
    )
    for dia in range(5):
        HorarioBase.objects.create(doctor=doctor, dia_semana=dia, hora_inicio=time(7, 0), hora_fin=time(12, 0))
    return doctor


@pytest.fixture
def cita(doctor, crear_paciente):
    return Cita.objects.create(paciente=crear_paciente(1), doctor=doctor, fecha=proximo_dia_habil(), hora=time(8, 0))


# --- Reprogramar ---


def prueba_reprogramar_cancela_la_original_y_crea_la_nueva(cita, cliente_de):
    respuesta = _reprogramar(cliente_de(cita.paciente.usuario), cita.id_cita, cita.fecha, "09:00")

    cita.refresh_from_db()
    assert respuesta.status_code == 200
    assert respuesta.json()["hora"] == "09:00" and respuesta.json()["estado"] == "Agendada"
    assert cita.estado == EstadoCita.CANCELADA
    assert Auditoria.objects.filter(operacion="REPROGRAMAR", resultado="OK").exists()


def prueba_la_franja_original_queda_libre_tras_reprogramar(cita, crear_paciente, cliente_de):
    _reprogramar(cliente_de(cita.paciente.usuario), cita.id_cita, cita.fecha, "09:00")

    otro = cliente_de(crear_paciente(2).usuario).post(
        "/api/v1/citas/", {"id_doctor": cita.doctor_id, "fecha": cita.fecha.isoformat(), "hora": "08:00"}, format="json"
    )

    assert otro.status_code == 201


def prueba_reprogramar_a_franja_ocupada_409_con_sugerencia_y_sin_tocar_la_original(cita, crear_paciente, cliente_de):
    Cita.objects.create(paciente=crear_paciente(2), doctor=cita.doctor, fecha=cita.fecha, hora=time(9, 0))

    respuesta = _reprogramar(cliente_de(cita.paciente.usuario), cita.id_cita, cita.fecha, "09:00")

    cita.refresh_from_db()
    assert respuesta.status_code == 409
    assert respuesta.json()["sugerencia"]["hora"] == "09:20"
    assert cita.estado == EstadoCita.AGENDADA  # La transacción se revirtió completa.


def prueba_reprogramar_con_otro_medico_de_la_misma_especialidad(cita, cliente_de):
    otro = _crear_doctor(2, cita.doctor.especialidad)

    respuesta = _reprogramar(cliente_de(cita.paciente.usuario), cita.id_cita, cita.fecha, "08:00", otro.id_doctor)

    assert respuesta.status_code == 200
    assert respuesta.json()["id_doctor"] == otro.id_doctor


def prueba_no_se_reprograma_con_medico_de_otra_especialidad(cita, cliente_de):
    otro = _crear_doctor(2, Especialidad.objects.create(nombre="Odontología"))

    respuesta = _reprogramar(cliente_de(cita.paciente.usuario), cita.id_cita, cita.fecha, "08:00", otro.id_doctor)

    assert respuesta.status_code == 422


def prueba_reprogramar_a_la_misma_fecha_y_hora_422(cita, cliente_de):
    assert _reprogramar(cliente_de(cita.paciente.usuario), cita.id_cita, cita.fecha, "08:00").status_code == 422


def prueba_no_se_reprograma_cita_ajena_403(cita, crear_paciente, cliente_de):
    respuesta = _reprogramar(cliente_de(crear_paciente(2).usuario), cita.id_cita, cita.fecha, "09:00")

    assert respuesta.status_code == 403
    assert Auditoria.objects.filter(operacion="REPROGRAMAR", resultado="DENEGADO").exists()


def prueba_no_se_reprograma_cita_cancelada_409(cita, cliente_de):
    cita.estado = EstadoCita.CANCELADA
    cita.save()

    assert _reprogramar(cliente_de(cita.paciente.usuario), cita.id_cita, cita.fecha, "09:00").status_code == 409


def prueba_reprogramacion_tardia_422(doctor, crear_paciente, cliente_de):
    paciente = crear_paciente(1)
    pronto = timezone.localtime() + timedelta(minutes=30)
    cita = Cita.objects.create(paciente=paciente, doctor=doctor, fecha=pronto.date(), hora=pronto.time())

    respuesta = _reprogramar(cliente_de(paciente.usuario), cita.id_cita, proximo_dia_habil(), "09:00")

    assert respuesta.status_code == 422


# --- Sugerencia al agendar ---


def prueba_agendar_franja_ocupada_sugiere_la_siguiente_libre(cita, crear_paciente, cliente_de):
    respuesta = cliente_de(crear_paciente(2).usuario).post(
        "/api/v1/citas/", {"id_doctor": cita.doctor_id, "fecha": cita.fecha.isoformat(), "hora": "08:00"}, format="json"
    )

    assert respuesta.status_code == 409
    assert respuesta.json()["detail"] == "La franja ya fue asignada."
    assert respuesta.json()["sugerencia"] == {
        "id_doctor": str(cita.doctor_id),
        "fecha": cita.fecha.isoformat(),
        "hora": "08:20",
    }


def prueba_sugerencia_salta_al_dia_siguiente_si_no_quedan_franjas(doctor, crear_paciente, cliente_de):
    fecha = proximo_dia_habil()
    Cita.objects.create(paciente=crear_paciente(1), doctor=doctor, fecha=fecha, hora=time(11, 40))

    respuesta = cliente_de(crear_paciente(2).usuario).post(
        "/api/v1/citas/", {"id_doctor": doctor.id_doctor, "fecha": fecha.isoformat(), "hora": "11:40"}, format="json"
    )
    sugerencia = respuesta.json()["sugerencia"]

    assert sugerencia["fecha"] > fecha.isoformat()
    assert sugerencia["hora"] == "07:00"


def prueba_limite_de_citas_no_ofrece_sugerencia(doctor, crear_paciente, cliente_de, settings):
    settings.EPS_PARAMETROS = {**settings.EPS_PARAMETROS, "MAXIMO_CITAS_ACTIVAS_PACIENTE": 1}
    cliente = cliente_de(crear_paciente(1).usuario)
    fecha = proximo_dia_habil()
    cliente.post(
        "/api/v1/citas/", {"id_doctor": doctor.id_doctor, "fecha": fecha.isoformat(), "hora": "07:00"}, format="json"
    )

    respuesta = cliente.post(
        "/api/v1/citas/", {"id_doctor": doctor.id_doctor, "fecha": fecha.isoformat(), "hora": "07:20"}, format="json"
    )

    assert respuesta.status_code == 409
    assert "sugerencia" not in respuesta.json()
