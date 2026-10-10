from rest_framework import serializers

from .models import EventoSimulacion, Simulacion, TipoSimulacion

# Límites pensados para no agotar las conexiones de PostgreSQL (max_connections = 100 por defecto).
MAXIMO_USUARIOS_RAFAGA = 60
MAXIMO_HILOS_CARGA = 40


class CrearSimulacionSerializador(serializers.Serializer):
    tipo = serializers.ChoiceField(choices=TipoSimulacion.choices)
    # Ráfaga
    usuarios = serializers.IntegerField(min_value=2, max_value=MAXIMO_USUARIOS_RAFAGA, default=30)
    proteccion = serializers.BooleanField(default=True)
    # Consultas masivas
    hilos = serializers.IntegerField(min_value=2, max_value=MAXIMO_HILOS_CARGA, default=20)
    duracion = serializers.IntegerField(min_value=3, max_value=60, default=15)
    medicos = serializers.IntegerField(min_value=1, max_value=10, default=5)
    pacientes = serializers.IntegerField(min_value=10, max_value=200, default=60)

    def parametros(self):
        datos = self.validated_data
        if datos["tipo"] == TipoSimulacion.RAFAGA:
            return {"usuarios": datos["usuarios"], "proteccion": datos["proteccion"]}
        return {campo: datos[campo] for campo in ("hilos", "duracion", "medicos", "pacientes")}


class SimulacionSerializador(serializers.ModelSerializer):
    creada_por = serializers.CharField(source="creada_por.username", default=None, read_only=True)

    class Meta:
        model = Simulacion
        fields = [
            "id_simulacion",
            "tipo",
            "parametros",
            "estado",
            "resultados",
            "creada_por",
            "iniciada_en",
            "terminada_en",
        ]


class EventoSerializador(serializers.ModelSerializer):
    class Meta:
        model = EventoSimulacion
        fields = ["id_evento", "momento", "nivel", "mensaje"]
