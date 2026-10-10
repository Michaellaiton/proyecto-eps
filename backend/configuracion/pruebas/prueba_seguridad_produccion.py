"""
La configuración de producción debe pasar la revisión de despliegue de Django sin advertencias (REQ-07).

Se ejecuta `manage.py check --deploy` en un proceso aparte, porque los ajustes se leen al iniciar Django
y aquí se necesita simular las variables de entorno de producción.
"""

import os
import secrets
import subprocess
import sys
from pathlib import Path

DIRECTORIO_BACKEND = Path(__file__).resolve().parents[2]


def _revisar_despliegue(**variables):
    entorno = {
        **os.environ,
        "EPS_DEPURACION": "False",
        "EPS_CLAVE_SECRETA": secrets.token_urlsafe(64),
        "EPS_HOSTS_PERMITIDOS": "citas.eps.example",
        "EPS_ORIGENES_CONFIABLES": "https://citas.eps.example",
        # En producción el correo debe salir por SMTP (la consola es solo para desarrollo).
        "EPS_CORREO_BACKEND": "django.core.mail.backends.smtp.EmailBackend",
        "EPS_CORREO_SERVIDOR": "smtp.eps.example",
        **variables,
    }
    return subprocess.run(
        [sys.executable, "manage.py", "check", "--deploy", "--fail-level", "WARNING"],
        cwd=DIRECTORIO_BACKEND,
        env=entorno,
        capture_output=True,
        text=True,
        timeout=120,
    )


def prueba_configuracion_de_produccion_sin_advertencias():
    resultado = _revisar_despliegue()

    assert resultado.returncode == 0, resultado.stdout + resultado.stderr


def prueba_la_revision_detecta_una_configuracion_insegura():
    resultado = _revisar_despliegue(EPS_DEPURACION="True")

    assert resultado.returncode != 0
    assert "DEBUG" in resultado.stdout + resultado.stderr
