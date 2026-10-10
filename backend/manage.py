#!/usr/bin/env python
"""Utilidad de línea de comandos de Django para el backend del sistema de citas EPS."""

import os
import sys


def principal():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "configuracion.ajustes")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    principal()
