from django.urls import path
from rest_framework.routers import SimpleRouter

from .vistas import (
    EspecialidadesVista,
    ListaAuditoria,
    ListaCitasAdmin,
    UsuariosVista,
    VistaHorarioDoctor,
    VistaReporteOcupacion,
    VistaResumen,
)

app_name = "administracion"

enrutador = SimpleRouter()
enrutador.register("usuarios", UsuariosVista, basename="usuarios")
enrutador.register("especialidades", EspecialidadesVista, basename="especialidades")

urlpatterns = [
    path("resumen/", VistaResumen.as_view(), name="resumen"),
    path("medicos/<int:id_doctor>/horario/", VistaHorarioDoctor.as_view(), name="horario-doctor"),
    path("citas/", ListaCitasAdmin.as_view(), name="citas"),
    path("reportes/ocupacion/", VistaReporteOcupacion.as_view(), name="reporte-ocupacion"),
    path("auditoria/", ListaAuditoria.as_view(), name="auditoria"),
    *enrutador.urls,
]
