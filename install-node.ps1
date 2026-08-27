# install-node.ps1
# Detecta e instala Node.js (LTS, portable) sin requerir permisos de administrador.
# - Descarga el .zip oficial de nodejs.org (ultima version LTS)
# - Lo extrae en una carpeta del usuario (por defecto: %LOCALAPPDATA%\nodejs)
# - (Opcional) agrega esa carpeta al PATH del usuario c/ -AddToPath
# Devuelve (stdout/Write-Output) la ruta de la carpeta con node.exe

[CmdletBinding()]
param(
    [string]$InstallRoot = "",
    [switch]$AddToPath
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # acelera Invoke-WebRequest

# ---- 1. Detectar arquitectura ----
$arch = $env:PROCESSOR_ARCHITECTURE
if ($arch -eq 'ARM64') { $cpu = 'arm64' } else { $cpu = 'x64' }

if (-not $InstallRoot) {
    $InstallRoot = Join-Path $env:LOCALAPPDATA 'Node'
}
New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null

# ---- 2. Obtener la ultima version LTS ----
Write-Host "Buscando la ultima version LTS de Node.js..."
$index = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json' -UseBasicParsing
$latest = $index | Where-Object { $_.lts } | Select-Object -First 1
if (-not $latest) {
    throw 'No se pudo obtener la version LTS de Node.js. Revisa tu conexion a internet.'
}
$ver     = $latest.version
$folder  = "node-$ver-win-$cpu"
$url     = "https://nodejs.org/dist/$ver/$folder.zip"
$zip     = Join-Path $env:TEMP "$folder.zip"

# ---- 3. Descargar ----
Write-Host "Descargando Node.js $ver ($cpu)..."
if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
    & curl.exe -L -sS -o $zip $url
    if ($LASTEXITCODE -ne 0) { throw "Fallo la descarga con curl (codigo $LASTEXITCODE)." }
} else {
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
}

# ---- 4. Extraer ----
Write-Host "Extrayendo..."
Expand-Archive -Path $zip -DestinationPath $InstallRoot -Force
Remove-Item $zip -Force -ErrorAction SilentlyContinue

$bin = Join-Path $InstallRoot $folder
$nodeExe = Join-Path $bin 'node.exe'
if (-not (Test-Path $nodeExe)) {
    throw "No se encontro node.exe en $bin"
}

# ---- 5. (Opcional) Agregar al PATH del usuario ----
if ($AddToPath) {
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $exists = ($userPath -split ';') | Where-Object { $_.Trim() -ieq $bin }
    if (-not $exists) {
        $newPath = if ([string]::IsNullOrWhiteSpace($userPath)) { $bin } else { "$userPath;$bin" }
        [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
        Write-Host "Agregado al PATH de usuario: $bin"
    } else {
        Write-Host "Node.js ya estaba en el PATH de usuario."
    }
}

Write-Host "Instalado en: $bin"
Write-Host "Version: $((& $nodeExe --version))"
Write-Output $bin