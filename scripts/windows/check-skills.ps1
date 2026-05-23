param(
    [string]$RepoPath = ""
)

$ErrorActionPreference = "Stop"

if (-not $RepoPath) {
    $RepoPath = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

$SkillsSrc    = Join-Path $RepoPath ".claude\skills"
$ClaudeLink   = Join-Path $HOME ".claude\skills"
$CodexDir     = Join-Path $HOME ".codex\skills"
$ClaudeMdSrc  = Join-Path $RepoPath ".claude\CLAUDE.md"
$ClaudeMdLink = Join-Path $HOME ".claude\CLAUDE.md"
$AgentsMdSrc  = Join-Path $RepoPath ".codex\AGENTS.md"
$AgentsMdLink = Join-Path $HOME ".codex\AGENTS.md"
$RulesSrc     = Join-Path $RepoPath ".cursor\rules"
$ExpectedRules = @("pr-workflow.mdc")

$script:pass = 0
$script:fail = 0

function Normalize-Path([string]$p) {
    if (-not $p) { return $p }
    $p = $p -replace '^\\\\\?\\', ''
    return $p.TrimEnd('\')
}

function Check-Link {
    param(
        [string]$Link,
        [string]$Expected,
        [string]$Label
    )

    if (-not (Test-Path -LiteralPath $Link)) {
        Write-Host "  [FAIL] $Label : missing" -ForegroundColor Red
        $script:fail++
        return
    }

    $item = Get-Item -LiteralPath $Link -Force
    if (-not $item.LinkType) {
        $kind = if ($item.PSIsContainer) { "real directory" } else { "real file" }
        Write-Host "  [FAIL] $Label : exists but is not a link ($kind)" -ForegroundColor Red
        $script:fail++
        return
    }

    $rawTarget = $item.Target
    if ($rawTarget -is [array]) { $rawTarget = $rawTarget[0] }
    $target   = Normalize-Path $rawTarget
    $expected = Normalize-Path $Expected

    if ($target -ieq $expected) {
        Write-Host "  [OK]   $Label  ($($item.LinkType) -> $target)" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  [WARN] $Label : points to $target (expected $expected)" -ForegroundColor Yellow
        $script:fail++
    }
}

Write-Host "=== Skills Setup Check ===" -ForegroundColor Cyan
Write-Host "Repo:    $RepoPath"
Write-Host "Source:  $SkillsSrc"
Write-Host ""

if (-not (Test-Path -LiteralPath $SkillsSrc)) {
    Write-Host "[FAIL] source directory missing: $SkillsSrc" -ForegroundColor Red
    exit 1
}

Write-Host "--- Claude ($ClaudeLink) ---" -ForegroundColor Cyan
Check-Link -Link $ClaudeLink -Expected $SkillsSrc -Label "skills"
Write-Host ""

Write-Host "--- Codex ($CodexDir) ---" -ForegroundColor Cyan
if (-not (Test-Path -LiteralPath $CodexDir)) {
    Write-Host "  [FAIL] directory does not exist" -ForegroundColor Red
    $script:fail++
} else {
    $marker = Join-Path $CodexDir ".system\.codex-system-skills.marker"
    if (Test-Path -LiteralPath $marker) {
        Write-Host "  [OK]   .system\ bundled skills preserved" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  [FAIL] .system\.codex-system-skills.marker missing" -ForegroundColor Red
        $script:fail++
    }

    $repoSkills    = Get-ChildItem -Directory -LiteralPath $SkillsSrc | Sort-Object Name
    $codexEntries  = Get-ChildItem -LiteralPath $CodexDir -Force -ErrorAction SilentlyContinue |
                     Where-Object { $_.Name -ne '.system' }

    foreach ($s in $repoSkills) {
        $link = Join-Path $CodexDir $s.Name
        Check-Link -Link $link -Expected $s.FullName -Label $s.Name
    }

    $repoNames    = $repoSkills.Name
    $orphanLinks  = $codexEntries | Where-Object { $repoNames -notcontains $_.Name }
    if ($orphanLinks) {
        Write-Host ""
        Write-Host "  Orphan entries in $CodexDir (not present in repo):" -ForegroundColor Yellow
        foreach ($o in $orphanLinks) {
            $type = if ($o.LinkType) { $o.LinkType } else { "(real)" }
            Write-Host "    - $($o.Name) [$type]" -ForegroundColor Yellow
        }
    }
}
Write-Host ""

Write-Host "--- Cursor rules (repo: $RulesSrc) ---" -ForegroundColor Cyan
if (-not (Test-Path -LiteralPath $RulesSrc)) {
    Write-Host "  [INFO] no .cursor\rules directory in repo (optional)" -ForegroundColor DarkGray
} else {
    foreach ($rule in $ExpectedRules) {
        $path = Join-Path $RulesSrc $rule
        if (Test-Path -LiteralPath $path) {
            Write-Host "  [OK]   $rule present in repo" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host "  [FAIL] $rule missing in repo" -ForegroundColor Red
            $script:fail++
        }
    }
}
Write-Host "  [INFO] ~/.cursor/rules is not checked; configure rules in Cursor Settings or per project." -ForegroundColor DarkGray
Write-Host ""

Write-Host "--- Global Instructions ---" -ForegroundColor Cyan
if (-not (Test-Path -LiteralPath $ClaudeMdSrc)) {
    Write-Host "  [FAIL] source file missing: $ClaudeMdSrc" -ForegroundColor Red
    $script:fail++
} else {
    Check-Link -Link $ClaudeMdLink -Expected $ClaudeMdSrc -Label "~/.claude/CLAUDE.md"
}
if (-not (Test-Path -LiteralPath $AgentsMdSrc)) {
    Write-Host "  [FAIL] source file missing: $AgentsMdSrc" -ForegroundColor Red
    $script:fail++
} else {
    Check-Link -Link $AgentsMdLink -Expected $AgentsMdSrc -Label "~/.codex/AGENTS.md"
}
Write-Host ""

Write-Host "=== Summary: $script:pass pass, $script:fail fail ===" -ForegroundColor Cyan
if ($script:fail -eq 0) {
    Write-Host "All good." -ForegroundColor Green
} else {
    Write-Host "Run setup-claude-skills.bat / setup-codex-skills.bat to fix." -ForegroundColor Yellow
}

if ($script:fail -gt 0) { exit 1 } else { exit 0 }
