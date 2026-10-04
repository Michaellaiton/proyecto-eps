"""Pruebas de las reglas de integridad de la tabla citas (REQ-03 y REQ-04). Requieren PostgreSQL."""
from datetime import time

import pytest
from django.db import IntegrityError, transaction

from aplicaciones.citas.models import Cita, EstadoCita
from conftest import proximo_dia_habil

HORA = time(8, 0)


@pytest.mark.django_db
def prueba_indice_unico_rechaza_dos_citas_activas_en_la_misma_franja(doctor, crear_paciente):
    fecha = proximo_dia_habil()
    Cita.objects.create(paciente=crear_paciente(1), doctor=doctor, fecha=fecha, hora=HORA)

    with pytest.raises(IntegrityError), transaction.atomic():
        Cita.objects.create(paciente=crear_paciente(2), doctor=doctor, fecha=fecha, hora=HORA)


@pytest.mark.django_db
def prueba_indice_parcial_permite_reutilizar_franja_cancelada(doctor, crear_paciente):
    fecha = proximo_dia_habil()
    Cita.objects.create(
        paciente=crear_paciente(1), doctor=doctor, fecha=fecha, hora=HORA, estado=EstadoCita.CANCELADA
    )

    cita = Cita.objects.create(paciente=crear_paciente(2), doctor=doctor, fecha=fecha, hora=HORA)

    assert cita.estado == EstadoCita.AGENDADA


@pytest.mark.django_db
def prueba_estado_invalido_es_rechazado_por_la_base_de_datos(doctor, crear_paciente):
    with pytest.raises(IntegrityError), transaction.atomic():
        Cita.objects.create(
            paciente=crear_paciente(1), doctor=doctor, fecha=proximo_dia_habil(), hora=HORA, estado="Inventado"
        )
