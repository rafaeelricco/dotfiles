#Requires -Version 7.0
[CmdletBinding()]
param(
    [string]$Dir,
    [switch]$Yes,
    [switch]$SkipCodex
)

$ErrorActionPreference = 'Stop'
$RepoSlug = 'rafaeelricco/dotfiles'

function Resolve-InstallDir {
    param([string]$DirParam)
    $value = if ($DirParam) { $DirParam } elseif ($env:DOTFILES_DIR) { $env:DOTFILES_DIR } else { Join-Path $HOME '.dotfiles' }
    [System.IO.Path]::GetFullPath($value)
}

function Get-RepoSlug {
    param([string]$Url)
    if ([string]::IsNullOrWhiteSpace($Url)) { return '' }
    $normalized = $Url.Trim() -replace '\.git$', ''
    if ($normalized -match '[:/]([^/:]+/[^/:]+)$') { return $Matches[1].ToLowerInvariant() }
    $normalized.ToLowerInvariant()
}

try {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'git was not found on PATH.' }
    $repoDir = Resolve-InstallDir $Dir
    if (-not (Test-Path -LiteralPath $repoDir -PathType Container)) { throw "clone not found: $repoDir" }

    $origin = & git -C $repoDir config --get remote.origin.url 2>$null
    if ($LASTEXITCODE -ne 0 -or (Get-RepoSlug $origin) -ne $RepoSlug) {
        throw "$repoDir is not the rafaeelricco/dotfiles clone."
    }

    $env:GIT_TERMINAL_PROMPT = '0'
    Write-Host "Updating $repoDir"
    & git -C $repoDir pull --ff-only
    if ($LASTEXITCODE -ne 0) { throw 'update failed; checkout was not relinked.' }

    $installer = Join-Path $repoDir 'install.ps1'
    if (-not (Test-Path -LiteralPath $installer -PathType Leaf)) {
        throw "installer missing after update: $installer"
    }

    $arguments = @{ Dir = $repoDir }
    if ($Yes.IsPresent) { $arguments['Yes'] = $true }
    if ($SkipCodex.IsPresent) { $arguments['SkipCodex'] = $true }
    & $installer @arguments
    if ($LASTEXITCODE -ne 0) { throw "install.ps1 failed with exit code $LASTEXITCODE." }
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
