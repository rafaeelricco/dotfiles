#Requires -Version 7.0

$ErrorActionPreference = 'Stop'
$script:DotfilesPayloadRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))

function Get-DotfilesFullPath {
    param([Parameter(Mandatory)][string]$Path)
    [System.IO.Path]::GetFullPath($Path).TrimEnd('\', '/')
}

function Test-DotfilesSamePath {
    param([string]$Left, [string]$Right)
    if ([string]::IsNullOrWhiteSpace($Left) -or [string]::IsNullOrWhiteSpace($Right)) { return $false }
    $comparison = if ($IsWindows) { [StringComparison]::OrdinalIgnoreCase } else { [StringComparison]::Ordinal }
    (Get-DotfilesFullPath $Left).Equals((Get-DotfilesFullPath $Right), $comparison)
}

function Test-DotfilesPathInside {
    param([string]$Path, [string]$Parent)
    if ([string]::IsNullOrWhiteSpace($Path) -or [string]::IsNullOrWhiteSpace($Parent)) { return $false }
    $child = Get-DotfilesFullPath $Path
    $root = Get-DotfilesFullPath $Parent
    $comparison = if ($IsWindows) { [StringComparison]::OrdinalIgnoreCase } else { [StringComparison]::Ordinal }
    $child.StartsWith("$root$([IO.Path]::DirectorySeparatorChar)", $comparison)
}

function Test-DotfilesField {
    param([Parameter(Mandatory)][string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value) -or -not [IO.Path]::IsPathRooted($Value) -or $Value -match "[`t`r`n]") {
        throw 'lifecycle state paths must be absolute and cannot contain tabs or newlines.'
    }
}

function Get-DotfilesStatePath {
    $base = if ($IsWindows -and $env:LOCALAPPDATA) { $env:LOCALAPPDATA }
    elseif ($env:XDG_STATE_HOME) { $env:XDG_STATE_HOME }
    else { Join-Path $HOME '.local/state' }
    Join-Path (Join-Path $base 'dotfiles') 'install-state'
}

function Get-DotfilesHomePath {
    if ($env:DOTFILES_HOME) {
        if (-not [IO.Path]::IsPathRooted($env:DOTFILES_HOME) -or $env:DOTFILES_HOME -match "[`t`r`n]") {
            throw 'DOTFILES_HOME must be an absolute path without tabs or newlines.'
        }
        return Get-DotfilesFullPath $env:DOTFILES_HOME
    }
    if ($env:XDG_DATA_HOME) {
        if (-not [IO.Path]::IsPathRooted($env:XDG_DATA_HOME)) { throw 'XDG_DATA_HOME must be an absolute path.' }
        return Get-DotfilesFullPath (Join-Path $env:XDG_DATA_HOME 'dotfiles')
    }
    Get-DotfilesFullPath (Join-Path $HOME '.local/share/dotfiles')
}

function Get-DotfilesItem {
    param([string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return $null }
    Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
}

function Test-DotfilesLink {
    param([System.IO.FileSystemInfo]$Item)
    if ($null -eq $Item) { return $false }
    if ([string]$Item.LinkType -in @('SymbolicLink', 'SymLink', 'Junction')) { return $true }
    ($Item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0
}

function Get-DotfilesLinkTarget {
    param([Parameter(Mandatory)][System.IO.FileSystemInfo]$Item)
    $target = $Item.Target
    if ($target -is [array]) { $target = $target[0] }
    if ([string]::IsNullOrWhiteSpace([string]$target)) { return '' }
    if (-not [IO.Path]::IsPathRooted([string]$target)) { $target = Join-Path (Split-Path -Parent $Item.FullName) $target }
    Get-DotfilesFullPath ([string]$target)
}

function Test-DotfilesValidSourceRoot {
    param([string]$Root)
    if ([string]::IsNullOrWhiteSpace($Root) -or -not [IO.Path]::IsPathRooted($Root) -or $Root -match "[`t`r`n]") { return $false }
    $rootPath = Get-DotfilesFullPath $Root
    $item = Get-DotfilesItem $rootPath
    if ($null -eq $item -or -not $item.PSIsContainer -or (Test-DotfilesLink $item)) { return $false }
    foreach ($required in @('install.ps1', 'INSTRUCTIONS.md', 'skill')) {
        $requiredPath = Join-Path $rootPath $required
        if (-not (Test-Path -LiteralPath $requiredPath)) { return $false }
        $entry = Get-DotfilesItem $requiredPath
        if ($null -eq $entry -or (Test-DotfilesLink $entry)) { return $false }
    }
    $gitDir = Get-DotfilesItem (Join-Path $rootPath '.git')
    if ($null -ne $gitDir) {
        if ((Test-DotfilesLink $gitDir) -or -not (Get-Command git -ErrorAction SilentlyContinue)) { return $false }
        $top = & git -C $rootPath rev-parse --show-toplevel 2>$null
        if ($LASTEXITCODE -ne 0 -or -not (Test-DotfilesSamePath ([string]$top).Trim() $rootPath)) { return $false }
        $origin = & git -C $rootPath config --get remote.origin.url 2>$null
        if ($LASTEXITCODE -ne 0) { return $false }
        $allowed = @('https://github.com/rafaeelricco/dotfiles', 'https://github.com/rafaeelricco/dotfiles.git',
            'git@github.com:rafaeelricco/dotfiles', 'git@github.com:rafaeelricco/dotfiles.git',
            'ssh://git@github.com/rafaeelricco/dotfiles', 'ssh://git@github.com/rafaeelricco/dotfiles.git')
        if ($allowed -notcontains ([string]$origin).Trim().TrimEnd('/')) { return $false }
        return $true
    }
    $version = Join-Path $rootPath 'VERSION'
    if (Test-Path -LiteralPath $version -PathType Leaf) {
        return ([IO.File]::ReadAllText($version).Trim() -cmatch '\A[0-9a-f]{40}\z')
    }
    # Local source fixtures and pre-release developer copies have no Git
    # metadata or release marker. Their full runtime shape is still checked
    # above; state paths remain constrained to known destinations and targets.
    $true
}

function Get-DotfilesLegacyStatePaths {
    $roots = [Collections.Generic.List[string]]::new()
    foreach ($candidate in @($script:DotfilesPayloadRoot, (Get-DotfilesHomePath), (Join-Path $HOME '.dotfiles'), $env:DOTFILES_DIR)) {
        if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
        $full = Get-DotfilesFullPath $candidate
        if (-not ($roots | Where-Object { Test-DotfilesSamePath $_ $full })) { $roots.Add($full) | Out-Null }
    }
    $paths = [Collections.Generic.List[string]]::new()
    $paths.Add((Join-Path (Split-Path -Parent (Get-DotfilesStatePath)) 'local-install-state')) | Out-Null
    foreach ($root in $roots) { $paths.Add((Join-Path $root '.git/dotfiles-lifecycle-state')) | Out-Null }
    @($paths | Select-Object -Unique)
}

function New-DotfilesState {
    [pscustomobject]@{
        Path = Get-DotfilesStatePath
        Records = [Collections.Generic.List[object]]::new()
        Sources = [Collections.Generic.List[string]]::new()
        Links = [Collections.Generic.List[object]]::new()
        Backups = [Collections.Generic.List[object]]::new()
        Directories = [Collections.Generic.List[string]]::new()
        Imports = [Collections.Generic.List[string]]::new()
        LegacyTerminals = [Collections.Generic.List[string]]::new()
        TerminalDeltas = [Collections.Generic.List[object]]::new()
    }
}

function Add-DotfilesRecord {
    param([Parameter(Mandatory)][object]$State, [Parameter(Mandatory)][string]$Type, [Parameter(Mandatory)][string[]]$Fields)
    $line = @($Type) + @($Fields)
    $pathFieldCount = if ($Type -eq 'terminaldelta') { 1 } else { $Fields.Count }
    for ($i = 0; $i -lt $pathFieldCount; $i++) { Test-DotfilesField $Fields[$i] }
    if ($Type -eq 'terminaldelta' -and $Fields[1] -notmatch '\A[A-Za-z0-9+/]*={0,2}\z') { throw 'terminal delta must be base64.' }
    $signature = $line -join "`t"
    foreach ($record in $State.Records) { if ($record.Line -ceq $signature) { return } }
    $State.Records.Add([pscustomobject]@{ Type = $Type; Fields = @($Fields); Line = $signature }) | Out-Null
    switch ($Type) {
        'source' { if (-not ($State.Sources | Where-Object { Test-DotfilesSamePath $_ $Fields[0] })) { $State.Sources.Add($Fields[0]) | Out-Null } }
        'link' { $State.Links.Add([pscustomobject]@{ Destination = $Fields[0]; Target = $Fields[1] }) | Out-Null }
        'backup' { $State.Backups.Add([pscustomobject]@{ Original = $Fields[0]; Backup = $Fields[1] }) | Out-Null }
        'dir' { if (-not ($State.Directories | Where-Object { Test-DotfilesSamePath $_ $Fields[0] })) { $State.Directories.Add($Fields[0]) | Out-Null } }
        'import' { if (-not ($State.Imports | Where-Object { Test-DotfilesSamePath $_ $Fields[0] })) { $State.Imports.Add($Fields[0]) | Out-Null } }
        'terminal' { $State.LegacyTerminals.Add($Fields[0]) | Out-Null }
        'terminaldelta' { $State.TerminalDeltas.Add([pscustomobject]@{ Path = $Fields[0]; Data = $Fields[1] }) | Out-Null }
    }
}

function Save-DotfilesState {
    param([Parameter(Mandatory)][object]$State)
    $parent = Split-Path -Parent $State.Path
    if (-not (Test-Path -LiteralPath $parent -PathType Container)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    $lines = @('dotfiles-lifecycle-state-v2') + @($State.Records | ForEach-Object { $_.Line })
    $temp = "$($State.Path).tmp.$PID"
    try {
        [IO.File]::WriteAllLines($temp, $lines, [Text.UTF8Encoding]::new($false))
        Move-Item -LiteralPath $temp -Destination $State.Path -Force
    } finally { Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue }
}

function Read-DotfilesState {
    param([Parameter(Mandatory)][object]$State)
    $item = Get-DotfilesItem $State.Path
    if ($null -eq $item) { return }
    if ($item.PSIsContainer -or (Test-DotfilesLink $item)) { throw "lifecycle state is not a regular file: $($State.Path)" }
    $lines = [IO.File]::ReadAllLines($State.Path)
    if ($lines.Count -eq 0 -or $lines[0] -cne 'dotfiles-lifecycle-state-v2') { throw "invalid lifecycle state header: $($State.Path)" }
    for ($i = 1; $i -lt $lines.Count; $i++) {
        if ([string]::IsNullOrWhiteSpace($lines[$i])) { continue }
        $parts = $lines[$i].Split("`t")
        $count = switch ($parts[0]) { { $_ -in @('source', 'dir', 'import', 'terminal') } { 2 }; { $_ -in @('link', 'backup', 'terminaldelta') } { 3 }; default { 0 } }
        if ($parts.Count -ne $count -or $count -eq 0) { throw "malformed lifecycle state at line $($i + 1): $($State.Path)" }
        $pathFieldCount = if ($parts[0] -eq 'terminaldelta') { 1 } else { $parts.Count - 1 }
        for ($fieldIndex = 1; $fieldIndex -le $pathFieldCount; $fieldIndex++) { Test-DotfilesField $parts[$fieldIndex] }
        if ($parts[0] -eq 'terminaldelta' -and $parts[2] -notmatch '\A[A-Za-z0-9+/]*={0,2}\z') { throw "malformed terminal delta at line $($i + 1)" }
        Add-DotfilesRecord -State $State -Type $parts[0] -Fields @($parts[1..($parts.Count - 1)])
    }
    foreach ($source in @($State.Sources)) {
        if (Test-DotfilesValidSourceRoot $source) { continue }
        [Console]::Error.WriteLine("warning: lifecycle source is unavailable or invalid; links to it will be preserved: $source")
        $State.Sources.Remove($source) | Out-Null
        $State.Records.RemoveAll([Predicate[object]]{ param($r) $r.Type -eq 'source' -and $r.Fields[0] -ceq $source }) | Out-Null
    }
}

function Read-DotfilesLegacyState {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][object]$State)
    $item = Get-DotfilesItem $Path
    if ($null -eq $item) { return }
    if ($item.PSIsContainer -or (Test-DotfilesLink $item)) { throw "legacy lifecycle state is not a regular file: $Path" }
    $lines = [IO.File]::ReadAllLines($Path)
    if ($lines.Count -eq 0 -or $lines[0] -cnotin @('dotfiles-lifecycle-state-v1', 'dotfiles-local-lifecycle-state-v1')) { return }
    $inferredRoot = $null
    if ($Path -like '*local-install-state') {
        if ($lines.Count -lt 2) { throw "malformed legacy local state: $Path" }
        $source = $lines[1].Split("`t")
        if ($source.Count -ne 2 -or $source[0] -ne 'source' -or -not (Test-DotfilesValidSourceRoot $source[1])) { throw "untrusted source in legacy state: $Path" }
        $inferredRoot = Get-DotfilesFullPath $source[1]
        Add-DotfilesRecord -State $State -Type source -Fields @($inferredRoot)
        $start = 2
    } else {
        $inferredRoot = Get-DotfilesFullPath (Split-Path -Parent (Split-Path -Parent $Path))
        if (-not (Test-DotfilesValidSourceRoot $inferredRoot)) { throw "untrusted legacy checkout state: $Path" }
        Add-DotfilesRecord -State $State -Type source -Fields @($inferredRoot)
        $start = 1
    }
    for ($i = $start; $i -lt $lines.Count; $i++) {
        if ([string]::IsNullOrWhiteSpace($lines[$i])) { continue }
        $parts = $lines[$i].Split("`t")
        switch ($parts[0]) {
            'source' {
                if ($parts.Count -ne 2 -or -not (Test-DotfilesValidSourceRoot $parts[1])) { throw "untrusted source in legacy state: $Path" }
                Add-DotfilesRecord -State $State -Type source -Fields @($parts[1])
            }
            { $_ -in @('link', 'backup') } {
                if ($parts.Count -ne 3) { throw "malformed legacy state: $Path line $($i + 1)" }
                foreach ($field in $parts[1..2]) { Test-DotfilesField $field }
                Add-DotfilesRecord -State $State -Type $parts[0] -Fields @($parts[1], $parts[2])
            }
            { $_ -in @('dir', 'terminal') } {
                if ($parts.Count -ne 2) { throw "malformed legacy state: $Path line $($i + 1)" }
                Test-DotfilesField $parts[1]
                Add-DotfilesRecord -State $State -Type $parts[0] -Fields @($parts[1])
            }
            default { throw "unknown legacy state record in $Path at line $($i + 1)" }
        }
    }
    Add-DotfilesRecord -State $State -Type import -Fields @((Get-DotfilesFullPath $Path))
}

function Initialize-DotfilesState {
    param([Parameter(Mandatory)][object]$State)
    Read-DotfilesState $State
    if ($State.Records.Count -gt 0) { return }
    foreach ($path in (Get-DotfilesLegacyStatePaths)) { Read-DotfilesLegacyState -Path $path -State $State }
}

function Enter-DotfilesMutationLock {
    param([Parameter(Mandatory)][object]$State)
    $parent = Split-Path -Parent $State.Path
    if (-not (Test-Path -LiteralPath $parent -PathType Container)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    $lock = "$($State.Path).lock"
    try { New-Item -ItemType Directory -Path $lock -ErrorAction Stop | Out-Null }
    catch { throw "another dotfiles mutation is active (lock: $lock). If no installer is running, remove the stale lock directory and retry." }
    $script:DotfilesLockPath = $lock
}

function Exit-DotfilesMutationLock {
    if ($script:DotfilesLockPath) {
        $parent = Split-Path -Parent $script:DotfilesLockPath
        Remove-Item -LiteralPath $script:DotfilesLockPath -Force -ErrorAction SilentlyContinue
        $script:DotfilesLockPath = $null
        if ((Test-Path -LiteralPath $parent -PathType Container) -and @(Get-ChildItem -LiteralPath $parent -Force).Count -eq 0) {
            Remove-Item -LiteralPath $parent -Force -ErrorAction SilentlyContinue
        }
    }
}

function Get-DotfilesSkillNames {
    param([Parameter(Mandatory)][string]$Root)
    if (-not (Test-Path -LiteralPath (Join-Path $Root 'skill') -PathType Container)) { return @() }
    @(Get-ChildItem -LiteralPath (Join-Path $Root 'skill') -Directory | Where-Object {
        Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') -PathType Leaf
    } | ForEach-Object { $_.Name } | Sort-Object -Unique)
}

function Get-DotfilesDependencies {
    param([Parameter(Mandatory)][string]$Root)
    $manifest = Join-Path $Root 'skill/dependencies.txt'
    $result = @{}
    if (-not (Test-Path -LiteralPath $manifest -PathType Leaf)) { return $result }
    foreach ($line in [IO.File]::ReadAllLines($manifest)) {
        $tokens = @($line -split '\s+' | Where-Object { $_ -and -not $_.StartsWith('#') })
        if ($tokens.Count -gt 0) { $result[$tokens[0]] = @($tokens | Select-Object -Skip 1) }
    }
    $result
}

function Resolve-DotfilesSelection {
    param([Parameter(Mandatory)][string]$Root, [string[]]$Names)
    $available = @(Get-DotfilesSkillNames $Root)
    if ($Names.Count -eq 0 -or ($Names.Count -eq 1 -and $Names[0] -eq 'all')) { return [pscustomobject]@{ Full = $true; Skills = $available } }
    if ($Names -contains 'all') { throw "'all' cannot be combined with skill names." }
    $deps = Get-DotfilesDependencies $Root
    $selected = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    $pending = [Collections.Generic.Queue[string]]::new()
    foreach ($name in $Names) { $pending.Enqueue($name) }
    while ($pending.Count -gt 0) {
        $name = $pending.Dequeue()
        if ($name -notmatch '\A[A-Za-z0-9._-]+\z' -or $available -notcontains $name) { throw "unknown skill '$name'. Run install.ps1 -Help to list available skills." }
        if (-not $selected.Add($name)) { continue }
        if ($deps.ContainsKey($name)) { foreach ($dependency in $deps[$name]) { $pending.Enqueue([string]$dependency) } }
    }
    $resolved = @($selected | Sort-Object)
    [pscustomobject]@{ Full = $false; Skills = $resolved }
}

function Get-DotfilesManagers {
    $items = [Collections.Generic.List[object]]::new()
    $claude = if ($env:CLAUDE_CONFIG_DIR) { Get-DotfilesFullPath $env:CLAUDE_CONFIG_DIR } else { Get-DotfilesFullPath (Join-Path $HOME '.claude') }
    $codex = if ($env:CODEX_HOME) { Get-DotfilesFullPath $env:CODEX_HOME } else { Get-DotfilesFullPath (Join-Path $HOME '.codex') }
    $grok = if ($env:GROK_HOME) { Get-DotfilesFullPath $env:GROK_HOME } else { Get-DotfilesFullPath (Join-Path $HOME '.grok') }
    $hermes = if ($env:HERMES_HOME) { Get-DotfilesFullPath $env:HERMES_HOME } elseif ($IsWindows -and $env:LOCALAPPDATA) { Get-DotfilesFullPath (Join-Path $env:LOCALAPPDATA 'hermes') } else { Get-DotfilesFullPath (Join-Path $HOME '.hermes') }
    $cursor = Get-DotfilesFullPath (Join-Path $HOME '.cursor')
    $defs = @(
        @{ Name = 'Claude Code'; Home = $claude; Skip = 'SkipClaude'; Cmd = 'claude'; Guidance = 'CLAUDE.md'; SkillDir = 'skills' },
        @{ Name = 'Codex'; Home = $codex; Skip = 'SkipCodex'; Cmd = 'codex'; Guidance = 'AGENTS.md'; SkillDir = 'skills' },
        @{ Name = 'Grok'; Home = $grok; Skip = 'SkipGrok'; Cmd = 'grok'; Guidance = 'AGENTS.md'; SkillDir = 'skills' },
        @{ Name = 'Hermes'; Home = $hermes; Skip = 'SkipHermes'; Cmd = 'hermes'; Guidance = ''; SkillDir = 'skills' },
        @{ Name = 'Cursor'; Home = $cursor; Skip = 'SkipCursor'; Cmd = ''; Guidance = ''; SkillDir = 'skills' }
    )
    foreach ($def in $defs) {
        $skip = [bool]$script:Options[$def.Skip]
        $detected = ($def.Cmd -and (Get-Command -Name $def.Cmd -CommandType Application, ExternalScript -ErrorAction SilentlyContinue)) -or
            (Test-Path -LiteralPath $def.Home -PathType Container)
        $items.Add([pscustomobject]@{ Name = $def.Name; Home = $def.Home; Skip = $skip; Detected = [bool]$detected; Guidance = $def.Guidance; SkillDir = $def.SkillDir }) | Out-Null
    }
    $items
}

function Get-DotfilesKnownPaths {
    param([object]$State)
    $paths = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    foreach ($manager in (Get-DotfilesManagers)) {
        if ($manager.Guidance) { $paths.Add((Join-Path $manager.Home $manager.Guidance)) | Out-Null }
        $paths.Add((Join-Path $manager.Home $manager.SkillDir)) | Out-Null
    }
    $paths.Add((Join-Path $HOME '.agents/skills')) | Out-Null
    $paths.Add((Join-Path $HOME '.cursor/skills')) | Out-Null
    $paths.Add((Join-Path $HOME '.claude/agents/advisor.md')) | Out-Null
    $paths.Add((Join-Path $HOME '.claude/agents/opus-advisor.md')) | Out-Null
    $paths.Add($PROFILE) | Out-Null
    if ($PROFILE) { $paths.Add((Join-Path (Split-Path -Parent $PROFILE) 'themes/robbyrussell.omp.json')) | Out-Null }
    if ($env:LOCALAPPDATA) {
        $paths.Add((Join-Path $env:LOCALAPPDATA 'Packages/Microsoft.WindowsTerminal_8wekyb3d8bbwe/LocalState/settings.json')) | Out-Null
        $paths.Add((Join-Path $env:LOCALAPPDATA 'Microsoft/Windows Terminal/settings.json')) | Out-Null
    }
    $paths
}

function Test-DotfilesAllowedDestination {
    param([string]$Destination, [object]$State)
    if ([string]::IsNullOrWhiteSpace($Destination)) { return $false }
    $full = Get-DotfilesFullPath $Destination
    foreach ($known in (Get-DotfilesKnownPaths $State)) { if (Test-DotfilesSamePath $full $known) { return $true } }
    foreach ($manager in (Get-DotfilesManagers)) {
        $skillDir = Join-Path $manager.Home $manager.SkillDir
        if ((Test-DotfilesPathInside $full $skillDir) -and (Split-Path -Parent $full) -eq $skillDir) {
            return ((Split-Path -Leaf $full) -match '\A[A-Za-z0-9._-]+\z')
        }
    }
    $codexSkillDir = Join-Path $HOME '.agents/skills'
    if ((Test-DotfilesPathInside $full $codexSkillDir) -and (Test-DotfilesSamePath (Split-Path -Parent $full) $codexSkillDir)) {
        return ((Split-Path -Leaf $full) -match '\A[A-Za-z0-9._-]+\z')
    }
    $false
}

function Test-DotfilesAllowedSourceShape {
    param([string]$Destination, [string]$Target, [object]$State)
    if (-not (Test-DotfilesValidSourceRoot (Split-Path -Parent (Split-Path -Parent $Target))) -and
        -not (Test-DotfilesValidSourceRoot (Split-Path -Parent $Target)) -and
        -not ($State.Sources | Where-Object { Test-DotfilesPathInside $Target $_ -or (Test-DotfilesSamePath $Target $_) })) { return $false }
    foreach ($root in $State.Sources) {
        if (-not (Test-DotfilesPathInside $Target $root) -and -not (Test-DotfilesSamePath $Target $root)) { continue }
        $relative = $Target.Substring($root.Length).TrimStart('\', '/') -replace '\\', '/'
        $leaf = Split-Path -Leaf $Destination
        if ($relative -in @('INSTRUCTIONS.md', 'CLAUDE.md', '.claude/CLAUDE.md', '.codex/AGENTS.md', '.grok/AGENTS.md')) { return ($leaf -in @('CLAUDE.md', 'AGENTS.md')) }
        if ($relative -in @('powershell/Microsoft.PowerShell_profile.ps1', 'powershell/themes/robbyrussell.omp.json')) { return ($leaf -in @('Microsoft.PowerShell_profile.ps1', 'robbyrussell.omp.json')) }
        if ($relative -in @('.claude/agents/advisor.md', '.claude/agents/opus-advisor.md')) { return ($leaf -in @('advisor.md', 'opus-advisor.md')) }
        if ($relative -eq 'skill' -or $relative -eq '.claude/skills') { return ($leaf -eq 'skills') }
        if ($relative -match '^(skill|\.claude/skills)/([A-Za-z0-9._-]+)$') { return ($leaf -eq $Matches[2]) }
    }
    $false
}

function Test-DotfilesTrackedLink {
    param([string]$Destination, [string]$Target, [object]$State)
    if (-not (Test-DotfilesAllowedDestination $Destination $State) -or -not (Test-DotfilesAllowedSourceShape $Destination $Target $State)) { return $false }
    foreach ($link in $State.Links) {
        if ((Test-DotfilesSamePath $link.Destination $Destination) -and (Test-DotfilesSamePath $link.Target $Target)) { return $true }
    }
    $false
}

function Get-DotfilesLinkPlan {
    param([Parameter(Mandatory)][string]$Root, [Parameter(Mandatory)][object]$Selection)
    $rows = [Collections.Generic.List[object]]::new()
    $targets = [Collections.Generic.List[object]]::new()
    $legacySkillDirs = [Collections.Generic.List[object]]::new()
    $foreignSkillDirs = [Collections.Generic.List[string]]::new()
    $guidance = Join-Path $Root 'INSTRUCTIONS.md'
    $managers = @(Get-DotfilesManagers)
    if ($Selection.Full) {
        foreach ($manager in $managers) {
            if ($manager.Skip) { $rows.Add([pscustomobject]@{ Kind='skip'; Action='skip agent'; Destination=$manager.Home; Target='' }) | Out-Null; continue }
            if (-not $manager.Detected) { $rows.Add([pscustomobject]@{ Kind='skip'; Action='not detected'; Destination=$manager.Home; Target='' }) | Out-Null; continue }
            if ($manager.Guidance) { $targets.Add([pscustomobject]@{ Destination=(Join-Path $manager.Home $manager.Guidance); Target=$guidance; Kind='link' }) | Out-Null }
            $skillHome = Join-Path $manager.Home $manager.SkillDir
            foreach ($skill in $Selection.Skills) { $targets.Add([pscustomobject]@{ Destination=(Join-Path $skillHome $skill); Target=(Join-Path $Root "skill/$skill"); Kind='link' }) | Out-Null }
        }
        if (-not $script:Options.SkipCodex -and ($managers | Where-Object { $_.Name -eq 'Codex' -and $_.Detected })) {
            foreach ($skill in $Selection.Skills) { $targets.Add([pscustomobject]@{ Destination=(Join-Path $HOME ".agents/skills/$skill"); Target=(Join-Path $Root "skill/$skill"); Kind='link' }) | Out-Null }
        }
    } else {
        foreach ($manager in $managers) {
            if ($manager.Skip -or -not $manager.Detected) { continue }
            $skillHome = Join-Path $manager.Home $manager.SkillDir
            foreach ($skill in $Selection.Skills) { $targets.Add([pscustomobject]@{ Destination=(Join-Path $skillHome $skill); Target=(Join-Path $Root "skill/$skill"); Kind='link' }) | Out-Null }
        }
        if (-not $script:Options.SkipCodex -and ($managers | Where-Object { $_.Name -eq 'Codex' -and $_.Detected })) {
            foreach ($skill in $Selection.Skills) { $targets.Add([pscustomobject]@{ Destination=(Join-Path $HOME ".agents/skills/$skill"); Target=(Join-Path $Root "skill/$skill"); Kind='link' }) | Out-Null }
        }
    }
    $legacyPaths = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    foreach ($target in @($targets.ToArray())) {
        $skillHome = Split-Path -Parent $target.Destination
        if (-not $legacyPaths.Add($skillHome)) { continue }
        $parentItem = Get-DotfilesItem $skillHome
        if (-not (Test-DotfilesLink $parentItem)) { continue }
        $legacyTarget = Get-DotfilesLinkTarget $parentItem
        if (-not (Test-DotfilesAllowedSourceShape $skillHome $legacyTarget $script:State)) {
            $foreignSkillDirs.Add($skillHome) | Out-Null
            $rows.Add([pscustomobject]@{ Kind='conflict'; Action='back up foreign directory link'; Destination=$skillHome; Target=$legacyTarget }) | Out-Null
            continue
        }
        $legacySkillDirs.Add([pscustomobject]@{ Destination=$skillHome; Target=$legacyTarget }) | Out-Null
        $rows.Add([pscustomobject]@{ Kind='migrate'; Action='migrate legacy skill directory'; Destination=$skillHome; Target=$legacyTarget }) | Out-Null
        if (-not $Selection.Full) {
            $oldRoot = Split-Path -Parent $legacyTarget
            foreach ($oldSkill in (Get-DotfilesSkillNames $oldRoot)) {
                if ($Selection.Skills -contains $oldSkill) { continue }
                $legacySkill = Join-Path $legacyTarget $oldSkill
                $targets.Add([pscustomobject]@{ Destination=(Join-Path $skillHome $oldSkill); Target=$legacySkill; Kind='link' }) | Out-Null
            }
        }
    }
    if ($IsWindows -and $Selection.Full -and -not $script:Options.SkipTerminal) {
        $profileSource = Join-Path $Root 'powershell/Microsoft.PowerShell_profile.ps1'
        $themeSource = Join-Path $Root 'powershell/themes/robbyrussell.omp.json'
        if ([string]::IsNullOrWhiteSpace($PROFILE)) { throw 'PowerShell $PROFILE is empty; cannot install the profile.' }
        $profileItem = Get-DotfilesItem $PROFILE
        if ($null -eq $profileItem) { $rows.Add([pscustomobject]@{ Kind='copy'; Action='copy profile'; Destination=$PROFILE; Target=$profileSource }) | Out-Null }
        else { $rows.Add([pscustomobject]@{ Kind='keep'; Action='preserve profile'; Destination=$PROFILE; Target=$profileSource }) | Out-Null }
        $theme = Join-Path (Split-Path -Parent $PROFILE) 'themes/robbyrussell.omp.json'
        $targets.Add([pscustomobject]@{ Destination=$theme; Target=$themeSource; Kind='link' }) | Out-Null
        $settings = Get-WindowsTerminalSettingsPath
        if ($settings) { $rows.Add([pscustomobject]@{ Kind='terminal'; Action='update terminal settings'; Destination=$settings; Target='' }) | Out-Null }
    } elseif ($IsWindows -and $Selection.Full) {
        $rows.Add([pscustomobject]@{ Kind='skip'; Action='skip terminal'; Destination='Windows Terminal / PowerShell'; Target='' }) | Out-Null
    }
    $migratingParents = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    foreach ($legacy in $legacySkillDirs) { $migratingParents.Add($legacy.Destination) | Out-Null }
    foreach ($foreign in $foreignSkillDirs) { $migratingParents.Add($foreign) | Out-Null }
    foreach ($target in $targets) {
        if ($migratingParents.Contains((Split-Path -Parent $target.Destination))) { continue }
        $item = Get-DotfilesItem $target.Destination
        if (Test-DotfilesLink $item) {
            $current = Get-DotfilesLinkTarget $item
            if (Test-DotfilesSamePath $current $target.Target) { $rows.Add([pscustomobject]@{ Kind='keep'; Action='up to date'; Destination=$target.Destination; Target=$target.Target }) | Out-Null }
            elseif (Test-DotfilesAllowedSourceShape $target.Destination $current $script:State) { $rows.Add([pscustomobject]@{ Kind='change'; Action='relink'; Destination=$target.Destination; Target=$target.Target }) | Out-Null }
            else { $rows.Add([pscustomobject]@{ Kind='conflict'; Action='replace foreign link'; Destination=$target.Destination; Target=$target.Target }) | Out-Null }
        } elseif ($null -eq $item) { $rows.Add([pscustomobject]@{ Kind='change'; Action='link'; Destination=$target.Destination; Target=$target.Target }) | Out-Null }
        else { $rows.Add([pscustomobject]@{ Kind='conflict'; Action='back up foreign path'; Destination=$target.Destination; Target=$target.Target }) | Out-Null }
    }
    if ($Selection.Full) {
        $selectedNames = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
        foreach ($skill in $Selection.Skills) { $selectedNames.Add($skill) | Out-Null }
        $knownRoots = @($script:State.Sources) + @($Root)
        $dirs = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
        foreach ($manager in $managers) {
            if ($manager.Skip -or -not $manager.Detected) { continue }
            $dirs.Add((Join-Path $manager.Home $manager.SkillDir)) | Out-Null
        }
        if (-not $script:Options.SkipCodex -and ($managers | Where-Object { $_.Name -eq 'Codex' -and $_.Detected })) { $dirs.Add((Join-Path $HOME '.agents/skills')) | Out-Null }
        foreach ($dir in $dirs) {
            if ($foreignSkillDirs.Contains($dir)) { continue }
            foreach ($entry in @(Get-ChildItem -LiteralPath $dir -Force -ErrorAction SilentlyContinue)) {
                if ($selectedNames.Contains($entry.Name) -or -not (Test-DotfilesLink $entry)) { continue }
                $linkTarget = Get-DotfilesLinkTarget $entry
                $owned = $false
                foreach ($sourceRoot in $knownRoots) {
                    if ((Test-DotfilesPathInside $linkTarget $sourceRoot) -and (Test-DotfilesValidSourceRoot $sourceRoot)) { $owned = $true; break }
                }
                if ($owned -and (Test-DotfilesAllowedDestination $entry.FullName $script:State)) { $rows.Add([pscustomobject]@{ Kind='remove'; Action='remove stale managed link'; Destination=$entry.FullName; Target=$linkTarget }) | Out-Null }
            }
        }
    }
    [pscustomobject]@{ Rows = @($rows); Targets = @($targets); LegacySkillDirs = @($legacySkillDirs); ForeignSkillDirs = @($foreignSkillDirs) }
}

function Get-WindowsTerminalSettingsPath {
    if (-not $IsWindows -or -not $env:LOCALAPPDATA) { return $null }
    foreach ($path in @((Join-Path $env:LOCALAPPDATA 'Packages/Microsoft.WindowsTerminal_8wekyb3d8bbwe/LocalState/settings.json'), (Join-Path $env:LOCALAPPDATA 'Microsoft/Windows Terminal/settings.json'))) {
        if (Test-Path -LiteralPath $path -PathType Leaf) { return $path }
    }
    $null
}

function ConvertFrom-DotfilesJsonc {
    param([Parameter(Mandatory)][string]$Text)
    try { return $Text | ConvertFrom-Json -AsHashtable -ErrorAction Stop } catch {
        $noBlock = [regex]::Replace($Text, '(?s)/\*.*?\*/', '')
        $lines = foreach ($line in ($noBlock -split "`n")) {
            $quoted = $false; $escaped = $false; $cut = $line.Length
            for ($i = 0; $i -lt $line.Length; $i++) {
                $ch = $line[$i]
                if ($escaped) { $escaped = $false; continue }
                if ($quoted -and $ch -eq '\') { $escaped = $true; continue }
                if ($ch -eq '"') { $quoted = -not $quoted; continue }
                if (-not $quoted -and $ch -eq '/' -and $i + 1 -lt $line.Length -and $line[$i + 1] -eq '/') { $cut = $i; break }
            }
            $line.Substring(0, $cut)
        }
        $stripped = [regex]::Replace(($lines -join "`n"), ',(\s*[}\]])', '$1')
        $stripped | ConvertFrom-Json -AsHashtable -ErrorAction Stop
    }
}

function Get-DotfilesTerminalDelta {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][object]$Settings, [Parameter(Mandatory)][object]$State)
    $existing = $State.TerminalDeltas | Where-Object { Test-DotfilesSamePath $_.Path $Path } | Select-Object -First 1
    if ($null -ne $existing) { return $existing.Data }
    $defaults = $null
    if ($Settings.profiles -is [Collections.IDictionary] -and $Settings.profiles.defaults -is [Collections.IDictionary]) { $defaults = $Settings.profiles.defaults }
    $backgroundPresent = ($null -ne $defaults -and $defaults.Contains('background'))
    $background = if ($backgroundPresent) { $defaults['background'] } else { $null }
    $beforeActions = @()
    if ($Settings.actions) { $beforeActions = @($Settings.actions | Where-Object { [string]$_.keys -eq 'ctrl+shift+t' }) }
    $delta = [ordered]@{
        profilesPresent = $Settings.Contains('profiles')
        defaultsPresent = ($Settings.profiles -is [Collections.IDictionary] -and $Settings.profiles.Contains('defaults'))
        actionsPresent = $Settings.Contains('actions')
        background = [ordered]@{ present = $backgroundPresent; before = $background; after = '#141414' }
        actions = [ordered]@{ before = $beforeActions; after = @([ordered]@{ command='duplicateTab'; id='User.duplicateTab'; keys='ctrl+shift+t' }) }
    }
    $json = $delta | ConvertTo-Json -Depth 100 -Compress
    [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json))
}

function Write-DotfilesTerminalSettings {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][object]$Settings)
    [IO.File]::WriteAllText($Path, (($Settings | ConvertTo-Json -Depth 100) + [Environment]::NewLine), [Text.UTF8Encoding]::new($false))
}

