from django.urls import path

from .vistas import VistaDetalleSimulacion, VistaSimulaciones

app_name = "simulacion"

urlpatterns = [
    path("", VistaSimulaciones.as_view(), name="simulaciones"),
    path("<int:id_simulacion>/", VistaDetalleSimulacion.as_view(), name="detalle"),
]
