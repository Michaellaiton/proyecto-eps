from django.urls import path

from .vistas import VistaAsistente

app_name = "asistente"

urlpatterns = [
    path("", VistaAsistente.as_view(), name="mensaje"),
]
