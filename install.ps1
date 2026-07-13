#Requires -Version 7.0
[CmdletBinding()]
param(
    [string]$Dir,
    [switch]$Yes,
    [switch]$Override,
    [switch]$SkipClaude,
    [switch]$SkipCodex
)

$ErrorActionPreference = 'Stop'
$script:RepoUrl = 'https://github.com/rafaeelricco/dotfiles.git'
$script:AllowedRepoUrls = @(
    'https://github.com/rafaeelricco/dotfiles',
    'https://github.com/rafaeelricco/dotfiles.git',
    'git@github.com:rafaeelricco/dotfiles',
    'git@github.com:rafaeelricco/dotfiles.git',
    'ssh://git@github.com/rafaeelricco/dotfiles',
    'ssh://git@github.com/rafaeelricco/dotfiles.git'
)
$script:StateHeader = 'dotfiles-lifecycle-state-v1'
$script:StateReady = $false
$script:PendingCreatedDirs = [System.Collections.Generic.List[string]]::new()

function Resolve-InstallDir {
    param([string]$DirParam)
    $value = if ($DirParam) { $DirParam } elseif ($env:DOTFILES_DIR) { $env:DOTFILES_DIR } else { Join-Path $HOME '.dotfiles' }
    [System.IO.Path]::GetFullPath($value)
}

function Assert-Git {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw 'git was not found on PATH.'
    }
}

