from django.contrib import admin

from .models import Paciente


@admin.register(Paciente)
class PacienteAdmin(admin.ModelAdmin):
    list_display = ("apellidos", "nombres", "tipo_documento", "numero_documento", "telefono")
    search_fields = ("nombres", "apellidos", "numero_documento")
