"""Controladores de autenticación."""
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializadores import InicioSesionSerializador, UsuarioActualSerializador


class VistaIniciarSesion(TokenObtainPairView):
    """POST /api/v1/usuarios/iniciar-sesion/  {username, password} → {access, refresh, rol}"""

    serializer_class = InicioSesionSerializador


class VistaRenovarToken(TokenRefreshView):
    """POST /api/v1/usuarios/renovar-token/  {refresh} → {access}"""


class VistaUsuarioActual(APIView):
    """GET /api/v1/usuarios/yo/"""

    def get(self, solicitud):
        return Response(UsuarioActualSerializador(solicitud.user).data)
