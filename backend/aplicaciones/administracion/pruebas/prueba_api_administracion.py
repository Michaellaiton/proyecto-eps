"""Pruebas del módulo de administración (rol ADMIN). Requieren PostgreSQL."""

from datetime import time, timedelta

import pytest
from rest_framework.test import APIClient

from aplicaciones.auditoria.models import Auditoria
from aplicaciones.citas.models import Cita, EstadoCita
from aplicaciones.medicos.models import Especialidad
from aplicaciones.usuarios.models import Usuario
from conftest import CLAVE_PRUEBA, proximo_dia_habil

pytestmark = pytest.mark.django_db

URL = "/api/v1/administracion"
CLAVE_NUEVA = "Clave-Nueva-Segura-2026"


def _datos_paciente(**cambios):
    datos = {
        "username": "nuevo_paciente",
        "password": CLAVE_NUEVA,
        "rol": "PACIENTE",
        "nombres": "María",
        "apellidos": "López",
        "tipo_documento": "CC",
        "numero_documento": "123456789",
        "telefono": "3001234567",
    }
    return {**datos, **cambios}


# --- Control de acceso ---


@pytest.mark.parametrize("ruta", ["/resumen/", "/usuarios/", "/especialidades/", "/citas/", "/auditoria/"])
def prueba_paciente_no_accede_al_modulo_de_administracion(ruta, crear_paciente, cliente_de):
    assert cliente_de(crear_paciente(1).usuario).get(URL + ruta).status_code == 403


def prueba_sin_token_responde_401():
    assert APIClient().get(URL + "/resumen/").status_code == 401


# --- Usuarios ---


def prueba_crear_paciente_crea_usuario_y_perfil(administrador, cliente_de):
    respuesta = cliente_de(administrador).post(URL + "/usuarios/", _datos_paciente(), format="json")

    assert respuesta.status_code == 201
    assert respuesta.json()["rol"] == "PACIENTE"
    assert respuesta.json()["perfil"]["numero_documento"] == "123456789"
    assert Auditoria.objects.filter(operacion="CREAR_USUARIO", resultado="OK").exists()


def prueba_paciente_creado_puede_iniciar_sesion(administrador, cliente_de):
    cliente_de(administrador).post(URL + "/usuarios/", _datos_paciente(), format="json")

    respuesta = APIClient().post(
        "/api/v1/usuarios/iniciar-sesion/", {"username": "nuevo_paciente", "password": CLAVE_NUEVA}, format="json"
    )

    assert respuesta.status_code == 200


def prueba_crear_medico_exige_especialidad_y_registro(administrador, cliente_de):
    datos = {"username": "medico_x", "password": CLAVE_NUEVA, "rol": "DOCTOR", "nombres": "Luis", "apellidos": "Paz"}

    respuesta = cliente_de(administrador).post(URL + "/usuarios/", datos, format="json")

    assert respuesta.status_code == 422
    assert {"id_especialidad", "registro_medico"} <= set(respuesta.json())


def prueba_crear_medico_valido(administrador, cliente_de):
    especialidad = Especialidad.objects.create(nombre="Cardiología")
    datos = {
        "username": "medico_x",
        "password": CLAVE_NUEVA,
        "rol": "DOCTOR",
        "nombres": "Luis",
        "apellidos": "Paz",
        "id_especialidad": especialidad.id_especialidad,
        "registro_medico": "RM-9999",
    }

    respuesta = cliente_de(administrador).post(URL + "/usuarios/", datos, format="json")

    assert respuesta.status_code == 201
    assert respuesta.json()["perfil"]["especialidad"] == "Cardiología"


def prueba_usuario_y_documento_duplicados_se_rechazan(administrador, cliente_de):
    cliente = cliente_de(administrador)
    cliente.post(URL + "/usuarios/", _datos_paciente(), format="json")

    mismo_usuario = cliente.post(URL + "/usuarios/", _datos_paciente(numero_documento="1"), format="json")
    mismo_documento = cliente.post(URL + "/usuarios/", _datos_paciente(username="otro"), format="json")

    assert mismo_usuario.status_code == 422 and "username" in mismo_usuario.json()
    assert mismo_documento.status_code == 422 and "numero_documento" in mismo_documento.json()


def prueba_contrasena_debil_se_rechaza(administrador, cliente_de):
    respuesta = cliente_de(administrador).post(URL + "/usuarios/", _datos_paciente(password="12345678"), format="json")

    assert respuesta.status_code == 422


