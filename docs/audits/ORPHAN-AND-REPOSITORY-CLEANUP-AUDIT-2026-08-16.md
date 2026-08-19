# Orphan and Repository Cleanup Audit — 2026-08-16

**Status:** Current (audit report)  
**Repository:** `Schmidt127/127-si-shooting-challenge`  
**Audit tip:** `827fc82309af74d684bd5a732a0189535bb24533` (`master` = `origin/master`)  
**Controlling status doc:** [`docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](../SHOOTING_CHALLENGE_COMPLETION_MASTER.md)  
**Authority map:** [`docs/AUTHORITY-MAP.md`](../AUTHORITY-MAP.md)

**Hard rules applied:** No deletions of branches, commits, Git objects, or historical documents. No Airtable / Make / Fillout / Lambda / Vercel changes. No production code changes. Safe reconciliation limited to labels, pointers, and version cross-references.

**Label legend:** Current · Historical · Superseded · Archived · Retired · Needs review · Orphan candidate · Duplicate candidate

**Section 7 guardrail:** Do **not** reintroduce the outdated claims listed by Mike (Early Bird Aug 9 2026–May 1 2027; Early Bird counts toward challenge; Weeks `Counts Toward Challenge?`; premature automation/completion assertions). GitHub SCRIPT versions below are repository facts only — live Airtable paste state requires Mike UI confirmation.

---

## 1. Repository state

| Item | Value |
|------|-------|
| Branch | `master` (this audit branch created for report + safe docs only) |
| HEAD / origin/master | `827fc82` — Merge PR #220 (`fix/022-align-production-v2.0`) |
| Ahead / behind origin/master | **0 / 0** |
| Local branches | **159** |
| Remote branches | **230** |
| Remote merged into `origin/master` | **128** |
| Remote not merged | **102** |
| Open PRs | **6** (2 ready, 4 draft) |
| Unreachable objects (`git fsck --unreachable --no-reflogs`) | **~1337** lines: **160** commits, **668** trees, **509** blobs |
| Nested clone (ignored) | `127-si-shooting-challenge/` — gitignored (`/127-si-shooting-challenge/`) |
| Recovery folder (ignored) | `chatgpt-recovery-2026-07-14/` — gitignored |
| CONTROL.json canonical SHA | Stale vs tip: records `2f8188bc…` (2026-08-13 PKG-033 baseline) — **Needs review** (Lead refresh), not auto-edited here |
| Unrelated untracked working tree | Impeccable skill trees, probe scripts, `test-results/`, asset folders — **not touched** |

---

## 2. Branch inventory

### 2.1 Keep active (Current)

| Branch / tip | Why keep |
|--------------|----------|
| `master` @ `827fc82` | Canonical integration branch |
| Open PR heads: `fix/005-010-date-only-midnight-utc` (#218), `rewrite/022-child-upload-writeback` (#217) | Active work |
| Draft PR heads: `cursor/prepare-remaining-reliability-packages-69fc` (#214), `cursor/pkg-038-closeout-docs-cff3` (#213), `cursor/impeccable-design-context-d7f5` (#186), `cursor/pkg-028-generic-email-dispatcher-a848` (#162) | Open drafts — do not delete |

### 2.2 Local branches already merged into `master` (archive candidates)

Representative set (full list from `git branch --merged master`; **~80** local tips). Examples:

| Branch | Tip (abbrev) | Unique work? | Replaced by | Safe to archive? | Mike approval? |
|--------|--------------|--------------|-------------|------------------|----------------|
| `fix/010-airtable-date-normalization` | merged via #216 | No (on master) | master | Yes (delete remote+local after OK) | **Yes** |
| `hotfix/pkg-006-*`, `pkg-034-*`, `pkg-036-*` merged tips | various | No | master | Yes | **Yes** |
| `agent/daily-submission-hub-handoff`, `agent/participation-workflow-audit`, … | merged | No | master | Yes | **Yes** |
| `feature/scv2-web-player-profiles-001`, brand redesign, etc. | merged | No | master | Yes | **Yes** |
| `test/airtable-runtime-compatibility-gate` | merged #189 | No | master | Yes | **Yes** |

**Verdict:** Merged branches contain no unique unmerged work relative to `master`. Safe to **delete after Mike approval**. Do not `git gc --prune` until Mike approves object cleanup.

### 2.3 Not merged — unique or superseded work (Needs review)

| Branch | Notes | Unique work? | Safe to archive? | Mike approval? |
|--------|-------|--------------|------------------|----------------|
| `fix/005-010-date-only-midnight-utc` | Open PR #218 | Yes | No until PR closed | Keep |
| `rewrite/022-child-upload-writeback` | Open PR #217; may supersede or conflict with merged 022 v2.0 alignment | Yes | No | Keep + review vs #220 |
| `agent/prevent-duplicate-enrollments` | Sibling of merged `-pr` tip | Possible duplicate of #150 | Soft-archive | **Yes** |
| `agent/app-base-closeout-001` | Closed PR #136 (superseded by #135) | Partial | Soft-archive | **Yes** |
| `cursor/sc-p3-*` worktrees | Merged via #111–#115; local tips behind | Mostly merged | Soft-archive | **Yes** |
| `docs/pkg-001`…`003`, `draft/pkg-001`…`003` | Merged via #142–#146; tips behind master by hundreds | Historical drafts | Soft-archive | **Yes** |
| `overnight/v2-run/worker-*` | Stage worker tips; much integrated via `overnight/lead-integration` | Some archaeology | Soft-archive | **Yes** |
| `archive/go-live-probes-snapshots-2026-07-24` | Explicit archive branch | Evidence | Keep as Archived | Prefer keep |
| `feature/122-prod-airtable-safety` | Local-only tip | Possible unique | Needs review | **Yes** |
| `continuation/go-live-second-pass` (local, no remote track in list) | Docs purge | Likely superseded | Soft-archive | **Yes** |

### 2.4 Stale / no recent commits

Most overnight (2026-07-12, 2026-07-21) and agent1–13 tips have not moved since their package close. Label **Historical / Orphan candidate** for deletion after Mike approval. Prefer remote retention until a single “branch retirement” pass.

### 2.5 Work merged under a different branch name

| Original branch | Landed via | Notes |
|-----------------|------------|-------|
| `agent/prevent-duplicate-enrollments` | `…-pr` → #150 | Duplicate local tip |
| `agent/app-base-closeout-001` | `scv2-app-base-closeout-001` → #135 | #136 closed unmerged |
| PKG-041 runtime drafts #191–#193 | Closed; work absorbed into #189/#190 path | Branch tips may still exist remotely as deleted `pr/191`–`193` after prune |
| Superseded package drafts #127–#131, #161, #199, #212 | Closed without merge; retirement doc exists | See `docs/archive/PR-RETIREMENT-2026-08-10.md` |

---

## 3. Orphan commit / tree / blob findings

| Finding | Object IDs (samples) | Why orphaned | Unique work? | Safe to purge? | Mike approval? |
|---------|----------------------|--------------|--------------|----------------|----------------|
| Unreachable commits | e.g. `5b01abd3…`, `5f025c8f…`, `db04a74a…` (~160) | Rewritten / rebase / replaced PR tips; no ref | Possibly superseded patches | Soft only (`git gc` after reflog expiry) | **Yes** before prune |
| Unreachable trees | e.g. `310013c4…`, `3500a28a…` (~668) | Orphaned commit trees | N/A | Same | **Yes** |
| Unreachable blobs | e.g. `730062e0…`, `5f0115ac…` (~509) | Orphaned file contents | Rarely unique vs master | Same | **Yes** |
| Duplicate commit content | Common on overnight workers (same SHAs shared across worker-a/b/c tips) | Parallel integrates | No unique | Do not delete history | N/A |
| Local commits ahead of origin/master | **None** on `master` | — | — | — | — |

**Do not run** `git prune`, `gc --prune=now`, or force-delete unreachable objects without Mike approval. Refs on open/closed PR branches may still be needed for archaeology.

---

## 4. Pull request reconciliation

### 4.1 Open (ready)

| PR | Branch | Notes | Branch archive? |
|----|--------|-------|-----------------|
| [#218](https://github.com/Schmidt127/127-si-shooting-challenge/pull/218) | `fix/005-010-date-only-midnight-utc` | Active date-normalization fix | Keep |
| [#217](https://github.com/Schmidt127/127-si-shooting-challenge/pull/217) | `rewrite/022-child-upload-writeback` | Rewrite vs merged #220 022 v2.0 alignment — **Needs review** for supersession | Keep until Mike decides |

### 4.2 Open (draft)

| PR | Notes |
|----|-------|
| #214 PKG-039/009/037 prep | Active draft |
| #213 PKG-038 closeout docs | Active draft |
| #186 Impeccable public pages | Draft; design |
| #162 PKG-028 email dispatcher | Draft; CONTROL notes avoid overlapping #161/#162 |

### 4.3 Closed unmerged (safe branch archive after Mike OK)

| PR | Head | Why closed | Unique work? |
|----|------|------------|--------------|
| #212 | `cursor/pkg-038-operator-package-d76c` | Superseded by #213 | Partial → #213 |
| #199 | `pkg-003-doc-contract-reconciliation-20260814` | Superseded by #200 | No |
| #193/#192/#191 | runtime drafts | Superseded by #189/#190 | Absorbed |
| #161 | `improvement/pkg-028-…` | Closed; #162 remains | Partial |
| #136 | `agent/app-base-closeout-001` | Superseded by #135 | Partial |
| #131/#130/#129/#127 | Season launch drafts | Retired 2026-08-10 | Historical |

### 4.4 Recently merged (documentation may lag)

| PR | Gap |
|----|-----|
| #220 022 v2.0 align | Index/Master OK; inventory OK for 022 |
| #219 current-state reconcile | Driving Aug 16 packet |
| #216 010 date normalization | Index still **v10.9** while GitHub **v10.10** |
| #208/#207/#179 010 path | Operator packets still say **v10.9** |

Remaining review comments: not bulk-fetched; treat any unresolved threads on open PRs as **Needs review** per PR UI.

---

## 5. Orphan and duplicate file findings

### 5.1 High-signal orphan / scratch candidates (do not delete)

| Path | Why orphaned | Unique? | Replaced by | Safe to archive? | Mike OK? |
|------|--------------|---------|-------------|------------------|----------|
| `docs/testing/evidence/2026-08-04-package-02-critical-pastes/_*.py` | One-off probes | Evidence | Dated JSON/MD | Soft-label Historical | Yes before delete |
| Untracked `tools/testing/probe_*.mjs`, `retrigger_057*.mjs` | Scratch | Possibly | — | Soft-archive | Yes |
| Untracked `tools/airtable/New Text Document*.txt` | Accidental | No | — | Delete OK if empty/junk | Yes |
| Untracked `duplicate-enrollment-guard-v5.3.patch` | Patch leftover | Maybe | merged enrollment work | Soft-archive | Yes |
| Untracked `test-results/` | Local Playwright | No | — | gitignore / leave | Prefer ignore |
| `docs/overnight/`, `docs/recovery/`, `docs/foundation-reset/` | Dated evidence | Yes | Completion Master for *status* | Historical label | Prefer keep |
| `docs/deploy-checklists/*PASTE*.txt` stacks (115 ETF v1.4–v1.8, 070b v4.2) | Superseded pastes | Diff archaeology | Current scripts | Soft-archive | Yes |
| `docs/chatgpt-sources/*` | Sync mirrors | Duplicate of v2/masters | Live docs | Duplicate candidate | Keep as sync target |
| Nested `127-si-shooting-challenge/` | Accidental clone | Confusion risk | Canonical tree | Already gitignored | Do not commit; optional local delete |
| `chatgpt-recovery-2026-07-14/` | Recovery snapshot | Historical | — | Already gitignored | Prefer keep locally |
| `.cursor/skills/impeccable` vs `.github/skills/impeccable` | Dual install | Tooling dup | — | Duplicate candidate | Out of product scope |
| `airtable/.../_superseded/117a|117b` | S16 design | Historical | Stage 17 117 email | Archived | Keep |
| `airtable/.../_design-alternatives/stage17-modular-reference/117*` | Design only | Yes | Do not paste over 117 | Archived | Keep |

### 5.2 Test files without root `npm test`

No root `package.json`. Active: `web` vitest/playwright; many `airtable/**/*.test.js` and `tests/**` via ad-hoc `node --test`. Label **Needs review** (document suite entrypoint) — not orphan deletes.

---

## 6. Automation reconciliation

Canonical directory: `airtable/automations/shooting-challenge/`.  
**56** numbered production scripts on disk. **SCRIPT vs CONFIG:** no mismatches where both exist.

### 6.1 Retired — never reactivate

| # | Status | Notes |
|---|--------|-------|
| 008 | Retired | Replaced by 116 |
| 012 | Deleted / slot recovered | Documented in index |
| 043 | Retired | Legacy gate helper |
| 063 | Retired/deleted PROD | Repo file historical only |
| 068 | Retired stub | Throws on run |
| 077 | Retired Make daily path | Hub path replaces |
| 111 | Deleted / retired | Replaced by 013 |
| 112 | OFF forever | Duplicate of 013 |
| 117a/117b Airtable slots | Do not create | Design/superseded only; live **117** = email handoff |

### 6.2 Critical version matrix (GitHub vs docs)

| # | GitHub SCRIPT | automation-index | AUTOMATION_VERSION_INVENTORY | Completion Master / Aug 16 packet | Action |
|---|---------------|------------------|------------------------------|-----------------------------------|--------|
| 010 | **v10.10** | **v10.9** | v10.10 | Dated evidence | **Fix index → GitHub v10.10** (repo fact) |
| 020 | **v3.5** | v3.5 | **v3.6** (misleading as GitHub) | Packet: v3.6 paste confirmation needed | **Fix inventory** to separate GitHub v3.5 vs paste-pending |
| 022 | **v2.0** | v2.0 | v2.0 | Aligned | OK |
| 065 | **v10.1** | v10.1 | **v9.2** | v10.1 | **Fix inventory → v10.1** |
| 070b | **v4.4** | v4.4 | v4.4 | v4.4 | OK |
| 031 | v4.1 | v4.1 | **v3.1** | Mixed historical | Inventory refresh |
| 033 | v4.3 | **v4.1** | v3.1 | Historical | Index/inventory refresh |
| 041/042 | 5.0 / 4.1.2 | OK | **3.0** | Older deferred tables | Inventory refresh |
| 066 | v3.8 | v3.8 | **v3.3** | Historical v3.5 proofs | Inventory refresh |
| 071 | v3.6 | titled v3.5 | v3.4 | Test-window Off ≠ retired | Clarify Off vs retired |
| 073 | v3.3 | listed | v3.2 | Test-window Off ≠ retired | Clarify |
| 101 | v6.6 | **v6.3** text | v5.4 | PKG-034 v6.6 | Index/inventory refresh |
| 079/118/119/035 | present | mostly listed | **missing rows** | — | Add inventory rows |
| 117 | email v1.1 | correct ownership | **stale 117a/117b ready** | Do not create 117a/b | Fix inventory summary |

### 6.3 Duplicate number / ownership conflicts

- **117:** Canonical = `117-zoom-send-recording-approval-email-to-make.js`. Inventory summary still describes 117a/117b as installable — **Duplicate candidate / conflict**.
- Nested ignored clone still contains Stage-17 orchestrator set — **non-canonical**.

---

## 7. Documentation conflicts

| Doc | Label | Conflict |
|-----|-------|----------|
| `SHOOTING_CHALLENGE_COMPLETION_MASTER.md` | **Current** | Controlling; contains historical package tables under dated sections — do not treat old dashboard rows as overlay |
| `prod-completion/2026-08-16/SC-2026-08-16-CURRENT-STATE-RECONCILIATION.md` | **Current** (evidence packet) | Prefer for controlled-path IDs; do not expand into overstated “complete” claims per §7 guardrail |
| `AUTOMATION_VERSION_INVENTORY.md` | **Needs review** | Header refreshed; body broadly stale (020/065/031/041/…); C-025 summary wrong |
| `automation-index.md` | **Needs review** | 010 v10.9; 101 v6.3; 033/072/119 minor drift |
| `PROJECT_STATE.md` | **Current** (pointer) | Points at Master + Aug 16 |
| `docs/README.md` | **Needs review** | Still “Current reconciliation (2026-07-24)” |
| `KNOWN_ISSUES.md` | **Historical / Needs review** | Dated 2026-07-18; K-M1 still says 117a/b not installed vs Stage 17 complete |
| `docs/v2-014-automation-modernization-roadmap.md` | Historical for versions | 065 still v9.2 in table |
| `docs/next-wave/**` | Historical for status | Jul 24 recon; some architecture still useful |
| `docs/archive/PR-RETIREMENT-2026-08-10.md` | **Archived** | Correctly labeled |
| `SYSTEM_OVERVIEW.md` | Needs review | Soft “hub” wording vs `/shoot` |
| `PRODUCT.md` | Current (design) | Not release status |
| `CHANGELOG.md` | Current | Unreleased includes 022 alignment |
| `docs/agent-runs/CONTROL.json` | Needs review | SHA behind tip; season policy Early Bird **2027-04-25–2027-05-01** (correct calendar) |

**Outdated claims to avoid reintroducing (Mike §7):** Early Bird Aug 9 2026–May 1 2027; Early Bird counts toward challenge; Weeks `Counts Toward Challenge?`; and premature “complete” assertions for contested automation/test outcomes. Prefer Completion Master honesty rules + live-system authority.

---

## 8. Safe cleanup candidates (this pass)

Non-destructive only:

1. Point `docs/README.md` current reconciliation at Completion Master + Aug 16 packet; label Jul 24 as Historical.
2. Align `automation-index.md` **010** GitHub version string to **v10.10**.
3. Fix inventory **065 → v10.1**; clarify **020** GitHub **v3.5** vs paste-pending note; fix summary C-025 / count; banner that many rows need UI refresh.
4. Banner `KNOWN_ISSUES.md` as Historical for release status.
5. Publish this audit under `docs/audits/`.

**Not in this pass:** branch deletes, `git gc`, file deletes, inventory full rewrite, CONTROL.json SHA bump, PR closes, production code.

---

## 9. Items that require Mike’s approval

| Item | Why |
|------|-----|
| Delete any merged remote/local branches (~128 remote merged) | Irreversible ref removal |
| Prune unreachable commits/trees/blobs | May remove archaeology |
| Delete nested local clone / recovery folders | Local disk only; confirm no unique notes |
| Delete evidence `_*.py` / overnight JSON / PASTE stacks | Historical evidence |
| Close or supersede open PR #217 vs merged #220 | Product decision |
| Full AUTOMATION_VERSION_INVENTORY UI-attested refresh | Live Airtable required |
| CONTROL.json tip SHA refresh | Lead/Integrator ownership |
| Assert PROD paste of 020 v3.6 | Packet still asks confirmation |
| Any Airtable / Make / Vercel / Lambda change | Hard stop |

---

## 10. Recommended final repository structure

```
master                          # only long-lived integration branch
docs/                           # Completion Master + PROJECT_STATE + indexes (Current)
docs/prod-completion/YYYY-MM-DD/# dated evidence (Historical)
docs/audits/                    # audit reports (this file)
docs/archive/                   # explicitly retired packages
docs/next-wave/                 # Historical status; keep architecture
airtable/automations/shooting-challenge/          # canonical scripts
  _superseded/ / _design-alternatives/            # Archived
web/                            # /shoot app
tools/                          # CLIs + offline tests
```

Ignore (never commit): nested `127-si-shooting-challenge/`, `chatgpt-recovery-*/`, local `test-results/`.

Feature work: short-lived `cursor/*` / `fix/*` / `docs/*` branches → PR → merge → delete.

---

## 11. Exact files and branches that should remain

**Branches:** `master`; open PR heads (#218, #217, #214, #213, #186, #162); `archive/go-live-probes-snapshots-2026-07-24` until Mike retires.

**Files / trees:** Completion Master; AUTHORITY-MAP; PROJECT_STATE; automation-index; inventory (after fixes); Aug 16 recon packet; all `docs/prod-completion/**`; all `docs/testing/evidence/**`; canonical automation scripts; `_superseded` / `_design-alternatives`; `docs/archive/**`; CHANGELOG; AGENTS.md / APP_CONTEXT / BRAND_STANDARDS; `web/**`; `tools/**` that are referenced.

---

## 12. Exact files and branches that can be archived

**Branches (after Mike OK):** all `git branch --merged master` except `master`; remote equivalents among the 128 merged remotes; closed-unmerged PR heads listed in §4.3 once unique work is confirmed absent.

**Files (soft-archive / Historical banner — not delete):** Jul 24 next-wave status docs; foundation-reset raw dumps; ETF PASTE v1.4–v1.7; 070b v4.2 paste; overnight probe JSON; chatgpt-sources (keep as sync, label not-live-status); KNOWN_ISSUES dated claims.

---

## 13. Items that must not be deleted

- Any `docs/prod-completion/` or `docs/testing/evidence/` with record IDs  
- Completion Master, AUTHORITY-MAP, automation scripts (including retired stubs)  
- `_superseded` / design-alternative scripts  
- Merged PR history and closed PR discussion  
- Unreachable objects until Mike approves prune  
- CONTROL.json / agent-runs role docs  
- Anything with unique live-proof content  

---

## Reconciliation performed after this report

On branch `docs/orphan-cleanup-audit-2026-08-16` (uncommitted until Mike asks):

| File | Change |
|------|--------|
| `docs/audits/ORPHAN-AND-REPOSITORY-CLEANUP-AUDIT-2026-08-16.md` | This report |
| `docs/README.md` | Current recon pointer → Aug 16; Jul 24 labeled Historical |
| `docs/PROJECT_STATE.md` | Link to this audit; Historical labels on handoff / known issues |
| `docs/automation-index.md` | 010 → v10.10; 101 → v6.6 (GitHub facts) |
| `docs/AUTOMATION_VERSION_INVENTORY.md` | Banner; count 56; 020 GitHub v3.5; 065 v10.1; 117 ownership; Source Key / status table |
| `docs/KNOWN_ISSUES.md` | Historical / Needs review banner |

**Not changed:** branches, PRs, Git objects, production scripts, Airtable/Make/Vercel, CONTROL.json SHA, full inventory body refresh.

Remaining orphan candidates and Mike approvals: §§8–9 and final handoff below.
