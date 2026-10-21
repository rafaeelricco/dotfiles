#Requires -Version 7.0
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$DotfilesArguments)

$ErrorActionPreference = 'Stop'
$script:Release = '__DOTFILES_RELEASE__'
$script:ReleaseSkills = '__DOTFILES_SKILLS__'

function Get-RemoteDotfilesHome {
    if ($env:DOTFILES_HOME) {
        if (-not [IO.Path]::IsPathRooted($env:DOTFILES_HOME) -or $env:DOTFILES_HOME -match "[`t`r`n]") { throw 'DOTFILES_HOME must be an absolute path without tabs or newlines.' }
        return [IO.Path]::GetFullPath($env:DOTFILES_HOME).TrimEnd('\', '/')
    }
    if ($env:XDG_DATA_HOME) {
        if (-not [IO.Path]::IsPathRooted($env:XDG_DATA_HOME)) { throw 'XDG_DATA_HOME must be an absolute path.' }
        return [IO.Path]::GetFullPath((Join-Path $env:XDG_DATA_HOME 'dotfiles')).TrimEnd('\', '/')
    }
    [IO.Path]::GetFullPath((Join-Path $HOME '.local/share/dotfiles')).TrimEnd('\', '/')
}

function Show-RemoteDotfilesHelp {
    $skills = @()
    $inventorySentinel = '__DOTFILES_' + 'SKILLS__'
    if ($script:ReleaseSkills -and $script:ReleaseSkills -cne $inventorySentinel) {
        $skills = @($script:ReleaseSkills -split '\s+' | Where-Object { $_ })
    } elseif (-not [string]::IsNullOrWhiteSpace($PSScriptRoot)) {
        $local = Join-Path $PSScriptRoot '../skill'
        if (Test-Path -LiteralPath $local -PathType Container) {
            $skills = @(Get-ChildItem -LiteralPath $local -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'SKILL.md') } | ForEach-Object Name | Sort-Object)
        }
    }
    @"
Usage: install.ps1 [skill ...] [options]
       install.ps1 uninstall [options]

No skill names, or 'all', installs the full setup. Named skills include their
dependencies and leave instructions and terminal configuration untouched.
Available skills: $($skills -join ' ')

Options: -DryRun / --dry-run, -Help / -h / --help,
         -SkipClaude / --skip-claude, -SkipCodex / --skip-codex,
         -SkipGrok / --skip-grok, -SkipCursor / --skip-cursor,
         -SkipHermes / --skip-hermes, -SkipTerminal / --skip-terminal

The verified bundle cache defaults to $((Get-RemoteDotfilesHome)). DOTFILES_HOME overrides it.
"@ | Write-Host
}

function Get-RemoteDotfilesSkills {
    $inventorySentinel = '__DOTFILES_' + 'SKILLS__'
    if ($script:ReleaseSkills -and $script:ReleaseSkills -cne $inventorySentinel) {
        return @($script:ReleaseSkills -split '\s+' | Where-Object { $_ })
    }
    if ([string]::IsNullOrWhiteSpace($PSScriptRoot)) { return @() }
    $local = Join-Path $PSScriptRoot '../skill'
    if (-not (Test-Path -LiteralPath $local -PathType Container)) { return @() }
    @(Get-ChildItem -LiteralPath $local -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'SKILL.md') } | ForEach-Object Name)
}

