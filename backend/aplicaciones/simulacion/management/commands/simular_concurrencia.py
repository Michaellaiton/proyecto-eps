"""
Ejecuta una simulación de concurrencia desde la terminal y muestra sus registros en vivo.

Ejemplos:
  python manage.py simular_concurrencia --tipo rafaga --usuarios 30
  python manage.py simular_concurrencia --tipo rafaga --usuarios 30 --sin-proteccion
  python manage.py simular_concurrencia --tipo carga --hilos 20 --duracion 15
"""

import threading

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from aplicaciones.simulacion import motor
from aplicaciones.simulacion.models import EstadoSimulacion, Simulacion, TipoSimulacion

COLORES = {"OK": "\033[32m", "CONFLICTO": "\033[33m", "ERROR": "\033[31m", "METRICA": "\033[36m"}


class Command(BaseCommand):
    help = "Simula reservas simultáneas (ráfaga) o consultas masivas contra la base de datos."

    def add_arguments(self, parser):
        parser.add_argument("--tipo", choices=["rafaga", "carga"], default="rafaga")
        parser.add_argument("--usuarios", type=int, default=30, help="Ráfaga: pacientes simultáneos (2–60).")
        parser.add_argument("--sin-proteccion", action="store_true", help="Ráfaga: lógica ingenua sin controles.")
        parser.add_argument("--hilos", type=int, default=20, help="Carga: hilos concurrentes (2–40).")
        parser.add_argument("--duracion", type=int, default=15, help="Carga: segundos (3–60).")
        parser.add_argument("--medicos", type=int, default=5)

    def handle(self, *args, **o):
        if Simulacion.objects.filter(estado=EstadoSimulacion.EN_CURSO).exists():
            raise CommandError("Ya hay una simulación en curso.")
        if o["tipo"] == "rafaga":
            tipo, parametros = (
                TipoSimulacion.RAFAGA,
                {"usuarios": min(max(o["usuarios"], 2), 60), "proteccion": not o["sin_proteccion"]},
            )
        else:
            tipo = TipoSimulacion.CARGA
            parametros = {
                "hilos": min(max(o["hilos"], 2), 40),
                "duracion": min(max(o["duracion"], 3), 60),
                "medicos": o["medicos"],
                "pacientes": 60,
            }
        simulacion = Simulacion.objects.create(tipo=tipo, parametros=parametros)

        hilo = threading.Thread(target=motor.ejecutar, args=(simulacion.pk,))
        hilo.start()
        ultimo = 0
        while hilo.is_alive() or simulacion.eventos.filter(id_evento__gt=ultimo).exists():
            for evento in simulacion.eventos.filter(id_evento__gt=ultimo):
                ultimo = evento.id_evento
                color = COLORES.get(evento.nivel, "")
                self.stdout.write(
                    f"{color}{timezone.localtime(evento.momento):%H:%M:%S} [{evento.nivel:<9}] {evento.mensaje}\033[0m"
                )
            hilo.join(timeout=0.5)

        simulacion.refresh_from_db()
        r = simulacion.resultados
        self.stdout.write(
            self.style.SUCCESS(
                f"\nResultado: {r['solicitudes']} solicitudes · {r['exitos']} éxitos · {r['conflictos']} conflictos · "
                f"{r['errores']} errores · p95 {r['latencia_ms']['p95']} ms · {r['ops_por_segundo']} ops/s · "
                f"integridad {r.get('integridad')}"
            )
        )
