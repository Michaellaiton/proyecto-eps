"""Controladores del simulador de concurrencia (solo administrador)."""

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from aplicaciones.usuarios.permisos import EsAdmin

from . import servicios
from .models import Simulacion
from .serializadores import CrearSimulacionSerializador, EventoSerializador, SimulacionSerializador

HISTORIAL = 10
MAXIMO_EVENTOS_POR_CONSULTA = 500


class VistaSimulaciones(APIView):
    """
    GET  /api/v1/simulacion/  Últimas simulaciones.
    POST /api/v1/simulacion/  {tipo: RAFAGA|CARGA, usuarios?, proteccion?, hilos?, duracion?, medicos?, pacientes?}
         → 202: la simulación queda corriendo; su avance se consulta con el detalle.
    """

    permission_classes = [EsAdmin]

    def get(self, solicitud):
        simulaciones = Simulacion.objects.select_related("creada_por")[:HISTORIAL]
        return Response(SimulacionSerializador(simulaciones, many=True).data)

    def post(self, solicitud):
        entrada = CrearSimulacionSerializador(data=solicitud.data)
        entrada.is_valid(raise_exception=True)
        simulacion = servicios.crear_simulacion(solicitud.user, entrada.validated_data["tipo"], entrada.parametros())
        return Response(SimulacionSerializador(simulacion).data, status=status.HTTP_202_ACCEPTED)


class VistaDetalleSimulacion(APIView):
    """GET /api/v1/simulacion/<id>/?desde_evento=<id>  Estado, resultados (parciales o finales) y eventos nuevos."""

    permission_classes = [EsAdmin]

    def get(self, solicitud, id_simulacion):
        simulacion = get_object_or_404(Simulacion.objects.select_related("creada_por"), pk=id_simulacion)
        desde = solicitud.query_params.get("desde_evento", "0")
        eventos = simulacion.eventos.filter(id_evento__gt=int(desde) if desde.isdigit() else 0)[
            :MAXIMO_EVENTOS_POR_CONSULTA
        ]
        return Response(
            {
                "simulacion": SimulacionSerializador(simulacion).data,
                "eventos": EventoSerializador(eventos, many=True).data,
            }
        )
