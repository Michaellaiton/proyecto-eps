"""Pruebas de las notificaciones internas (campana) y de los recordatorios de cita."""

from datetime import datetime, time, timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from aplicaciones.citas.models import Cita
from aplicaciones.citas.servicios import enviar_recordatorios
from aplicaciones.notificaciones.models import Notificacion, TipoNotificacion
from aplicaciones.notificaciones.servicios import notificar
from conftest import CLAVE_PRUEBA, proximo_dia_habil

pytestmark = pytest.mark.django_db

URL = "/api/v1/notificaciones/"


def _agendar(cliente, doctor, fecha, hora="08:00"):
    return cliente.post(
        "/api/v1/citas/", {"id_doctor": doctor.id_doctor, "fecha": fecha.isoformat(), "hora": hora}, format="json"
    )


# --- Eventos que generan avisos ---


def prueba_agendar_avisa_al_paciente_y_al_medico(doctor, crear_paciente, cliente_de):
    paciente = crear_paciente(1)

    _agendar(cliente_de(paciente.usuario), doctor, proximo_dia_habil())

    del_paciente = Notificacion.objects.get(usuario=paciente.usuario)
    del_medico = Notificacion.objects.get(usuario=doctor.usuario)
    assert (del_paciente.titulo, del_paciente.destino) == ("Cita agendada", "mis-citas")
    assert (del_medico.tipo, del_medico.destino) == (TipoNotificacion.AGENDA, "agenda")
    assert "Paciente 1 Prueba" in del_medico.mensaje


def prueba_cancelacion_por_administrador_avisa_al_paciente(doctor, crear_paciente, administrador, cliente_de):
    paciente = crear_paciente(1)
    id_cita = _agendar(cliente_de(paciente.usuario), doctor, proximo_dia_habil()).json()["id_cita"]

    cliente_de(administrador).patch(f"/api/v1/citas/{id_cita}/cancelar/")

    aviso = Notificacion.objects.filter(usuario=paciente.usuario, titulo="Cita cancelada").get()
    assert "personal de la EPS" in aviso.mensaje


def prueba_operacion_fallida_no_deja_avisos(doctor, crear_paciente, cliente_de):
    fecha = proximo_dia_habil()
    Cita.objects.create(paciente=crear_paciente(2), doctor=doctor, fecha=fecha, hora=time(8, 0))

    respuesta = _agendar(cliente_de(crear_paciente(1).usuario), doctor, fecha)

    assert respuesta.status_code == 409
    assert Notificacion.objects.count() == 0  # El aviso se revierte con la transacción.


def prueba_bloqueo_con_citas_avisa_a_los_administradores(doctor, crear_paciente, administrador, cliente_de):
    fecha = proximo_dia_habil()
    Cita.objects.create(paciente=crear_paciente(1), doctor=doctor, fecha=fecha, hora=time(7, 20))

    cliente_de(doctor.usuario).post(
        "/api/v1/medicos/bloqueos/",
        {"fecha": fecha.isoformat(), "hora_inicio": "07:00", "hora_fin": "08:00", "motivo": "Incapacidad"},
        format="json",
    )

    aviso = Notificacion.objects.get(usuario=administrador)
    assert aviso.destino == "citas" and "Incapacidad" in aviso.mensaje


def prueba_bloqueo_de_cuenta_genera_aviso_de_seguridad(crear_paciente, settings):
    settings.EPS_PARAMETROS = {**settings.EPS_PARAMETROS, "INTENTOS_MAXIMOS_SESION": 2}
    paciente = crear_paciente(1)
    for _ in range(2):
        APIClient().post(
            "/api/v1/usuarios/iniciar-sesion/", {"username": "paciente1", "password": "mala"}, format="json"
        )

    aviso = Notificacion.objects.get(usuario=paciente.usuario)
    assert aviso.tipo == TipoNotificacion.SEGURIDAD


def prueba_cambiar_clave_genera_aviso(crear_paciente, cliente_de):
    paciente = crear_paciente(1)

    cliente_de(paciente.usuario).post(
        "/api/v1/usuarios/cambiar-clave/",
        {"clave_actual": CLAVE_PRUEBA, "clave_nueva": "Clave-Nueva-Segura-2026"},
        format="json",
    )

    assert Notificacion.objects.filter(usuario=paciente.usuario, tipo=TipoNotificacion.SEGURIDAD).exists()


