"""
Excepciones de negocio y su traducción a códigos HTTP.

Los servicios lanzan estas excepciones sin conocer HTTP; DRF las convierte en la respuesta adecuada.
Contrato de errores del informe de Calidad (Tabla 11): 404 inexistente, 409 conflicto, 422 regla inválida.
"""
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.views import exception_handler


class Conflicto(APIException):
    """La operación choca con el estado actual (franja ocupada, cita ya cancelada…)."""

    status_code = status.HTTP_409_CONFLICT
    default_detail = "La operación entra en conflicto con el estado actual."
    default_code = "conflicto"


class ReglaInvalida(APIException):
    """Los datos son válidos en forma, pero violan una regla de negocio (fecha pasada, fuera de horario…)."""

    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = "La solicitud no cumple las reglas del sistema."
    default_code = "regla_invalida"


def manejador_excepciones(excepcion, contexto):
    """Igual al manejador de DRF, pero los errores de validación de entrada responden 422 en lugar de 400."""
    respuesta = exception_handler(excepcion, contexto)
    if respuesta is not None and isinstance(excepcion, ValidationError):
        respuesta.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    return respuesta
