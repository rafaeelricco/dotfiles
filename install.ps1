#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$Dir,
    [switch]$Yes,
    [switch]$SkipCodex,
    [switch]$Update
)

$ErrorActionPreference = 'Stop'

$script:RepoUrl  = 'https://github.com/rafaeelricco/dotfiles.git'
$script:RepoSlug = 'rafaeelricco/dotfiles'
$script:RepoDir  = $null

function Test-EnvFlag {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $false }
    return ($Value.Trim().ToLowerInvariant() -notin @('0', 'false', 'no', 'off', 'n'))
}

function Get-Option {
    param([bool]$Switch, [string]$EnvValue)
    if ($Switch) { return $true }
    return (Test-EnvFlag $EnvValue)
}

function Join-Parts {
    param(
        [Parameter(Mandatory)][string]$Base,
        [Parameter(Mandatory)][string[]]$Parts
    )
    $p = $Base
    foreach ($part in $Parts) { $p = Join-Path $p $part }
    return $p
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

function Sync-Repo {
    param(
        [Parameter(Mandatory)][string]$Dir,
        [bool]$UpdateOnly
    )
    if (Test-Path -LiteralPath $Dir) {
        if (-not (Test-Path -LiteralPath (Join-Path $Dir '.git'))) {
            throw "$Dir already exists but is not a git repository. Move it aside and retry."
        }
        $origin = & git -C $Dir remote get-url origin 2>$null
        if ((Get-RepoSlug $origin) -ne $script:RepoSlug) {
            throw "$Dir is a git repo but origin '$origin' is not $($script:RepoSlug). Aborting to avoid touching an unrelated checkout."
        }
        Write-Host "Refreshing existing clone at $Dir"
        & git -C $Dir pull --ff-only
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "git pull --ff-only could not fast-forward $Dir; continuing with the existing checkout."
            $global:LASTEXITCODE = 0
        }
    }
    else {
        if ($UpdateOnly) {
            throw "No clone found at $Dir. Run install.ps1 (without -Update) first."
        }
        Write-Host "Cloning $($script:RepoUrl) into $Dir"
        & git clone $script:RepoUrl $Dir
        if ($LASTEXITCODE -ne 0) { throw "git clone failed" }
    }
}

function Test-CodexPresent {
    if (Test-Path -LiteralPath (Join-Path $HOME '.codex') -PathType Container) { return $true }
    if (Get-Command codex -ErrorAction SilentlyContinue) { return $true }
    return $false
}

function Test-IsSymlink {
    param([System.IO.FileSystemInfo]$Item)
    return ($null -ne $Item -and $Item.LinkType -eq 'SymbolicLink')
}

function Remove-SymlinkSafely {
    # Removes ONLY the reparse point; never deletes the link target's contents.
    param([Parameter(Mandatory)][System.IO.FileSystemInfo]$Item)
    if ($Item -is [System.IO.DirectoryInfo]) {
        [System.IO.Directory]::Delete($Item.FullName, $false)
    }
    else {
        [System.IO.File]::Delete($Item.FullName)
    }
}