# --- Endpoints de la campana ---


def prueba_listado_solo_muestra_las_propias_y_cuenta_no_leidas(crear_paciente, cliente_de):
    uno, dos = crear_paciente(1).usuario, crear_paciente(2).usuario
    notificar(uno, "A", "mensaje")
    notificar(uno, "B", "mensaje")
    notificar(dos, "C", "mensaje")

    datos = cliente_de(uno).get(URL).json()

    assert datos["no_leidas"] == 2
    assert [n["titulo"] for n in datos["resultados"]] == ["B", "A"]


def prueba_marcar_una_y_todas_como_leidas(crear_paciente, cliente_de):
    usuario = crear_paciente(1).usuario
    primera = notificar(usuario, "A", "mensaje")
    notificar(usuario, "B", "mensaje")
    cliente = cliente_de(usuario)

    cliente.patch(f"{URL}{primera.id_notificacion}/leida/")
    assert cliente.get(f"{URL}contador/").json()["no_leidas"] == 1

    assert cliente.post(f"{URL}marcar-todas/").json()["actualizadas"] == 1
    assert cliente.get(f"{URL}?solo_no_leidas=true").json()["resultados"] == []


def prueba_no_se_marca_notificacion_ajena(crear_paciente, cliente_de):
    ajena = notificar(crear_paciente(2).usuario, "A", "mensaje")

    assert cliente_de(crear_paciente(1).usuario).patch(f"{URL}{ajena.id_notificacion}/leida/").status_code == 404


def prueba_notificaciones_exigen_sesion():
    assert APIClient().get(URL).status_code == 401


# --- Recordatorios ---


def _cita_en(doctor, paciente, horas):
    momento = timezone.localtime() + timedelta(hours=horas)
    return Cita.objects.create(
        paciente=paciente, doctor=doctor, fecha=momento.date(), hora=momento.time().replace(microsecond=0)
    )


def prueba_recordatorio_solo_para_citas_de_las_proximas_24_horas(doctor, crear_paciente):
    cercana = _cita_en(doctor, crear_paciente(1), 5)
    lejana = _cita_en(doctor, crear_paciente(2), 48)

    enviados = enviar_recordatorios()

    cercana.refresh_from_db()
    lejana.refresh_from_db()
    assert enviados == 1
    assert cercana.recordatorio_enviado_en is not None and lejana.recordatorio_enviado_en is None
    assert Notificacion.objects.filter(usuario=cercana.paciente.usuario, tipo=TipoNotificacion.RECORDATORIO).exists()


def prueba_recordatorio_no_se_repite(doctor, crear_paciente):
    _cita_en(doctor, crear_paciente(1), 5)

    assert enviar_recordatorios() == 1
    assert enviar_recordatorios() == 0


def prueba_recordatorio_ignora_canceladas(doctor, crear_paciente):
    cita = _cita_en(doctor, crear_paciente(1), 5)
    cita.estado = "Cancelada"
    cita.save()

    assert enviar_recordatorios() == 0


def prueba_recordatorio_envia_correo(doctor, crear_paciente, mailoutbox, django_capture_on_commit_callbacks):
    paciente = crear_paciente(1)
    paciente.usuario.email = "paciente1@eps.test"
    paciente.usuario.save()
    _cita_en(doctor, paciente, 5)

    with django_capture_on_commit_callbacks(execute=True):
        enviar_recordatorios()

    assert [c.subject for c in mailoutbox] == ["[Citas EPS] Recordatorio de su cita"]


def prueba_comando_de_recordatorios(doctor, crear_paciente, capsys):
    from django.core.management import call_command

    _cita_en(doctor, crear_paciente(1), 5)
    call_command("enviar_recordatorios")

    assert "Recordatorios enviados: 1" in capsys.readouterr().out


def prueba_recordatorio_con_hora_de_referencia(doctor, crear_paciente):
    fecha = proximo_dia_habil()
    Cita.objects.create(paciente=crear_paciente(1), doctor=doctor, fecha=fecha, hora=time(8, 0))
    la_vispera = timezone.make_aware(datetime.combine(fecha - timedelta(days=1), time(9, 0)))

    assert enviar_recordatorios(ahora=la_vispera) == 1
