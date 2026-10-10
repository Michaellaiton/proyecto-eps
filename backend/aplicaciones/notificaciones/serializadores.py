from rest_framework import serializers

from .models import Notificacion


class NotificacionSerializador(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = ["id_notificacion", "tipo", "titulo", "mensaje", "destino", "leida", "creada_en"]
