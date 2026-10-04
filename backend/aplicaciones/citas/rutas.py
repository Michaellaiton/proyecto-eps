from django.urls import path

from .vistas import (
    VistaAgendarCita,
    VistaCancelarCita,
    VistaMisCitas,
    VistaRegistrarAtencion,
    VistaReprogramarCita,
)

app_name = "citas"

urlpatterns = [
    path("", VistaAgendarCita.as_view(), name="agendar"),
    path("mias/", VistaMisCitas.as_view(), name="mis-citas"),
    path("<int:id_cita>/cancelar/", VistaCancelarCita.as_view(), name="cancelar"),
    path("<int:id_cita>/reprogramar/", VistaReprogramarCita.as_view(), name="reprogramar"),
    path("<int:id_cita>/atencion/", VistaRegistrarAtencion.as_view(), name="registrar-atencion"),
]
