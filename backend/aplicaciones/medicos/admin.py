from django.contrib import admin

from .models import BloqueoAgenda, Doctor, Especialidad, HorarioBase


@admin.register(Especialidad)
class EspecialidadAdmin(admin.ModelAdmin):
    search_fields = ("nombre",)


class HorarioBaseEnLinea(admin.TabularInline):
    model = HorarioBase
    extra = 0


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ("apellidos", "nombres", "especialidad", "registro_medico", "activo")
    list_filter = ("especialidad", "activo")
    search_fields = ("nombres", "apellidos", "registro_medico")
    inlines = [HorarioBaseEnLinea]


@admin.register(BloqueoAgenda)
class BloqueoAgendaAdmin(admin.ModelAdmin):
    list_display = ("doctor", "fecha", "hora_inicio", "hora_fin", "motivo")
    list_filter = ("doctor",)
