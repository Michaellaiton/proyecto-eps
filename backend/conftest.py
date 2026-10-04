"""Datos de prueba compartidos por todas las pruebas (pytest exige el nombre conftest.py)."""
from datetime import time, timedelta

import pytest
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from aplicaciones.medicos.models import DiaSemana, Doctor, Especialidad, HorarioBase
from aplicaciones.pacientes.models import Paciente
from aplicaciones.usuarios.models import Rol, Usuario

CLAVE_PRUEBA = "clave-solo-para-pruebas-1"


def proximo_dia_habil(dias_minimos=2):
    """Fecha hábil futura (lunes a viernes), al menos `dias_minimos` días después de hoy."""
    fecha = timezone.localdate() + timedelta(days=dias_minimos)
    while fecha.weekday() > DiaSemana.VIERNES:
        fecha += timedelta(days=1)
    return fecha


@pytest.fixture(autouse=True)
def cache_limpia():
    """Cada prueba empieza sin contadores de intentos de inicio de sesión."""
    cache.clear()


@pytest.fixture
def crear_paciente(db):
    def _crear(numero):
        usuario = Usuario.objects.create_user(username=f"paciente{numero}", password=CLAVE_PRUEBA, rol=Rol.PACIENTE)
        return Paciente.objects.create(
            usuario=usuario, tipo_documento="CC", numero_documento=f"9{numero:08d}",
            nombres=f"Paciente {numero}", apellidos="Prueba", telefono="3000000000",
        )

    return _crear


@pytest.fixture
def doctor(db):
    """Médico con horario de lunes a viernes, 07:00–12:00, franjas de 20 minutos (15 franjas por día)."""
    usuario = Usuario.objects.create_user(username="medico1", password=CLAVE_PRUEBA, rol=Rol.DOCTOR)
    especialidad = Especialidad.objects.create(nombre="Medicina general")
    doctor = Doctor.objects.create(
        usuario=usuario, especialidad=especialidad, nombres="Ana", apellidos="Prueba", registro_medico="RM-0001"
    )
    for dia in range(DiaSemana.LUNES, DiaSemana.VIERNES + 1):
        HorarioBase.objects.create(
            doctor=doctor, dia_semana=dia, hora_inicio=time(7, 0), hora_fin=time(12, 0), duracion_minutos=20
        )
    return doctor


@pytest.fixture
def administrador(db):
    return Usuario.objects.create_user(username="admin", password=CLAVE_PRUEBA, rol=Rol.ADMIN, is_staff=True)


@pytest.fixture
def cliente_de():
    """Devuelve un cliente de API autenticado como el usuario dado."""

    def _cliente(usuario):
        cliente = APIClient()
        cliente.force_authenticate(usuario)
        return cliente

    return _cliente
