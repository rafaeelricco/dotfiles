#Requires -Version 7.0
<#
.SYNOPSIS
  Install Maestro CLI for native Windows (not WSL).
.DESCRIPTION
  Downloads maestro.zip from GitHub releases, extracts to InstallDir (default C:\maestro),
  appends <InstallDir>\bin to the User PATH (no setx). Does not install Java/Android/Studio.
.PARAMETER InstallDir
  Root directory for the CLI tree (must end up containing bin\). Default: C:\maestro
.PARAMETER SkipPath
  Install files only; do not modify User PATH.
.EXAMPLE
  .\scripts\windows\setup-maestro.ps1
.EXAMPLE
  .\scripts\windows\setup-maestro.ps1 -InstallDir D:\tools\maestro
#>
[CmdletBinding()]
param(
    [string]$InstallDir = 'C:\maestro',
    [switch]$SkipPath
)

$ErrorActionPreference = 'Stop'
$DownloadUrl = 'https://github.com/mobile-dev-inc/maestro/releases/latest/download/maestro.zip'

function Test-Java17Plus {
    $java = Get-Command java -ErrorAction SilentlyContinue
    if (-not $java) { return $false }
    $verOut = & java -version 2>&1 | Out-String
    if ($verOut -match 'version "(\d+)') {
        return [int]$Matches[1] -ge 17
    }
    return $false
}

function Find-MaestroBinDir {
    param([string]$Root)
    $bat = Get-ChildItem -Path $Root -Recurse -Filter 'maestro.bat' -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($bat) { return $bat.DirectoryName }
    $cmd = Get-ChildItem -Path $Root -Recurse -Filter 'maestro.cmd' -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($cmd) { return $cmd.DirectoryName }
    $sh = Get-ChildItem -Path $Root -Recurse -Filter 'maestro' -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Extension -eq '' } |
        Select-Object -First 1
    if ($sh) { return $sh.DirectoryName }
    $null
}

function Add-UserPathEntry {
    param([string]$Entry)
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if ([string]::IsNullOrWhiteSpace($userPath)) { $userPath = '' }
    $parts = @($userPath -split ';' | Where-Object { $_ -ne '' })
    $normalized = $Entry.TrimEnd('\')
    foreach ($p in $parts) {
        if ($p.TrimEnd('\') -eq $normalized) {
            Write-Host "PATH already has $Entry"
            return
        }
    }
    $newPath = if ($userPath.TrimEnd(';')) { $userPath.TrimEnd(';') + ';' + $Entry } else { $Entry }
    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
    Write-Host "Appended User PATH: $Entry"
}

if (-not (Test-Java17Plus)) {
    Write-Warning 'Java 17+ not detected on PATH. Maestro requires Java 17+. Install Temurin/Microsoft OpenJDK and set JAVA_HOME.'
} else {
    Write-Host 'OK: Java 17+ detected'
}

$InstallDir = [System.IO.Path]::GetFullPath($InstallDir)
$binTarget = Join-Path $InstallDir 'bin'
$zip = Join-Path $env:TEMP 'maestro-cli.zip'
$extractRoot = Join-Path $env:TEMP ('maestro-extract-' + [guid]::NewGuid().ToString('n'))

Write-Host "Downloading $DownloadUrl ..."
Invoke-WebRequest -Uri $DownloadUrl -OutFile $zip

try {
    New-Item -ItemType Directory -Path $extractRoot -Force | Out-Null
    Expand-Archive -Path $zip -DestinationPath $extractRoot -Force
    $binFound = Find-MaestroBinDir -Root $extractRoot
    if (-not $binFound) { throw 'maestro binary not found inside zip' }
    $packageRoot = Split-Path -Parent $binFound

    if (Test-Path -LiteralPath $InstallDir) {
        Write-Host "Removing existing $InstallDir"
        Remove-Item -LiteralPath $InstallDir -Recurse -Force
    }
    $parent = Split-Path -Parent $InstallDir
    if ($parent -and -not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    Move-Item -LiteralPath $packageRoot -Destination $InstallDir
} finally {
    Remove-Item -LiteralPath $extractRoot -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path (Join-Path $InstallDir 'bin'))) {
    throw "Install layout unexpected: missing $binTarget"
}

if (-not $SkipPath) {
    Add-UserPathEntry -Entry $binTarget
    if ($env:Path -notlike "*${binTarget}*") {
        $env:Path += ";$binTarget"
    }
}

$maestro = Get-Command maestro -ErrorAction SilentlyContinue
if (-not $maestro) {
    $env:Path = $binTarget + ';' + $env:Path
    $maestro = Get-Command maestro -ErrorAction SilentlyContinue
}
if (-not $maestro) {
    throw "maestro not invokable after install. Open a new terminal or check $binTarget"
}

Write-Host ''
Write-Host "OK: Maestro installed at $InstallDir"
Write-Host "    bin: $binTarget"
Write-Host 'Verify: maestro --help'
Write-Host "Uninstall: .\scripts\windows\uninstall-maestro.ps1 -InstallDir '$InstallDir'"
