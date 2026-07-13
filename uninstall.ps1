#Requires -Version 7.0
[CmdletBinding()]
param(
    [switch]$Local,
    [string]$Dir,
    [switch]$Yes,
    [Alias('h')][switch]$Help
)

$ErrorActionPreference = 'Stop'
$StateHeader = 'dotfiles-lifecycle-state-v1'
$LocalStateHeader = 'dotfiles-local-lifecycle-state-v1'
$AllowedRepoUrls = @(
    'https://github.com/rafaeelricco/dotfiles',
    'https://github.com/rafaeelricco/dotfiles.git',
    'git@github.com:rafaeelricco/dotfiles',
    'git@github.com:rafaeelricco/dotfiles.git',
    'ssh://git@github.com/rafaeelricco/dotfiles',
    'ssh://git@github.com/rafaeelricco/dotfiles.git'
)

function Show-Usage {
    @'
Usage: uninstall.ps1 [-Local] [-Dir PATH] [-Yes] [-Help]

  -Yes       Bypass the required UNINSTALL confirmation.
  -Local     Remove local-mode links and state; preserve checkout.
  -Dir PATH  Override DOTFILES_DIR / $HOME\.dotfiles.
  -Help      Show this help.
'@ | Write-Host
}

function Resolve-InstallDir {
    param([string]$DirParam)
    $value = if ($DirParam) { $DirParam } elseif ($env:DOTFILES_DIR) { $env:DOTFILES_DIR } else { Join-Path $HOME '.dotfiles' }
    [System.IO.Path]::GetFullPath($value)
}

function Get-LocalStateFile {
    $base = if ($IsWindows -and $env:LOCALAPPDATA) { $env:LOCALAPPDATA } elseif ($env:XDG_STATE_HOME) { $env:XDG_STATE_HOME } else { Join-Path $HOME '.local/state' }
    Join-Path (Join-Path $base 'dotfiles') 'local-install-state'
}

