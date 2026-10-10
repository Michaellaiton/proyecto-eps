"""
Carga datos sintéticos de demostración (Anexo F del informe de Calidad: no se usan datos de personas reales).

Uso:  python manage.py sembrar_datos
La contraseña común de las cuentas se toma de EPS_CLAVE_USUARIOS_DEMO en el archivo .env.
Es idempotente: se puede ejecutar varias veces sin duplicar registros.
"""

import os
from datetime import time

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from aplicaciones.medicos.models import DiaSemana, Doctor, Especialidad, HorarioBase
from aplicaciones.pacientes.models import Paciente, TipoDocumento
from aplicaciones.usuarios.models import Rol, Usuario

ESPECIALIDADES = ["Medicina general", "Pediatría", "Ginecología", "Odontología"]
MEDICOS = [
    ("Ana", "Prueba Rojas", "Medicina general"),
    ("Carlos", "Prueba Díaz", "Medicina general"),
    ("Laura", "Prueba Gómez", "Pediatría"),
    ("Jorge", "Prueba Torres", "Pediatría"),
    ("Sofía", "Prueba Castro", "Ginecología"),
    ("Andrés", "Prueba Ruiz", "Odontología"),
]
JORNADAS = [(time(7, 0), time(12, 0)), (time(14, 0), time(17, 0))]
DIAS_HABILES = [DiaSemana.LUNES, DiaSemana.MARTES, DiaSemana.MIERCOLES, DiaSemana.JUEVES, DiaSemana.VIERNES]
CANTIDAD_PACIENTES = 30


class Command(BaseCommand):
    help = "Carga especialidades, médicos con horario, pacientes y un administrador, todos ficticios."

    def handle(self, *args, **opciones):
        clave = os.environ.get("EPS_CLAVE_USUARIOS_DEMO")
        if not clave:
            raise CommandError("Defina EPS_CLAVE_USUARIOS_DEMO en el archivo .env antes de sembrar datos.")

        with transaction.atomic():
            self._crear_usuario(
                "admin",
                clave,
                Rol.ADMIN,
                is_staff=True,
                is_superuser=True,
                first_name="Administrador",
                last_name="del sistema",
            )
            especialidades = {n: Especialidad.objects.get_or_create(nombre=n)[0] for n in ESPECIALIDADES}
            for numero, (nombres, apellidos, especialidad) in enumerate(MEDICOS, start=1):
                self._crear_medico(numero, nombres, apellidos, especialidades[especialidad], clave)
            for numero in range(1, CANTIDAD_PACIENTES + 1):
                self._crear_paciente(numero, clave)

        self.stdout.write(
            self.style.SUCCESS(
                f"Datos listos: {len(ESPECIALIDADES)} especialidades, {len(MEDICOS)} médicos "
                f"(medico1…medico{len(MEDICOS)}), {CANTIDAD_PACIENTES} pacientes "
                f"(paciente1…paciente{CANTIDAD_PACIENTES}) y el usuario admin."
            )
        )

    def _crear_usuario(self, nombre_usuario, clave, rol, **extra):
        usuario, creado = Usuario.objects.get_or_create(
            username=nombre_usuario, defaults={"email": f"{nombre_usuario}@eps.test", "rol": rol, **extra}
        )
        if creado:
            usuario.set_password(clave)
            usuario.save()
        return usuario

    def _crear_medico(self, numero, nombres, apellidos, especialidad, clave):
        usuario = self._crear_usuario(f"medico{numero}", clave, Rol.DOCTOR)
        doctor, creado = Doctor.objects.get_or_create(
            usuario=usuario,
            defaults={
                "nombres": nombres,
                "apellidos": apellidos,
                "especialidad": especialidad,
                "registro_medico": f"RM-{numero:04d}",
            },
        )
        if creado:
            duracion = settings.EPS_PARAMETROS["DURACION_CITA_MINUTOS"]
            HorarioBase.objects.bulk_create(
                HorarioBase(doctor=doctor, dia_semana=dia, hora_inicio=inicio, hora_fin=fin, duracion_minutos=duracion)
                for dia in DIAS_HABILES
                for inicio, fin in JORNADAS
            )

    def _crear_paciente(self, numero, clave):
        usuario = self._crear_usuario(f"paciente{numero}", clave, Rol.PACIENTE)
        Paciente.objects.get_or_create(
            usuario=usuario,
            defaults={
                "tipo_documento": TipoDocumento.CEDULA,
                "numero_documento": f"9{numero:08d}",
                "nombres": f"Paciente {numero:03d}",
                "apellidos": "Prueba",
                "telefono": "3000000000",
            },
        )
