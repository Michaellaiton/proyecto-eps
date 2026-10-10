from django.urls import path

from .vistas import VistaContadorNotificaciones, VistaMarcarLeida, VistaMarcarTodas, VistaMisNotificaciones

app_name = "notificaciones"

urlpatterns = [
    path("", VistaMisNotificaciones.as_view(), name="mis-notificaciones"),
    path("contador/", VistaContadorNotificaciones.as_view(), name="contador"),
    path("marcar-todas/", VistaMarcarTodas.as_view(), name="marcar-todas"),
    path("<int:id_notificacion>/leida/", VistaMarcarLeida.as_view(), name="marcar-leida"),
]
