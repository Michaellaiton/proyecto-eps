"""Controladores (vistas de la API) de médicos: catálogo y disponibilidad (CU-01), agenda y bloqueos (CU-04)."""
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from aplicaciones.usuarios.permisos import EsDoctor

from . import servicios
from .models import Doctor, Especialidad
from .serializadores import (
    BloqueoAgendaSerializador,
    ConsultaBloqueosSerializador,
    ConsultaDisponibilidadSerializador,
    DoctorSerializador,
    EspecialidadSerializador,
)


class ListaEspecialidades(generics.ListAPIView):
    """GET /api/v1/medicos/especialidades/"""

    queryset = Especialidad.objects.all()
    serializer_class = EspecialidadSerializador


class ListaDoctores(generics.ListAPIView):
    """GET /api/v1/medicos/?especialidad=<id>"""

    serializer_class = DoctorSerializador

    def get_queryset(self):
        doctores = Doctor.objects.filter(activo=True).select_related("especialidad")
        especialidad = self.request.query_params.get("especialidad")
        if especialidad:
            if not especialidad.isdigit():
                return doctores.none()
            doctores = doctores.filter(especialidad_id=especialidad)
        return doctores


class VistaDisponibilidad(APIView):
    """GET /api/v1/medicos/<id_doctor>/disponibilidad/?fecha=AAAA-MM-DD  (CU-01, REQ-01)"""

    def get(self, solicitud, id_doctor):
        doctor = get_object_or_404(Doctor, pk=id_doctor, activo=True)
        consulta = ConsultaDisponibilidadSerializador(data=solicitud.query_params)
        consulta.is_valid(raise_exception=True)
        fecha = consulta.validated_data["fecha"]

        franjas = servicios.franjas_disponibles(doctor, fecha)
        return Response(
            {
                "id_doctor": doctor.id_doctor,
                "fecha": fecha.isoformat(),
                "franjas": [hora.strftime("%H:%M") for hora in franjas],
            }
        )


# --- Vistas del rol DOCTOR (CU-04) ---


class VistaMiAgenda(APIView):
    """GET /api/v1/medicos/agenda/?fecha=AAAA-MM-DD  Agenda del médico autenticado (por defecto, hoy)."""

    permission_classes = [EsDoctor]

    def get(self, solicitud):
        datos = solicitud.query_params.copy()
        datos.setdefault("fecha", timezone.localdate().isoformat())
        consulta = ConsultaDisponibilidadSerializador(data=datos)
        consulta.is_valid(raise_exception=True)
        return Response(servicios.agenda_del_dia(solicitud.user.doctor, consulta.validated_data["fecha"]))


class VistaMisBloqueos(APIView):
    """
    GET  /api/v1/medicos/bloqueos/?desde=&hasta=   (por defecto, desde hoy)
    POST /api/v1/medicos/bloqueos/  {fecha, hora_inicio, hora_fin, motivo}  (REQ-05)
    """

    permission_classes = [EsDoctor]

    def get(self, solicitud):
        consulta = ConsultaBloqueosSerializador(data=solicitud.query_params)
        consulta.is_valid(raise_exception=True)
        bloqueos = solicitud.user.doctor.bloqueos.filter(
            fecha__gte=consulta.validated_data.get("desde", timezone.localdate())
        )
        if "hasta" in consulta.validated_data:
            bloqueos = bloqueos.filter(fecha__lte=consulta.validated_data["hasta"])
        return Response(BloqueoAgendaSerializador(bloqueos, many=True).data)

    def post(self, solicitud):
        entrada = BloqueoAgendaSerializador(data=solicitud.data)
        entrada.is_valid(raise_exception=True)
        bloqueo, afectadas = servicios.crear_bloqueo(solicitud.user, solicitud.user.doctor, **entrada.validated_data)
        return Response(
            {
                **BloqueoAgendaSerializador(bloqueo).data,
                "citas_existentes_en_intervalo": len(afectadas),
                "citas_afectadas": [
                    {"id_cita": c.id_cita, "hora": c.hora.strftime("%H:%M"), "paciente": f"{c.paciente.nombres} {c.paciente.apellidos}"}
                    for c in afectadas
                ],
            },
            status=status.HTTP_201_CREATED,
        )


class VistaEliminarBloqueo(APIView):
    """DELETE /api/v1/medicos/bloqueos/<id_bloqueo>/"""

    permission_classes = [EsDoctor]

    def delete(self, solicitud, id_bloqueo):
        servicios.eliminar_bloqueo(solicitud.user, solicitud.user.doctor, id_bloqueo)
        return Response(status=status.HTTP_204_NO_CONTENT)
