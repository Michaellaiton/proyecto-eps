from django.contrib import admin

from .models import Auditoria


@admin.register(Auditoria)
class AuditoriaAdmin(admin.ModelAdmin):
    list_display = ("fecha", "usuario", "operacion", "tabla", "id_registro", "resultado")
    list_filter = ("operacion", "resultado")

    # La auditoría es de solo lectura: no se crea, modifica ni borra desde el panel.
    def has_add_permission(self, solicitud):
        return False

    def has_change_permission(self, solicitud, objeto=None):
        return False

    def has_delete_permission(self, solicitud, objeto=None):
        return False
