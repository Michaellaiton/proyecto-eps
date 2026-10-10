"""Controlador del asistente virtual. Abierto a visitantes; si hay sesión, responde con los datos del usuario."""

from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from . import servicios


class MensajeSerializador(serializers.Serializer):
    mensaje = serializers.CharField(max_length=300, allow_blank=True)


class VistaAsistente(APIView):
    """POST /api/v1/asistente/  {mensaje} → {respuesta, accion, sugerencias, intencion}"""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "asistente"

    def post(self, solicitud):
        entrada = MensajeSerializador(data=solicitud.data)
        entrada.is_valid(raise_exception=True)
        usuario = solicitud.user if solicitud.user.is_authenticated else None
        return Response(servicios.responder(usuario, entrada.validated_data["mensaje"]))