function Merge-DotfilesTerminalSettings {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][object]$State)
    $settings = ConvertFrom-DotfilesJsonc ([IO.File]::ReadAllText($Path))
    if ($settings -isnot [Collections.IDictionary]) { throw "Windows Terminal settings root must be an object: $Path" }
    $delta = Get-DotfilesTerminalDelta -Path $Path -Settings $settings -State $State
    if (-not $settings.Contains('profiles') -or $null -eq $settings['profiles']) { $settings['profiles'] = [ordered]@{} }
    if ($settings.profiles -isnot [Collections.IDictionary]) { throw "Windows Terminal profiles must be an object: $Path" }
    if (-not $settings.profiles.Contains('defaults') -or $null -eq $settings.profiles.defaults) { $settings.profiles.defaults = [ordered]@{} }
    if ($settings.profiles.defaults -isnot [Collections.IDictionary]) { throw "Windows Terminal profiles.defaults must be an object: $Path" }
    $settings.profiles.defaults.background = '#141414'
    $other = @()
    if ($settings.actions) { $other = @($settings.actions | Where-Object { [string]$_.keys -ne 'ctrl+shift+t' }) }
    $settings.actions = @($other) + @([ordered]@{ command='duplicateTab'; id='User.duplicateTab'; keys='ctrl+shift+t' })
    Write-DotfilesTerminalSettings -Path $Path -Settings $settings
    Add-DotfilesRecord -State $State -Type terminaldelta -Fields @((Get-DotfilesFullPath $Path), $delta)
    Save-DotfilesState $State
}

