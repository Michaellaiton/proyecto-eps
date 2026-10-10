"""
Envía los recordatorios de las citas próximas (por defecto, las de las siguientes 24 horas).

Uso:  python manage.py enviar_recordatorios
Programarlo cada hora con el Programador de tareas de Windows o con cron en Linux.
"""

from django.core.management.base import BaseCommand

from aplicaciones.citas.servicios import enviar_recordatorios


class Command(BaseCommand):
    help = "Envía recordatorios por notificación interna y correo a las citas de las próximas horas."

    def handle(self, *args, **opciones):
        enviados = enviar_recordatorios()
        self.stdout.write(self.style.SUCCESS(f"Recordatorios enviados: {enviados}"))
