"""Permisos por rol (control de acceso basado en roles, REQ-07)."""

from rest_framework.permissions import BasePermission

from .models import Rol


class _TieneRol(BasePermission):
    roles = ()
    message = "Su rol no tiene permiso para realizar esta operación."

    def has_permission(self, solicitud, vista):
        usuario = solicitud.user
        return bool(usuario and usuario.is_authenticated and usuario.rol in self.roles)


class EsPaciente(_TieneRol):
    roles = (Rol.PACIENTE,)


class EsDoctor(_TieneRol):
    roles = (Rol.DOCTOR,)


class EsAdmin(_TieneRol):
    roles = (Rol.ADMIN,)


class EsPacienteOAdmin(_TieneRol):
    roles = (Rol.PACIENTE, Rol.ADMIN)