function Undo-DotfilesTerminalDeltas {
    param([Parameter(Mandatory)][object]$State)
    foreach ($record in $State.TerminalDeltas) {
        $valid = $false
        if ($env:LOCALAPPDATA) {
            foreach ($candidate in @((Join-Path $env:LOCALAPPDATA 'Packages/Microsoft.WindowsTerminal_8wekyb3d8bbwe/LocalState/settings.json'), (Join-Path $env:LOCALAPPDATA 'Microsoft/Windows Terminal/settings.json'))) {
                if (Test-DotfilesSamePath $candidate $record.Path) { $valid = $true }
            }
        }
        if (-not $valid -or -not (Test-Path -LiteralPath $record.Path -PathType Leaf)) { continue }
        try {
            $delta = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($record.Data)) | ConvertFrom-Json -AsHashtable -ErrorAction Stop
            $settings = ConvertFrom-DotfilesJsonc ([IO.File]::ReadAllText($record.Path))
            if ($settings -isnot [Collections.IDictionary]) { continue }
            $changed = $false
            if ($settings.profiles -is [Collections.IDictionary] -and $settings.profiles.defaults -is [Collections.IDictionary]) {
                $defaults = $settings.profiles.defaults
                if ($defaults.Contains('background') -and (ConvertTo-Json -InputObject $defaults.background -Compress) -ceq (ConvertTo-Json -InputObject $delta.background.after -Compress)) {
                    if ($delta.background.present) { $defaults.background = $delta.background.before } else { $defaults.Remove('background') | Out-Null }
                    $changed = $true
                }
            }
            $currentActions = @()
            if ($settings.actions) { $currentActions = @($settings.actions | Where-Object { [string]$_.keys -eq 'ctrl+shift+t' }) }
            $currentJson = ConvertTo-Json -InputObject @($currentActions) -Depth 100 -Compress
            $afterJson = ConvertTo-Json -InputObject @($delta.actions.after) -Depth 100 -Compress
            if ($currentJson -ceq $afterJson) {
                $other = @()
                if ($settings.actions) { $other = @($settings.actions | Where-Object { [string]$_.keys -ne 'ctrl+shift+t' }) }
                $settings.actions = @($other) + @($delta.actions.before)
                $changed = $true
            }
            if ($delta.Contains('actionsPresent') -and -not $delta.actionsPresent -and $settings.Contains('actions') -and @($settings.actions).Count -eq 0) {
                $settings.Remove('actions') | Out-Null
            }
            if ($delta.Contains('defaultsPresent') -and -not $delta.defaultsPresent -and $settings.profiles -is [Collections.IDictionary] -and $settings.profiles.defaults -is [Collections.IDictionary] -and $settings.profiles.defaults.Count -eq 0) {
                $settings.profiles.Remove('defaults') | Out-Null
            }
            if ($delta.Contains('profilesPresent') -and -not $delta.profilesPresent -and $settings.profiles -is [Collections.IDictionary] -and $settings.profiles.Count -eq 0) {
                $settings.Remove('profiles') | Out-Null
            }
            if ($changed) { Write-DotfilesTerminalSettings -Path $record.Path -Settings $settings; Write-Host "restored recorded Windows Terminal settings in $($record.Path)" }
        } catch { Write-Warning "could not restore terminal settings in $($record.Path): $($_.Exception.Message)" }
    }
}