function Assert-RemoteDotfilesArguments {
    param([string[]]$Arguments)
    $list = @($Arguments | Where-Object { $null -ne $_ })
    $uninstall = $list.Count -gt 0 -and $list[0] -ieq 'uninstall'
    $skills = [Collections.Generic.List[string]]::new()
    $inventory = @(Get-RemoteDotfilesSkills)
    foreach ($argument in $list) {
        $lower = $argument.ToLowerInvariant()
        if ($lower -in @('-help', '-h', '--help', '-dryrun', '--dry-run', '-skipclaude', '--skip-claude',
                '-skipcodex', '--skip-codex', '-skipgrok', '--skip-grok', '-skipcursor', '--skip-cursor',
                '-skiphermes', '--skip-hermes', '-skipterminal', '--skip-terminal')) { continue }
        if ($lower -match '^(-yes|-y|--yes|-override|--override|-local|--local|-dir(?:$|:|=)|--dir(?:$|=)|-skills|--skills)$') {
            throw "removed option '$argument'. Skill names are positional; run install.ps1 -Help for usage."
        }
        if ($argument.StartsWith('-') -or $argument.StartsWith('/')) { throw "unknown option '$argument'. Run install.ps1 -Help for usage." }
        if ($uninstall -and $argument -ieq 'uninstall') { continue }
        if ($uninstall) { throw 'uninstall does not accept skill names.' }
        if ($argument -ieq 'all') { $skills.Add('all') | Out-Null; continue }
        if ($argument -notmatch '\A[A-Za-z0-9._-]+\z' -or $inventory.Count -gt 0 -and $inventory -notcontains $argument) {
            throw "unknown skill '$argument'. Run install.ps1 -Help to list available skills."
        }
        $skills.Add($argument) | Out-Null
    }
    if ($skills -contains 'all' -and $skills.Count -gt 1) { throw "'all' cannot be combined with skill names." }
    $list
}

function Get-RemoteDotfilesRelease {
    $base = if ($env:DOTFILES_BASE_URL) { $env:DOTFILES_BASE_URL.TrimEnd('/') } else { 'https://r1cco.com/dotfiles' }
    if ($env:DOTFILES_VERSION) { $version = $env:DOTFILES_VERSION.Trim() }
    elseif ($script:Release -cmatch '\A[0-9a-f]{40}\z') { $version = $script:Release }
    else {
        $versionFile = Join-Path ([IO.Path]::GetTempPath()) ("dotfiles-version-$([guid]::NewGuid().ToString('N'))")
        try {
            Invoke-WebRequest -Uri "$base/VERSION" -OutFile $versionFile
            $version = [IO.File]::ReadAllText($versionFile).Trim()
        } finally { Remove-Item -LiteralPath $versionFile -Force -ErrorAction SilentlyContinue }
    }
    if ($version -cnotmatch '\A[0-9a-f]{40}\z') { throw "DOTFILES_VERSION or the release VERSION must be a 40-character lower-case commit SHA (got: $version)." }
    [pscustomobject]@{ Base = $base; Version = $version }
}

