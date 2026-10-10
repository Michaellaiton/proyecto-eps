<#
.SYNOPSIS
    Restaura un respaldo de eps_citas en una base NUEVA y mide el tiempo (evidencia del RTO).

.DESCRIPTION
    Por seguridad nunca restaura sobre la base en uso: crea la base indicada en -BaseDestino
    (por defecto eps_citas_restaurada). Para volver a operar con ella se cambia EPS_BD_NOMBRE en
    backend\.env o se renombran las bases en una ventana de mantenimiento.
    Usa el archivo pgpass o PGPASSWORD para la contraseña, igual que respaldar.ps1.

.EXAMPLE
    .\restaurar.ps1 -Archivo "C:\respaldos\eps\eps_citas_20261009_230000.dump"
#>
param(
    [Parameter(Mandatory = $true)][string]$Archivo,
    [string]$BaseDestino = "eps_citas_restaurada",
    [string]$Usuario = "eps_app",
    [string]$Servidor = "localhost",
    [string]$RutaPostgres = "C:\Program Files\PostgreSQL\18\bin"
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path $Archivo)) { throw "No existe el archivo $Archivo." }

$inicio = Get-Date
& (Join-Path $RutaPostgres "createdb.exe") -h $Servidor -U $Usuario $BaseDestino
if ($LASTEXITCODE -ne 0) { throw "No se pudo crear la base $BaseDestino (¿ya existe?)." }

& (Join-Path $RutaPostgres "pg_restore.exe") -h $Servidor -U $Usuario -d $BaseDestino --no-owner --exit-on-error $Archivo
if ($LASTEXITCODE -ne 0) { throw "pg_restore terminó con error ($LASTEXITCODE)." }

# Comprobación mínima: cantidad de citas restauradas.
$citas = & (Join-Path $RutaPostgres "psql.exe") -h $Servidor -U $Usuario -d $BaseDestino -tAc "SELECT COUNT(*) FROM citas"
$duracion = [math]::Round(((Get-Date) - $inicio).TotalSeconds, 1)
Write-Output "Base $BaseDestino restaurada en $duracion s (RTO medido). Citas: $citas"