function Add-DotfilesCreatedDirectory {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][object]$State)
    if (Test-Path -LiteralPath $Path -PathType Container) { return }
    if ($null -ne (Get-DotfilesItem $Path)) { throw "directory path is obstructed: $Path" }
    $parent = Split-Path -Parent $Path
    if ($parent -and -not (Test-Path -LiteralPath $parent -PathType Container)) { Add-DotfilesCreatedDirectory -Path $parent -State $State }
    New-Item -ItemType Directory -Path $Path | Out-Null
    $full = Get-DotfilesFullPath $Path
    if (-not (Test-DotfilesSamePath $full $HOME)) { Add-DotfilesRecord -State $State -Type dir -Fields @($full); Save-DotfilesState $State }
}

function Get-DotfilesBackupPath {
    param([Parameter(Mandatory)][string]$Path)
    $stamp = Get-Date -Format 'yyyyMMddHHmmss'
    $candidate = "$Path.backup-$stamp"; $i = 1
    while ($null -ne (Get-DotfilesItem $candidate)) { $candidate = "$Path.backup-$stamp-$i"; $i++ }
    $candidate
}

function Move-DotfilesConflictToBackup {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][object]$State)
    $backup = Get-DotfilesBackupPath $Path
    Move-Item -LiteralPath $Path -Destination $backup
    Add-DotfilesRecord -State $State -Type backup -Fields @((Get-DotfilesFullPath $Path), (Get-DotfilesFullPath $backup))
    Save-DotfilesState $State
    Write-Host "backed up foreign path: $Path -> $backup"
}

