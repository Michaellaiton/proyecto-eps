"""
Pruebas del simulador de concurrencia. Usan hilos reales contra PostgreSQL, por eso requieren
transacciones reales (transactional_db) en lugar de la transacción envolvente de cada prueba.
"""

from datetime import timedelta

import pytest
from django.utils import timezone

from aplicaciones.simulacion import motor, servicios
from aplicaciones.simulacion.models import EstadoSimulacion, Simulacion, TipoSimulacion
from aplicaciones.usuarios.models import Usuario

pytestmark = pytest.mark.django_db(transaction=True)

URL = "/api/v1/simulacion/"


def _ejecutar(tipo, **parametros):
    simulacion = Simulacion.objects.create(tipo=tipo, parametros=parametros)
    motor.ejecutar(simulacion.pk)
    simulacion.refresh_from_db()
    return simulacion


# --- Motor ---


def prueba_rafaga_con_controles_deja_una_sola_cita():
    simulacion = _ejecutar(TipoSimulacion.RAFAGA, usuarios=8, proteccion=True)

    r = simulacion.resultados
    assert simulacion.estado == EstadoSimulacion.TERMINADA
    assert r["integridad"] == {"reservas_en_la_franja": 1, "sobreagendamiento": False}
    assert (r["exitos"], r["conflictos"], r["errores"]) == (1, 7, 0)
    assert simulacion.eventos.filter(nivel="CONFLICTO").count() == 7


def prueba_rafaga_sin_controles_reproduce_el_sobreagendamiento():
    simulacion = _ejecutar(TipoSimulacion.RAFAGA, usuarios=8, proteccion=False)

    assert simulacion.resultados["integridad"]["sobreagendamiento"] is True
    assert simulacion.resultados["integridad"]["reservas_en_la_franja"] > 1


def prueba_carga_corta_sin_duplicados_y_con_metricas_de_la_bd():
    simulacion = _ejecutar(TipoSimulacion.CARGA, hilos=4, duracion=2, medicos=2, pacientes=20)

    r = simulacion.resultados
    assert r["solicitudes"] > 0 and r["errores"] == 0
    assert r["integridad"]["franjas_duplicadas"] == 0
    assert r["serie"] and r["bd"]["conexiones_max"] >= 1
    assert r["latencia_ms"]["p95"] >= r["latencia_ms"]["p50"]


def prueba_el_entorno_ficticio_se_elimina_al_terminar():
    _ejecutar(TipoSimulacion.RAFAGA, usuarios=3, proteccion=True)

    assert not Usuario.objects.filter(username__startswith=motor.PREFIJO).exists()


def prueba_percentil():
    assert motor._percentil([10, 20, 30, 40, 100], 0.5) == 30
    assert motor._percentil([], 0.95) == 0.0


# --- API ---


@pytest.fixture
def sincronico(monkeypatch):
    """Ejecuta la simulación en el mismo hilo para poder comprobar el resultado en la prueba."""
    monkeypatch.setattr(servicios, "lanzar_en_segundo_plano", motor.ejecutar)


def prueba_administrador_lanza_y_consulta_una_simulacion(administrador, cliente_de, sincronico):
    cliente = cliente_de(administrador)

    creada = cliente.post(URL, {"tipo": "RAFAGA", "usuarios": 5, "proteccion": True}, format="json")
    detalle = cliente.get(f"{URL}{creada.json()['id_simulacion']}/").json()

    assert creada.status_code == 202
    assert detalle["simulacion"]["estado"] == "TERMINADA"
    assert detalle["simulacion"]["resultados"]["integridad"]["reservas_en_la_franja"] == 1
    assert detalle["eventos"][0]["nivel"] == "INFO"


def prueba_eventos_incrementales(administrador, cliente_de, sincronico):
    cliente = cliente_de(administrador)
    id_simulacion = cliente.post(URL, {"tipo": "RAFAGA", "usuarios": 3}, format="json").json()["id_simulacion"]
    todos = cliente.get(f"{URL}{id_simulacion}/").json()["eventos"]

    nuevos = cliente.get(f"{URL}{id_simulacion}/", {"desde_evento": todos[-2]["id_evento"]}).json()["eventos"]

    assert [e["id_evento"] for e in nuevos] == [todos[-1]["id_evento"]]


def prueba_solo_una_simulacion_a_la_vez(administrador, cliente_de):
    Simulacion.objects.create(tipo=TipoSimulacion.RAFAGA, parametros={})

    respuesta = cliente_de(administrador).post(URL, {"tipo": "RAFAGA"}, format="json")

    assert respuesta.status_code == 409


def prueba_simulacion_colgada_se_da_por_fallida(administrador, cliente_de, sincronico):
    colgada = Simulacion.objects.create(tipo=TipoSimulacion.RAFAGA, parametros={})
    Simulacion.objects.filter(pk=colgada.pk).update(iniciada_en=timezone.now() - timedelta(hours=1))

    respuesta = cliente_de(administrador).post(URL, {"tipo": "RAFAGA", "usuarios": 2}, format="json")

    colgada.refresh_from_db()
    assert respuesta.status_code == 202
    assert colgada.estado == EstadoSimulacion.FALLIDA


def prueba_limites_de_parametros(administrador, cliente_de):
    cliente = cliente_de(administrador)

    assert cliente.post(URL, {"tipo": "RAFAGA", "usuarios": 500}, format="json").status_code == 422
    assert cliente.post(URL, {"tipo": "CARGA", "duracion": 600}, format="json").status_code == 422


def prueba_simulador_solo_para_administrador(crear_paciente, cliente_de):
    assert cliente_de(crear_paciente(1).usuario).get(URL).status_code == 403
