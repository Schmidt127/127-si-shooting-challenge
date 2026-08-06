# Final Airtable paste and verify — 2026-08-06

**PROD base:** `appn84sqPw03zEbTT`  
**Controlled enrollment:** `recCyFEPeATOVNlr9`  
**Do not use for current tests:** `recgP9qZYjAhE7NXm` (older 2025–26 Schmidt)  
**Repo tip when written:** see reconciliation report (must include Automation **066 v3.4** on `master`)

This checklist lists **only** Mike Airtable UI actions that still remain. Repository work for these scripts is complete.

---

## Already done (do not repeat)

| Item | State |
|------|--------|
| Automation **033 v3.3** | **Operator-attested pasted** by Mike — do not paste again. Live verification optional if not yet run. |
| Automation **059** trigger | **Operator-attested corrected** (Pending-only; no Shot Milestone filter). Test input = **Athlete Achievement Unlock** record ID — never WAS. |
| Overnight PRs #81–#86 | Merged to `master` |
| PR **#88** | Merged — Automation **066 v3.4** is on `master` (repo). **Not Installed in PROD** until paste below. |

---

## Remaining Mike actions (exact)

### 1. Paste Automation **066 v3.4** (required)

| Field | Value |
|-------|--------|
| Automation | **066** — Create Shot Milestone Unlocks |
| Version | **v3.4** |
| Repository path | `airtable/automations/shooting-challenge/066-achievements-and-milestones-create-shot-milestone-unlocks.js` |
| Full script replacement? | **Yes** — replace entire script body (production docblock through end). Skip GitHub header comment only. |
| Companion | [`066-v3.4-create-records-fields-fix.md`](./066-v3.4-create-records-fields-fix.md) |
| Input variable | `recordId` |
| Triggering table | Enrollments |
| Trigger conditions | `Run Shot Milestone Check?` is checked |
| Exact test record | **`recCyFEPeATOVNlr9`** |
| Expected console | `"version": "v3.4"`, `statusOut=success`, no `fields` property error |
| Expected field changes | Existing unlocks linked/updated/skipped; `Run Shot Milestone Check?` cleared on success |
| Duplicate-safety | Existing `SHOT_MILESTONE\|recCyFEPeATOVNlr9\|*` unlocks/XP must **not** be recreated — expect `createdUnlocksOut=0` if all already unlocked |
| PASS criteria | Run completes without error; console shows v3.4; no new duplicate Source Keys / XP Events for already-awarded milestones |

**Do not** mark 066 natural path Live Tested until this paste + rerun PASS.

---

### 2. Paste Automation **020 v3.2.0** (required — not confirmed pasted)

| Field | Value |
|-------|--------|
| Automation | **020** — Link or Create Homework Completion |
| Version | **v3.2.0** |
| Repository path | `airtable/automations/shooting-challenge/020-homework-link-or-create-homework-completion.js` |
| Full script replacement? | **Yes** |
| Input variable | Confirm in Airtable UI (typically Submission Asset / homework-ready path `recordId`) |
| Triggering table | Submission Assets (homework asset ready for HC prep) — confirm live UI conditions |
| Exact test record | Controlled Schmidt path on enrollment **`recCyFEPeATOVNlr9`** (new homework asset → existing assignment) |
| Expected behavior | Prefer Enrollment+Week+Homework+Slot identity; re-submit merges onto one HC |
| Duplicate-safety | Second submit must **not** create a second HC / second Homework XP for same identity |
| PASS criteria | Console/version shows v3.2.0 (or SCRIPT.version); one HC per identity after re-submit |

Until pasted, repo status remains **Built in Repository** (PHA table/seed already live).

---

### 3. Optional — 033 live verification only (script already pasted)

| Field | Value |
|-------|--------|
| Automation | **033 v3.3** (already pasted) |
| Action | Do **not** re-paste. Optionally Test assign on WAS `recKebuZ79QFTwivA` or a current-week WAS for `recCyFEPeATOVNlr9` |
| PASS | `WAS.Homework` filled from active Program Homework Assignments; no duplicate assignment rows |

---

### Explicitly not on this list

- unloadData pack (031/035/042/114/118/119) — separate package; not required for 066/020 closeout today  
- 057 downgrade — **forbidden** (PROD/repo **v1.5**)  
- 117a/117b/117c — **not** PROD Airtable slots  
- Emails / Make / Lambda / Fillout / Vercel changes  

---

## Local repository sync (PowerShell)

Mike’s machine may still be on `overnight/2026-08-05-agent2-foundation` with untracked Cursor/probe files.

```powershell
# Safe sync to origin/master after overnight merge + PR #88
# Run from the 127-si-shooting-challenge clone root.

# 1) Preserve untracked/generated files (does NOT delete anything)
git stash push -u -m "pre-master-sync-$(Get-Date -Format yyyyMMdd-HHmmss)"

# 2) Fetch + prune
git fetch origin --prune

# 3) Switch to master
git switch master

# 4) Fast-forward only (fails if local master diverged — stop and ask Cursor)
git pull --ff-only origin master

# 5) Confirm local HEAD == origin/master
$local = git rev-parse HEAD
$remote = git rev-parse origin/master
if ($local -ne $remote) { throw "HEAD mismatch: local=$local remote=$remote" }
Write-Host "OK HEAD=$local"

# 6) Confirm Automation 066 is v3.4
Select-String -Path "airtable/automations/shooting-challenge/066-achievements-and-milestones-create-shot-milestone-unlocks.js" -Pattern 'version:\s*"v3\.4"|Version:\s*v3\.4' | Select-Object -First 3

# 7) Optionally restore stash (keeps untracked probes/evidence)
git stash pop
# If conflicts on tracked files: resolve carefully; do NOT git clean -fdx

# WARNINGS
# - Do NOT run: git clean -fd / git clean -fdx
# - Do NOT blindly commit .cursor/, probe JSON dumps, or generated test-result folders
# - Current controlled enrollment for live tests: recCyFEPeATOVNlr9
# - Do NOT use older enrollment recgP9qZYjAhE7NXm for current season tests
```

---

## After Mike completes pastes

Reply with:

1. 066 paste done + Test console JSON (`version`, `statusOut`, `createdUnlocksOut`, `errorOut`)  
2. 020 paste done + one re-submit identity result  
3. Optional 033 verification note  

Cursor will then update Installed / Live Tested claims honestly.