function Remove-DotfilesLink {
    param([Parameter(Mandatory)][System.IO.FileSystemInfo]$Item)
    if ($Item -is [IO.DirectoryInfo]) { [IO.Directory]::Delete($Item.FullName, $false) } else { [IO.File]::Delete($Item.FullName) }
}

function Invoke-DotfilesLink {
    param([Parameter(Mandatory)][string]$Destination, [Parameter(Mandatory)][string]$Target, [Parameter(Mandatory)][object]$State)
    $parent = Split-Path -Parent $Destination
    if ($parent) { Add-DotfilesCreatedDirectory -Path $parent -State $State }
    $item = Get-DotfilesItem $Destination
    if (Test-DotfilesLink $item) {
        $current = Get-DotfilesLinkTarget $item
        if (Test-DotfilesSamePath $current $Target) {
            Add-DotfilesRecord -State $State -Type link -Fields @((Get-DotfilesFullPath $Destination), (Get-DotfilesFullPath $Target)); Save-DotfilesState $State
            Write-Host "up to date: $Destination"; return
        }
        if (Test-DotfilesAllowedSourceShape $Destination $current $State) { Remove-DotfilesLink $item }
        else { Move-DotfilesConflictToBackup $Destination $State }
    } elseif ($null -ne $item) { Move-DotfilesConflictToBackup $Destination $State }
    New-Item -ItemType SymbolicLink -Path $Destination -Target $Target -ErrorAction Stop | Out-Null
    Add-DotfilesRecord -State $State -Type link -Fields @((Get-DotfilesFullPath $Destination), (Get-DotfilesFullPath $Target))
    Save-DotfilesState $State
    Write-Host "linked: $Destination -> $Target"
}

