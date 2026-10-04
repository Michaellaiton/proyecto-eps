"""
Modelos de la oferta médica: especialidades, doctores, horario base recurrente y bloqueos de agenda.

La oferta se representa como un horario recurrente; las franjas libres se calculan a partir de él,
sin materializar franjas vacías en la base de datos.
"""
from django.conf import settings
from django.db import models
from django.db.models import F, Q


class Especialidad(models.Model):
    id_especialidad = models.BigAutoField(primary_key=True)
    nombre = models.CharField(max_length=80, unique=True)

    class Meta:
        db_table = "especialidades"
        ordering = ["nombre"]
        verbose_name = "especialidad"
        verbose_name_plural = "especialidades"

    def __str__(self):
        return self.nombre


class Doctor(models.Model):
    id_doctor = models.BigAutoField(primary_key=True)
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, db_column="id_usuario", related_name="doctor"
    )
    especialidad = models.ForeignKey(
        Especialidad, on_delete=models.PROTECT, db_column="id_especialidad", related_name="doctores"
    )
    nombres = models.CharField(max_length=80)
    apellidos = models.CharField(max_length=80)
    registro_medico = models.CharField(max_length=30, unique=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "doctores"
        ordering = ["apellidos", "nombres"]
        verbose_name = "doctor"
        verbose_name_plural = "doctores"

    def __str__(self):
        return f"Dr(a). {self.nombres} {self.apellidos}"


class DiaSemana(models.IntegerChoices):
    LUNES = 0, "Lunes"
    MARTES = 1, "Martes"
    MIERCOLES = 2, "Miércoles"
    JUEVES = 3, "Jueves"
    VIERNES = 4, "Viernes"
    SABADO = 5, "Sábado"
    DOMINGO = 6, "Domingo"


class HorarioBase(models.Model):
    id_horario = models.BigAutoField(primary_key=True)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, db_column="id_doctor", related_name="horarios")
    dia_semana = models.PositiveSmallIntegerField(choices=DiaSemana.choices)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    duracion_minutos = models.PositiveSmallIntegerField(default=20)

    class Meta:
        db_table = "horario_base"
        ordering = ["doctor", "dia_semana", "hora_inicio"]
        verbose_name = "horario base"
        verbose_name_plural = "horarios base"
        constraints = [
            models.CheckConstraint(condition=Q(hora_fin__gt=F("hora_inicio")), name="ck_horario_rango_valido"),
            models.CheckConstraint(
                condition=Q(duracion_minutos__gte=10, duracion_minutos__lte=120), name="ck_horario_duracion"
            ),
            models.CheckConstraint(condition=Q(dia_semana__lte=6), name="ck_horario_dia_semana"),
        ]

    def __str__(self):
        return f"{self.doctor} · {self.get_dia_semana_display()} {self.hora_inicio:%H:%M}-{self.hora_fin:%H:%M}"


class BloqueoAgenda(models.Model):
    id_bloqueo = models.BigAutoField(primary_key=True)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, db_column="id_doctor", related_name="bloqueos")
    fecha = models.DateField()
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    motivo = models.CharField(max_length=200)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "bloqueos_agenda"
        ordering = ["fecha", "hora_inicio"]
        verbose_name = "bloqueo de agenda"
        verbose_name_plural = "bloqueos de agenda"
        indexes = [models.Index(fields=["doctor", "fecha"], name="ix_bloqueos_doctor_fecha")]
        constraints = [
            models.CheckConstraint(condition=Q(hora_fin__gt=F("hora_inicio")), name="ck_bloqueo_rango_valido"),
        ]

    def __str__(self):
        return f"{self.doctor} · {self.fecha} {self.hora_inicio:%H:%M}-{self.hora_fin:%H:%M}"
