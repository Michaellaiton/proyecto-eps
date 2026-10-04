"""Controladores del módulo de administración. Todos exigen el rol ADMIN (REQ-07)."""
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from aplicaciones.auditoria import servicios as auditoria
from aplicaciones.auditoria.models import Auditoria
from aplicaciones.citas.models import Cita
from aplicaciones.medicos.models import Doctor, Especialidad
from aplicaciones.medicos.serializadores import EspecialidadSerializador
from aplicaciones.usuarios.models import Usuario
from aplicaciones.usuarios.permisos import EsAdmin
from configuracion.paginacion import PaginacionEstandar

from . import servicios
from .serializadores import (
    ActualizarUsuarioSerializador,
    AuditoriaSerializador,
    BloqueHorarioSerializador,
    CitaAdminSerializador,
    ConsultaRangoFechasSerializador,
    CrearUsuarioSerializador,
    FiltroCitasSerializador,
    HorarioDoctorSerializador,
    RestablecerClaveSerializador,
    UsuarioAdminSerializador,
)


class VistaResumen(APIView):
    """GET /api/v1/administracion/resumen/  Indicadores del panel principal."""

    permission_classes = [EsAdmin]

    def get(self, solicitud):
        return Response(servicios.resumen())


class UsuariosVista(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """
    GET    /api/v1/administracion/usuarios/?rol=&buscar=&activo=
    POST   /api/v1/administracion/usuarios/
    GET    /api/v1/administracion/usuarios/<id>/
    PATCH  /api/v1/administracion/usuarios/<id>/
    POST   /api/v1/administracion/usuarios/<id>/restablecer-clave/
    Los usuarios no se borran: se desactivan, para conservar la trazabilidad de sus citas.
    """

    permission_classes = [EsAdmin]
    serializer_class = UsuarioAdminSerializador

    def get_queryset(self):
        usuarios = Usuario.objects.select_related("paciente", "doctor__especialidad").order_by("rol", "id_usuario")
        parametros = self.request.query_params
        if parametros.get("rol"):
            usuarios = usuarios.filter(rol=parametros["rol"])
        if parametros.get("activo") in ("true", "false"):
            usuarios = usuarios.filter(is_active=parametros["activo"] == "true")
        if parametros.get("buscar"):
            texto = parametros["buscar"].strip()
            usuarios = usuarios.filter(
                Q(username__icontains=texto)
                | Q(first_name__icontains=texto)
                | Q(last_name__icontains=texto)
                | Q(paciente__numero_documento__icontains=texto)
                | Q(paciente__nombres__icontains=texto)
                | Q(paciente__apellidos__icontains=texto)
                | Q(doctor__nombres__icontains=texto)
                | Q(doctor__apellidos__icontains=texto)
            )
        return usuarios

    def create(self, solicitud):
        entrada = CrearUsuarioSerializador(data=solicitud.data)
        entrada.is_valid(raise_exception=True)
        usuario = servicios.crear_usuario(solicitud.user, entrada.validated_data)
        usuario = self.get_queryset().get(pk=usuario.pk)
        return Response(UsuarioAdminSerializador(usuario).data, status=status.HTTP_201_CREATED)

    def partial_update(self, solicitud, pk=None):
        usuario = self.get_object()
        entrada = ActualizarUsuarioSerializador(data=solicitud.data)
        entrada.is_valid(raise_exception=True)
        servicios.actualizar_usuario(solicitud.user, usuario, entrada.validated_data)
        return Response(UsuarioAdminSerializador(self.get_queryset().get(pk=usuario.pk)).data)

    @action(detail=True, methods=["post"], url_path="restablecer-clave")
    def restablecer_clave(self, solicitud, pk=None):
        usuario = self.get_object()
        entrada = RestablecerClaveSerializador(data=solicitud.data, context={"usuario": usuario})
        entrada.is_valid(raise_exception=True)
        servicios.restablecer_clave(solicitud.user, usuario, entrada.validated_data["password"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class EspecialidadesVista(viewsets.ModelViewSet):
    """CRUD de especialidades: /api/v1/administracion/especialidades/[<id>/]"""

    permission_classes = [EsAdmin]
    serializer_class = EspecialidadSerializador
    queryset = Especialidad.objects.all()
    http_method_names = ["get", "post", "patch", "delete"]

    def perform_create(self, serializador):
        especialidad = serializador.save()
        auditoria.registrar(self.request.user, "CREAR_ESPECIALIDAD", "especialidades", especialidad.id_especialidad)

    def perform_update(self, serializador):
        especialidad = serializador.save()
        auditoria.registrar(
            self.request.user, "ACTUALIZAR_ESPECIALIDAD", "especialidades", especialidad.id_especialidad
        )

    def perform_destroy(self, especialidad):
        servicios.eliminar_especialidad(self.request.user, especialidad)


class VistaHorarioDoctor(APIView):
    """
    GET /api/v1/administracion/medicos/<id_doctor>/horario/
    PUT /api/v1/administracion/medicos/<id_doctor>/horario/  {bloques: [...]}  (reemplaza todo el horario)
    """

    permission_classes = [EsAdmin]

    def get(self, solicitud, id_doctor):
        doctor = get_object_or_404(Doctor, pk=id_doctor)
        return Response({"bloques": BloqueHorarioSerializador(doctor.horarios.all(), many=True).data})

    def put(self, solicitud, id_doctor):
        doctor = get_object_or_404(Doctor, pk=id_doctor)
        entrada = HorarioDoctorSerializador(data=solicitud.data)
        entrada.is_valid(raise_exception=True)
        horarios = servicios.reemplazar_horario(solicitud.user, doctor, entrada.validated_data["bloques"])
        return Response({"bloques": BloqueHorarioSerializador(horarios, many=True).data})


class ListaCitasAdmin(ListAPIView):
    """GET /api/v1/administracion/citas/?desde=&hasta=&id_doctor=&estado=&buscar=&pagina="""

    permission_classes = [EsAdmin]
    serializer_class = CitaAdminSerializador
    pagination_class = PaginacionEstandar

    def get_queryset(self):
        citas = Cita.objects.select_related("doctor__especialidad", "paciente").order_by("-fecha", "-hora")
        parametros = self.request.query_params
        if parametros.get("desde"):
            citas = citas.filter(fecha__gte=parametros["desde"])
        if parametros.get("hasta"):
            citas = citas.filter(fecha__lte=parametros["hasta"])
        if parametros.get("id_doctor", "").isdigit():
            citas = citas.filter(doctor_id=parametros["id_doctor"])
        if parametros.get("estado"):
            citas = citas.filter(estado=parametros["estado"])
        if parametros.get("buscar"):
            texto = parametros["buscar"].strip()
            citas = citas.filter(
                Q(paciente__numero_documento__icontains=texto)
                | Q(paciente__nombres__icontains=texto)
                | Q(paciente__apellidos__icontains=texto)
            )
        return citas

    def list(self, solicitud, *args, **kwargs):
        FiltroCitasSerializador(data=solicitud.query_params).is_valid(raise_exception=True)
        return super().list(solicitud, *args, **kwargs)


class VistaReporteOcupacion(APIView):
    """GET /api/v1/administracion/reportes/ocupacion/?desde=&hasta=  (CU-05)"""

    permission_classes = [EsAdmin]

    def get(self, solicitud):
        consulta = ConsultaRangoFechasSerializador(data=solicitud.query_params)
        consulta.is_valid(raise_exception=True)
        return Response(servicios.reporte_ocupacion(**consulta.validated_data))


class ListaAuditoria(ListAPIView):
    """GET /api/v1/administracion/auditoria/?operacion=&resultado=&usuario=&pagina="""

    permission_classes = [EsAdmin]
    serializer_class = AuditoriaSerializador
    pagination_class = PaginacionEstandar

    def get_queryset(self):
        registros = Auditoria.objects.select_related("usuario").order_by("-fecha")
        parametros = self.request.query_params
        if parametros.get("operacion"):
            registros = registros.filter(operacion=parametros["operacion"])
        if parametros.get("resultado"):
            registros = registros.filter(resultado=parametros["resultado"])
        if parametros.get("usuario"):
            registros = registros.filter(usuario__username__icontains=parametros["usuario"])
        return registros