def prueba_filtrar_usuarios_por_rol_y_busqueda(administrador, crear_paciente, doctor, cliente_de):
    crear_paciente(1)
    cliente = cliente_de(administrador)

    por_rol = cliente.get(URL + "/usuarios/", {"rol": "DOCTOR"}).json()
    por_texto = cliente.get(URL + "/usuarios/", {"buscar": "900000001"}).json()

    assert [u["username"] for u in por_rol] == ["medico1"]
    assert [u["username"] for u in por_texto] == ["paciente1"]


def prueba_desactivar_usuario_impide_iniciar_sesion(administrador, crear_paciente, cliente_de):
    paciente = crear_paciente(1)

    respuesta = cliente_de(administrador).patch(
        f"{URL}/usuarios/{paciente.usuario.id_usuario}/", {"activo": False}, format="json"
    )
    inicio = APIClient().post(
        "/api/v1/usuarios/iniciar-sesion/", {"username": "paciente1", "password": CLAVE_PRUEBA}, format="json"
    )

    assert respuesta.status_code == 200 and respuesta.json()["activo"] is False
    assert inicio.status_code == 401


def prueba_desactivar_medico_lo_saca_de_la_lista_de_medicos(administrador, doctor, crear_paciente, cliente_de):
    cliente_de(administrador).patch(f"{URL}/usuarios/{doctor.usuario.id_usuario}/", {"activo": False}, format="json")

    medicos = cliente_de(crear_paciente(1).usuario).get("/api/v1/medicos/").json()

    assert medicos == []


def prueba_administrador_no_puede_desactivarse_a_si_mismo(administrador, cliente_de):
    respuesta = cliente_de(administrador).patch(
        f"{URL}/usuarios/{administrador.id_usuario}/", {"activo": False}, format="json"
    )

    assert respuesta.status_code == 409


def prueba_restablecer_clave(administrador, crear_paciente, cliente_de):
    paciente = crear_paciente(1)

    respuesta = cliente_de(administrador).post(
        f"{URL}/usuarios/{paciente.usuario.id_usuario}/restablecer-clave/", {"password": CLAVE_NUEVA}, format="json"
    )
    paciente.usuario.refresh_from_db()

    assert respuesta.status_code == 204
    assert paciente.usuario.check_password(CLAVE_NUEVA)
    assert Auditoria.objects.filter(operacion="RESTABLECER_CLAVE").exists()


# --- Especialidades ---


def prueba_crear_y_renombrar_especialidad(administrador, cliente_de):
    cliente = cliente_de(administrador)

    creada = cliente.post(URL + "/especialidades/", {"nombre": "Dermatología"}, format="json")
    renombrada = cliente.patch(
        f"{URL}/especialidades/{creada.json()['id_especialidad']}/", {"nombre": "Dermatología clínica"}, format="json"
    )

    assert creada.status_code == 201
    assert renombrada.json()["nombre"] == "Dermatología clínica"


def prueba_no_se_elimina_especialidad_con_medicos(administrador, doctor, cliente_de):
    respuesta = cliente_de(administrador).delete(f"{URL}/especialidades/{doctor.especialidad_id}/")

    assert respuesta.status_code == 409
    assert Especialidad.objects.filter(pk=doctor.especialidad_id).exists()


def prueba_eliminar_especialidad_sin_medicos(administrador, cliente_de):
    especialidad = Especialidad.objects.create(nombre="Temporal")

    assert cliente_de(administrador).delete(f"{URL}/especialidades/{especialidad.id_especialidad}/").status_code == 204


# --- Horario base ---


def prueba_reemplazar_horario_cambia_la_disponibilidad(administrador, doctor, crear_paciente, cliente_de):
    fecha = proximo_dia_habil()
    bloques = [{"dia_semana": fecha.weekday(), "hora_inicio": "14:00", "hora_fin": "15:00", "duracion_minutos": 30}]

    respuesta = cliente_de(administrador).put(
        f"{URL}/medicos/{doctor.id_doctor}/horario/", {"bloques": bloques}, format="json"
    )
    franjas = (
        cliente_de(crear_paciente(1).usuario)
        .get(f"/api/v1/medicos/{doctor.id_doctor}/disponibilidad/", {"fecha": fecha.isoformat()})
        .json()["franjas"]
    )

    assert respuesta.status_code == 200
    assert franjas == ["14:00", "14:30"]


def prueba_bloques_que_se_cruzan_se_rechazan(administrador, doctor, cliente_de):
    bloques = [
        {"dia_semana": 0, "hora_inicio": "07:00", "hora_fin": "10:00", "duracion_minutos": 20},
        {"dia_semana": 0, "hora_inicio": "09:00", "hora_fin": "11:00", "duracion_minutos": 20},
    ]

    respuesta = cliente_de(administrador).put(
        f"{URL}/medicos/{doctor.id_doctor}/horario/", {"bloques": bloques}, format="json"
    )

    assert respuesta.status_code == 422
    assert doctor.horarios.count() == 5  # El horario anterior queda intacto.


