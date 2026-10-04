from django.urls import path

from .vistas import (
    ListaDoctores,
    ListaEspecialidades,
    VistaDisponibilidad,
    VistaEliminarBloqueo,
    VistaMiAgenda,
    VistaMisBloqueos,
)

app_name = "medicos"

urlpatterns = [
    path("", ListaDoctores.as_view(), name="lista-doctores"),
    path("especialidades/", ListaEspecialidades.as_view(), name="lista-especialidades"),
    path("<int:id_doctor>/disponibilidad/", VistaDisponibilidad.as_view(), name="disponibilidad"),
    # Rol DOCTOR
    path("agenda/", VistaMiAgenda.as_view(), name="mi-agenda"),
    path("bloqueos/", VistaMisBloqueos.as_view(), name="mis-bloqueos"),
    path("bloqueos/<int:id_bloqueo>/", VistaEliminarBloqueo.as_view(), name="eliminar-bloqueo"),
]
