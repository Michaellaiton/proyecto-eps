from django.urls import path

from .vistas import VistaIniciarSesion, VistaRenovarToken, VistaUsuarioActual

app_name = "usuarios"

urlpatterns = [
    path("iniciar-sesion/", VistaIniciarSesion.as_view(), name="iniciar-sesion"),
    path("renovar-token/", VistaRenovarToken.as_view(), name="renovar-token"),
    path("yo/", VistaUsuarioActual.as_view(), name="usuario-actual"),
]