function Resolve-LocalRepository {
    if ([string]::IsNullOrWhiteSpace($PSScriptRoot)) { throw '-Local requires running the checked-out uninstall.ps1.' }
    $repo = [System.IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\', '/')
    $gitDir = Get-ItemIfPresent (Join-Path $repo '.git')
    if ($null -eq $gitDir -or -not $gitDir.PSIsContainer -or (Test-IsLink $gitDir)) {
        throw '-Local must run from the primary checkout.'
    }
    $repo
}

function Assert-NoLocalInstall {
    if ($null -ne (Get-ItemIfPresent (Get-LocalStateFile))) { throw 'a local installation is active; run uninstall.ps1 -Local.' }
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
    [System.IO.Path]::GetFullPath($target).TrimEnd('\', '/')
}

function Test-SamePath {
    param([string]$Left, [string]$Right)
    if (-not $Left -or -not $Right) { return $false }
    $a = [System.IO.Path]::GetFullPath($Left).TrimEnd('\', '/')
    $b = [System.IO.Path]::GetFullPath($Right).TrimEnd('\', '/')
    $a.Equals($b, [System.StringComparison]::OrdinalIgnoreCase)
}

function Test-PathInside {
    param([string]$Path, [string]$Parent)
    $child = [System.IO.Path]::GetFullPath($Path).TrimEnd('\', '/')
    $root = [System.IO.Path]::GetFullPath($Parent).TrimEnd('\', '/')
    $child.StartsWith("$root$([System.IO.Path]::DirectorySeparatorChar)", [System.StringComparison]::OrdinalIgnoreCase)
}

function Assert-ManagedRepository {
    param([Parameter(Mandatory)][string]$Path)
    $item = Get-ItemIfPresent $Path
    if ($null -eq $item -or -not $item.PSIsContainer -or (Test-IsLink $item)) { throw "clone path must be a real directory: $Path" }
    $gitDir = Get-ItemIfPresent (Join-Path $Path '.git')
    if ($null -eq $gitDir -or -not $gitDir.PSIsContainer -or (Test-IsLink $gitDir)) { throw "clone must have its own .git directory: $Path" }

    $top = & git -C $Path rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($top) -or -not (Test-SamePath $top $Path)) {
        throw "clone path is not the repository root: $Path"
    }
    $resolved = (Resolve-Path -LiteralPath $Path).Path.TrimEnd('\', '/')
    $homePath = [System.IO.Path]::GetFullPath($HOME).TrimEnd('\', '/')
    $root = [System.IO.Path]::GetPathRoot($resolved)
    if ((Test-SamePath $resolved $root) -or (Test-SamePath $resolved $homePath) -or (Test-PathInside $homePath $resolved)) {
        throw "unsafe clone path: $resolved"
    }
    $origin = & git -C $resolved config --get remote.origin.url 2>$null
    if ($LASTEXITCODE -ne 0 -or $AllowedRepoUrls -notcontains ([string]$origin).Trim()) {
        throw "$resolved does not use an allowed rafaeelricco/dotfiles origin."
    }
    $worktreeOutput = @(& git -C $resolved worktree list --porcelain)
    if ($LASTEXITCODE -ne 0) { throw "could not inspect worktrees for $resolved" }
    $worktrees = @($worktreeOutput | Where-Object { $_ -like 'worktree *' } | ForEach-Object { $_.Substring(9) })
    if ($worktrees.Count -ne 1 -or -not (Test-SamePath $worktrees[0] $resolved)) {
        throw 'linked worktrees are not supported for the managed clone.'
    }
}

function Assert-StateField {
    param([string]$Value)
    if ([string]::IsNullOrEmpty($Value) -or -not [System.IO.Path]::IsPathRooted($Value) -or
        $Value.Contains("`t") -or $Value.Contains("`r") -or $Value.Contains("`n")) {
        throw 'lifecycle state contains an invalid path.'
    }
}

function Read-LifecycleState {
    param([string]$RepoDir, [switch]$LocalState)
    $state = [pscustomobject]@{
        Source = ''
        Links = [System.Collections.Generic.List[object]]::new()
        Backups = [System.Collections.Generic.List[object]]::new()
        Directories = [System.Collections.Generic.List[string]]::new()
    }
    $path = if ($LocalState.IsPresent) { Get-LocalStateFile } else { Join-Path $RepoDir '.git\dotfiles-lifecycle-state' }
    $expectedHeader = if ($LocalState.IsPresent) { $LocalStateHeader } else { $StateHeader }
    $item = Get-ItemIfPresent $path
    if ($null -eq $item) { return $state }
    if ($item.PSIsContainer -or (Test-IsLink $item)) { throw "lifecycle state is not a regular file: $path" }
    $lines = [System.IO.File]::ReadAllLines($path)
    if ($lines.Count -eq 0 -or $lines[0] -ne $expectedHeader) { throw "invalid lifecycle state header: $path" }
    $sourceCount = 0
    for ($index = 1; $index -lt $lines.Count; $index++) {
        if ([string]::IsNullOrEmpty($lines[$index])) { continue }
        $parts = $lines[$index].Split("`t")
        switch ($parts[0]) {
            'source' {
                if (-not $LocalState.IsPresent -or $parts.Count -ne 2) { throw "malformed lifecycle state at line $($index + 1)" }
                Assert-StateField $parts[1]
                $state.Source = $parts[1]
                $sourceCount++
            }
            'link' {
                if ($parts.Count -ne 3) { throw "malformed lifecycle state at line $($index + 1)" }
                Assert-StateField $parts[1]; Assert-StateField $parts[2]
                $state.Links.Add([pscustomobject]@{ Destination = $parts[1]; Target = $parts[2] }) | Out-Null
            }
            'backup' {
                if ($parts.Count -ne 3) { throw "malformed lifecycle state at line $($index + 1)" }
                Assert-StateField $parts[1]; Assert-StateField $parts[2]
                $state.Backups.Add([pscustomobject]@{ Original = $parts[1]; Path = $parts[2] }) | Out-Null
            }
            'dir' {
                if ($parts.Count -ne 2) { throw "malformed lifecycle state at line $($index + 1)" }
                Assert-StateField $parts[1]
                $state.Directories.Add($parts[1]) | Out-Null
            }
            default { throw "unknown lifecycle state record at line $($index + 1)" }
        }
    }
    if ($LocalState.IsPresent -and $sourceCount -ne 1) { throw 'local lifecycle state must contain exactly one source.' }
    $state
}

function Add-SkillCandidates {
    param([string]$Path, [System.Collections.Generic.HashSet[string]]$Candidates, [System.Collections.Generic.HashSet[string]]$Known)
    $item = Get-ItemIfPresent $Path
    if (Test-IsLink $item) { $Candidates.Add($Path) | Out-Null; $Known.Add($Path) | Out-Null; return }
    if ($null -eq $item -or -not $item.PSIsContainer) { return }
    foreach ($entry in @(Get-ChildItem -LiteralPath $Path -Force)) {
        if (Test-IsLink $entry) { $Candidates.Add($entry.FullName) | Out-Null; $Known.Add($entry.FullName) | Out-Null }
    }
}

function Get-Candidates {
    param([object]$State)
    $candidates = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    $known = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($link in $State.Links) { $candidates.Add($link.Destination) | Out-Null }
    foreach ($backup in $State.Backups) { $candidates.Add($backup.Original) | Out-Null }
    $defaultClaude = Join-Path $HOME '.claude'
    $claudeHome = if ($env:CLAUDE_CONFIG_DIR) { [System.IO.Path]::GetFullPath($env:CLAUDE_CONFIG_DIR) } else { $defaultClaude }
    $defaultCodex = Join-Path $HOME '.codex'
    $codexHome = if ($env:CODEX_HOME) { [System.IO.Path]::GetFullPath($env:CODEX_HOME) } else { $defaultCodex }
    foreach ($path in @(
        (Join-Path $defaultClaude 'CLAUDE.md'), (Join-Path $claudeHome 'CLAUDE.md'),
        (Join-Path $defaultCodex 'AGENTS.md'), (Join-Path $codexHome 'AGENTS.md'),
        (Join-Path $defaultClaude 'agents\advisor.md'), (Join-Path $defaultClaude 'agents\opus-advisor.md'),
        (Join-Path $claudeHome 'agents\advisor.md'), (Join-Path $claudeHome 'agents\opus-advisor.md')
    )) { $candidates.Add($path) | Out-Null; $known.Add($path) | Out-Null }
    Add-SkillCandidates (Join-Path $defaultClaude 'skills') $candidates $known
    Add-SkillCandidates (Join-Path $claudeHome 'skills') $candidates $known
    Add-SkillCandidates (Join-Path $defaultCodex 'skills') $candidates $known
    Add-SkillCandidates (Join-Path $codexHome 'skills') $candidates $known
    Add-SkillCandidates (Join-Path $HOME '.agents\skills') $candidates $known
    [pscustomobject]@{ All = $candidates; Known = $known }
}

function Test-RecordedPair {
    param([object]$State, [string]$Destination, [string]$Target)
    foreach ($link in $State.Links) {
        if ((Test-SamePath $link.Destination $Destination) -and (Test-SamePath $link.Target $Target)) { return $true }
    }
    $false
}

function Test-AllowedSourceShape {
    param([string]$RepoDir, [string]$Destination, [string]$Target)
    $name = Split-Path -Leaf $Destination
    $guidanceTargets = @(
        (Join-Path $RepoDir 'INSTRUCTIONS.md'), (Join-Path $RepoDir 'CLAUDE.md'),
        (Join-Path $RepoDir '.claude\CLAUDE.md'), (Join-Path $RepoDir '.codex\AGENTS.md')
    )
    if ($name -in @('CLAUDE.md', 'AGENTS.md')) {
        return $null -ne ($guidanceTargets | Where-Object { Test-SamePath $_ $Target } | Select-Object -First 1)
    }
    if ($name -in @('advisor.md', 'opus-advisor.md')) {
        return Test-SamePath $Target (Join-Path $RepoDir ".claude\agents\$name")
    }
    if ($name -eq 'skills') {
        return (Test-SamePath $Target (Join-Path $RepoDir 'skill')) -or (Test-SamePath $Target (Join-Path $RepoDir '.claude\skills'))
    }
    (Test-SamePath $Target (Join-Path $RepoDir "skill\$name")) -or
        (Test-SamePath $Target (Join-Path $RepoDir ".claude\skills\$name"))
}

function Get-ManagedLinks {
    param([string]$RepoDir, [object]$State, [object]$Candidates)
    $managed = [System.Collections.Generic.List[System.IO.FileSystemInfo]]::new()
    foreach ($path in $Candidates.All) {
        $item = Get-ItemIfPresent $path
        if (Test-IsLink $item) {
            $target = Get-LinkTargetPath $item
            if ((Test-AllowedSourceShape $RepoDir $path $target) -and
                ((Test-RecordedPair $State $path $target) -or $Candidates.Known.Contains($path))) {
                $managed.Add($item) | Out-Null
            } else {
                Write-Host "preserved unmanaged link: $path -> $target"
            }
        } elseif ($null -ne $item -and $null -ne ($State.Links | Where-Object { Test-SamePath $_.Destination $path } | Select-Object -First 1)) {
            Write-Host "preserved unmanaged path: $path"
        }
    }
    $managed
}

function Assert-StateCleanupSafe {
    param([string]$RepoDir, [object]$State, [object]$Candidates)
    foreach ($backup in $State.Backups) {
        if (-not $Candidates.All.Contains($backup.Original)) { throw "backup record has an unknown destination: $($backup.Original)" }
        $pattern = '^' + [regex]::Escape($backup.Original) + '\.backup-\d{14}(?:-\d+)?$'
        if ($backup.Path -notmatch $pattern) { throw "invalid backup record: $($backup.Path)" }
    }
    $homePath = [System.IO.Path]::GetFullPath($HOME)
    foreach ($directory in $State.Directories) {
        $root = [System.IO.Path]::GetPathRoot($directory)
        if ((Test-SamePath $directory $root) -or (Test-SamePath $directory $homePath) -or
            (Test-SamePath $directory $RepoDir) -or (Test-PathInside $homePath $directory)) {
            throw "unsafe directory record: $directory"
        }
        $related = Test-PathInside $RepoDir $directory
        if (-not $related) {
            foreach ($candidate in $Candidates.All) {
                if (Test-PathInside $candidate $directory) { $related = $true; break }
            }
        }
        if (-not $related) { throw "unrelated directory record: $directory" }
    }
}

function Remove-LinkSafely {
    param([Parameter(Mandatory)][System.IO.FileSystemInfo]$Item)
    if ($Item -is [System.IO.DirectoryInfo]) { [System.IO.Directory]::Delete($Item.FullName, $false) }
    else { [System.IO.File]::Delete($Item.FullName) }
}

function Remove-TreeWithoutFollowingLinks {
    param([Parameter(Mandatory)][string]$Path)
    foreach ($child in @(Get-ChildItem -LiteralPath $Path -Force)) {
        if (Test-IsLink $child) { Remove-LinkSafely $child }
        elseif ($child.PSIsContainer) { Remove-TreeWithoutFollowingLinks $child.FullName }
        else { Remove-Item -LiteralPath $child.FullName -Force }
    }
    [System.IO.Directory]::Delete($Path, $false)
}

function Remove-RecordedBackups {
    param([object]$State)
    foreach ($backup in $State.Backups) {
        $item = Get-ItemIfPresent $backup.Path
        if ($null -eq $item) { continue }
        if (Test-IsLink $item) { Remove-LinkSafely $item }
        elseif ($item.PSIsContainer) { Remove-TreeWithoutFollowingLinks $item.FullName }
        else { Remove-Item -LiteralPath $item.FullName -Force }
        Write-Host "removed recorded backup: $($backup.Path)"
    }
}

function Remove-EmptyRecordedDirectories {
    param([object]$State)
    for ($pass = 0; $pass -lt $State.Directories.Count; $pass++) {
        foreach ($path in $State.Directories) {
            $item = Get-ItemIfPresent $path
            if ($null -eq $item -or (Test-IsLink $item) -or -not $item.PSIsContainer) { continue }
            if (@(Get-ChildItem -LiteralPath $path -Force).Count -eq 0) {
                [System.IO.Directory]::Delete($path, $false)
                Write-Host "removed empty recorded directory: $path"
            }
        }
    }
}

function Confirm-Uninstall {
    param([string]$RepoDir, [object]$State)
    if ($Local.IsPresent) {
        Write-Host 'This will permanently remove local-mode links and recorded backups.'
        Write-Host "Checkout will be preserved: $RepoDir"
    } else {
        Write-Host 'This will permanently remove managed links, recorded backups, and clone:'
        Write-Host "  $RepoDir"
    }
    if ($State.Backups.Count -gt 0) {
        Write-Host 'Recorded backups to delete:'
        foreach ($backup in $State.Backups) { Write-Host "  $($backup.Path)" }
    }
    if ($Yes.IsPresent) { return }
    if (-not [Environment]::UserInteractive -or [Console]::IsInputRedirected) {
        [Console]::Error.WriteLine('error: noninteractive uninstall requires -Yes')
        exit 2
    }
    if ((Read-Host 'Type UNINSTALL to continue') -cne 'UNINSTALL') {
        Write-Host 'Uninstall cancelled; no changes were made.'
        exit 0
    }
}

function Invoke-DotfilesUninstall {
    if ($Help.IsPresent) { Show-Usage; return }
    if ($Local.IsPresent -and $Dir) { throw '-Local and -Dir cannot be combined.' }
    if ($Local.IsPresent) {
        $repoDir = Resolve-LocalRepository
        $statePath = Get-LocalStateFile
        if ($null -eq (Get-ItemIfPresent $statePath)) { Write-Host 'Local dotfiles are already uninstalled.'; return }
        $state = Read-LifecycleState -RepoDir $repoDir -LocalState
        if (-not (Test-SamePath $state.Source $repoDir)) { throw "local installation belongs to another checkout: $($state.Source)" }
        $candidates = Get-Candidates $state
        $managedLinks = Get-ManagedLinks $repoDir $state $candidates
        Assert-StateCleanupSafe $repoDir $state $candidates
        Confirm-Uninstall $repoDir $state
        foreach ($link in $managedLinks) { Remove-LinkSafely $link; Write-Host "removed managed link: $($link.FullName)" }
        Remove-RecordedBackups $state
        Remove-EmptyRecordedDirectories $state
        Remove-Item -LiteralPath $statePath -Force
        $stateDir = Split-Path -Parent $statePath
        if (@(Get-ChildItem -LiteralPath $stateDir -Force).Count -eq 0) { Remove-Item -LiteralPath $stateDir -Force }
        Write-Host 'Local dotfiles links uninstalled; checkout preserved.'
        return
    }

    Assert-NoLocalInstall
    $repoDir = Resolve-InstallDir $Dir
    $item = Get-ItemIfPresent $repoDir
    if ($null -eq $item) { Write-Host 'Dotfiles are already uninstalled.'; return }
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'git was not found on PATH.' }
    Assert-ManagedRepository $repoDir
    $repoDir = (Resolve-Path -LiteralPath $repoDir).Path
    $state = Read-LifecycleState $repoDir
    $candidates = Get-Candidates $state
    $managedLinks = Get-ManagedLinks $repoDir $state $candidates
    Assert-StateCleanupSafe $repoDir $state $candidates
    Confirm-Uninstall $repoDir $state

    foreach ($link in $managedLinks) { Remove-LinkSafely $link; Write-Host "removed managed link: $($link.FullName)" }
    Remove-RecordedBackups $state
    Remove-EmptyRecordedDirectories $state
    Assert-ManagedRepository $repoDir

    $current = (Get-Location).Path
    if ((Test-SamePath $current $repoDir) -or (Test-PathInside $current $repoDir)) {
        Set-Location ([System.IO.Path]::GetPathRoot($repoDir))
    }
    Remove-TreeWithoutFollowingLinks $repoDir
    Write-Host "removed clone: $repoDir"
    Remove-EmptyRecordedDirectories $state
    Write-Host 'Dotfiles uninstalled.'
}

try {
    Invoke-DotfilesUninstall
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
