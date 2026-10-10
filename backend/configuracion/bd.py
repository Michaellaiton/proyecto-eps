"""
Selección de la base de datos para lecturas pesadas (Administración de BD: réplica de solo lectura).

Los reportes y exportaciones leen de la réplica si está configurada (EPS_BD_REPLICA_HOST), para no competir
con las escrituras del agendamiento en la instancia primaria. Sin réplica, leen de la base principal.
"""

from django.conf import settings


def alias_lectura():
    return "replica" if "replica" in settings.DATABASES else "default"
