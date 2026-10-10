"""Registro de auditoría. Debe llamarse fuera de la transacción que falla, para que el registro no se revierta."""

from .models import Auditoria


class Resultado:
    OK = "OK"
    DENEGADO = "DENEGADO"
    CONFLICTO = "CONFLICTO"


def registrar(usuario, operacion, tabla, id_registro=None, resultado=Resultado.OK, detalle=""):
    return Auditoria.objects.create(
        usuario=usuario if usuario and usuario.is_authenticated else None,
        operacion=operacion,
        tabla=tabla,
        id_registro=id_registro,
        resultado=resultado,
        detalle=detalle[:255],
    )
