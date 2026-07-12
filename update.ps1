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
$AllowedRepoUrls = @(
    'https://github.com/rafaeelricco/dotfiles',
    'https://github.com/rafaeelricco/dotfiles.git',
    'git@github.com:rafaeelricco/dotfiles',
    'git@github.com:rafaeelricco/dotfiles.git',
    'ssh://git@github.com/rafaeelricco/dotfiles',
    'ssh://git@github.com/rafaeelricco/dotfiles.git'
)

function Resolve-InstallDir {
    param([string]$DirParam)
    $value = if ($DirParam) { $DirParam } elseif ($env:DOTFILES_DIR) { $env:DOTFILES_DIR } else { Join-Path $HOME '.dotfiles' }
    [System.IO.Path]::GetFullPath($value)
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

function Test-SamePath {
    param([string]$Left, [string]$Right)
    if (-not $Left -or -not $Right) { return $false }
    $a = [System.IO.Path]::GetFullPath($Left).TrimEnd('\', '/')
    $b = [System.IO.Path]::GetFullPath($Right).TrimEnd('\', '/')
    $a.Equals($b, [System.StringComparison]::OrdinalIgnoreCase)
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
    if ((Test-SamePath $resolved $root) -or (Test-SamePath $resolved $homePath) -or
        $homePath.StartsWith("$resolved$([System.IO.Path]::DirectorySeparatorChar)", [System.StringComparison]::OrdinalIgnoreCase)) {
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

function Invoke-GitChecked {
    param(
        [Parameter(Mandatory)][string]$RepoDir,
        [Parameter(Mandatory)][string]$Failure,
        [Parameter(Mandatory)][string[]]$Arguments
    )
    & git -C $RepoDir @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Failure; checkout was not relinked." }
}

function Assert-RemoteTreeEntry {
    param([string]$RepoDir, [string]$Entry)
    Invoke-GitChecked -RepoDir $RepoDir -Failure "origin/main is missing $Entry" -Arguments @(
        'cat-file', '-e', "refs/remotes/origin/main:$Entry"
    )
}

try {
    if ($Yes.IsPresent -and $Override.IsPresent) {
        throw '-Yes and -Override cannot be used together.'
    }
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'git was not found on PATH.' }
    $repoDir = Resolve-InstallDir $Dir
    if (-not (Test-Path -LiteralPath $repoDir -PathType Container)) { throw "clone not found: $repoDir" }

    Assert-ManagedRepository $repoDir

    $env:GIT_TERMINAL_PROMPT = '0'
    Write-Host "Updating $repoDir"
    Invoke-GitChecked -RepoDir $repoDir -Failure 'fetch origin/main failed' -Arguments @(
        'fetch', '--force', '--prune', 'origin', '+refs/heads/main:refs/remotes/origin/main'
    )
    Assert-RemoteTreeEntry $repoDir 'INSTRUCTIONS.md'
    Assert-RemoteTreeEntry $repoDir 'skill'
    Assert-RemoteTreeEntry $repoDir 'install.ps1'
    Invoke-GitChecked -RepoDir $repoDir -Failure 'could not switch local main to origin/main' -Arguments @(
        'checkout', '--force', '-B', 'main', 'refs/remotes/origin/main'
    )
    Invoke-GitChecked -RepoDir $repoDir -Failure 'reset to origin/main failed' -Arguments @(
        'reset', '--hard', 'refs/remotes/origin/main'
    )
    Invoke-GitChecked -RepoDir $repoDir -Failure 'pristine cleanup failed' -Arguments @('clean', '-ffdx')

    $branch = & git -C $repoDir symbolic-ref --short HEAD
    $head = & git -C $repoDir rev-parse HEAD
    $remoteHead = & git -C $repoDir rev-parse refs/remotes/origin/main
    $status = @(& git -C $repoDir status --porcelain=v1 --untracked-files=all --ignored)
    if ($branch -ne 'main' -or $head -ne $remoteHead -or $status.Count -ne 0) {
        throw 'update did not produce a pristine local main matching origin/main.'
    }

    $installer = Join-Path $repoDir 'install.ps1'
    if (-not (Test-Path -LiteralPath $installer -PathType Leaf)) {
        throw "installer missing after update: $installer"
    }

    $arguments = @{ Dir = $repoDir }
    if ($Yes.IsPresent) { $arguments['Yes'] = $true }
    if ($Override.IsPresent) { $arguments['Override'] = $true }
    if ($SkipClaude.IsPresent) { $arguments['SkipClaude'] = $true }
    if ($SkipCodex.IsPresent) { $arguments['SkipCodex'] = $true }
    & $installer @arguments
    if ($LASTEXITCODE -ne 0) { throw "install.ps1 failed with exit code $LASTEXITCODE." }
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
