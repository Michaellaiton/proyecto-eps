"""Vistas transversales del sistema (no pertenecen a una aplicación de negocio)."""
from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

VERSION = "0.1.0"


class VistaSalud(APIView):
    """Verifica que la API responde y que la base de datos está disponible (monitoreo)."""

    permission_classes = [AllowAny]

    def get(self, solicitud):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            base_datos = "disponible"
        except Exception:
            base_datos = "no disponible"
        return Response({"estado": "ok", "base_datos": base_datos, "version": VERSION})
