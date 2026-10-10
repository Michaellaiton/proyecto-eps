"""Pruebas unitarias del cálculo de franjas (no usan base de datos). REQ-01 y REQ-05."""

from datetime import time
from types import SimpleNamespace

from aplicaciones.medicos.servicios import franja_bloqueada, generar_franjas


def _bloqueo(inicio, fin):
    return SimpleNamespace(hora_inicio=inicio, hora_fin=fin)


def prueba_genera_franjas_de_20_minutos():
    franjas = generar_franjas(time(7, 0), time(12, 0), 20)

    assert len(franjas) == 15
    assert franjas[0] == time(7, 0)
    assert franjas[-1] == time(11, 40)


def prueba_descarta_franja_incompleta_al_final():
    assert generar_franjas(time(7, 0), time(7, 50), 20) == [time(7, 0), time(7, 20)]


def prueba_horario_invalido_no_genera_franjas():
    assert generar_franjas(time(12, 0), time(7, 0), 20) == []
    assert generar_franjas(time(7, 0), time(12, 0), 0) == []


def prueba_bloqueo_excluye_franjas_que_se_cruzan():
    bloqueos = [_bloqueo(time(7, 0), time(8, 0))]

    assert franja_bloqueada(time(7, 0), 20, bloqueos)
    assert franja_bloqueada(time(7, 40), 20, bloqueos)


def prueba_limite_superior_del_bloqueo_es_exclusivo():
    assert not franja_bloqueada(time(8, 0), 20, [_bloqueo(time(7, 0), time(8, 0))])


def prueba_franja_parcialmente_bloqueada_cuenta_como_bloqueada():
    assert franja_bloqueada(time(7, 50), 20, [_bloqueo(time(8, 0), time(9, 0))])