function Write-DotfilesPlan {
    param([object[]]$Rows, [string]$Title)
    Write-Host "== $Title =="
    if ($Rows.Count -eq 0) { Write-Host 'No changes.'; return }
    foreach ($row in $Rows) {
        if ($row.Target) { Write-Host ('{0,-24} {1} -> {2}' -f $row.Action, $row.Destination, $row.Target) }
        else { Write-Host ('{0,-24} {1}' -f $row.Action, $row.Destination) }
    }
    Write-Host '------------------------------------------------------------'
}

function Test-DotfilesConsoleInput {
    try { [Environment]::UserInteractive -and -not [Console]::IsInputRedirected } catch { $false }
}

function Confirm-DotfilesPlan {
    param([int]$Conflicts)
    if (-not (Test-DotfilesConsoleInput)) {
        if ($Conflicts -gt 0) { throw 'foreign destinations block unattended installation; remove them or rerun in a terminal and type yes to back them up.' }
        return $true
    }
    Write-Host -NoNewline 'Proceed? [Y/n] '
    $answer = [Console]::In.ReadLine()
    if (-not [string]::IsNullOrWhiteSpace($answer) -and $answer.Trim() -notmatch '^(?i:y|yes)$') {
        Write-Host 'Installation cancelled; no changes were made.'; return $false
    }
    if ($Conflicts -gt 0) {
        Write-Host "This install will back up $Conflicts foreign destination(s) before linking."
        Write-Host -NoNewline 'Type yes to continue: '
        if ([Console]::In.ReadLine() -cne 'yes') { Write-Host 'Installation cancelled; no changes were made.'; return $false }
    }
    $true
}

function Install-DotfilesPlan {
    param([Parameter(Mandatory)][string]$Root, [Parameter(Mandatory)][object]$Selection, [Parameter(Mandatory)][object]$Plan)
    if ($env:DOTFILES_REMOTE_STAGE -eq '1') { Activate-DotfilesRemoteStage -SourceRoot $Root }
    $stateRoot = if ($env:DOTFILES_REMOTE_STAGE -eq '1') { Get-DotfilesFullPath $env:DOTFILES_TARGET_ROOT } else { Get-DotfilesFullPath $Root }
    if (-not (Test-DotfilesValidSourceRoot $stateRoot)) { throw "activated bundle is not a verified dotfiles source: $stateRoot" }
    Add-DotfilesRecord -State $script:State -Type source -Fields @($stateRoot)
    Save-DotfilesState $script:State
    foreach ($legacy in $Plan.LegacySkillDirs) {
        $item = Get-DotfilesItem $legacy.Destination
        if (Test-DotfilesLink $item) { Remove-DotfilesLink $item }
        Add-DotfilesCreatedDirectory -Path $legacy.Destination -State $script:State
    }
    foreach ($foreign in $Plan.ForeignSkillDirs) {
        if (Test-DotfilesLink (Get-DotfilesItem $foreign)) { Move-DotfilesConflictToBackup $foreign $script:State }
        Add-DotfilesCreatedDirectory -Path $foreign -State $script:State
    }
    foreach ($target in $Plan.Targets) { Invoke-DotfilesLink -Destination $target.Destination -Target $target.Target -State $script:State }
    if ($Selection.Full -and $IsWindows -and -not $script:Options.SkipTerminal) {
        $profileSource = Join-Path $stateRoot 'powershell/Microsoft.PowerShell_profile.ps1'
        if (-not (Test-Path -LiteralPath $PROFILE)) {
            $profileParent = Split-Path -Parent $PROFILE
            if ($profileParent) { Add-DotfilesCreatedDirectory $profileParent $script:State }
            Copy-Item -LiteralPath $profileSource -Destination $PROFILE
            Write-Host "copied profile: $PROFILE"
        }
        $settings = Get-WindowsTerminalSettingsPath
        if ($settings) { Merge-DotfilesTerminalSettings -Path $settings -State $script:State }
    }
    if ($Selection.Full) {
        foreach ($row in $Plan.Rows | Where-Object Kind -eq 'remove') {
            $item = Get-DotfilesItem $row.Destination
            if ((Test-DotfilesLink $item) -and (Test-DotfilesAllowedSourceShape $row.Destination (Get-DotfilesLinkTarget $item) $script:State)) {
                Remove-DotfilesLink $item
                Write-Host "removed stale managed link: $($row.Destination)"
            }
        }
    }
    Write-Host "Dotfiles setup completed from $stateRoot"
}

