param(
    [string]$RepoPath = ""
)

$ErrorActionPreference = "Stop"

if (-not $RepoPath) {
    $RepoPath = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

$SkillsSrc  = Join-Path $RepoPath ".claude\skills"
$ClaudeLink = Join-Path $HOME ".claude\skills"
$CodexDir   = Join-Path $HOME ".codex\skills"

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
        Write-Host "  [FAIL] $Label : exists but is not a link (real directory)" -ForegroundColor Red
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

Write-Host "=== Summary: $script:pass pass, $script:fail fail ===" -ForegroundColor Cyan
if ($script:fail -eq 0) {
    Write-Host "All good." -ForegroundColor Green
} else {
    Write-Host "Run setup-claude-skills.bat / setup-codex-skills.bat to fix." -ForegroundColor Yellow
}

if ($script:fail -gt 0) { exit 1 } else { exit 0 }
