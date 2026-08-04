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
$CodexCcMarketplace = 'openai/codex-plugin-cc'
$CodexCcPlugin = 'codex@openai-codex'
$script:WantExa = $false
$script:WantCodexCc = $false
$script:ApiKey = ''
# Script-level $PSBoundParameters (not available inside nested functions).
$script:McpProvided = $PSBoundParameters.ContainsKey('Mcp')
$script:ExaKeyProvided = $PSBoundParameters.ContainsKey('ExaKey')

function Show-Usage {
    @'
Register selected MCP servers with detected Claude Code, Codex, and Grok CLIs.

Usage: install-mcp.ps1 [-Mcp <list>] [-ExaKey <key>] [-SkipClaude] [-SkipCodex] [-SkipGrok] [-Help]

  -Mcp         Comma-separated ids: exa, codex-cc, or all.
               Omit for interactive checkbox picker (TTY required).
  -ExaKey      Exa API key (empty = free tier). Skip prompt when bound.
  -SkipClaude  Do not configure Claude Code.
  -SkipCodex   Do not configure Codex.
  -SkipGrok    Do not configure Grok.
  -Help        Show this help.

MCPs:
  exa       Exa search (HTTP). Optional API key → https://dashboard.exa.ai/api-keys
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
    $script:WantCodexCc = $false
    foreach ($raw in ($List -split '[,;\s]+')) {
        $item = $raw.Trim().ToLowerInvariant()
        if (-not $item) { continue }
        switch ($item) {
            'all' { $script:WantExa = $true; $script:WantCodexCc = $true }
            'exa' { $script:WantExa = $true }
            'codex-cc' { $script:WantCodexCc = $true }
            default { throw "unknown MCP: $item (want: exa, codex-cc, all)" }
        }
    }
    if (-not $script:WantExa -and -not $script:WantCodexCc) {
        throw 'no MCP selected'
    }
}

function Select-McpsInteractive {
    if (-not [Environment]::UserInteractive -or [Console]::IsInputRedirected) {
        throw 'no interactive terminal; pass -Mcp exa,codex-cc (or all)'
    }
    $onExa = $true
    $onCodexCc = $true
    while ($true) {
        Write-Host ''
        Write-Host 'Select MCP servers to install (number toggles, Enter confirms):'
        Write-Host ("  [{0}] 1  exa      - Exa search (optional API key)" -f ($(if ($onExa) { 'x' } else { ' ' })))
        Write-Host ("  [{0}] 2  codex-cc - Codex plugin for Claude Code (not an MCP)" -f ($(if ($onCodexCc) { 'x' } else { ' ' })))
        $choice = Read-Host '>'
        if ([string]::IsNullOrWhiteSpace($choice)) { break }
        switch ($choice.Trim()) {
            '1' { $onExa = -not $onExa }
            '2' { $onCodexCc = -not $onCodexCc }
            default { Write-Host '  (enter 1-2 to toggle, or Enter to confirm)' }
        }
    }
    $script:WantExa = $onExa
    $script:WantCodexCc = $onCodexCc
    if (-not $script:WantExa -and -not $script:WantCodexCc) {
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

# Claude Code plugin (not an MCP). Install once; no per-CLI mcp add.
function Install-CodexCcPlugin {
    param([Parameter(Mandatory)][bool]$SkipClaudeCli)
    Write-Host '== Codex plugin (Claude Code) =='
    if ($SkipClaudeCli -or -not (Test-CliPresent 'claude')) {
        if (-not $script:WantExa) {
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
    if ($script:WantCodexCc) {
        Install-CodexCcPlugin -SkipClaudeCli $SkipClaude.IsPresent
    }
    if ($script:WantExa) {
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
