"""Rutas principales del backend. Cada aplicación expone sus rutas bajo /api/v1/."""
from django.contrib import admin
from django.urls import include, path

from configuracion.vistas import VistaSalud

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/salud/", VistaSalud.as_view(), name="salud"),
    path("api/v1/usuarios/", include("aplicaciones.usuarios.rutas")),
    path("api/v1/medicos/", include("aplicaciones.medicos.rutas")),
    path("api/v1/citas/", include("aplicaciones.citas.rutas")),
    path("api/v1/administracion/", include("aplicaciones.administracion.rutas")),
]