function Activate-DotfilesRemoteStage {
    param([Parameter(Mandatory)][string]$SourceRoot)
    $target = Get-DotfilesFullPath $env:DOTFILES_TARGET_ROOT
    if (-not [IO.Path]::IsPathRooted($target) -or $target -match "[`t`r`n]") { throw 'DOTFILES_TARGET_ROOT must be an absolute path.' }
    $source = Get-DotfilesFullPath $SourceRoot
    $parent = Split-Path -Parent $target
    $stage = Split-Path -Parent $source
    $stageParent = Split-Path -Parent $stage
    if ((Split-Path -Leaf $source) -cne 'dotfiles' -or
        (Split-Path -Leaf $stage) -notmatch '\A\.dotfiles-stage-[0-9a-f]{32}\z' -or
        -not (Test-DotfilesSamePath $stageParent $parent) -or
        (Test-DotfilesSamePath $source $target) -or
        (Test-DotfilesPathInside $target $source) -or
        (Test-DotfilesPathInside $source $target)) {
        throw 'remote stage must be a private .dotfiles-stage-* sibling containing dotfiles beside the cache path.'
    }
    $sourceItem = Get-DotfilesItem $source
    $stageItem = Get-DotfilesItem $stage
    if ($null -eq $sourceItem -or -not $sourceItem.PSIsContainer -or (Test-DotfilesLink $sourceItem) -or
        $null -eq $stageItem -or -not $stageItem.PSIsContainer -or (Test-DotfilesLink $stageItem) -or
        -not (Test-DotfilesValidSourceRoot $source)) {
        throw 'remote stage is not a valid verified bundle directory.'
    }
    $versionFile = Join-Path $source 'VERSION'
    if (-not (Test-Path -LiteralPath $versionFile -PathType Leaf) -or [IO.File]::ReadAllText($versionFile).Trim() -cnotmatch '\A[0-9a-f]{40}\z') {
        throw 'remote staged bundle must contain a lower-case 40-character VERSION.'
    }
    if (-not (Test-Path -LiteralPath $parent -PathType Container)) { Add-DotfilesCreatedDirectory $parent $script:State }
    $existing = Get-DotfilesItem $target
    if ($null -ne $existing) {
        if (-not $existing.PSIsContainer -or (Test-DotfilesLink $existing)) { throw "refusing to replace non-directory cache path: $target" }
        if ($null -ne (Get-DotfilesItem (Join-Path $target '.git'))) { throw "refusing to replace a legacy Git checkout at $target; preserve it and choose a separate DOTFILES_HOME." }
        $marker = Join-Path $target 'VERSION'
        if (-not (Test-Path -LiteralPath $marker -PathType Leaf) -or [IO.File]::ReadAllText($marker).Trim() -cnotmatch '\A[0-9a-f]{40}\z') {
            throw "cache path exists but has no verified release marker: $target; preserve it and choose a separate DOTFILES_HOME."
        }
        if (-not (Test-DotfilesValidSourceRoot $target)) { throw "cache path exists but is not a verified dotfiles bundle: $target; choose a separate DOTFILES_HOME." }
    }
    # The private stage and stable cache are siblings on the same filesystem,
    # allowing activation with atomic directory renames.
    $backup = "$target.previous.$([guid]::NewGuid().ToString('N'))"
    $hadExisting = $null -ne $existing
    if ($hadExisting) { Move-Item -LiteralPath $target -Destination $backup }
    try { Move-Item -LiteralPath $source -Destination $target }
    catch {
        $moveError = $_.Exception.Message
        if ($hadExisting) {
            try { Move-Item -LiteralPath $backup -Destination $target -ErrorAction Stop }
            catch { throw "bundle activation failed ($moveError); rollback failed; previous cache remains at $backup" }
        }
        throw "bundle activation failed ($moveError); previous cache restored."
    }
    if ($hadExisting) { Remove-Item -LiteralPath $backup -Recurse -Force -ErrorAction SilentlyContinue }
    Write-Host "activated verified bundle at $target"
}

function Show-DotfilesUsage {
    param([string]$Root)
    $skills = @(Get-DotfilesSkillNames $Root)
    if (-not $skills.Count -and $script:RemoteHelpSkills) { $skills = @($script:RemoteHelpSkills -split '\s+' | Where-Object { $_ }) }
    @"
Usage: install.ps1 [skill ...] [options]
       install.ps1 uninstall [options]

No skill names, or 'all', installs the full setup. Named skills include their
dependencies and leave instructions and terminal configuration untouched.
Available skills: $($skills -join ' ')

Options: -DryRun / --dry-run, -Help / -h / --help,
         -SkipClaude / --skip-claude, -SkipCodex / --skip-codex,
         -SkipGrok / --skip-grok, -SkipCursor / --skip-cursor,
         -SkipHermes / --skip-hermes, -SkipTerminal

The bundle cache defaults to $((Get-DotfilesHomePath)). DOTFILES_HOME overrides it.
"@ | Write-Host
}

function ConvertTo-DotfilesOptions {
    param([Parameter(Mandatory)][AllowEmptyCollection()][AllowNull()][string[]]$Arguments, [string]$Action)
    $options = @{ DryRun = $false; Help = $false; SkipClaude = $false; SkipCodex = $false; SkipGrok = $false; SkipCursor = $false; SkipHermes = $false; SkipTerminal = $false; Names = [Collections.Generic.List[string]]::new() }
    foreach ($argument in $Arguments) {
        switch -Regex ($argument.ToLowerInvariant()) {
            '^(-help|-h|--help)$' { $options.Help = $true; continue }
            '^(-dryrun|--dry-run)$' { $options.DryRun = $true; continue }
            '^(-skipclaude|--skip-claude)$' { $options.SkipClaude = $true; continue }
            '^(-skipcodex|--skip-codex)$' { $options.SkipCodex = $true; continue }
            '^(-skipgrok|--skip-grok)$' { $options.SkipGrok = $true; continue }
            '^(-skipcursor|--skip-cursor)$' { $options.SkipCursor = $true; continue }
            '^(-skiphermes|--skip-hermes)$' { $options.SkipHermes = $true; continue }
            '^(-skipterminal|--skip-terminal)$' { $options.SkipTerminal = $true; continue }
            '^(-yes|-y|--yes|-override|--override|-local|--local|-dir(?:$|:|=)|--dir(?:$|=)|-skills|--skills)$' { throw "removed option '$argument'. Skill names are positional; run install.ps1 -Help for usage." }
            '^[-/]' { throw "unknown option '$argument'. Run install.ps1 -Help for usage." }
            default {
                if ($Action -eq 'install' -and $argument -ieq 'uninstall' -and $options.Names.Count -eq 0) { $options.Names.Add('uninstall') | Out-Null }
                else { $options.Names.Add($argument) | Out-Null }
            }
        }
    }
    $options
}