function Expand-RemoteDotfilesZip {
    param([Parameter(Mandatory)][string]$Archive, [Parameter(Mandatory)][string]$Destination)
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [IO.Compression.ZipFile]::OpenRead($Archive)
    try {
        $seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
        foreach ($entry in $zip.Entries) {
            $name = $entry.FullName
            if (-not $name.StartsWith('dotfiles/', [StringComparison]::Ordinal) -or $name.Contains('\') -or $name.StartsWith('/')) { throw "unsafe release archive path: $name" }
            $parts = $name.TrimEnd('/').Split('/')
            foreach ($part in $parts) {
                if (-not $part -or $part -in @('.', '..') -or $part -match '[\x00-\x1f<>:"|?*]' -or $part -match '[. ]$' -or $part -match '^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)') {
                    throw "unsafe release archive path: $name"
                }
            }
            if ($parts.Count -gt 1 -and $parts[1] -eq '.git') { throw 'release archive must not contain .git.' }
            if (-not $seen.Add($name.TrimEnd('/'))) { throw "duplicate release archive path: $name" }
            $mode = ($entry.ExternalAttributes -shr 16) -band 0xF000
            if (($mode -ne 0 -and $mode -notin @(0x8000, 0x4000)) -or ($entry.ExternalAttributes -band [int][IO.FileAttributes]::ReparsePoint)) {
                throw "release archive contains a link or special file: $name"
            }
        }
    } finally { $zip.Dispose() }
    [IO.Compression.ZipFile]::ExtractToDirectory($Archive, $Destination)
}

function Invoke-RemoteDotfiles {
    param([string[]]$Arguments = @())
    $argumentsList = @(Assert-RemoteDotfilesArguments $Arguments)
    if ($argumentsList | Where-Object { $_ -in @('-Help', '-h', '--help') }) { Show-RemoteDotfilesHelp; return }
    $uninstall = ($argumentsList.Count -gt 0 -and $argumentsList[0] -ieq 'uninstall')
    $forward = @(if ($uninstall) { $argumentsList | Select-Object -Skip 1 } else { $argumentsList })
    $bundleHome = Get-RemoteDotfilesHome
    $parent = Split-Path -Parent $bundleHome
    if ([string]::IsNullOrWhiteSpace($parent)) { throw "invalid DOTFILES_HOME path: $bundleHome" }
    $createdParent = -not (Test-Path -LiteralPath $parent -PathType Container)
    if ($createdParent) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    $stage = Join-Path $parent ('.dotfiles-stage-' + [guid]::NewGuid().ToString('N'))
    $oldStage = $env:DOTFILES_REMOTE_STAGE
    $oldTarget = $env:DOTFILES_TARGET_ROOT
    try {
        New-Item -ItemType Directory -Path $stage | Out-Null
        $release = Get-RemoteDotfilesRelease
        $releaseRoot = "$($release.Base)/releases/$($release.Version)"
        $asset = "dotfiles-$($release.Version).zip"
        $archive = Join-Path $stage $asset
        $sums = Join-Path $stage 'SHA256SUMS'
        Invoke-WebRequest -Uri "$releaseRoot/$asset" -OutFile $archive
        Invoke-WebRequest -Uri "$releaseRoot/SHA256SUMS" -OutFile $sums
        $pattern = '\A([0-9a-fA-F]{64}) [ *]' + [regex]::Escape($asset) + '\z'
        $expected = @([IO.File]::ReadAllLines($sums) | ForEach-Object { if ($_ -cmatch $pattern) { $Matches[1] } })
        if ($expected.Count -ne 1) { throw "SHA256SUMS must contain exactly one checksum for $asset." }
        $actual = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash
        if ($actual -ine $expected[0]) { throw "checksum mismatch for $asset." }
        Expand-RemoteDotfilesZip -Archive $archive -Destination $stage
        $package = Join-Path $stage 'dotfiles'
        $bundleVersion = Join-Path $package 'VERSION'
        if (-not (Test-Path -LiteralPath $bundleVersion -PathType Leaf) -or [IO.File]::ReadAllText($bundleVersion).Trim() -cne $release.Version) {
            throw "release bundle VERSION does not match $($release.Version)."
        }
        foreach ($required in @('install.ps1', 'update.ps1', 'uninstall.ps1', 'INSTRUCTIONS.md', 'skill', 'scripts/remote.ps1', 'scripts/lib/lifecycle.ps1')) {
            if (-not (Test-Path -LiteralPath (Join-Path $package $required))) { throw "release bundle is missing $required." }
        }
        if ($uninstall) {
            $entry = Join-Path $package 'uninstall.ps1'
            $global:LASTEXITCODE = 0
            & $entry @forward
        } else {
            $env:DOTFILES_REMOTE_STAGE = '1'
            $env:DOTFILES_TARGET_ROOT = $bundleHome
            $entry = Join-Path $package 'install.ps1'
            $global:LASTEXITCODE = 0
            & $entry @forward
        }
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "installer failed with exit code $LASTEXITCODE." }
    } finally {
        if ($null -eq $oldStage) { Remove-Item Env:DOTFILES_REMOTE_STAGE -ErrorAction SilentlyContinue } else { $env:DOTFILES_REMOTE_STAGE = $oldStage }
        if ($null -eq $oldTarget) { Remove-Item Env:DOTFILES_TARGET_ROOT -ErrorAction SilentlyContinue } else { $env:DOTFILES_TARGET_ROOT = $oldTarget }
        Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
        if ($createdParent -and (Test-Path -LiteralPath $parent -PathType Container) -and @(Get-ChildItem -LiteralPath $parent -Force).Count -eq 0) {
            Remove-Item -LiteralPath $parent -Force -ErrorAction SilentlyContinue
        }
    }
}

try { Invoke-RemoteDotfiles -Arguments $DotfilesArguments }
catch { [Console]::Error.WriteLine("error: $($_.Exception.Message)"); exit 1 }
