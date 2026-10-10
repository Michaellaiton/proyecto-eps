<#
.SYNOPSIS
    Respaldo de la base de datos eps_citas (Administración de Bases de Datos: plan de respaldo).

.DESCRIPTION
    Genera un respaldo comprimido en formato personalizado de pg_dump, verifica que se pueda leer
    y elimina los respaldos más antiguos que el período de retención.

    Objetivos del plan:
      RPO (pérdida máxima de datos): 24 horas con un respaldo diario. Para bajarlo a minutos se activa
      el archivado continuo del WAL (ver LEEME.md, sección "Reducir el RPO").
      RTO (tiempo máximo de recuperación): menos de 1 hora; restaurar.ps1 mide el tiempo real.

    La contraseña NO va en el script: se toma del archivo pgpass de PostgreSQL
    (%APPDATA%\postgresql\pgpass.conf, línea  localhost:5432:eps_citas:USUARIO:CLAVE)
    o de la variable de entorno PGPASSWORD.

.EXAMPLE
    .\respaldar.ps1 -Destino "D:\respaldos\eps" -DiasRetencion 14
    Programarlo a diario con el Programador de tareas de Windows.
#>
param(
    [string]$Destino = "C:\respaldos\eps",
    [int]$DiasRetencion = 7,
    [string]$Usuario = "eps_app",
    [string]$BaseDatos = "eps_citas",
    [string]$Servidor = "localhost",
    [string]$RutaPostgres = "C:\Program Files\PostgreSQL\18\bin"
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $Destino | Out-Null

$marca = Get-Date -Format "yyyyMMdd_HHmmss"
$archivo = Join-Path $Destino "$($BaseDatos)_$marca.dump"
$inicio = Get-Date

& (Join-Path $RutaPostgres "pg_dump.exe") -h $Servidor -U $Usuario -d $BaseDatos -Fc -Z 9 -f $archivo
if ($LASTEXITCODE -ne 0) { throw "pg_dump terminó con error ($LASTEXITCODE)." }

# Verificación: el respaldo debe poder listarse (detecta archivos truncados o corruptos).
& (Join-Path $RutaPostgres "pg_restore.exe") --list $archivo | Out-Null
if ($LASTEXITCODE -ne 0) { throw "El respaldo $archivo no se pudo verificar." }

$duracion = [math]::Round(((Get-Date) - $inicio).TotalSeconds, 1)
$tamano = [math]::Round((Get-Item $archivo).Length / 1KB, 1)
Write-Output "Respaldo creado: $archivo ($tamano KB en $duracion s)"

# Retención: se borran solo respaldos de esta base más antiguos que el período definido.
$limite = (Get-Date).AddDays(-$DiasRetencion)
Get-ChildItem -Path $Destino -Filter "$($BaseDatos)_*.dump" |
    Where-Object { $_.LastWriteTime -lt $limite } |
    ForEach-Object {
        Remove-Item $_.FullName -Confirm:$false
        Write-Output "Respaldo antiguo eliminado: $($_.Name)"
    }
