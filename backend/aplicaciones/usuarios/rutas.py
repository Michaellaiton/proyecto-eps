from django.urls import path

from .vistas import VistaCambiarClave, VistaIniciarSesion, VistaRenovarToken, VistaUsuarioActual

app_name = "usuarios"

urlpatterns = [
    path("iniciar-sesion/", VistaIniciarSesion.as_view(), name="iniciar-sesion"),
    path("renovar-token/", VistaRenovarToken.as_view(), name="renovar-token"),
    path("yo/", VistaUsuarioActual.as_view(), name="usuario-actual"),
    path("cambiar-clave/", VistaCambiarClave.as_view(), name="cambiar-clave"),
]
