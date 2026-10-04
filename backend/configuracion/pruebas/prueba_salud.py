from rest_framework.test import APIClient


def prueba_salud_responde_sin_autenticacion():
    respuesta = APIClient().get("/api/v1/salud/")

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "ok"
