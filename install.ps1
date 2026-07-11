#Requires -Version 7.0
[CmdletBinding()]
param(
    [string]$Dir,
    [switch]$Yes,
    [switch]$SkipCodex
)

$ErrorActionPreference = 'Stop'
$script:RepoUrl = 'https://github.com/rafaeelricco/dotfiles.git'
$script:RepoSlug = 'rafaeelricco/dotfiles'

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

function Assert-Git {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw 'git was not found on PATH.'
    }
}

function Ensure-Repo {
    param([Parameter(Mandatory)][string]$Path)
    if (Test-Path -LiteralPath $Path) {
        if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
            throw "$Path exists but is not a directory."
        }
        $origin = & git -C $Path config --get remote.origin.url 2>$null
        if ($LASTEXITCODE -ne 0 -or (Get-RepoSlug $origin) -ne $script:RepoSlug) {
            throw "$Path is not the rafaeelricco/dotfiles clone."
        }
        Write-Host "Using existing clone: $Path"
        return
    }

    $parent = Split-Path -Parent $Path
    if ($parent -and -not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    Write-Host "Cloning $($script:RepoUrl) -> $Path"
    & git clone $script:RepoUrl $Path
    if ($LASTEXITCODE -ne 0) { throw 'git clone failed.' }
}

function Get-ItemIfPresent {
    param([Parameter(Mandatory)][string]$Path)
    Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
}

function Test-IsSymlink {
    param([System.IO.FileSystemInfo]$Item)
    $null -ne $Item -and $Item.LinkType -eq 'SymbolicLink'
}

