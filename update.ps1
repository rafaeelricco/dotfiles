#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$Dir,
    [switch]$Yes,
    [switch]$SkipCodex
)

$ErrorActionPreference = 'Stop'

$script:RepoSlug = 'rafaeelricco/dotfiles'

function Test-EnvFlag {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $false }
    return ($Value.Trim().ToLowerInvariant() -notin @('0', 'false', 'no', 'off', 'n'))
}

function Resolve-Dir {
    param([string]$DirParam)
    $d = if ($DirParam) { $DirParam }
         elseif ($env:DOTFILES_DIR) { $env:DOTFILES_DIR }
         else { Join-Path $HOME '.dotfiles' }
    return [System.IO.Path]::GetFullPath($d)
}

function Assert-Git {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw "git was not found on PATH. Install Git for Windows: https://git-scm.com/download/win"
    }
}

function Get-RepoSlug {
    param([string]$Url)
    if ([string]::IsNullOrWhiteSpace($Url)) { return '' }
    $u = $Url.Trim() -replace '\.git$', ''
    if ($u -match '[:/]([^/:]+/[^/:]+)$') { return $Matches[1].ToLowerInvariant() }
    return $u.ToLowerInvariant()
}

function Get-PythonExe {
    foreach ($name in @('python3', 'python')) {
        $cmd = Get-Command $name -ErrorAction SilentlyContinue
        if ($cmd) { return $cmd.Source }
    }
    return $null
}

function Invoke-DotfilesUpdate {
    param(
        [string]$Dir,
        [switch]$Yes,
        [switch]$SkipCodex
    )

    $resolvedDir  = Resolve-Dir $Dir
    $optSkipCodex = $SkipCodex.IsPresent -or (Test-EnvFlag $env:DOTFILES_SKIP_CODEX)

    Assert-Git

    if (-not (Test-Path -LiteralPath $resolvedDir -PathType Container)) {
        throw "No clone found at $resolvedDir. Run install.ps1 first."
    }
    if (-not (Test-Path -LiteralPath (Join-Path $resolvedDir '.git'))) {
        throw "$resolvedDir exists but is not a git repository. Run install.ps1 first."
    }
    $origin = & git -C $resolvedDir remote get-url origin 2>$null
    if ((Get-RepoSlug $origin) -ne $script:RepoSlug) {
        throw "$resolvedDir origin '$origin' is not $($script:RepoSlug). Refusing to update an unrelated checkout."
    }

    $before = & git -C $resolvedDir rev-parse HEAD 2>$null

    Write-Host "Pulling latest changes in $resolvedDir"
    & git -C $resolvedDir pull --ff-only
    if ($LASTEXITCODE -ne 0) { throw "git pull --ff-only failed in $resolvedDir" }

    $after = & git -C $resolvedDir rev-parse HEAD 2>$null

    $skillsChanged = $false
    if ($before -and $after -and ($before -ne $after)) {
        $changed = & git -C $resolvedDir diff --name-only "$before" "$after" -- '.claude/skills'
        if ($changed) { $skillsChanged = $true }
    }

    # Guard after the pull so an older clone that predates install.ps1 can fetch
    # it via this updater instead of aborting first.
    $installScript = Join-Path $resolvedDir 'install.ps1'
    if (-not (Test-Path -LiteralPath $installScript)) {
        throw "install.ps1 not found in $resolvedDir after pull. The clone may be incomplete."
    }

    # Re-link using the freshly pulled install.ps1 so link logic lives in one place.
    Write-Host "Relinking via $installScript"
    $installArgs = @{ Dir = $resolvedDir; Yes = $true }
    if ($optSkipCodex) { $installArgs['SkipCodex'] = $true }
    & $installScript @installArgs
    if ($LASTEXITCODE -ne 0) { throw "install.ps1 relink step failed (exit $LASTEXITCODE)." }

    # Regenerate the plugin marketplace only when skills changed and python is available.
    if ($skillsChanged) {
        $py = Get-PythonExe
        if ($py) {
            $syncScript = Join-Path $resolvedDir 'scripts\sync-claude-plugin-marketplace.py'
            if (Test-Path -LiteralPath $syncScript) {
                Write-Host ".claude/skills changed; regenerating plugin marketplace"
                try {
                    & $py $syncScript
                    if ($LASTEXITCODE -ne 0) {
                        Write-Warning "marketplace sync exited with code $LASTEXITCODE (non-fatal)"
                    }
                }
                catch {
                    Write-Warning "marketplace sync failed (non-fatal): $($_.Exception.Message)"
                }
            }
        }
        else {
            Write-Host "python not found; skipping marketplace regeneration."
        }
    }

    Write-Host ""
    Write-Host "Update complete for $resolvedDir"
}

function Main {
    try {
        Invoke-DotfilesUpdate -Dir $Dir -Yes:$Yes -SkipCodex:$SkipCodex
    }
    catch {
        Write-Error "$($_.Exception.Message)"
        exit 1
    }
}

Main
