"""
Prueba de concurrencia (REQ-03, OBS-01): N solicitudes simultáneas por la misma franja
deben producir exactamente una cita. Usa hilos reales y conexiones independientes a PostgreSQL.
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import time
from threading import Barrier

import pytest
from django.db import connections

from aplicaciones.citas import servicios
from aplicaciones.citas.models import Cita
from configuracion.excepciones import Conflicto
from conftest import proximo_dia_habil

SOLICITUDES_SIMULTANEAS = 20


@pytest.mark.django_db(transaction=True)
def prueba_CP_CONC_01_misma_franja_un_solo_ganador(doctor, crear_paciente):
    usuarios = [crear_paciente(n).usuario for n in range(1, SOLICITUDES_SIMULTANEAS + 1)]
    fecha, hora = proximo_dia_habil(), time(8, 0)
    barrera = Barrier(SOLICITUDES_SIMULTANEAS)

    def intentar(usuario):
        try:
            barrera.wait()
            servicios.agendar_cita(usuario, doctor.id_doctor, fecha, hora)
            return "201"
        except Conflicto:
            return "409"
        finally:
            connections.close_all()

    with ThreadPoolExecutor(max_workers=SOLICITUDES_SIMULTANEAS) as ejecutor:
        resultados = list(ejecutor.map(intentar, usuarios))

    assert resultados.count("201") == 1
    assert resultados.count("409") == SOLICITUDES_SIMULTANEAS - 1
    assert Cita.objects.filter(doctor=doctor, fecha=fecha, hora=hora).count() == 1
