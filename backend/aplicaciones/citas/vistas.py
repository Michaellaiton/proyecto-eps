"""Controladores de citas: agendar (CU-02), consultar las propias, cancelar (CU-03) y registrar atención (CU-04)."""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from aplicaciones.usuarios.permisos import EsDoctor, EsPaciente, EsPacienteOAdmin

from . import servicios
from .serializadores import (
    AgendarCitaSerializador,
    CitaSerializador,
    RegistrarAtencionSerializador,
    ReprogramarCitaSerializador,
)


class VistaAgendarCita(APIView):
    """POST /api/v1/citas/  {id_doctor, fecha, hora}  (CU-02, REQ-02, REQ-03)"""

    permission_classes = [EsPaciente]

    def post(self, solicitud):
        entrada = AgendarCitaSerializador(data=solicitud.data)
        entrada.is_valid(raise_exception=True)
        cita = servicios.agendar_cita(solicitud.user, **entrada.validated_data)
        return Response(CitaSerializador(cita).data, status=status.HTTP_201_CREATED)


class VistaMisCitas(APIView):
    """GET /api/v1/citas/mias/  (REQ-04)"""

    permission_classes = [EsPaciente]

    def get(self, solicitud):
        citas = servicios.citas_del_paciente(solicitud.user)
        return Response(CitaSerializador(citas, many=True).data)


class VistaCancelarCita(APIView):
    """PATCH /api/v1/citas/<id_cita>/cancelar/  (CU-03, REQ-04, REQ-07)"""

    permission_classes = [EsPacienteOAdmin]

    def patch(self, solicitud, id_cita):
        cita = servicios.cancelar_cita(solicitud.user, id_cita)
        return Response(CitaSerializador(cita).data)


class VistaReprogramarCita(APIView):
    """
    PATCH /api/v1/citas/<id_cita>/reprogramar/  {fecha, hora, id_doctor?}  (CU-03, REQ-04)
    Devuelve la nueva cita; la original queda 'Cancelada'.
    """

    permission_classes = [EsPaciente]

    def patch(self, solicitud, id_cita):
        entrada = ReprogramarCitaSerializador(data=solicitud.data)
        entrada.is_valid(raise_exception=True)
        cita = servicios.reprogramar_cita(solicitud.user, id_cita, **entrada.validated_data)
        return Response(CitaSerializador(cita).data)


class VistaRegistrarAtencion(APIView):
    """PATCH /api/v1/citas/<id_cita>/atencion/  {estado: 'Atendida' | 'No asistio'}  (CU-04)"""

    permission_classes = [EsDoctor]

    def patch(self, solicitud, id_cita):
        entrada = RegistrarAtencionSerializador(data=solicitud.data)
        entrada.is_valid(raise_exception=True)
        cita = servicios.registrar_atencion(solicitud.user, id_cita, entrada.validated_data["estado"])
        return Response(CitaSerializador(cita).data)
