from django.contrib import admin

from .models import Notificacion


@admin.register(Notificacion)
class NotificacionAdmin(admin.ModelAdmin):
    list_display = ("creada_en", "usuario", "tipo", "titulo", "leida")
    list_filter = ("tipo", "leida")
    search_fields = ("usuario__username", "titulo")
