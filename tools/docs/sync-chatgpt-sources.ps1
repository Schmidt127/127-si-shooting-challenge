# Sync canonical docs into docs/chatgpt-sources/ for ChatGPT Project Sources import.
# Run from repo root: .\tools\docs\sync-chatgpt-sources.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$dest = Join-Path $root "docs\chatgpt-sources"

if (-not (Test-Path $dest)) {
    New-Item -ItemType Directory -Path $dest | Out-Null
}

$maps = @(
    @{ Src = "docs\v2\01-constitution.md"; Dst = "01-constitution.md" },
    @{ Src = "docs\shooting-challenge-v2-master-direction.md"; Dst = "02-master-direction.md" },
    @{ Src = "docs\v2\03-business-rules.md"; Dst = "03-business-rules.md" },
    @{ Src = "docs\v2\season-configuration-design.md"; Dst = "04-season-configuration-design.md" },
    @{ Src = "docs\shooting-challenge-v2-config-vs-code.md"; Dst = "05-config-vs-code.md" },
    @{ Src = "docs\shooting-challenge-v2-base-cutover.md"; Dst = "06-base-cutover.md" },
    @{ Src = "docs\PROJECT_STATE.md"; Dst = "07-project-state.md" },
    @{ Src = "docs\xp-motivation-analysis-2025-26.md"; Dst = "08-xp-motivation-analysis-2025-26.md" },
    @{ Src = "AGENTS.md"; Dst = "09-agents.md" },
    @{ Src = "SYSTEM_OVERVIEW.md"; Dst = "10-system-overview.md" },
    @{ Src = "docs\v2\level-gate-rules-config-template.csv"; Dst = "11-level-gate-rules-config-template.csv" },
    @{ Src = "docs\v2\04-ai-development-standards.md"; Dst = "12-ai-development-standards.md" },
    @{ Src = "docs\v2\05-system-architecture.md"; Dst = "13-system-architecture.md" },
    @{ Src = "docs\v2\06-automation-standards.md"; Dst = "14-automation-standards.md" },
    @{ Src = "docs\v2\07-ui-standards.md"; Dst = "15-ui-standards.md" },
    @{ Src = "docs\v2\08-testing-standards.md"; Dst = "16-testing-standards.md" },
    @{ Src = "docs\v2\09-release-notes.md"; Dst = "17-release-notes.md" },
    @{ Src = "docs\close-out-considerations.md"; Dst = "18-close-out-considerations.md" },
    @{ Src = "docs\asset-storage-migration.md"; Dst = "19-asset-storage-migration.md" },
    @{ Src = "docs\testing-and-intake-architecture.md"; Dst = "20-testing-and-intake-architecture.md" },
    @{ Src = "docs\platform-config-improvements.md"; Dst = "21-platform-config-improvements.md" },
    @{ Src = "docs\v2-change-backlog.md"; Dst = "22-v2-change-backlog.md" },
    @{ Src = "docs\CHATGPT-MASTER-PLAN-BRIEF.md"; Dst = "23-master-plan-brief.md" }
)

$copied = 0
foreach ($m in $maps) {
    $srcPath = Join-Path $root $m.Src
    $dstPath = Join-Path $dest $m.Dst
    if (-not (Test-Path $srcPath)) {
        Write-Warning "Missing source, skipping: $($m.Src)"
        continue
    }
    Copy-Item -Path $srcPath -Destination $dstPath -Force
    $copied++
}

$stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
$startHere = Join-Path $dest "00-START-HERE.md"
if (Test-Path $startHere) {
    $content = Get-Content $startHere -Raw
    if ($content -match '\*Last synced:.*\*') {
        $content = $content -replace '\*Last synced:.*\*', "*Last synced: $stamp (local)*"
        Set-Content -Path $startHere -Value $content -NoNewline
    }
}

Write-Host "Synced $copied files to docs/chatgpt-sources/"
Write-Host "Import this folder into ChatGPT Project Sources."