function Assert-ManagedRepository {
    param([Parameter(Mandatory)][string]$Path)
    $item = Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
    if ($null -eq $item -or -not $item.PSIsContainer -or (Test-IsLink $item)) {
        throw "clone path must be a real directory: $Path"
    }
    $gitDir = Get-Item -LiteralPath (Join-Path $Path '.git') -Force -ErrorAction SilentlyContinue
    if ($null -eq $gitDir -or -not $gitDir.PSIsContainer -or (Test-IsLink $gitDir)) {
        throw "clone must have its own .git directory: $Path"
    }

    $top = & git -C $Path rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($top)) { throw "not a git checkout: $Path" }
    $resolved = (Resolve-Path -LiteralPath $Path).Path.TrimEnd('\', '/')
    $top = [System.IO.Path]::GetFullPath([string]$top).TrimEnd('\', '/')
    if (-not $resolved.Equals($top, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "clone path is not the repository root: $Path"
    }

    $homePath = [System.IO.Path]::GetFullPath($HOME).TrimEnd('\', '/')
    $root = [System.IO.Path]::GetPathRoot($resolved)
    if ($resolved.Equals($root, [System.StringComparison]::OrdinalIgnoreCase) -or
        $resolved.Equals($homePath, [System.StringComparison]::OrdinalIgnoreCase) -or
        $homePath.StartsWith("$resolved$([System.IO.Path]::DirectorySeparatorChar)", [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "unsafe clone path: $resolved"
    }

    $origin = & git -C $resolved config --get remote.origin.url 2>$null
    if ($LASTEXITCODE -ne 0 -or $script:AllowedRepoUrls -notcontains ([string]$origin).Trim()) {
        throw "$resolved does not use an allowed rafaeelricco/dotfiles origin."
    }

    $worktreeOutput = @(& git -C $resolved worktree list --porcelain)
    if ($LASTEXITCODE -ne 0) { throw "could not inspect worktrees for $resolved" }
    $worktrees = @($worktreeOutput | Where-Object { $_ -like 'worktree *' } | ForEach-Object { $_.Substring(9) })
    if ($worktrees.Count -ne 1 -or -not (Test-SamePath $worktrees[0] $resolved)) {
        throw 'linked worktrees are not supported for the managed clone.'
    }
}

function Test-ValidStateField {
    param([Parameter(Mandatory)][string]$Value)
    if ([string]::IsNullOrEmpty($Value) -or -not [System.IO.Path]::IsPathRooted($Value) -or
        $Value.Contains("`t") -or $Value.Contains("`r") -or $Value.Contains("`n")) {
        throw 'lifecycle state paths must be absolute and cannot contain tabs or newlines.'
    }
}

function Add-LifecycleStateRecord {
    param(
        [Parameter(Mandatory)][ValidateSet('link', 'backup', 'dir')][string]$Type,
        [Parameter(Mandatory)][string]$First,
        [string]$Second
    )
    if (-not $script:StateReady) { return }
    Test-ValidStateField $First
    if ($Second) {
        Test-ValidStateField $Second
        $line = "$Type`t$First`t$Second"
    } else {
        $line = "$Type`t$First"
    }
    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.AddRange([string[]][System.IO.File]::ReadAllLines($script:StateFile))
    if ($lines.Contains($line)) { return }
    $lines.Add($line) | Out-Null
    $temp = "$($script:StateFile).tmp.$PID"
    try {
        [System.IO.File]::WriteAllLines($temp, $lines, [System.Text.UTF8Encoding]::new($false))
        Move-Item -LiteralPath $temp -Destination $script:StateFile -Force
    } finally {
        Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
    }
}

function Assert-LifecycleStateValid {
    $lines = [System.IO.File]::ReadAllLines($script:StateFile)
    if ($lines.Count -eq 0 -or $lines[0] -ne $script:StateHeader) {
        throw "invalid lifecycle state header: $($script:StateFile)"
    }
    for ($index = 1; $index -lt $lines.Count; $index++) {
        if ([string]::IsNullOrEmpty($lines[$index])) { continue }
        $parts = $lines[$index].Split("`t")
        if (($parts[0] -in @('link', 'backup') -and $parts.Count -eq 3) -or
            ($parts[0] -eq 'dir' -and $parts.Count -eq 2)) {
            foreach ($part in $parts[1..($parts.Count - 1)]) { Test-ValidStateField $part }
            continue
        }
        throw "malformed lifecycle state at line $($index + 1): $($script:StateFile)"
    }
}

function Initialize-LifecycleState {
    param([Parameter(Mandatory)][string]$RepoDir)
    $script:StateFile = Join-Path $RepoDir '.git\dotfiles-lifecycle-state'
    $item = Get-Item -LiteralPath $script:StateFile -Force -ErrorAction SilentlyContinue
    if ($null -ne $item) {
        if ($item.PSIsContainer -or (Test-IsLink $item)) { throw "lifecycle state is not a regular file: $($script:StateFile)" }
        Assert-LifecycleStateValid
    } else {
        $temp = "$($script:StateFile).tmp.$PID"
        try {
            [System.IO.File]::WriteAllText($temp, "$($script:StateHeader)`n", [System.Text.UTF8Encoding]::new($false))
            Move-Item -LiteralPath $temp -Destination $script:StateFile
        } finally {
            Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
        }
    }
    $script:StateReady = $true
    foreach ($created in $script:PendingCreatedDirs) { Add-LifecycleStateRecord -Type dir -First $created }
    $script:PendingCreatedDirs.Clear()
}

function New-RecordedDirectory {
    param([Parameter(Mandatory)][string]$Path)
    if (Test-Path -LiteralPath $Path -PathType Container) { return }
    if ($null -ne (Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue)) {
        throw "directory path is obstructed: $Path"
    }
    $missing = [System.Collections.Generic.List[string]]::new()
    $candidate = $Path
    while (-not (Test-Path -LiteralPath $candidate)) {
        $missing.Add($candidate) | Out-Null
        $parent = Split-Path -Parent $candidate
        if ([string]::IsNullOrEmpty($parent) -or $parent -eq $candidate) { break }
        $candidate = $parent
    }
    if (-not (Test-Path -LiteralPath $candidate -PathType Container)) { throw "directory path is obstructed: $candidate" }
    for ($index = $missing.Count - 1; $index -ge 0; $index--) {
        New-Item -ItemType Directory -Path $missing[$index] | Out-Null
        $created = [System.IO.Path]::GetFullPath($missing[$index])
        if (Test-SamePath $created $HOME) { continue }
        if ($script:StateReady) { Add-LifecycleStateRecord -Type dir -First $created }
        else { $script:PendingCreatedDirs.Add($created) | Out-Null }
    }
}

function Ensure-Repo {
    param([Parameter(Mandatory)][string]$Path)
    if (Test-Path -LiteralPath $Path) {
        if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
            throw "$Path exists but is not a directory."
        }
        Assert-ManagedRepository $Path
        Write-Host "Using existing clone: $Path"
        return
    }

    $parent = Split-Path -Parent $Path
    if ($parent -and -not (Test-Path -LiteralPath $parent)) {
        New-RecordedDirectory $parent
    }
    Write-Host "Cloning $($script:RepoUrl) -> $Path"
    & git clone $script:RepoUrl $Path
    if ($LASTEXITCODE -ne 0) { throw 'git clone failed.' }
    Assert-ManagedRepository $Path
}

function Get-ItemIfPresent {
    param([Parameter(Mandatory)][string]$Path)
    Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
}

function Test-IsLink {
    param([System.IO.FileSystemInfo]$Item)
    if ($null -eq $Item) { return $false }
    if ([string]$Item.LinkType -in @('SymbolicLink', 'SymLink', 'Junction')) { return $true }
    ($Item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0
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

function Remove-LinkSafely {
    param([Parameter(Mandatory)][System.IO.FileSystemInfo]$Item)
    if ($Item -is [System.IO.DirectoryInfo]) {
        [System.IO.Directory]::Delete($Item.FullName, $false)
    } else {
        [System.IO.File]::Delete($Item.FullName)
    }
}

function Remove-ConflictItem {
    param([Parameter(Mandatory)][string]$Path)
    $item = Get-ItemIfPresent $Path
    if ($null -eq $item) { return }
    if (Test-IsLink $item) {
        Remove-LinkSafely $item
    } elseif ($item.PSIsContainer) {
        Remove-Item -LiteralPath $Path -Recurse -Force
    } else {
        Remove-Item -LiteralPath $Path -Force
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
    $action = $script:ConflictMode
    if ($action -eq 'Prompt') {
        $answer = Read-Host "Conflict: $Path`n  [b]ackup, [o]verride, [s]kip, or [a]bort"
        switch -Regex ($answer) {
            '^[bB]$' { $action = 'Backup'; break }
            '^[oO]$' { $action = 'Override'; break }
            '^[sS]$' { Write-Host "skipped: $Path"; return $false }
            default { throw "aborted at: $Path" }
        }
    }
    if ($action -eq 'Override') {
        Remove-ConflictItem $Path
        Write-Host "overridden: $Path"
    } else {
        $backup = Get-BackupPath $Path
        Move-Item -LiteralPath $Path -Destination $backup
        Add-LifecycleStateRecord -Type backup -First $Path -Second $backup
        Write-Host "backed up: $Path -> $backup"
    }
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
        New-RecordedDirectory $parent
    }

    $item = Get-ItemIfPresent $LinkPath
    if (Test-IsLink $item) {
        $current = Get-LinkTargetPath $item
        if (Test-SamePath $current $TargetPath) {
            Add-LifecycleStateRecord -Type link -First $LinkPath -Second $TargetPath
            Write-Host "up to date: $LinkPath"
            return
        }
        if (Test-ManagedTarget $current) {
            Remove-LinkSafely $item
        } elseif (-not (Resolve-Conflict $LinkPath)) {
            return
        }
    } elseif ($null -ne $item) {
        if (-not (Resolve-Conflict $LinkPath)) { return }
    }

    New-SymbolicLinkChecked -LinkPath $LinkPath -TargetPath $TargetPath
    Add-LifecycleStateRecord -Type link -First $LinkPath -Second $TargetPath
    Write-Host "linked: $LinkPath -> $TargetPath"
}

function Prepare-SkillDirectory {
    param([string]$Path, [string]$Label)
    $item = Get-ItemIfPresent $Path
    if (Test-IsLink $item) {
        $target = Get-LinkTargetPath $item
        if (Test-ManagedTarget $target) {
            Remove-LinkSafely $item
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
        New-RecordedDirectory $Path
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
        if ($valid.ContainsKey($entry.Name) -or -not (Test-IsLink $entry)) { continue }
        if (Test-ManagedTarget (Get-LinkTargetPath $entry)) {
            Remove-LinkSafely $entry
            Write-Host "pruned stale skill link: $($entry.FullName)"
        }
    }
}

function Clear-ManagedSkillDirectory {
    param([string]$Path)
    $item = Get-ItemIfPresent $Path
    if (Test-IsLink $item) {
        if (Test-ManagedTarget (Get-LinkTargetPath $item)) {
            Remove-LinkSafely $item
            Write-Host "removed legacy managed link: $Path"
        }
        return
    }
    if ($null -eq $item -or -not $item.PSIsContainer) { return }
    foreach ($entry in @(Get-ChildItem -LiteralPath $Path -Force)) {
        if ((Test-IsLink $entry) -and (Test-ManagedTarget (Get-LinkTargetPath $entry))) {
            Remove-LinkSafely $entry
            Write-Host "removed legacy managed link: $($entry.FullName)"
        }
    }
}

function Remove-ManagedLink {
    param([string]$Path)
    $item = Get-ItemIfPresent $Path
    if ((Test-IsLink $item) -and (Test-ManagedTarget (Get-LinkTargetPath $item))) {
        Remove-LinkSafely $item
        Write-Host "removed legacy managed link: $Path"
    }
}

function Clear-LegacyAgents {
    param([string]$ClaudeHome)
    Remove-ManagedLink (Join-Path $ClaudeHome 'agents\advisor.md')
    Remove-ManagedLink (Join-Path $ClaudeHome 'agents\opus-advisor.md')
}

function Test-CliPresent {
    param([Parameter(Mandatory)][string]$Name)
    $null -ne (Get-Command -Name $Name -CommandType Application, ExternalScript -ErrorAction SilentlyContinue)
}

function Assert-CodexSkillDestinationWritable {
    $destination = Join-Path $HOME '.agents\skills'
    $item = Get-ItemIfPresent $destination
    if ($null -ne $item -and $item.PSIsContainer -and -not (Test-IsLink $item)) {
        $probe = $destination
    } else {
        $probe = Split-Path -Parent $destination
        while (-not (Test-Path -LiteralPath $probe -PathType Container)) {
            if ($null -ne (Get-ItemIfPresent $probe)) { break }
            $parent = Split-Path -Parent $probe
            if ([string]::IsNullOrEmpty($parent) -or (Test-SamePath $parent $probe)) { break }
            $probe = $parent
        }
    }

    if (-not (Test-Path -LiteralPath $probe -PathType Container)) {
        throw "Codex skills destination is not writable: $probe. Fix its ownership or permissions, then rerun install.ps1."
    }

    $testFile = Join-Path $probe ".dotfiles-write-test-$([Guid]::NewGuid().ToString('N')).tmp"
    try {
        [System.IO.File]::WriteAllText($testFile, '')
        [System.IO.File]::Delete($testFile)
    } catch {
        Remove-Item -LiteralPath $testFile -Force -ErrorAction SilentlyContinue
        throw "Codex skills destination is not writable: $probe. Fix its ownership or permissions, then rerun install.ps1."
    }
}

function Invoke-DotfilesInstall {
    if ($Yes.IsPresent -and $Override.IsPresent) {
        throw '-Yes and -Override cannot be used together.'
    }
    $requestedRepoDir = Resolve-InstallDir $Dir
    Assert-Git
    Ensure-Repo $requestedRepoDir
    $repoDir = (Resolve-Path -LiteralPath $requestedRepoDir).Path

    $script:GuidanceSrc = Join-Path $repoDir 'INSTRUCTIONS.md'
    $script:SkillsSrc = Join-Path $repoDir 'skill'
    if (-not (Test-Path -LiteralPath $script:GuidanceSrc -PathType Leaf)) { throw "source missing: $($script:GuidanceSrc)" }
    if (-not (Test-Path -LiteralPath $script:SkillsSrc -PathType Container)) { throw "source missing: $($script:SkillsSrc)" }

    $script:ManagedRoots = @()
    foreach ($managedRepo in (@($requestedRepoDir, $repoDir) | Select-Object -Unique)) {
        $script:ManagedRoots += @(
            (Join-Path $managedRepo 'INSTRUCTIONS.md'),
            (Join-Path $managedRepo 'CLAUDE.md'),
            (Join-Path $managedRepo 'skill'),
            (Join-Path $managedRepo '.claude\CLAUDE.md'),
            (Join-Path $managedRepo '.claude\skills'),
            (Join-Path $managedRepo '.claude\agents'),
            (Join-Path $managedRepo '.codex\AGENTS.md')
        )
    }
    $interactive = [Environment]::UserInteractive -and -not [Console]::IsInputRedirected -and -not $Yes.IsPresent -and -not $Override.IsPresent
    $script:ConflictMode = if ($Override.IsPresent) { 'Override' } elseif ($interactive) { 'Prompt' } else { 'Backup' }

    $defaultClaudeHome = Join-Path $HOME '.claude'
    $claudeHome = if ($env:CLAUDE_CONFIG_DIR) { [System.IO.Path]::GetFullPath($env:CLAUDE_CONFIG_DIR) } else { $defaultClaudeHome }
    $defaultCodexHome = Join-Path $HOME '.codex'
    $codexHome = if ($env:CODEX_HOME) { [System.IO.Path]::GetFullPath($env:CODEX_HOME) } else { $defaultCodexHome }
    $installClaude = -not $SkipClaude.IsPresent -and (Test-CliPresent 'claude')
    $installCodex = -not $SkipCodex.IsPresent -and (Test-CliPresent 'codex')
    if ($installClaude -or $installCodex) {
        Test-SymlinkCapability
    }
    if ($installCodex) {
        Assert-CodexSkillDestinationWritable
    }
    Initialize-LifecycleState $repoDir

    if ($SkipClaude.IsPresent) {
        Write-Host 'Claude Code: skipped (-SkipClaude).'
    } elseif ($installClaude) {
        Write-Host '== Claude Code =='
        if (-not (Test-SamePath $claudeHome $defaultClaudeHome)) {
            Remove-ManagedLink (Join-Path $defaultClaudeHome 'CLAUDE.md')
            Clear-ManagedSkillDirectory (Join-Path $defaultClaudeHome 'skills')
            Clear-LegacyAgents $defaultClaudeHome
        }
        Clear-LegacyAgents $claudeHome
        Install-Link -LinkPath (Join-Path $claudeHome 'CLAUDE.md') -TargetPath $script:GuidanceSrc
        Sync-SkillSet -Destination (Join-Path $claudeHome 'skills') -Label 'Claude'
    } else {
        Write-Host 'Claude Code: not detected on PATH; skipping.'
    }

    if ($SkipCodex.IsPresent) {
        Write-Host 'Codex: skipped (-SkipCodex).'
    } elseif ($installCodex) {
        Write-Host '== Codex =='
        if (-not (Test-SamePath $codexHome $defaultCodexHome)) {
            Remove-ManagedLink (Join-Path $defaultCodexHome 'AGENTS.md')
            Clear-ManagedSkillDirectory (Join-Path $defaultCodexHome 'skills')
        }
        Clear-ManagedSkillDirectory (Join-Path $codexHome 'skills')
        Install-Link -LinkPath (Join-Path $codexHome 'AGENTS.md') -TargetPath $script:GuidanceSrc
        Sync-SkillSet -Destination (Join-Path $HOME '.agents\skills') -Label 'Codex'
    } else {
        Write-Host 'Codex: not detected on PATH; skipping.'
    }

    Write-Host "Dotfiles setup completed from $repoDir"
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
