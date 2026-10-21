#Requires -Version 7.0
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$DotfilesArguments)

$ErrorActionPreference = 'Stop'
$lifecycle = Join-Path $PSScriptRoot 'scripts/lib/lifecycle.ps1'
if (-not (Test-Path -LiteralPath $lifecycle -PathType Leaf)) { throw "dotfiles lifecycle helper is missing: $lifecycle" }
. $lifecycle
Invoke-DotfilesEntrypoint -Action uninstall -Arguments $DotfilesArguments
