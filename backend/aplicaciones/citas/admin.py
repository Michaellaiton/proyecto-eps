from django.contrib import admin

from .models import Cita


@admin.register(Cita)
class CitaAdmin(admin.ModelAdmin):
    list_display = ("id_cita", "fecha", "hora", "doctor", "paciente", "estado")
    list_filter = ("estado", "doctor__especialidad")
    date_hierarchy = "fecha"
    list_select_related = ("doctor", "paciente")
