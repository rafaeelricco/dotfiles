#Requires -Version 7.0
<#
.SYNOPSIS
  Uninstall Maestro CLI installed by setup-maestro.ps1.
.PARAMETER InstallDir
  Same root used at install. Default: C:\maestro
.PARAMETER Yes
  Skip confirmation prompt.
.EXAMPLE
  .\scripts\windows\uninstall-maestro.ps1 -Yes
#>
[CmdletBinding()]
param(
    [string]$InstallDir = 'C:\maestro',
    [Alias('y')][switch]$Yes
)

$ErrorActionPreference = 'Stop'
$InstallDir = [System.IO.Path]::GetFullPath($InstallDir)
$binEntry = Join-Path $InstallDir 'bin'

function Remove-UserPathEntry {
    param([string]$Entry)
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if ([string]::IsNullOrWhiteSpace($userPath)) {
        Write-Host "User PATH empty; nothing to remove for $Entry"
        return
    }
    $normalized = $Entry.TrimEnd('\')
    $before = @($userPath -split ';' | Where-Object { $_ -ne '' })
    $after = @($before | Where-Object { $_.TrimEnd('\') -ne $normalized })
    if ($before.Count -eq $after.Count) {
        Write-Host "User PATH had no entry for $Entry"
        return
    }
    [Environment]::SetEnvironmentVariable('Path', ($after -join ';'), 'User')
    Write-Host "Removed User PATH entry: $Entry"
}

if (-not $Yes) {
    $answer = Read-Host "Remove Maestro at '$InstallDir' and its User PATH entry? [y/N]"
    if ($answer -notmatch '^[yY]') {
        Write-Host 'Aborted.'
        exit 0
    }
}

if (Test-Path -LiteralPath $InstallDir) {
    Remove-Item -LiteralPath $InstallDir -Recurse -Force
    Write-Host "Removed $InstallDir"
} else {
    Write-Host "Install dir already absent: $InstallDir"
}

Remove-UserPathEntry -Entry $binEntry

Write-Host 'OK: Maestro CLI uninstall complete (current shell PATH may still list the old bin until restart).'
Write-Host 'Note: Android AVDs / SDK / Java were not touched.'
