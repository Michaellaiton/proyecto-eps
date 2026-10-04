"""Pruebas del rol DOCTOR: agenda, bloqueos (REQ-05) y registro de atención (CU-04). Requieren PostgreSQL."""
from datetime import time, timedelta

import pytest
from django.utils import timezone

from aplicaciones.auditoria.models import Auditoria
from aplicaciones.citas.models import Cita, EstadoCita
from aplicaciones.medicos.models import BloqueoAgenda, Doctor, Especialidad
from aplicaciones.usuarios.models import Rol, Usuario
from conftest import CLAVE_PRUEBA, proximo_dia_habil

pytestmark = pytest.mark.django_db


def _bloquear(cliente, fecha, inicio="07:00", fin="08:00", motivo="Junta médica"):
    return cliente.post(
        "/api/v1/medicos/bloqueos/",
        {"fecha": fecha.isoformat(), "hora_inicio": inicio, "hora_fin": fin, "motivo": motivo},
        format="json",
    )


@pytest.fixture
def otro_doctor(db):
    usuario = Usuario.objects.create_user(username="medico2", password=CLAVE_PRUEBA, rol=Rol.DOCTOR)
    return Doctor.objects.create(
        usuario=usuario, especialidad=Especialidad.objects.create(nombre="Pediatría"),
        nombres="Luis", apellidos="Prueba", registro_medico="RM-0002",
    )


# --- Agenda del día ---

def prueba_CP_CU04_04_agenda_muestra_franjas_citas_y_bloqueos(doctor, crear_paciente, cliente_de):
    fecha = proximo_dia_habil()
    Cita.objects.create(paciente=crear_paciente(1), doctor=doctor, fecha=fecha, hora=time(8, 0))
    BloqueoAgenda.objects.create(doctor=doctor, fecha=fecha, hora_inicio=time(7, 0), hora_fin=time(7, 40), motivo="Junta")

    agenda = cliente_de(doctor.usuario).get("/api/v1/medicos/agenda/", {"fecha": fecha.isoformat()}).json()
    por_hora = {f["hora"]: f for f in agenda["franjas"]}

    assert len(agenda["franjas"]) == 15
    assert por_hora["08:00"]["estado"] == "cita"
    assert por_hora["08:00"]["cita"]["paciente"] == "Paciente 1 Prueba"
    assert por_hora["07:20"]["estado"] == "bloqueada"
    assert por_hora["07:40"]["estado"] == "libre"
    assert agenda["resumen"] == {
        "franjas": 15, "citas": 1, "agendadas": 1, "atendidas": 0, "no_asistio": 0, "libres": 12, "bloqueadas": 2,
    }


def prueba_agenda_sin_fecha_usa_el_dia_de_hoy(doctor, cliente_de):
    agenda = cliente_de(doctor.usuario).get("/api/v1/medicos/agenda/").json()

    assert agenda["fecha"] == timezone.localdate().isoformat()


def prueba_agenda_no_muestra_citas_de_otro_medico(doctor, otro_doctor, crear_paciente, cliente_de):
    fecha = proximo_dia_habil()
    Cita.objects.create(paciente=crear_paciente(1), doctor=doctor, fecha=fecha, hora=time(8, 0))

    agenda = cliente_de(otro_doctor.usuario).get("/api/v1/medicos/agenda/", {"fecha": fecha.isoformat()}).json()

    assert agenda["resumen"]["citas"] == 0


def prueba_paciente_no_accede_a_la_agenda_del_medico(crear_paciente, cliente_de):
    assert cliente_de(crear_paciente(1).usuario).get("/api/v1/medicos/agenda/").status_code == 403


# --- Bloqueos (REQ-05) ---

def prueba_CP_CU04_01_bloqueo_informa_citas_existentes(doctor, crear_paciente, cliente_de):
    fecha = proximo_dia_habil()
    Cita.objects.create(paciente=crear_paciente(1), doctor=doctor, fecha=fecha, hora=time(7, 20))

    respuesta = _bloquear(cliente_de(doctor.usuario), fecha)

    assert respuesta.status_code == 201
    assert respuesta.json()["citas_existentes_en_intervalo"] == 1
    assert Cita.objects.get(hora=time(7, 20)).estado == EstadoCita.AGENDADA  # No se cancela automáticamente.
    assert Auditoria.objects.filter(operacion="BLOQUEAR").exists()


def prueba_CP_CU04_02_bloqueo_con_intervalo_invertido_422(doctor, cliente_de):
    assert _bloquear(cliente_de(doctor.usuario), proximo_dia_habil(), "09:00", "08:00").status_code == 422


def prueba_bloqueo_en_fecha_pasada_422(doctor, cliente_de):
    ayer = timezone.localdate() - timedelta(days=1)

    assert _bloquear(cliente_de(doctor.usuario), ayer).status_code == 422


