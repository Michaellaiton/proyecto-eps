"""Controladores de autenticación y del perfil del usuario autenticado."""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import servicios
from .serializadores import (
    ActualizarPerfilSerializador,
    CambiarClaveSerializador,
    InicioSesionSerializador,
    UsuarioActualSerializador,
)


class VistaIniciarSesion(TokenObtainPairView):
    """POST /api/v1/usuarios/iniciar-sesion/  {username, password} → {access, refresh, rol}"""

    serializer_class = InicioSesionSerializador


class VistaRenovarToken(TokenRefreshView):
    """POST /api/v1/usuarios/renovar-token/  {refresh} → {access}"""


class VistaUsuarioActual(APIView):
    """
    GET   /api/v1/usuarios/yo/
    PATCH /api/v1/usuarios/yo/  {email?, telefono?}  Datos de contacto propios.
    """

    def get(self, solicitud):
        return Response(UsuarioActualSerializador(solicitud.user).data)

    def patch(self, solicitud):
        entrada = ActualizarPerfilSerializador(data=solicitud.data)
        entrada.is_valid(raise_exception=True)
        servicios.actualizar_perfil(solicitud.user, entrada.validated_data)
        return Response(UsuarioActualSerializador(solicitud.user).data)


class VistaCambiarClave(APIView):
    """POST /api/v1/usuarios/cambiar-clave/  {clave_actual, clave_nueva}"""

    def post(self, solicitud):
        entrada = CambiarClaveSerializador(data=solicitud.data, context={"usuario": solicitud.user})
        entrada.is_valid(raise_exception=True)
        servicios.cambiar_clave(solicitud.user, entrada.validated_data["clave_nueva"])
        return Response(status=status.HTTP_204_NO_CONTENT)
