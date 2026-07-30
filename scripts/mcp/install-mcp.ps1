#Requires -Version 7.0
[CmdletBinding()]
param(
    [string]$Mcp,
    [string]$ExaKey,
    [switch]$SkipClaude,
    [switch]$SkipCodex,
    [switch]$SkipGrok,
    [Alias('h')][switch]$Help
)

$ErrorActionPreference = 'Stop'
$ExaUrl = 'https://mcp.exa.ai/mcp'
$ArgentPkg = '@swmansion/argent'
$CodexCcMarketplace = 'openai/codex-plugin-cc'
$CodexCcPlugin = 'codex@openai-codex'
$script:WantExa = $false
$script:WantArgent = $false
$script:WantCodexCc = $false
$script:ApiKey = ''
# Script-level $PSBoundParameters (not available inside nested functions).
$script:McpProvided = $PSBoundParameters.ContainsKey('Mcp')
$script:ExaKeyProvided = $PSBoundParameters.ContainsKey('ExaKey')

function Show-Usage {
    @'
Register selected MCP servers with detected Claude Code, Codex, and Grok CLIs.

Usage: install-mcp.ps1 [-Mcp <list>] [-ExaKey <key>] [-SkipClaude] [-SkipCodex] [-SkipGrok] [-Help]

  -Mcp         Comma-separated ids: exa, argent, codex-cc, or all.
               Omit for interactive checkbox picker (TTY required).
  -ExaKey      Exa API key (empty = free tier). Skip prompt when bound.
  -SkipClaude  Do not configure Claude Code.
  -SkipCodex   Do not configure Codex.
  -SkipGrok    Do not configure Grok.
  -Help        Show this help.

MCPs:
  exa       Exa search (HTTP). Optional API key → https://dashboard.exa.ai/api-keys
  argent    Software Mansion Argent (stdio + skills). Needs Node ≥ 20.11 + npm; global install.
            Also installs argent-* skills via npx skills -g (Grok/Claude/Codex agents).
  codex-cc  OpenAI Codex plugin for Claude Code (not an MCP). Needs claude on PATH.
            Optional runtime: npm i -g @openai/codex; then codex login.

Interactive: number toggles checkbox, Enter confirms (default: all selected).
Remove: claude mcp remove -s user <name>
        codex mcp remove <name>
        grok mcp remove <name>
'@ | Write-Host
}

function Test-CliPresent {
    param([Parameter(Mandatory)][string]$Name)
    $null -ne (Get-Command -Name $Name -CommandType Application, ExternalScript -ErrorAction SilentlyContinue)
}

function Set-McpSelectionFromList {
    param([Parameter(Mandatory)][string]$List)
    $script:WantExa = $false
    $script:WantArgent = $false
    $script:WantCodexCc = $false
    foreach ($raw in ($List -split '[,;\s]+')) {
        $item = $raw.Trim().ToLowerInvariant()
        if (-not $item) { continue }
        switch ($item) {
            'all' { $script:WantExa = $true; $script:WantArgent = $true; $script:WantCodexCc = $true }
            'exa' { $script:WantExa = $true }
            'argent' { $script:WantArgent = $true }
            'codex-cc' { $script:WantCodexCc = $true }
            default { throw "unknown MCP: $item (want: exa, argent, codex-cc, all)" }
        }
    }
    if (-not $script:WantExa -and -not $script:WantArgent -and -not $script:WantCodexCc) {
        throw 'no MCP selected'
    }
}

function Select-McpsInteractive {
    if (-not [Environment]::UserInteractive -or [Console]::IsInputRedirected) {
        throw 'no interactive terminal; pass -Mcp exa,argent,codex-cc (or all)'
    }
    $onExa = $true
    $onArgent = $true
    $onCodexCc = $true
    while ($true) {
        Write-Host ''
        Write-Host 'Select MCP servers to install (number toggles, Enter confirms):'
        Write-Host ("  [{0}] 1  exa      - Exa search (optional API key)" -f ($(if ($onExa) { 'x' } else { ' ' })))
        Write-Host ("  [{0}] 2  argent   - iOS/Android/Electron control (Node ≥ 20.11)" -f ($(if ($onArgent) { 'x' } else { ' ' })))
        Write-Host ("  [{0}] 3  codex-cc - Codex plugin for Claude Code (not an MCP)" -f ($(if ($onCodexCc) { 'x' } else { ' ' })))
        $choice = Read-Host '>'
        if ([string]::IsNullOrWhiteSpace($choice)) { break }
        switch ($choice.Trim()) {
            '1' { $onExa = -not $onExa }
            '2' { $onArgent = -not $onArgent }
            '3' { $onCodexCc = -not $onCodexCc }
            default { Write-Host '  (enter 1-3 to toggle, or Enter to confirm)' }
        }
    }
    $script:WantExa = $onExa
    $script:WantArgent = $onArgent
    $script:WantCodexCc = $onCodexCc
    if (-not $script:WantExa -and -not $script:WantArgent -and -not $script:WantCodexCc) {
        throw 'no MCP selected'
    }
}