function Test-LinkTarget {
    param(
        [Parameter(Mandatory)][System.IO.FileSystemInfo]$Item,
        [Parameter(Mandatory)][string]$TargetPath
    )
    $current = $Item.Target
    if ($current -is [array]) { $current = $current[0] }
    if ([string]::IsNullOrEmpty($current)) { return $false }
    try {
        $a = [System.IO.Path]::GetFullPath($current).TrimEnd('\', '/')
        $b = [System.IO.Path]::GetFullPath($TargetPath).TrimEnd('\', '/')
        return $a.Equals($b, [System.StringComparison]::OrdinalIgnoreCase)
    }
    catch {
        return ($current.TrimEnd('\', '/') -ieq $TargetPath.TrimEnd('\', '/'))
    }
}

function Backup-RealPath {
    # Returns $true if the caller may create the link, $false if the user declined.
    param(
        [Parameter(Mandatory)][string]$Path,
        [bool]$Yes
    )
    $interactive = ([Environment]::UserInteractive) -and (-not $Yes)
    if ($interactive) {
        $answer = Read-Host "  '$Path' is a real file/dir. Back it up and replace with a symlink? [y/N]"
        if ($answer -notmatch '^(y|yes)$') { return $false }
    }
    $stamp  = Get-Date -Format 'yyyyMMddHHmmss'
    $backup = "$Path.backup-$stamp"
    Move-Item -LiteralPath $Path -Destination $backup -Force
    Write-Host "  backed up: $Path -> $backup"
    return $true
}

function New-SymbolicLinkChecked {
    param(
        [Parameter(Mandatory)][string]$LinkPath,
        [Parameter(Mandatory)][string]$TargetPath
    )
    try {
        New-Item -ItemType SymbolicLink -Path $LinkPath -Target $TargetPath -Force -ErrorAction Stop | Out-Null
    }
    catch {
        $m = "$($_.Exception.Message)"
        if ($m -match 'privilege|not held|1314|Administrator|Developer Mode') {
            throw "SYMLINK_PRIVILEGE::$m"
        }
        throw
    }
}

function Test-SymlinkCapability {
    # Probe symlink creation BEFORE any real file is backed up, so a privilege
    # failure cannot strand a moved-aside file while Show-PrivilegeGuidance still
    # claims "no real files were modified".
    $base   = [System.IO.Path]::GetTempPath()
    $target = Join-Path $base ("dotfiles-symprobe-t-" + [System.Guid]::NewGuid().ToString('N'))
    $link   = Join-Path $base ("dotfiles-symprobe-l-" + [System.Guid]::NewGuid().ToString('N'))
    New-Item -ItemType File -Path $target -Force | Out-Null
    try {
        New-SymbolicLinkChecked -LinkPath $link -TargetPath $target
    }
    finally {
        Remove-Item -LiteralPath $link   -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $target -Force -ErrorAction SilentlyContinue
    }
}

function Install-Link {
    param(
        [Parameter(Mandatory)][string]$LinkPath,
        [Parameter(Mandatory)][string]$TargetPath,
        [bool]$Yes
    )
    if (-not (Test-Path -LiteralPath $TargetPath)) {
        Write-Warning "  source missing, skipping: $TargetPath"
        return
    }

    $parent = Split-Path -Parent $LinkPath
    if ($parent -and -not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    $item = Get-Item -LiteralPath $LinkPath -Force -ErrorAction SilentlyContinue
    if ($null -ne $item) {
        if (Test-IsSymlink $item) {
            if (Test-LinkTarget -Item $item -TargetPath $TargetPath) {
                Write-Host "  up-to-date: $LinkPath"
                return
            }
            Remove-SymlinkSafely -Item $item
        }
        else {
            if (-not (Backup-RealPath -Path $LinkPath -Yes $Yes)) {
                Write-Warning "  skipped (declined, left in place): $LinkPath"
                return
            }
        }
    }

    New-SymbolicLinkChecked -LinkPath $LinkPath -TargetPath $TargetPath
    Write-Host "  linked: $LinkPath -> $TargetPath"
}

function Sync-CodexSkills {
    param(
        [Parameter(Mandatory)][string]$SkillsSrc,
        [Parameter(Mandatory)][string]$CodexSkillsDir,
        [bool]$Yes
    )
    if (-not (Test-Path -LiteralPath $SkillsSrc -PathType Container)) {
        Write-Warning "  skills source missing, skipping Codex skills: $SkillsSrc"
        return
    }
    if (-not (Test-Path -LiteralPath $CodexSkillsDir)) {
        New-Item -ItemType Directory -Path $CodexSkillsDir -Force | Out-Null
    }

    $valid = @{}
    foreach ($skill in (Get-ChildItem -LiteralPath $SkillsSrc -Directory -Force)) {
        $valid[$skill.Name] = $true
        Install-Link -LinkPath (Join-Path $CodexSkillsDir $skill.Name) -TargetPath $skill.FullName -Yes $Yes
    }

    # Prune stale skill symlinks. Never touch .system (Codex bundled skills) or real dirs.
    foreach ($entry in (Get-ChildItem -LiteralPath $CodexSkillsDir -Force)) {
        if ($entry.Name -eq '.system') { continue }
        if ($valid.ContainsKey($entry.Name)) { continue }
        if (Test-IsSymlink $entry) {
            Remove-SymlinkSafely -Item $entry
            Write-Host "  pruned stale skill link: $($entry.Name)"
        }
    }
}

function Sync-Agents {
    param(
        [Parameter(Mandatory)][string]$AgentsSrc,
        [Parameter(Mandatory)][string]$AgentsDir,
        [bool]$Yes
    )
    if (-not (Test-Path -LiteralPath $AgentsSrc -PathType Container)) {
        return
    }
    if (-not (Test-Path -LiteralPath $AgentsDir)) {
        New-Item -ItemType Directory -Path $AgentsDir -Force | Out-Null
    }

    $valid = @{}
    foreach ($agent in (Get-ChildItem -LiteralPath $AgentsSrc -Filter '*.md' -File)) {
        $valid[$agent.Name] = $true
        Install-Link -LinkPath (Join-Path $AgentsDir $agent.Name) -TargetPath $agent.FullName -Yes $Yes
    }

    # Prune stale agent symlinks. Never touch real files.
    foreach ($entry in (Get-ChildItem -LiteralPath $AgentsDir -Force)) {
        if ($valid.ContainsKey($entry.Name)) { continue }
        if (Test-IsSymlink $entry) {
            Remove-SymlinkSafely -Item $entry
            Write-Host "  pruned stale agent link: $($entry.Name)"
        }
    }
}

function Show-PrivilegeGuidance {
    param([string]$Dir, [string]$Detail)
    Write-Host ""
    Write-Warning "Could not create a symbolic link: $Detail"
    Write-Host "Creating symlinks on Windows requires ONE of the following:"
    Write-Host "  1. Enable Developer Mode: Settings > Privacy & security > For developers > Developer Mode"
    Write-Host "  2. Run this installer from an elevated (Administrator) PowerShell"
    Write-Host "  3. Run the self-elevating helper (it requests admin for you):"
    if ($Dir) { Write-Host "       $Dir\scripts\windows\setup-claude-skills.bat" }
    else      { Write-Host "       <clone>\scripts\windows\setup-claude-skills.bat" }
    Write-Host "No real files were modified. Re-run after enabling one of the above."
}

function Invoke-DotfilesInstall {
    param(
        [string]$Dir,
        [switch]$Yes,
        [switch]$SkipCodex,
        [switch]$Update
    )

    $resolvedDir    = Resolve-Dir $Dir
    $script:RepoDir = $resolvedDir
    $optYes         = Get-Option -Switch $Yes.IsPresent       -EnvValue $env:DOTFILES_YES
    $optSkipCodex   = Get-Option -Switch $SkipCodex.IsPresent  -EnvValue $env:DOTFILES_SKIP_CODEX

    Assert-Git
    Sync-Repo -Dir $resolvedDir -UpdateOnly:$Update.IsPresent

    # Fail fast (before backing up real files) if symlinks can't be created.
    Test-SymlinkCapability

    Write-Host "== Claude =="
    Install-Link -LinkPath (Join-Parts $HOME @('.claude', 'CLAUDE.md')) -TargetPath (Join-Parts $resolvedDir @('.claude', 'CLAUDE.md')) -Yes $optYes
    Install-Link -LinkPath (Join-Parts $HOME @('.claude', 'skills'))    -TargetPath (Join-Parts $resolvedDir @('.claude', 'skills'))    -Yes $optYes
    Sync-Agents -AgentsSrc (Join-Parts $resolvedDir @('.claude', 'agents')) -AgentsDir (Join-Parts $HOME @('.claude', 'agents')) -Yes $optYes

    if ($optSkipCodex) {
        Write-Host "Skipping Codex (requested)."
    }
    elseif (-not (Test-CodexPresent)) {
        Write-Host "Codex not detected (~/.codex missing and no 'codex' on PATH); skipping Codex links."
    }
    else {
        Write-Host "== Codex =="
        $codexHome = Join-Path $HOME '.codex'
        # .codex/AGENTS.md is a git symlink to ../.claude/CLAUDE.md; on Windows with
        # core.symlinks=false it checks out as a stub, so link to the real file.
        Install-Link -LinkPath (Join-Path $codexHome 'AGENTS.md') -TargetPath (Join-Parts $resolvedDir @('.claude', 'CLAUDE.md')) -Yes $optYes
        Sync-CodexSkills -SkillsSrc (Join-Parts $resolvedDir @('.claude', 'skills')) -CodexSkillsDir (Join-Path $codexHome 'skills') -Yes $optYes
    }

    Write-Host ""
    Write-Host "Dotfiles linked from $resolvedDir"
}

function Main {
    try {
        Invoke-DotfilesInstall -Dir $Dir -Yes:$Yes -SkipCodex:$SkipCodex -Update:$Update
    }
    catch {
        $msg = "$($_.Exception.Message)"
        if ($msg -like 'SYMLINK_PRIVILEGE::*') {
            Show-PrivilegeGuidance -Dir $script:RepoDir -Detail ($msg -replace '^SYMLINK_PRIVILEGE::', '')
            exit 1
        }
        Write-Error $msg
        exit 1
    }
}

Main
