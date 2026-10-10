"""
Ajustes de Django del sistema de agendamiento de citas EPS.

Todos los valores sensibles y parámetros del sistema se leen del archivo .env
(ver .env.example). Ningún secreto debe escribirse en este archivo.
"""

import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

DIRECTORIO_BASE = Path(__file__).resolve().parent.parent
load_dotenv(DIRECTORIO_BASE / ".env")


def _variable(nombre, por_defecto=None, obligatoria=False):
    valor = os.environ.get(nombre, por_defecto)
    if obligatoria and not valor:
        raise RuntimeError(f"Falta la variable de entorno obligatoria {nombre} (ver .env.example).")
    return valor


def _lista(nombre, por_defecto=""):
    return [v.strip() for v in _variable(nombre, por_defecto).split(",") if v.strip()]


# --- Seguridad ---
SECRET_KEY = _variable("EPS_CLAVE_SECRETA", obligatoria=True)
DEBUG = _variable("EPS_DEPURACION", "False").lower() == "true"
ALLOWED_HOSTS = _lista("EPS_HOSTS_PERMITIDOS", "localhost,127.0.0.1")

# Cabeceras de protección (siempre activas)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

# Endurecimiento para producción (REQ-07): se activa al desactivar la depuración. Supone un proxy inverso
# con TLS delante de Django que envía la cabecera X-Forwarded-Proto.
if not DEBUG:
    SECURE_SSL_REDIRECT = _variable("EPS_REDIRIGIR_HTTPS", "True").lower() == "true"
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_HSTS_SECONDS = int(_variable("EPS_HSTS_SEGUNDOS", "31536000"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    CSRF_TRUSTED_ORIGINS = _lista("EPS_ORIGENES_CONFIABLES", "")

# --- Aplicaciones ---
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Terceros
    "rest_framework",
    "corsheaders",
    # Propias
    "aplicaciones.usuarios",
    "aplicaciones.medicos",
    "aplicaciones.pacientes",
    "aplicaciones.citas",
    "aplicaciones.auditoria",
    "aplicaciones.administracion",
    "aplicaciones.notificaciones",
    "aplicaciones.asistente",
    "aplicaciones.simulacion",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "configuracion.rutas"
WSGI_APPLICATION = "configuracion.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# --- Base de datos (PostgreSQL) ---
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": _variable("EPS_BD_NOMBRE", "eps_citas"),
        "USER": _variable("EPS_BD_USUARIO", "eps_app"),
        "PASSWORD": _variable("EPS_BD_CLAVE", ""),
        "HOST": _variable("EPS_BD_HOST", "localhost"),
        "PORT": _variable("EPS_BD_PUERTO", "5432"),
        "ATOMIC_REQUESTS": False,
        "CONN_MAX_AGE": 60,
    }
}
# Réplica de solo lectura para reportes (opcional). Ver configuracion/bd.py y backend/scripts/bd/.
if _variable("EPS_BD_REPLICA_HOST"):
    DATABASES["replica"] = {
        **DATABASES["default"],
        "HOST": _variable("EPS_BD_REPLICA_HOST"),
        "PORT": _variable("EPS_BD_REPLICA_PUERTO", DATABASES["default"]["PORT"]),
        "USER": _variable("EPS_BD_REPLICA_USUARIO", DATABASES["default"]["USER"]),
        "PASSWORD": _variable("EPS_BD_REPLICA_CLAVE", DATABASES["default"]["PASSWORD"]),
        "TEST": {"MIRROR": "default"},
    }
# Separación de datos e índices en tablespaces distintos (definido en Administración de BD).
DEFAULT_TABLESPACE = _variable("EPS_BD_TABLESPACE_DATOS", "")
DEFAULT_INDEX_TABLESPACE = _variable("EPS_BD_TABLESPACE_INDICES", "")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "usuarios.Usuario"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- Internacionalización ---
LANGUAGE_CODE = "es-co"
TIME_ZONE = _variable("EPS_ZONA_HORARIA", "America/Bogota")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"

# --- API ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "EXCEPTION_HANDLER": "configuracion.excepciones.manejador_excepciones",
    # Límite de mensajes al asistente virtual (abierto a visitantes).
    "DEFAULT_THROTTLE_RATES": {"asistente": "30/min"},
}
# Token firmado con expiración corta (REQ-07, ADR-04). La firma usa EPS_CLAVE_SECRETA.
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(_variable("EPS_MINUTOS_VIGENCIA_TOKEN", "60"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(hours=8),
    "USER_ID_FIELD": "id_usuario",
    "USER_ID_CLAIM": "id_usuario",
    "UPDATE_LAST_LOGIN": True,  # Registra el último acceso, visible en el panel de administración.
}
CORS_ALLOWED_ORIGINS = _lista("EPS_ORIGENES_CORS", "http://localhost:5173")
# Permite al frontend leer el nombre de los archivos descargados (exportaciones CSV).
CORS_EXPOSE_HEADERS = ["Content-Disposition"]

# --- Correo (notificaciones) ---
# En desarrollo, el backend de consola imprime los correos en la terminal de runserver.
# Las opciones de servidor solo aplican al backend SMTP (los demás backends no las aceptan).
_BACKEND_CORREO = _variable("EPS_CORREO_BACKEND", "django.core.mail.backends.console.EmailBackend")
_OPCIONES_SMTP = {
    "host": _variable("EPS_CORREO_SERVIDOR", "") or "localhost",
    "port": int(_variable("EPS_CORREO_PUERTO", "587")),
    "username": _variable("EPS_CORREO_USUARIO", ""),
    "password": _variable("EPS_CORREO_CLAVE", ""),
    "use_tls": _variable("EPS_CORREO_TLS", "True").lower() == "true",
}
MAILERS = {
    "default": {
        "BACKEND": _BACKEND_CORREO,
        "OPTIONS": _OPCIONES_SMTP if _BACKEND_CORREO.endswith("smtp.EmailBackend") else {},
    }
}
DEFAULT_FROM_EMAIL = _variable("EPS_CORREO_REMITENTE", "Citas EPS <no-responder@eps.test>")

# --- Tareas en segundo plano (envío de correos) ---
# ImmediateBackend ejecuta la tarea al instante (desarrollo y pruebas). En producción se cambia por un backend
# con cola y un worker, sin tocar el código de las tareas.
TASKS = {"default": {"BACKEND": _variable("EPS_TAREAS_BACKEND", "django.tasks.backends.immediate.ImmediateBackend")}}

# --- Parámetros configurables del sistema de agendamiento ---
EPS_PARAMETROS = {
    "DURACION_CITA_MINUTOS": int(_variable("EPS_DURACION_CITA_MINUTOS", "20")),
    "HORAS_MINIMAS_CANCELACION": int(_variable("EPS_HORAS_MINIMAS_CANCELACION", "2")),
    "MAXIMO_CITAS_ACTIVAS_PACIENTE": int(_variable("EPS_MAXIMO_CITAS_ACTIVAS_PACIENTE", "3")),
    "INTENTOS_MAXIMOS_SESION": int(_variable("EPS_INTENTOS_MAXIMOS_SESION", "5")),
    "MINUTOS_BLOQUEO_SESION": int(_variable("EPS_MINUTOS_BLOQUEO_SESION", "15")),
    "HORAS_ANTICIPACION_RECORDATORIO": int(_variable("EPS_HORAS_ANTICIPACION_RECORDATORIO", "24")),
}
