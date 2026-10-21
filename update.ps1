#Requires -Version 7.0
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$DotfilesArguments)

$ErrorActionPreference = 'Stop'
$versionPath = Join-Path $PSScriptRoot 'VERSION'
$version = if (Test-Path -LiteralPath $versionPath -PathType Leaf) { [IO.File]::ReadAllText($versionPath).Trim() } else { '' }
if ($version -cmatch '\A[0-9a-f]{40}\z') {
    $remote = Join-Path $PSScriptRoot 'scripts/remote.ps1'
    if (-not (Test-Path -LiteralPath $remote -PathType Leaf)) { throw "dotfiles remote fetcher is missing: $remote" }
    & $remote @DotfilesArguments
} else {
    $installer = Join-Path $PSScriptRoot 'install.ps1'
    if (-not (Test-Path -LiteralPath $installer -PathType Leaf)) { throw "dotfiles installer is missing: $installer" }
    & $installer @DotfilesArguments
}