function Invoke-DotfilesInstall {
    param([string[]]$Arguments = @())
    $root = $script:DotfilesPayloadRoot
    $script:Options = ConvertTo-DotfilesOptions -Arguments $Arguments -Action 'install'
    if ($script:Options.Help) { Show-DotfilesUsage $root; return }
    if ($script:Options.Names.Count -eq 1 -and $script:Options.Names[0] -eq 'uninstall') { Invoke-DotfilesUninstall -Arguments @($Arguments | Where-Object { $_ -ine 'uninstall' }); return }
    if ($script:Options.Names -contains 'uninstall') { throw "'uninstall' cannot be combined with skill names." }
    if (-not (Test-DotfilesValidSourceRoot $root)) { throw "not a valid dotfiles source bundle: $root" }
    $selection = Resolve-DotfilesSelection -Root $root -Names @($script:Options.Names)
    $script:State = New-DotfilesState
    if ($script:Options.DryRun) {
        Initialize-DotfilesState $script:State
        $script:SourceRoot = if ($env:DOTFILES_REMOTE_STAGE -eq '1') { Get-DotfilesFullPath $env:DOTFILES_TARGET_ROOT } else { $root }
        $script:State.Sources.Add($script:SourceRoot) | Out-Null
        $plan = Get-DotfilesLinkPlan -Root $script:SourceRoot -Selection $selection
        if ($env:DOTFILES_REMOTE_STAGE -eq '1') {
            $version = [IO.File]::ReadAllText((Join-Path $root 'VERSION')).Trim()
            $plan.Rows = @([pscustomobject]@{ Kind='change'; Action="activate verified bundle $version"; Destination=$script:SourceRoot; Target='verified staged release' }) + @($plan.Rows)
        }
        Write-DotfilesPlan -Rows $plan.Rows -Title $(if ($selection.Full) { 'Full install preview' } else { 'Selected skill preview' })
        return
    }
    Enter-DotfilesMutationLock $script:State
    try {
        Initialize-DotfilesState $script:State
        $script:SourceRoot = if ($env:DOTFILES_REMOTE_STAGE -eq '1') { Get-DotfilesFullPath $env:DOTFILES_TARGET_ROOT } else { $root }
        if (-not ($script:State.Sources | Where-Object { Test-DotfilesSamePath $_ $script:SourceRoot })) { $script:State.Sources.Add($script:SourceRoot) | Out-Null }
        $plan = Get-DotfilesLinkPlan -Root $script:SourceRoot -Selection $selection
        if ($env:DOTFILES_REMOTE_STAGE -eq '1') {
            $version = [IO.File]::ReadAllText((Join-Path $root 'VERSION')).Trim()
            $plan.Rows = @([pscustomobject]@{ Kind='change'; Action="activate verified bundle $version"; Destination=$script:SourceRoot; Target='verified staged release' }) + @($plan.Rows)
        }
        Write-DotfilesPlan -Rows $plan.Rows -Title $(if ($selection.Full) { 'Full install plan' } else { 'Selected skill plan' })
        $conflicts = @($plan.Rows | Where-Object Kind -eq 'conflict').Count
        if (-not (Confirm-DotfilesPlan $conflicts)) { return }
        if ($script:Options.DryRun) { return }
        foreach ($source in @($script:State.Sources)) {
            if ($env:DOTFILES_REMOTE_STAGE -eq '1' -and (Test-DotfilesSamePath $source $script:SourceRoot) -and -not (Test-Path -LiteralPath $source)) {
                if (-not (Test-DotfilesValidSourceRoot $root)) { throw "untrusted staged source root: $root" }
                continue
            }
            if (-not (Test-DotfilesValidSourceRoot $source)) { throw "untrusted source root in lifecycle state: $source" }
        }
        Install-DotfilesPlan -Root $root -Selection $selection -Plan $plan
    } finally { Exit-DotfilesMutationLock }
}

function Read-DotfilesUninstallState {
    $state = New-DotfilesState
    Initialize-DotfilesState $state
    $state
}

function Get-DotfilesManagedLinksForRemoval {
    param([Parameter(Mandatory)][object]$State)
    $result = [Collections.Generic.List[System.IO.FileSystemInfo]]::new()
    foreach ($link in $State.Links) {
        if (-not (Test-DotfilesAllowedDestination $link.Destination $State) -or -not (Test-DotfilesAllowedSourceShape $link.Destination $link.Target $State)) { continue }
        $item = Get-DotfilesItem $link.Destination
        if (Test-DotfilesLink $item) {
            $target = Get-DotfilesLinkTarget $item
            if ((Test-DotfilesSamePath $target $link.Target) -and (Test-DotfilesTrackedLink $link.Destination $target $State) -and -not ($result | Where-Object { Test-DotfilesSamePath $_.FullName $link.Destination })) { $result.Add($item) | Out-Null }
        }
    }
    $result
}

function Remove-DotfilesEmptyDirectories {
    param([Parameter(Mandatory)][object]$State)
    for ($pass = 0; $pass -lt $State.Directories.Count; $pass++) {
        foreach ($path in $State.Directories) {
            $full = Get-DotfilesFullPath $path
            if ((Test-DotfilesSamePath $full $HOME) -or (Test-DotfilesPathInside $HOME $full)) { continue }
            $related = $false
            foreach ($known in (Get-DotfilesKnownPaths $State)) { if ((Test-DotfilesSamePath $known $full) -or (Test-DotfilesPathInside $known $full)) { $related = $true; break } }
            if (-not $related) { continue }
            $item = Get-DotfilesItem $full
            if ($null -eq $item -or -not $item.PSIsContainer -or (Test-DotfilesLink $item)) { continue }
            if (@(Get-ChildItem -LiteralPath $full -Force).Count -eq 0) { [IO.Directory]::Delete($full, $false); Write-Host "removed empty recorded directory: $full" }
        }
    }
}

function Invoke-DotfilesUninstall {
    param([string[]]$Arguments = @())
    $script:Options = ConvertTo-DotfilesOptions -Arguments $Arguments -Action 'uninstall'
    if ($script:Options.Names.Count -gt 0) { throw 'uninstall does not accept skill names; run install.ps1 -Help for usage.' }
    if ($script:Options.Help) { Show-DotfilesUsage $PSScriptRoot; return }
    $state = Read-DotfilesUninstallState
    $links = @(Get-DotfilesManagedLinksForRemoval $state)
    $rows = @($links | ForEach-Object { [pscustomobject]@{ Kind='remove'; Action='remove managed link'; Destination=$_.FullName; Target=(Get-DotfilesLinkTarget $_) } })
    foreach ($delta in $state.TerminalDeltas) { $rows += [pscustomobject]@{ Kind='restore'; Action=$(if ($IsWindows) { 'restore recorded terminal settings' } else { 'preserve terminal settings record' }); Destination=$delta.Path; Target='' } }
    foreach ($path in $state.Directories) { $rows += [pscustomobject]@{ Kind='directory'; Action='remove if empty'; Destination=$path; Target='' } }
    Write-DotfilesPlan -Rows $rows -Title 'Uninstall plan'
    if ($script:Options.DryRun) { return }
    if ($state.Records.Count -eq 0) { Write-Host 'No dotfiles lifecycle state found; no owned changes to remove.'; return }
    Enter-DotfilesMutationLock $state
    try {
        $state = Read-DotfilesUninstallState
        $links = @(Get-DotfilesManagedLinksForRemoval $state)
        $rows = @($links | ForEach-Object { [pscustomobject]@{ Kind='remove'; Action='remove managed link'; Destination=$_.FullName; Target=(Get-DotfilesLinkTarget $_) } })
        foreach ($delta in $state.TerminalDeltas) { $rows += [pscustomobject]@{ Kind='restore'; Action=$(if ($IsWindows) { 'restore recorded terminal settings' } else { 'preserve terminal settings record' }); Destination=$delta.Path; Target='' } }
        Write-DotfilesPlan -Rows $rows -Title 'Uninstall plan'
        if (Test-DotfilesConsoleInput) {
            Write-Host -NoNewline 'Proceed? [Y/n] '
            $answer = [Console]::In.ReadLine()
            if (-not [string]::IsNullOrWhiteSpace($answer) -and $answer.Trim() -notmatch '^(?i:y|yes)$') { Write-Host 'Uninstall cancelled; no changes were made.'; return }
        }
        foreach ($link in $links) { Remove-DotfilesLink $link; Write-Host "removed managed link: $($link.FullName)" }
        if ($IsWindows) { Undo-DotfilesTerminalDeltas $state }
        Remove-DotfilesEmptyDirectories $state
        $preserveTerminalState = -not $IsWindows -and ($state.TerminalDeltas.Count -gt 0 -or $state.LegacyTerminals.Count -gt 0)
        if (-not $preserveTerminalState) { Remove-Item -LiteralPath $state.Path -Force -ErrorAction SilentlyContinue }
        $stateParent = Split-Path -Parent $state.Path
        if (-not $preserveTerminalState -and (Test-Path -LiteralPath $stateParent -PathType Container) -and @(Get-ChildItem -LiteralPath $stateParent -Force).Count -eq 0) { Remove-Item -LiteralPath $stateParent -Force }
        Write-Host 'Dotfiles links uninstalled; checkouts, bundles, backups, and copied profiles are preserved.'
    } finally { Exit-DotfilesMutationLock }
}

function Invoke-DotfilesEntrypoint {
    param([Parameter(Mandatory)][string]$Action, [string[]]$Arguments = @())
    if ($null -eq $Arguments) { $Arguments = @() }
    if ($Action -eq 'install') { Invoke-DotfilesInstall -Arguments $Arguments }
    elseif ($Action -eq 'uninstall') { Invoke-DotfilesUninstall -Arguments $Arguments }
    else { throw "unknown dotfiles action: $Action" }
}