function Get-LinkTargetPath {
    param([Parameter(Mandatory)][System.IO.FileSystemInfo]$Item)
    $target = $Item.Target
    if ($target -is [array]) { $target = $target[0] }
    if ([string]::IsNullOrWhiteSpace($target)) { return '' }
    if (-not [System.IO.Path]::IsPathRooted($target)) {
        $target = Join-Path (Split-Path -Parent $Item.FullName) $target
    }
    try { [System.IO.Path]::GetFullPath($target).TrimEnd('\', '/') } catch { $target.TrimEnd('\', '/') }
}

function Test-SamePath {
    param([string]$Left, [string]$Right)
    if (-not $Left -or -not $Right) { return $false }
    $a = [System.IO.Path]::GetFullPath($Left).TrimEnd('\', '/')
    $b = [System.IO.Path]::GetFullPath($Right).TrimEnd('\', '/')
    $a.Equals($b, [System.StringComparison]::OrdinalIgnoreCase)
}

function Test-ManagedTarget {
    param([string]$Target)
    if ([string]::IsNullOrWhiteSpace($Target)) { return $false }
    $candidate = [System.IO.Path]::GetFullPath($Target).TrimEnd('\', '/')
    foreach ($root in $script:ManagedRoots) {
        $managed = [System.IO.Path]::GetFullPath($root).TrimEnd('\', '/')
        if ($candidate.Equals($managed, [System.StringComparison]::OrdinalIgnoreCase)) { return $true }
        if ($candidate.StartsWith("$managed$([System.IO.Path]::DirectorySeparatorChar)", [System.StringComparison]::OrdinalIgnoreCase)) { return $true }
    }
    $false
}

function Remove-SymlinkSafely {
    param([Parameter(Mandatory)][System.IO.FileSystemInfo]$Item)
    if ($Item -is [System.IO.DirectoryInfo]) {
        [System.IO.Directory]::Delete($Item.FullName, $false)
    } else {
        [System.IO.File]::Delete($Item.FullName)
    }
}

function Get-BackupPath {
    param([Parameter(Mandatory)][string]$Path)
    $stamp = Get-Date -Format 'yyyyMMddHHmmss'
    $candidate = "$Path.backup-$stamp"
    $index = 1
    while ($null -ne (Get-ItemIfPresent $candidate)) {
        $candidate = "$Path.backup-$stamp-$index"
        $index++
    }
    $candidate
}

function Resolve-Conflict {
    param([Parameter(Mandatory)][string]$Path)
    if ($script:Interactive) {
        $answer = Read-Host "Conflict: $Path`n  [b]ackup, [s]kip, or [a]bort"
        switch -Regex ($answer) {
            '^[bB]$' { break }
            '^[sS]$' { Write-Host "skipped: $Path"; return $false }
            default { throw "aborted at: $Path" }
        }
    }
    $backup = Get-BackupPath $Path
    Move-Item -LiteralPath $Path -Destination $backup
    Write-Host "backed up: $Path -> $backup"
    $true
}

function New-SymbolicLinkChecked {
    param(
        [Parameter(Mandatory)][string]$LinkPath,
        [Parameter(Mandatory)][string]$TargetPath
    )
    try {
        New-Item -ItemType SymbolicLink -Path $LinkPath -Target $TargetPath -ErrorAction Stop | Out-Null
    } catch {
        $message = $_.Exception.Message
        if ($message -match 'privilege|not held|1314|Administrator|Developer Mode') {
            throw "SYMLINK_PRIVILEGE::$message"
        }
        throw
    }
}

function Test-SymlinkCapability {
    $base = [System.IO.Path]::GetTempPath()
    $target = Join-Path $base ("dotfiles-target-" + [System.Guid]::NewGuid().ToString('N'))
    $link = Join-Path $base ("dotfiles-link-" + [System.Guid]::NewGuid().ToString('N'))
    New-Item -ItemType File -Path $target | Out-Null
    try {
        New-SymbolicLinkChecked -LinkPath $link -TargetPath $target
    } finally {
        Remove-Item -LiteralPath $link -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $target -Force -ErrorAction SilentlyContinue
    }
}

function Install-Link {
    param(
        [Parameter(Mandatory)][string]$LinkPath,
        [Parameter(Mandatory)][string]$TargetPath
    )
    if (-not (Test-Path -LiteralPath $TargetPath)) { throw "source missing: $TargetPath" }
    $parent = Split-Path -Parent $LinkPath
    if ($parent -and -not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    $item = Get-ItemIfPresent $LinkPath
    if (Test-IsSymlink $item) {
        $current = Get-LinkTargetPath $item
        if (Test-SamePath $current $TargetPath) {
            Write-Host "up to date: $LinkPath"
            return
        }
        if (Test-ManagedTarget $current) {
            Remove-SymlinkSafely $item
        } elseif (-not (Resolve-Conflict $LinkPath)) {
            return
        }
    } elseif ($null -ne $item) {
        if (-not (Resolve-Conflict $LinkPath)) { return }
    }

    New-SymbolicLinkChecked -LinkPath $LinkPath -TargetPath $TargetPath
    Write-Host "linked: $LinkPath -> $TargetPath"
}

function Prepare-SkillDirectory {
    param([string]$Path, [string]$Label)
    $item = Get-ItemIfPresent $Path
    if (Test-IsSymlink $item) {
        $target = Get-LinkTargetPath $item
        if (Test-ManagedTarget $target) {
            Remove-SymlinkSafely $item
        } elseif (-not (Resolve-Conflict $Path)) {
            Write-Host "$Label skills skipped."
            return $false
        }
    } elseif ($null -ne $item -and -not $item.PSIsContainer) {
        if (-not (Resolve-Conflict $Path)) {
            Write-Host "$Label skills skipped."
            return $false
        }
    }
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
    $true
}

function Sync-SkillSet {
    param([string]$Destination, [string]$Label)
    if (-not (Prepare-SkillDirectory -Path $Destination -Label $Label)) { return }
    $skills = @(Get-ChildItem -LiteralPath $script:SkillsSrc -Directory | Where-Object {
        Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') -PathType Leaf
    })
    if ($skills.Count -eq 0) { throw "no skills found in $($script:SkillsSrc)" }

    $valid = @{}
    foreach ($skill in $skills) {
        $valid[$skill.Name] = $true
        Install-Link -LinkPath (Join-Path $Destination $skill.Name) -TargetPath $skill.FullName
    }
    foreach ($entry in @(Get-ChildItem -LiteralPath $Destination -Force)) {
        if ($valid.ContainsKey($entry.Name) -or -not (Test-IsSymlink $entry)) { continue }
        if (Test-ManagedTarget (Get-LinkTargetPath $entry)) {
            Remove-SymlinkSafely $entry
            Write-Host "pruned stale skill link: $($entry.FullName)"
        }
    }
}

function Clear-ManagedSkillDirectory {
    param([string]$Path)
    $item = Get-ItemIfPresent $Path
    if (Test-IsSymlink $item) {
        if (Test-ManagedTarget (Get-LinkTargetPath $item)) {
            Remove-SymlinkSafely $item
            Write-Host "removed legacy managed link: $Path"
        }
        return
    }
    if ($null -eq $item -or -not $item.PSIsContainer) { return }
    foreach ($entry in @(Get-ChildItem -LiteralPath $Path -Force)) {
        if ((Test-IsSymlink $entry) -and (Test-ManagedTarget (Get-LinkTargetPath $entry))) {
            Remove-SymlinkSafely $entry
            Write-Host "removed legacy managed link: $($entry.FullName)"
        }
    }
}

function Remove-ManagedLink {
    param([string]$Path)
    $item = Get-ItemIfPresent $Path
    if ((Test-IsSymlink $item) -and (Test-ManagedTarget (Get-LinkTargetPath $item))) {
        Remove-SymlinkSafely $item
        Write-Host "removed legacy managed link: $Path"
    }
}

function Clear-LegacyAgents {
    param([string]$ClaudeHome)
    Remove-ManagedLink (Join-Path $ClaudeHome 'agents\advisor.md')
    Remove-ManagedLink (Join-Path $ClaudeHome 'agents\opus-advisor.md')
}

function Test-CodexPresent {
    param([string]$CodexHome)
    (Test-Path -LiteralPath $CodexHome -PathType Container) -or $null -ne (Get-Command codex -ErrorAction SilentlyContinue)
}

function Invoke-DotfilesInstall {
    $requestedRepoDir = Resolve-InstallDir $Dir
    Assert-Git
    Ensure-Repo $requestedRepoDir
    $repoDir = (Resolve-Path -LiteralPath $requestedRepoDir).Path

    $script:GuidanceSrc = Join-Path $repoDir 'CLAUDE.md'
    $script:SkillsSrc = Join-Path $repoDir 'skill'
    if (-not (Test-Path -LiteralPath $script:GuidanceSrc -PathType Leaf)) { throw "source missing: $($script:GuidanceSrc)" }
    if (-not (Test-Path -LiteralPath $script:SkillsSrc -PathType Container)) { throw "source missing: $($script:SkillsSrc)" }

    $script:ManagedRoots = @()
    foreach ($managedRepo in (@($requestedRepoDir, $repoDir) | Select-Object -Unique)) {
        $script:ManagedRoots += @(
            (Join-Path $managedRepo 'CLAUDE.md'),
            (Join-Path $managedRepo 'skill'),
            (Join-Path $managedRepo '.claude\CLAUDE.md'),
            (Join-Path $managedRepo '.claude\skills'),
            (Join-Path $managedRepo '.claude\agents'),
            (Join-Path $managedRepo '.codex\AGENTS.md')
        )
    }
    $script:Interactive = [Environment]::UserInteractive -and -not [Console]::IsInputRedirected -and -not $Yes.IsPresent
    Test-SymlinkCapability

    $defaultClaudeHome = Join-Path $HOME '.claude'
    $claudeHome = if ($env:CLAUDE_CONFIG_DIR) { [System.IO.Path]::GetFullPath($env:CLAUDE_CONFIG_DIR) } else { $defaultClaudeHome }
    $defaultCodexHome = Join-Path $HOME '.codex'
    $codexHome = if ($env:CODEX_HOME) { [System.IO.Path]::GetFullPath($env:CODEX_HOME) } else { $defaultCodexHome }

    Write-Host '== Claude Code =='
    if (-not (Test-SamePath $claudeHome $defaultClaudeHome)) {
        Remove-ManagedLink (Join-Path $defaultClaudeHome 'CLAUDE.md')
        Clear-ManagedSkillDirectory (Join-Path $defaultClaudeHome 'skills')
        Clear-LegacyAgents $defaultClaudeHome
    }
    Clear-LegacyAgents $claudeHome
    Install-Link -LinkPath (Join-Path $claudeHome 'CLAUDE.md') -TargetPath $script:GuidanceSrc
    Sync-SkillSet -Destination (Join-Path $claudeHome 'skills') -Label 'Claude'

    if ($SkipCodex.IsPresent) {
        Write-Host 'Codex: skipped (-SkipCodex).'
    } elseif (Test-CodexPresent $codexHome) {
        Write-Host '== Codex =='
        if (-not (Test-SamePath $codexHome $defaultCodexHome)) {
            Remove-ManagedLink (Join-Path $defaultCodexHome 'AGENTS.md')
            Clear-ManagedSkillDirectory (Join-Path $defaultCodexHome 'skills')
        }
        Clear-ManagedSkillDirectory (Join-Path $codexHome 'skills')
        Install-Link -LinkPath (Join-Path $codexHome 'AGENTS.md') -TargetPath $script:GuidanceSrc
        Sync-SkillSet -Destination (Join-Path $HOME '.agents\skills') -Label 'Codex'
    } else {
        Write-Host 'Codex: not detected; skipping.'
    }

    Write-Host "Dotfiles linked from $repoDir"
}

try {
    Invoke-DotfilesInstall
} catch {
    $message = $_.Exception.Message
    if ($message -like 'SYMLINK_PRIVILEGE::*') {
        Write-Error "Windows symlinks require Developer Mode or an elevated PowerShell. $($message -replace '^SYMLINK_PRIVILEGE::', '')"
    } else {
        Write-Error $message
    }
    exit 1
}
