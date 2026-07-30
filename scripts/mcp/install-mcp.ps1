#Requires -Version 7.0
[CmdletBinding()]
param(
    [switch]$SkipClaude,
    [switch]$SkipCodex,
    [switch]$SkipGrok,
    [Alias('h')][switch]$Help
)

$ErrorActionPreference = 'Stop'
$ExaUrl = 'https://mcp.exa.ai/mcp'

function Show-Usage {
    @'
Register MCP servers with detected Claude Code, Codex, and Grok CLIs.
Prompts once for an Exa API key; a blank answer registers Exa's free tier.

Usage: install-mcp.ps1 [-SkipClaude] [-SkipCodex] [-SkipGrok] [-Help]

  -SkipClaude  Do not configure Claude Code.
  -SkipCodex   Do not configure Codex.
  -SkipGrok    Do not configure Grok.
  -Help        Show this help.

The key is stored in plaintext by each CLI (~/.claude.json, ~/.codex/config.toml,
~/.grok/config.toml). Get one at https://dashboard.exa.ai/api-keys.
Remove a server with: claude mcp remove -s user exa
                      codex mcp remove exa
                      grok mcp remove exa
'@ | Write-Host
}

function Test-CliPresent {
    param([Parameter(Mandatory)][string]$Name)
    $null -ne (Get-Command -Name $Name -CommandType Application, ExternalScript -ErrorAction SilentlyContinue)
}

function Read-ApiKey {
    if (-not [Environment]::UserInteractive -or [Console]::IsInputRedirected) {
        throw 'no interactive terminal; cannot prompt for the Exa API key'
    }
    $secure = Read-Host 'Exa API key (blank for the free tier, input hidden)' -AsSecureString
    [System.Net.NetworkCredential]::new('', $secure).Password
}

# Each Register-* removes any existing entry first so re-runs stay idempotent.
function Register-Claude {
    param([string]$Key)
    claude mcp remove -s user exa *> $null
    if ($Key) { claude mcp add -s user -t http exa $ExaUrl -H "x-api-key: $Key" }
    else { claude mcp add -s user -t http exa $ExaUrl }
}

function Register-Grok {
    param([string]$Key)
    grok mcp remove exa *> $null
    if ($Key) { grok mcp add -s user -t http exa $ExaUrl -H "x-api-key: $Key" }
    else { grok mcp add -s user -t http exa $ExaUrl }
}

# codex mcp add has no header flag, so the key rides the query string instead.
function Register-Codex {
    param([string]$Key)
    codex mcp remove exa *> $null
    if ($Key) { codex mcp add exa --url "${ExaUrl}?exaApiKey=$Key" }
    else { codex mcp add exa --url $ExaUrl }
}

function Register-Cli {
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string]$Cli,
        [Parameter(Mandatory)][bool]$Skip,
        [Parameter(Mandatory)][string]$Function,
        [string]$Key
    )
    Write-Host "== $Label =="
    if ($Skip) {
        Write-Host "skipped: $Cli"
    } elseif (Test-CliPresent $Cli) {
        & $Function -Key $Key *> $null
        Write-Host 'registered: exa'
    } else {
        Write-Host "not detected: $Cli"
    }
}

function Invoke-McpInstall {
    if ($Help.IsPresent) { Show-Usage; return }
    if ($SkipClaude.IsPresent -and $SkipCodex.IsPresent -and $SkipGrok.IsPresent) {
        throw 'every CLI skipped; nothing to do'
    }
    $key = Read-ApiKey
    Register-Cli -Label 'Claude Code' -Cli 'claude' -Skip $SkipClaude.IsPresent -Function 'Register-Claude' -Key $key
    Register-Cli -Label 'Codex' -Cli 'codex' -Skip $SkipCodex.IsPresent -Function 'Register-Codex' -Key $key
    Register-Cli -Label 'Grok' -Cli 'grok' -Skip $SkipGrok.IsPresent -Function 'Register-Grok' -Key $key
}

try {
    Invoke-McpInstall
} catch {
    Write-Error $_
    exit 1
}