def prueba_bloqueos_que_se_cruzan_409(doctor, cliente_de):
    cliente = cliente_de(doctor.usuario)
    fecha = proximo_dia_habil()
    _bloquear(cliente, fecha, "07:00", "08:00")

    assert _bloquear(cliente, fecha, "07:40", "09:00").status_code == 409
    assert _bloquear(cliente, fecha, "08:00", "09:00").status_code == 201  # Contiguo: no se cruza.


def prueba_CP_CU04_03_paciente_no_puede_bloquear_403(crear_paciente, cliente_de):
    assert _bloquear(cliente_de(crear_paciente(1).usuario), proximo_dia_habil()).status_code == 403


def prueba_listar_y_eliminar_bloqueo_libera_la_disponibilidad(doctor, crear_paciente, cliente_de):
    cliente = cliente_de(doctor.usuario)
    fecha = proximo_dia_habil()
    id_bloqueo = _bloquear(cliente, fecha).json()["id_bloqueo"]

    listado = cliente.get("/api/v1/medicos/bloqueos/").json()
    eliminado = cliente.delete(f"/api/v1/medicos/bloqueos/{id_bloqueo}/")
    franjas = cliente_de(crear_paciente(1).usuario).get(
        f"/api/v1/medicos/{doctor.id_doctor}/disponibilidad/", {"fecha": fecha.isoformat()}
    ).json()["franjas"]

    assert [b["id_bloqueo"] for b in listado] == [id_bloqueo]
    assert eliminado.status_code == 204
    assert "07:00" in franjas


def prueba_no_se_elimina_bloqueo_de_otro_medico(doctor, otro_doctor, cliente_de):
    id_bloqueo = _bloquear(cliente_de(doctor.usuario), proximo_dia_habil()).json()["id_bloqueo"]

    assert cliente_de(otro_doctor.usuario).delete(f"/api/v1/medicos/bloqueos/{id_bloqueo}/").status_code == 404


# --- Registro de atención (CU-04) ---

def _cita_pasada(doctor, paciente):
    hace_una_hora = timezone.localtime() - timedelta(hours=1)
    return Cita.objects.create(paciente=paciente, doctor=doctor, fecha=hace_una_hora.date(), hora=hace_una_hora.time())


@pytest.mark.parametrize("estado", ["Atendida", "No asistio"])
def prueba_medico_registra_atencion(estado, doctor, crear_paciente, cliente_de):
    cita = _cita_pasada(doctor, crear_paciente(1))

    respuesta = cliente_de(doctor.usuario).patch(f"/api/v1/citas/{cita.id_cita}/atencion/", {"estado": estado}, format="json")

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == estado
    assert Auditoria.objects.filter(operacion="REGISTRAR_ATENCION", resultado="OK").exists()


def prueba_no_se_registra_atencion_de_una_cita_futura(doctor, crear_paciente, cliente_de):
    cita = Cita.objects.create(paciente=crear_paciente(1), doctor=doctor, fecha=proximo_dia_habil(), hora=time(8, 0))

    respuesta = cliente_de(doctor.usuario).patch(f"/api/v1/citas/{cita.id_cita}/atencion/", {"estado": "Atendida"}, format="json")

    assert respuesta.status_code == 422


def prueba_otro_medico_no_registra_atencion_403_y_queda_auditado(doctor, otro_doctor, crear_paciente, cliente_de):
    cita = _cita_pasada(doctor, crear_paciente(1))

    respuesta = cliente_de(otro_doctor.usuario).patch(
        f"/api/v1/citas/{cita.id_cita}/atencion/", {"estado": "Atendida"}, format="json"
    )

    assert respuesta.status_code == 403
    assert Auditoria.objects.filter(operacion="REGISTRAR_ATENCION", resultado="DENEGADO").exists()


def prueba_atencion_ya_registrada_409(doctor, crear_paciente, cliente_de):
    cliente = cliente_de(doctor.usuario)
    cita = _cita_pasada(doctor, crear_paciente(1))
    cliente.patch(f"/api/v1/citas/{cita.id_cita}/atencion/", {"estado": "Atendida"}, format="json")

    assert cliente.patch(f"/api/v1/citas/{cita.id_cita}/atencion/", {"estado": "No asistio"}, format="json").status_code == 409


def prueba_estado_de_atencion_invalido_422(doctor, crear_paciente, cliente_de):
    cita = _cita_pasada(doctor, crear_paciente(1))

    respuesta = cliente_de(doctor.usuario).patch(f"/api/v1/citas/{cita.id_cita}/atencion/", {"estado": "Cancelada"}, format="json")

    assert respuesta.status_code == 422