function Read-ApiKey {
    if (-not [Environment]::UserInteractive -or [Console]::IsInputRedirected) {
        throw 'no interactive terminal; cannot prompt for the Exa API key'
    }
    $secure = Read-Host 'Exa API key (blank for the free tier, input hidden)' -AsSecureString
    [System.Net.NetworkCredential]::new('', $secure).Password
}

function Assert-NodeForArgent {
    if (-not (Test-CliPresent 'node') -or -not (Test-CliPresent 'npm')) {
        throw 'Argent needs Node.js ≥ 20.11 and npm on PATH'
    }
    $ver = (node -v).TrimStart('v')
    $parts = $ver.Split('.')
    $major = [int]$parts[0]
    $minor = [int]$parts[1]
    if ($major -lt 20 -or ($major -eq 20 -and $minor -lt 11)) {
        throw "Argent needs Node.js ≥ 20.11 (found v$ver)"
    }
}

function Install-ArgentPackage {
    Write-Host '== Argent package =='
    & npm install -g $ArgentPkg
    if ($LASTEXITCODE -ne 0) {
        throw "npm install -g $ArgentPkg failed (exit $LASTEXITCODE)"
    }
    if (-not (Test-CliPresent 'argent')) {
        throw "npm install finished but 'argent' not on PATH; open a new shell or fix npm global bin"
    }
    Write-Host "installed: $ArgentPkg"
}

function Get-ArgentVersion {
    $raw = (& argent --version 2>$null | Out-String).Trim()
    if (-not $raw) { throw "could not read 'argent --version'" }
    if ($raw -match '(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)') { return $Matches[1] }
    throw "unparseable argent version: $raw"
}

# Mirrors argent init skills step: version-pinned GitHub source + npx skills -g.
# Agent ids match vercel-labs/skills (grok → ~/.grok/skills).
function Install-ArgentSkills {
    param(
        [bool]$SkipClaude,
        [bool]$SkipCodex,
        [bool]$SkipGrok
    )
    Write-Host '== Argent skills =='
    $version = Get-ArgentVersion
    $source = "software-mansion/argent/packages/skills/skills#v$version"
    $agents = [System.Collections.Generic.List[string]]::new()
    if (-not $SkipGrok -and (Test-CliPresent 'grok')) { $agents.Add('grok') }
    if (-not $SkipClaude -and (Test-CliPresent 'claude')) { $agents.Add('claude-code') }
    if (-not $SkipCodex -and (Test-CliPresent 'codex')) { $agents.Add('codex') }
    if ($agents.Count -eq 0) {
        if ($SkipGrok) {
            Write-Host 'skipped: argent skills (no eligible agent)'
            return
        }
        # Still install for Grok path even if CLI binary missing (skills are files).
        $agents.Add('grok')
    }
    $npxArgs = @('--force', 'skills', 'add', $source, '--skill', '*', '-y', '-g')
    foreach ($a in $agents) { $npxArgs += @('-a', $a) }
    Write-Host ("npx {0}" -f ($npxArgs -join ' '))
    & npx @npxArgs
    if ($LASTEXITCODE -ne 0) {
        $pkgRoot = & npm root -g
        $bundled = Join-Path $pkgRoot '@swmansion\argent\skills'
        if (-not (Test-Path -LiteralPath $bundled)) {
            throw "npx skills add failed (exit $LASTEXITCODE); no bundled fallback at $bundled"
        }
        Write-Host "retry with bundled: $bundled"
        $npxArgs = @('--force', 'skills', 'add', $bundled, '--skill', '*', '-y', '-g')
        foreach ($a in $agents) { $npxArgs += @('-a', $a) }
        & npx @npxArgs
        if ($LASTEXITCODE -ne 0) {
            throw "npx skills add (bundled) failed (exit $LASTEXITCODE)"
        }
    }
    Write-Host ("installed skills for: {0}" -f ($agents -join ', '))
}

# Claude Code plugin (not an MCP). Install once; no per-CLI mcp add.
function Install-CodexCcPlugin {
    param([Parameter(Mandatory)][bool]$SkipClaudeCli)
    Write-Host '== Codex plugin (Claude Code) =='
    if ($SkipClaudeCli -or -not (Test-CliPresent 'claude')) {
        if (-not $script:WantExa -and -not $script:WantArgent) {
            throw 'codex-cc needs Claude Code CLI on PATH (and not -SkipClaude)'
        }
        Write-Host 'skipped: codex-cc (Claude Code required)'
        return
    }
    & claude plugin marketplace add $CodexCcMarketplace
    if ($LASTEXITCODE -ne 0) { throw "claude plugin marketplace add failed (exit $LASTEXITCODE)" }
    & claude plugin install $CodexCcPlugin -s user
    if ($LASTEXITCODE -ne 0) { throw "claude plugin install failed (exit $LASTEXITCODE)" }
    Write-Host "installed: $CodexCcPlugin"
}

