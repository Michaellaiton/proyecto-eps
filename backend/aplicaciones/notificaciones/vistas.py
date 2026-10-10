"""Controladores de las notificaciones internas del usuario autenticado."""

from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notificacion
from .serializadores import NotificacionSerializador

MAXIMO_LISTADO = 30


class VistaMisNotificaciones(APIView):
    """GET /api/v1/notificaciones/?solo_no_leidas=true  → {no_leidas, resultados}"""

    def get(self, solicitud):
        propias = Notificacion.objects.filter(usuario=solicitud.user)
        listado = propias.filter(leida=False) if solicitud.query_params.get("solo_no_leidas") == "true" else propias
        return Response(
            {
                "no_leidas": propias.filter(leida=False).count(),
                "resultados": NotificacionSerializador(listado[:MAXIMO_LISTADO], many=True).data,
            }
        )


class VistaContadorNotificaciones(APIView):
    """GET /api/v1/notificaciones/contador/  → {no_leidas}. Consulta liviana para revisar periódicamente."""

    def get(self, solicitud):
        return Response({"no_leidas": Notificacion.objects.filter(usuario=solicitud.user, leida=False).count()})


class VistaMarcarLeida(APIView):
    """PATCH /api/v1/notificaciones/<id>/leida/"""

    def patch(self, solicitud, id_notificacion):
        notificacion = get_object_or_404(Notificacion, pk=id_notificacion, usuario=solicitud.user)
        if not notificacion.leida:
            notificacion.leida = True
            notificacion.save(update_fields=["leida"])
        return Response(NotificacionSerializador(notificacion).data)


class VistaMarcarTodas(APIView):
    """POST /api/v1/notificaciones/marcar-todas/  → {actualizadas}"""

    def post(self, solicitud):
        actualizadas = Notificacion.objects.filter(usuario=solicitud.user, leida=False).update(leida=True)
        return Response({"actualizadas": actualizadas})
