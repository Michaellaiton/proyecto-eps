"""
Exportación de reportes a CSV (abre directamente en Excel).

Se usa punto y coma como separador y UTF-8 con BOM, que es lo que Excel espera en configuración regional
de Colombia, para que las tildes y los decimales con coma se vean bien.
"""

import codecs
import csv
from io import StringIO

from django.http import HttpResponse
from django.utils import timezone

BOM_UTF8 = codecs.BOM_UTF8.decode("utf-8")  # Marca que le indica a Excel que el archivo está en UTF-8.


def _numero(valor):
    return f"{valor}".replace(".", ",")


def respuesta_csv(nombre_base, encabezados, filas):
    contenido = StringIO()
    escritor = csv.writer(contenido, delimiter=";")
    escritor.writerow(encabezados)
    escritor.writerows(filas)
    nombre = f"{nombre_base}_{timezone.localdate():%Y%m%d}.csv"
    respuesta = HttpResponse(BOM_UTF8 + contenido.getvalue(), content_type="text/csv; charset=utf-8")
    respuesta["Content-Disposition"] = f'attachment; filename="{nombre}"'
    return respuesta


def reporte_ocupacion_csv(reporte):
    encabezados = [
        "Médico",
        "Especialidad",
        "Activo",
        "Franjas ofrecidas",
        "Agendadas",
        "Atendidas",
        "No asistió",
        "Canceladas",
        "Ocupación (%)",
    ]
    filas = [
        [
            m["doctor"],
            m["especialidad"],
            "Sí" if m["activo"] else "No",
            m["franjas_ofertadas"],
            m["agendadas"],
            m["atendidas"],
            m["no_asistio"],
            m["canceladas"],
            _numero(m["porcentaje_ocupacion"]),
        ]
        for m in reporte["medicos"]
    ]
    t = reporte["totales"]
    filas.append(
        [
            "Total",
            "",
            "",
            t["franjas_ofertadas"],
            t["agendadas"],
            t["atendidas"],
            t["no_asistio"],
            t["canceladas"],
            _numero(t["porcentaje_ocupacion"]),
        ]
    )
    return respuesta_csv(f"ocupacion_{reporte['desde']:%Y%m%d}_{reporte['hasta']:%Y%m%d}", encabezados, filas)


def citas_csv(citas):
    encabezados = ["Fecha", "Hora", "Paciente", "Documento", "Médico", "Especialidad", "Estado"]
    filas = [
        [
            f"{c.fecha:%Y-%m-%d}",
            f"{c.hora:%H:%M}",
            f"{c.paciente.nombres} {c.paciente.apellidos}",
            f"{c.paciente.tipo_documento} {c.paciente.numero_documento}",
            f"{c.doctor.nombres} {c.doctor.apellidos}",
            c.doctor.especialidad.nombre,
            c.estado,
        ]
        for c in citas
    ]
    return respuesta_csv("citas", encabezados, filas)