# Each Register-* removes any existing entry first so re-runs stay idempotent.
function Register-ClaudeExa {
    param([string]$Key)
    claude mcp remove -s user exa *> $null
    if ($Key) { claude mcp add -s user -t http exa $ExaUrl -H "x-api-key: $Key" }
    else { claude mcp add -s user -t http exa $ExaUrl }
}

function Register-GrokExa {
    param([string]$Key)
    grok mcp remove exa *> $null
    if ($Key) { grok mcp add -s user -t http exa $ExaUrl -H "x-api-key: $Key" }
    else { grok mcp add -s user -t http exa $ExaUrl }
}

# codex mcp add has no header flag, so the key rides the query string instead.
function Register-CodexExa {
    param([string]$Key)
    codex mcp remove exa *> $null
    if ($Key) { codex mcp add exa --url "${ExaUrl}?exaApiKey=$Key" }
    else { codex mcp add exa --url $ExaUrl }
}

function Register-ClaudeArgent {
    claude mcp remove -s user argent *> $null
    claude mcp add -s user argent -- argent mcp
}

function Register-GrokArgent {
    grok mcp remove -s user argent *> $null
    grok mcp add -s user argent -- argent mcp
}

function Register-CodexArgent {
    codex mcp remove argent *> $null
    codex mcp add argent -- argent mcp
}

function Register-CliMcps {
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string]$Cli,
        [Parameter(Mandatory)][bool]$Skip,
        [string]$Key
    )
    Write-Host "== $Label =="
    if ($Skip) {
        Write-Host "skipped: $Cli"
        return
    }
    if (-not (Test-CliPresent $Cli)) {
        Write-Host "not detected: $Cli"
        return
    }
    $names = [System.Collections.Generic.List[string]]::new()
    if ($script:WantExa) {
        switch ($Cli) {
            'claude' { Register-ClaudeExa -Key $Key *> $null }
            'codex' { Register-CodexExa -Key $Key *> $null }
            'grok' { Register-GrokExa -Key $Key *> $null }
        }
        # PS 7.0-7.2 does not turn a nonzero native exit into a terminating error,
        # and `*> $null` hides the CLI's message, so check the status explicitly.
        if ($LASTEXITCODE -ne 0) { throw "$Cli mcp add exa failed (exit $LASTEXITCODE)" }
        $names.Add('exa')
    }
    if ($script:WantArgent) {
        switch ($Cli) {
            'claude' { Register-ClaudeArgent *> $null }
            'codex' { Register-CodexArgent *> $null }
            'grok' { Register-GrokArgent *> $null }
        }
        if ($LASTEXITCODE -ne 0) { throw "$Cli mcp add argent failed (exit $LASTEXITCODE)" }
        $names.Add('argent')
    }
    if ($names.Count -gt 0) {
        Write-Host ("registered: {0}" -f ($names -join ' '))
    } else {
        Write-Host 'nothing to register'
    }
}

function Invoke-McpInstall {
    if ($Help.IsPresent) { Show-Usage; return }
    if ($SkipClaude.IsPresent -and $SkipCodex.IsPresent -and $SkipGrok.IsPresent) {
        throw 'every CLI skipped; nothing to do'
    }
    if ($script:McpProvided) {
        if ([string]::IsNullOrWhiteSpace($Mcp)) { throw 'no MCP selected' }
        Set-McpSelectionFromList -List $Mcp
    } else {
        Select-McpsInteractive
    }
    if ($script:WantExa) {
        if ($script:ExaKeyProvided) {
            $script:ApiKey = $ExaKey
        } else {
            $script:ApiKey = Read-ApiKey
        }
    }
    if ($script:WantArgent) {
        Assert-NodeForArgent
        Install-ArgentPackage
        Install-ArgentSkills -SkipClaude $SkipClaude.IsPresent -SkipCodex $SkipCodex.IsPresent -SkipGrok $SkipGrok.IsPresent
    }
    if ($script:WantCodexCc) {
        Install-CodexCcPlugin -SkipClaudeCli $SkipClaude.IsPresent
    }
    if ($script:WantExa -or $script:WantArgent) {
        Register-CliMcps -Label 'Claude Code' -Cli 'claude' -Skip $SkipClaude.IsPresent -Key $script:ApiKey
        Register-CliMcps -Label 'Codex' -Cli 'codex' -Skip $SkipCodex.IsPresent -Key $script:ApiKey
        Register-CliMcps -Label 'Grok' -Cli 'grok' -Skip $SkipGrok.IsPresent -Key $script:ApiKey
    }
}

try {
    Invoke-McpInstall
} catch {
    Write-Error $_
    exit 1
}