def prueba_bloque_con_hora_fin_anterior_se_rechaza(administrador, doctor, cliente_de):
    bloques = [{"dia_semana": 0, "hora_inicio": "10:00", "hora_fin": "09:00", "duracion_minutos": 20}]

    respuesta = cliente_de(administrador).put(
        f"{URL}/medicos/{doctor.id_doctor}/horario/", {"bloques": bloques}, format="json"
    )

    assert respuesta.status_code == 422


# --- Citas, reporte y resumen ---


def prueba_listado_de_citas_filtra_por_estado(administrador, doctor, crear_paciente, cliente_de):
    fecha = proximo_dia_habil()
    Cita.objects.create(paciente=crear_paciente(1), doctor=doctor, fecha=fecha, hora=time(7, 0))
    Cita.objects.create(
        paciente=crear_paciente(2), doctor=doctor, fecha=fecha, hora=time(7, 20), estado=EstadoCita.CANCELADA
    )

    respuesta = cliente_de(administrador).get(URL + "/citas/", {"estado": "Cancelada"}).json()

    assert respuesta["count"] == 1
    assert respuesta["results"][0]["paciente"] == "Paciente 2 Prueba"


def prueba_listado_de_citas_rechaza_fecha_invalida(administrador, cliente_de):
    assert cliente_de(administrador).get(URL + "/citas/", {"desde": "ayer"}).status_code == 422


def prueba_administrador_cancela_cita_de_cualquier_paciente(administrador, doctor, crear_paciente, cliente_de):
    cita = Cita.objects.create(paciente=crear_paciente(1), doctor=doctor, fecha=proximo_dia_habil(), hora=time(8, 0))

    respuesta = cliente_de(administrador).patch(f"/api/v1/citas/{cita.id_cita}/cancelar/")

    assert respuesta.status_code == 200 and respuesta.json()["estado"] == "Cancelada"


def prueba_reporte_de_ocupacion(administrador, doctor, crear_paciente, cliente_de):
    fecha = proximo_dia_habil()
    Cita.objects.create(paciente=crear_paciente(1), doctor=doctor, fecha=fecha, hora=time(7, 0))
    Cita.objects.create(paciente=crear_paciente(2), doctor=doctor, fecha=fecha, hora=time(7, 20))
    Cita.objects.create(
        paciente=crear_paciente(3), doctor=doctor, fecha=fecha, hora=time(7, 40), estado=EstadoCita.CANCELADA
    )

    reporte = (
        cliente_de(administrador)
        .get(URL + "/reportes/ocupacion/", {"desde": fecha.isoformat(), "hasta": fecha.isoformat()})
        .json()
    )
    fila = reporte["medicos"][0]

    assert fila["franjas_ofertadas"] == 15
    assert (fila["agendadas"], fila["canceladas"]) == (2, 1)
    assert fila["porcentaje_ocupacion"] == round(100 * 2 / 15, 1)


def prueba_reporte_rechaza_rango_invertido_o_muy_largo(administrador, cliente_de):
    cliente = cliente_de(administrador)
    hoy = proximo_dia_habil()

    invertido = cliente.get(URL + "/reportes/ocupacion/", {"desde": hoy, "hasta": hoy - timedelta(days=1)})
    largo = cliente.get(URL + "/reportes/ocupacion/", {"desde": hoy, "hasta": hoy + timedelta(days=400)})

    assert invertido.status_code == 422 and largo.status_code == 422


def prueba_resumen_cuenta_pacientes_y_medicos(administrador, doctor, crear_paciente, cliente_de):
    crear_paciente(1)
    crear_paciente(2)

    resumen = cliente_de(administrador).get(URL + "/resumen/").json()

    assert resumen["pacientes"] == 2
    assert resumen["medicos_activos"] == 1


def prueba_auditoria_lista_registros_paginados(administrador, crear_paciente, cliente_de):
    paciente = crear_paciente(1)
    cliente = cliente_de(administrador)
    cliente.patch(f"{URL}/usuarios/{paciente.usuario.id_usuario}/", {"telefono": "3110000000"}, format="json")

    respuesta = cliente.get(URL + "/auditoria/", {"operacion": "ACTUALIZAR_USUARIO"}).json()

    assert respuesta["count"] == 1
    assert respuesta["results"][0]["usuario"] == "admin"
    assert Usuario.objects.get(pk=paciente.usuario.pk).paciente.telefono == "3110000000"
