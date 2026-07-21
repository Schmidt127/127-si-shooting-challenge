# Repository Health Audit — 2026-07-21

**Repo:** `Schmidt127/127-si-shooting-challenge`
**Audit branch:** `overnight/repository-health-2026-07-21`
**Branched from:** base `147b5f73` (see notes below)
**Author:** Cursor overnight repository-health run
**Scope:** Read-only inspection + safe `.gitignore` improvements only. **No files deleted. No Airtable/Make/Gmail/Vercel/webhook/prod/env changes.**

> **Branch-base note.** The task named `master` as the default branch. `master` is **checked out in a linked worktree** (`.../127-si-shooting-challenge-integration`) and the primary working tree had uncommitted line-ending/content churn, so this audit branch is based on `147b5f73` (tip of `feature/c025-stage17-zoom-attendance`) to avoid a disruptive checkout. All merge analysis below is computed against `origin/master` regardless of branch base.

> **[!] Concurrency incident (important for owner).** During this run, **multiple overnight agents were operating in the same primary working tree at once**, each switching branches and committing, which caused git-level collisions: (1) a `test-audit` agent commit briefly landed on this branch; (2) an initial commit attempt from this run was swept onto `overnight/test-audit-2026-07-21` and inadvertently included another agent's `SECURITY-PRIVACY-AUDIT-2026-07-21.md` alongside this report — that commit (`e0e498d`) was then built upon by the `test-audit` agent, so this report's file currently also appears in `overnight/test-audit-2026-07-21` history. To recover **non-destructively**, this branch was repointed with `git branch -f overnight/repository-health-2026-07-21 147b5f7` (verified no unique work orphaned — the displaced `test-audit` content is preserved on its own branch via cherry-pick) and the final commit was made in an **isolated dedicated worktree** (`.../127-si-shooting-challenge-repo-health`). **No other agent's branch was modified.** Owner actions: (a) reconcile `overnight/test-audit-2026-07-21` if the stray `REPOSITORY-HEALTH`/`SECURITY-PRIVACY` files there are unwanted; (b) give each overnight agent its **own worktree** to prevent shared-HEAD races.

---

## 1. Executive summary

| Signal | Finding | Severity |
|---|---|---|
| Nested clone | `127-si-shooting-challenge/` is a **full ~477 MB / 1,402-file accidental clone** of this repo (has its own `.git`), created today | **High** (space + confusion) |
| `.git` size | 289 MiB objects, **7,476 loose objects**, only 725 KiB packed -> `git gc` candidate | Medium |
| Tracked binaries | ~19 large `.zip` packet/photo archives tracked (top file 31 MB) -> ~200 MB of the repo is media zips | Medium |
| Branches | 60 local / 69 remote; **5 duplicate `cursor/setup-dev-environment-*`** remotes; many merged branches safe to prune | Medium |
| Worktrees | 14 registered worktrees incl. stale `_sc_pr26_temp`, `pr25-light-theme`, `pr26-release-readiness` (detached) | Medium |
| Untracked local artifacts | 205 untracked paths: recovery folder+zip, `_tmp_*` scratch, diagnostic Python, schema exports, send-ready zip | Low-Medium |

**No destructive action taken.** All deletions/prunes below require owner (Mike) approval. This run only proposes `.gitignore` additions for clearly-local artifacts (Section 8).

---

## 2. Classification legend

1. **Keep as active source**
2. **Keep as historical evidence**
3. **Move to archive** (outside repo or `docs/**/_archive`)
4. **Add to `.gitignore`** (local artifact, never track)
5. **Candidate for deletion after owner review**
6. **Unclear — needs owner decision**

---

## 3. File / folder findings

Legend for columns: **Tracked?** = currently in git index; **Ref'd?** = referenced by current docs or tests.

### 3.1 Highest-priority items

| File / folder | Class | Reason | Risk of removal | Recommended action | Tracked? | Ref'd? |
|---|---|---|---|---|---|---|
| `127-si-shooting-challenge/` (nested) | **5** | Accidental **full nested clone** of the repo (own `.git`, 1,402 files, ~477 MB) created 2026-07-21 07:16-07:27. Not a submodule. | Low — it is a duplicate working copy; deleting it does not affect the real repo. Confirm no un-pushed local commits inside first. | Owner: verify nothing unique inside (`cd 127-si-shooting-challenge; git status; git log --oneline origin/master..HEAD`), then delete the folder. Ignored defensively (Section 8). | No (untracked; embedded git) | No |
| `.git` loose objects (289 MiB, 7,476 loose) | — | Objects almost entirely unpacked; large media zips inflate object store. | None (housekeeping). | Owner: run `git gc --prune=now` (or `git repack -ad`) when no worktree operation is mid-flight. Non-destructive to history. | n/a | n/a |
| `chatgpt-recovery-2026-07-14/` | **2->3** | Recovery snapshot (91 files, ~0.85 MB): duplicate copies of `docs/`, `AGENTS.md`, repo-state text. Governed by existing `docs/UNTRACKED-RECOVERY-TRIAGE.md`. | Low — duplicates of `master` content; keep offline backup. | Keep local / move to external archive per triage doc section 2. Do not commit. Ignored (Section 8). | No | Referenced conceptually by `docs/UNTRACKED-RECOVERY-TRIAGE.md` |
| `chatgpt-recovery-2026-07-14.zip` | **3** | Zip of the above recovery folder. Possible embedded secrets — do not commit. | Low. | Archive externally; secret-scan before any use. Ignored (Section 8). | No | No |

### 3.2 Tracked large binaries (media zips)

| File / folder | Class | Reason | Risk of removal | Recommended action | Tracked? | Ref'd? |
|---|---|---|---|---|---|---|
| `media/2025-2026/newspapers/final-packets/*-SEND-READY.zip` (10) | **2** / 6 | Season send-ready newspaper packets. Committing zips bloats history (~120 MB across zips). | Medium — these are the delivered artifacts; source photos also tracked separately. | Owner decision: keep as historical evidence **or** move zips to external/media storage and `git rm --cached` (history rewrite optional, high-effort). Do **not** ignore existing tracked ones silently. | Yes | `media/**/README.md` |
| `media/2025-2026/newspapers/final-packets/**/Photos.zip` (10) + `01-...-WITH-PHOTOS.zip` | **2** / 6 | Duplicate of loose `Photos/` images already tracked -> double storage. | Medium. | Owner: confirm loose `Photos/` folders are the source of truth, then consider `git rm --cached` the redundant `Photos.zip`. | Yes | `media/**/README.md` |
| `Award Recipients-Grid view from June 29 FINAL.csv` (root, 68 KB) | **6** | Exported Airtable grid at repo root; unclear owner. Contains recipient names (possible PII). | Low storage / PII consideration. | Owner: relocate under `media/2025-2026/` or `docs/`, or archive; confirm no PII policy issue. | Yes | Not referenced |

### 3.3 Untracked diagnostic / temporary Python utilities (`tools/`)

| File / folder | Class | Reason | Risk of removal | Recommended action | Tracked? | Ref'd? |
|---|---|---|---|---|---|---|
| `tools/overnight/_tmp_*.py` and `_tmp_*.txt` (21) | **4** | Scratch scripts probing Cursor settings/UI; `_tmp_` prefix; entire dir untracked. | None. | Ignored via `**/_tmp_*` (Section 8). Delete locally when done. | No | No |
| `tools/airtable/_tmp_*.py` (4) | **4** | Preflight/scratch (`_tmp_c025_*`, `_tmp_list_zoom_fields`, `_tmp_bump_stage17_versions`). | None. | Ignored via `**/_tmp_*`. | No | `_tmp_list_zoom_fields.py` name appears in one doc note only |
| `tools/airtable/_c025_*.py` (~33), `_probe_*.py` (6), `_phase_d_*.py`, `_scan_packet_status.py`, `_build_send_ready_zip.py` | **5 / 6** | One-off C-025 Stage-17 diagnostic / install / probe utilities. **Not `_tmp_`-prefixed**, so *not* auto-ignored. Several referenced only by their own paste-body docs. | Low-Medium — some may still be handy for re-runs. | Owner decision per file: promote the reusable ones into `tools/airtable/` with a README + tests, archive the rest to `tools/airtable/_archive/`, or delete. Not ignored by this run. | No | A few referenced in `docs/deploy-checklists/*` paste bodies |
| `docs/audits/_tmp_missing_sa_fields_dev.json` | **4** | Temp audit JSON, `_tmp_` prefix. | None. | Ignored via `**/_tmp_*`. | No | No |
| `docs/overnight-runs/results/_stale_branch_raw.json` | **6** | Generated JSON output from a prior stale-branch scan; `_`-prefixed but not `_tmp_`. | None. | Owner: keep as evidence or ignore `docs/overnight-runs/results/`. Not auto-ignored (outside sanctioned patterns). | No | No |
| `docs/overnight-runs/_status-update-ready.md` | **6** | Overnight run status scratch; dir is untracked. | Low. | Owner: commit if it is a real deliverable, else archive. | No | No |

### 3.4 Untracked real content (do **not** ignore — owner should review for commit)

| File / folder | Class | Reason | Risk of removal | Recommended action | Tracked? | Ref'd? |
|---|---|---|---|---|---|---|
| `make/blueprints/c025-117f-zoom-recording-approval-email-dev-v1.blueprint.json` | **1** | Make template. **Referenced by test** `make/lib/c025-117f-make-scenario.test.js` and 4 deploy docs. | High if lost. | Owner: commit through normal workflow. **Never ignore** (Make template + test-referenced). | No | Yes (test + docs) |
| `docs/deploy-checklists/PHASE-A-021-combined-v1.0.0-PASTE.txt`, `PROD-021-v1.0.0-nofile-smoke-2026-07-20.md`, `PROD-021-vs-DEV-combined-audit-2026-07-20.md`, `C-025-117f-dev-make-blueprint-import-repair.md` | **1 / 2** | Deployment documentation not yet committed. | Medium. | Owner: commit (deployment docs are in-scope for the repo). Do not ignore. | No | Cross-referenced by other deploy docs |
| `docs/v2/SHOOTING-V2-PROJECT-HANDOFF.md` | **1** | V2 handoff doc referenced by other v2 docs. | Medium. | Owner: commit. | No | Yes (docs) |
| `airtable/schema/snapshots/c023-stage3-verify/` and `c023-stage3-verify-dev/` (30 files) | **2** | Dated DEV/PROD schema export snapshots (2026-07-10). Snapshot dir pattern matches `airtable/schema/snapshots/README.md`. | Low (regenerable via export tool). | Owner: commit as historical evidence or archive. Do **not** ignore (schema snapshots are sanctioned content). | No | Snapshot convention in `airtable/schema/snapshots/README.md` |
| `media/2025-2026/MORNING-DISTRIBUTION-LIST.md` | **1 / 2** | Media ops doc. | Low. | Owner: commit or archive. | No | `media/**/README.md` |
| `media/2025-2026/newspapers/final-packets/01-belgrade-...-SEND-READY.zip` (untracked) | **4 / 6** | Generated send-ready zip (matches sanctioned "generated send-ready ZIP" ignore class). Note: sibling packet zips are already tracked (inconsistency). | Low. | Ignored via `**/*-SEND-READY.zip` (Section 8). Owner: decide whether to unify by un-tracking the others. | No | No |

### 3.5 Already-tracked "superseded" / historical items (correctly retained)

| File / folder | Class | Reason | Recommended action | Tracked? | Ref'd? |
|---|---|---|---|---|---|
| `airtable/automations/shooting-challenge/_superseded/117a-...-SUPERSEDED.js`, `117b-...-SUPERSEDED.js`, `README.md` | **2** | Explicitly superseded automations, isolated in `_superseded/` with its own README. Correct pattern. | Keep as historical evidence. No action. | Yes | `_superseded/README.md`, automation index |
| `make/blueprints/upload-asset-engine-v1.json`, `-v2-*.json` | **2** | Older Make blueprints kept alongside `*.template.json`. | Keep; ensure `make/blueprints/README.md` notes which is current. | Yes | `make/blueprints/README.md` |
| `make/test-payloads/c025-117f-zoom-recording-approved.sample.json` | **1** | Active test payload. | Keep. | Yes | `make/test-payloads/README.md`, scenario test |
| `docs/testing/C-025-stage17-test-fixtures.json`, `expected-results.json` | **1** | Active C-025 Stage-17 test contract fixtures. | Keep. **Never ignore.** | Yes | Stage-17 contract tests / docs |
| `docs/deploy-checklists/C-025-stage17-prod-schema-manifest.json` | **1** | Schema manifest referenced by multiple deploy docs (and duplicated inside the nested clone). | Keep. **Never ignore.** | Yes | Docs (multiple) |

### 3.6 Naming / structure observations

- **Inconsistent README extension:** `media/2025-2026/newspapers/final-packets/01-.../README.docx` is the only `.docx` README among ~30 `.md` READMEs -> convert to `.md` for consistency (owner, low priority).
- **Missing READMEs:** `tools/overnight/` and `docs/overnight-runs/` have **no README** and are entirely untracked scratch. If either becomes a real tracked area, add a README describing purpose/retention.
- **Root-level stray:** `Award Recipients-...FINAL.csv` at repo root is out of place vs the `media/` / `docs/` structure.

---

## 4. Branch analysis (vs `origin/master`)

Counts: **60 local**, **69 remote** branches.

### 4.1 Local branches merged into `origin/master` — safe to delete (after confirming not needed)

```
audit-followup/agent-a-xp-automation-contracts      (checked out in worktree -agent-a -> remove worktree first)
audit-followup/agent-b-web-docs-release-hygiene     (checked out in worktree -agent-b -> remove worktree first)
audit-followup/lead-integration
feature/shooting-challenge-brand-redesign
feature/shooting-challenge-mvp                       (checked out in worktree -mvp-wt -> remove worktree first)
feature/shooting-v2-release-readiness
feature/v2-dev-completion-package-117-070a
master                                               (default branch — DO NOT delete; checked out in -integration worktree)
```

Recommended: after owner confirmation, `git branch -d <name>` for the non-worktree merged branches; for worktree-bound ones run `git worktree remove <path>` first. **Do not** delete `master`.

### 4.2 Remote branches merged into `origin/master` — safe to prune on remote (owner approval required; not pushed in this run)

```
origin/audit-followup/agent-a-xp-automation-contracts
origin/audit-followup/agent-b-web-docs-release-hygiene
origin/audit-followup/lead-integration
origin/cursor/control-tipsync-2ca9
origin/cursor/dev-release-verify-2ca9
origin/cursor/fa-001-four-agent-pilot-cfc9
origin/cursor/fa-001-implementation-cfc9
origin/cursor/fa-001-research-cfc9
origin/cursor/fa-001-testing-cfc9
origin/cursor/learning-activities-handoff-2ca9
origin/cursor/pr-reconcile-contracts-2565
origin/cursor/remaining-airtable-dev-packages-2565
origin/cursor/v2-dev-execution-runbook-3ea4
origin/feature/shooting-challenge-brand-redesign
origin/feature/shooting-v2-blocker-closure-followup
origin/feature/shooting-v2-release-readiness
```
(plus `origin/master` + `origin/HEAD`, which are retained.)

### 4.3 Branches that still contain unique commits (do **not** delete without review)

- **Local, not merged (contain unique work):** `audit/c025-stage17-prod-readiness` (ahead of origin/master), `feature/c025-stage17-zoom-attendance`, `feature/shooting-v2-release-readiness` (ahead 29), all `overnight/v2-run/worker-*`, `overnight/2026-07-12/worker-*`, `overnight/lead-integration`, `overnight/docs-cleanup-2026-07-21`, `overnight/c025-send-key-reconciliation-2026-07-21`, `overnight/security-audit-2026-07-21`, `overnight/test-audit-2026-07-21`, and this branch. Several are ahead of their upstream (e.g. `worker-a-s3` ahead 9). Keep pending integration review.
- **Remote, not merged:** ~50 including the full `origin/overnight/v2-run/worker-*` set and `origin/overnight/worker-*-070a-*`.

### 4.4 Likely-duplicate / stale remote branches (owner review)

- **5 near-duplicate branches**, all "add Cursor Cloud setup instructions", unmerged:
  ```
  origin/cursor/setup-dev-environment-3ded
  origin/cursor/setup-dev-environment-5578
  origin/cursor/setup-dev-environment-86cb
  origin/cursor/setup-dev-environment-bdba
  origin/cursor/setup-dev-environment-e61f
  ```
  Recommend collapsing to at most one (or deleting all if the content already landed on `master`).
- `origin/cursor/066-omni-live-blocked-b7bd`, `origin/cursor/c025-dev-install-attempt-e6f3`, `origin/cursor/overnight-live-status-251a`, `origin/cursor/v2-execution-board-e0f4` — status/attempt branches; confirm captured in docs then prune.

---

## 5. Worktrees

14 worktrees are registered (a 15th, `.../127-si-shooting-challenge-repo-health`, was created by this run to isolate the commit and can be removed after review):

```
.../127-si-shooting-challenge                 (primary; shared by overnight agents)
.../127-si-shooting-challenge-agent-a         audit-followup/agent-a   (merged branch)
.../127-si-shooting-challenge-agent-b         audit-followup/agent-b   (merged branch)
.../127-si-shooting-challenge-c025-stage17-audit  audit/c025-stage17-prod-readiness
.../127-si-shooting-challenge-e2e-wt          overnight/lead-integration
.../127-si-shooting-challenge-integration     master
.../127-si-shooting-challenge-mvp-wt          feature/shooting-challenge-mvp (merged; behind 15)
.../127-si-worktrees/pr25-light-theme         detached HEAD            STALE?
.../127-si-worktrees/pr26-release-readiness   detached HEAD            STALE?
.../127-si-worktrees/worker-a|b|c|d           overnight/v2-run/worker-*
.../_sc_pr26_temp                             detached HEAD            STALE (temp)
```

**Concern:** worktrees on **merged** branches (`-agent-a`, `-agent-b`, `-mvp-wt`) and detached-HEAD temp worktrees (`_sc_pr26_temp`, `pr25-light-theme`, `pr26-release-readiness`) are likely finished. Each worktree is a full checkout consuming disk. Owner: `git worktree remove <path>` for confirmed-finished ones, then prune the associated merged branches (Section 4.1). Not done in this run.

**Root cause of the concurrency incident:** overnight agents share the single **primary** working tree and keep switching branches + committing on the same HEAD. Give each concurrent agent its own worktree (as `agent-a`/`agent-b`/`worker-*` already have) to eliminate the races.

---

## 6. Repository size

| Metric | Value |
|---|---|
| Tracked files | 1,366 |
| `.git` objects | 289.02 MiB (7,476 loose, 954 in-pack, 3 packs, 725 KiB packed) |
| `.git` on disk | ~292.6 MB |
| Nested accidental clone `127-si-shooting-challenge/` | ~477 MB / 1,402 files (untracked) |
| `chatgpt-recovery-2026-07-14/` | ~0.85 MB / 91 files (untracked) |

**Drivers:** (a) large tracked media `.zip` archives; (b) unpacked loose objects -> `git gc` would sharply reduce `.git` size; (c) the untracked nested clone is the single largest local disk consumer.

## 7. Top 20 largest tracked files

```
  31,150,355  media/2025-2026/newspapers/final-packets/03-north-central-montana/Photos.zip
  31,150,147  media/2025-2026/newspapers/final-packets/03-north-central-montana-SEND-READY.zip
  20,837,575  media/2025-2026/newspapers/final-packets/01-belgrade-bozeman-manhattan-christian-WITH-PHOTOS.zip
  20,830,514  media/2025-2026/newspapers/final-packets/01-belgrade-bozeman-manhattan-christian/Photos.zip
  19,948,854  media/2025-2026/newspapers/final-packets/04-billings-yellowstone-bridger-wibaux-SEND-READY.zip
  19,948,035  media/2025-2026/newspapers/final-packets/04-billings-yellowstone-bridger-wibaux/Photos.zip
   7,675,633  media/2025-2026/newspapers/final-packets/04-billings-yellowstone-bridger-wibaux/Photos/Keyser_Alyna_Bridger-Elementary-School_Grade-6.jpg
   6,098,752  media/2025-2026/newspapers/final-packets/02-missoula-area-st-joes-frenchtown-SEND-READY.zip
   6,094,631  media/2025-2026/newspapers/final-packets/02-missoula-area-st-joes-frenchtown/Photos.zip
   3,632,717  media/2025-2026/newspapers/final-packets/06-madison-county-SEND-READY.zip
   3,630,450  media/2025-2026/newspapers/final-packets/06-madison-county/Photos.zip
   3,273,061  media/2025-2026/newspapers/final-packets/07-bitterroot-SEND-READY.zip
   3,270,650  media/2025-2026/newspapers/final-packets/07-bitterroot/Photos.zip
   3,269,511  media/2025-2026/newspapers/final-packets/07-bitterroot/Photos/Talbitzer_Lewis_Darby_Grade-4.jpg
   3,033,714  media/2025-2026/newspapers/final-packets/01-belgrade-bozeman-manhattan-christian/Photos/Kimm_Liam_Manhattan-Christian_Grade-1.jpg
   2,551,134  media/2025-2026/newspapers/final-packets/03-north-central-montana/Photos/Davison_Charlotte_Centerville-School_Grade-K.jpg
   2,392,996  media/2025-2026/newspapers/final-packets/03-north-central-montana/Photos/Costa_Daniel_Cascade_Grade-3.jpg
   2,360,219  media/2025-2026/newspapers/final-packets/04-billings-yellowstone-bridger-wibaux/Photos/Ehrlich_Hartlie_Bridger_Grade-7.jpg
   2,351,491  media/2025-2026/newspapers/final-packets/01-belgrade-bozeman-manhattan-christian/Photos/Elders_Ryder_Manhattan-Christian_Grade-6.jpg
   2,341,674  media/2025-2026/newspapers/final-packets/04-billings-yellowstone-bridger-wibaux/Photos/Harsha_Tayin_Will-James_Grade-6.jpg
```

All top-20 are `media/2025-2026/newspapers/final-packets/` archives and photos. Consideration: media assets may be better stored outside git (external drive / object storage) with only manifests tracked. Owner decision — history rewrite is out of scope for this run.

---

## 8. `.gitignore` improvements applied (safe, this run)

Only clearly-local artifact classes explicitly sanctioned by the task were added. Added block:

```gitignore
# --- Repository health audit 2026-07-21: local artifacts (never track) ---
# ChatGPT recovery snapshots (see docs/UNTRACKED-RECOVERY-TRIAGE.md)
chatgpt-recovery-*/
chatgpt-recovery-*.zip
# Accidental nested clone of this repo (defensive; owner to delete folder)
/127-si-shooting-challenge/
# Temporary scratch/diagnostic files
**/_tmp_*
# Generated send-ready newspaper packets (already-tracked copies are unaffected)
**/*-SEND-READY.zip
# Test-output cache
.pytest_cache/
```

**Deliberately NOT ignored** (per task constraints): production source code, active test fixtures (`docs/testing/*`, `make/test-payloads/*`), Make templates/blueprints, Airtable automation scripts, deployment documentation (`docs/deploy-checklists/*`), and schema manifests/snapshots used by docs/tests.

**Safety check on new patterns** (`git ls-files -ci --exclude-standard`):

- `chatgpt-recovery-*`, `/127-si-shooting-challenge/`, `**/_tmp_*`, `.pytest_cache/` match **zero** currently-tracked files -> purely additive.
- `**/*-SEND-READY.zip` matches the currently-untracked `01-...-SEND-READY.zip` **and** the 9 already-tracked `-SEND-READY.zip` packets. **Git does not untrack already-tracked files**, so all 9 remain tracked and versioned exactly as before; the pattern only prevents *new* send-ready zips from being accidentally added. Un-tracking the existing 9 is a separate owner decision (Section 3.2) and was **not** done here.
- The pre-existing `_preview/` rule and `.env` rules already shadow `tools/airtable/_preview/**` and `web/.env.example`; those are unchanged by this run.

---

## 9. Commands used (representative)

```powershell
git rev-parse --show-toplevel; git rev-parse --abbrev-ref HEAD; git rev-parse HEAD
git switch -c overnight/repository-health-2026-07-21
git branch --merged origin/master; git branch --no-merged origin/master
git branch -r --merged origin/master; git branch -r --no-merged origin/master
git ls-tree -r --long HEAD | ...sort by size... | Select-Object -First 20
git count-objects -vH
git worktree list
git ls-files --others --exclude-standard
git ls-files "*_superseded*" ; git ls-files "*.zip" ; git ls-files "airtable/schema/snapshots/*"
cmd /c "dir /s /-c 127-si-shooting-challenge"   # nested clone size
git ls-files -ci --exclude-standard              # .gitignore safety check
# --- concurrency recovery (non-destructive) ---
git branch -f overnight/repository-health-2026-07-21 147b5f7
git worktree add .../127-si-shooting-challenge-repo-health overnight/repository-health-2026-07-21
```

---

## 10. Recommended owner sequence (nothing destructive done here)

1. Confirm the nested `127-si-shooting-challenge/` clone has no unique commits, then delete the folder (~477 MB reclaimed).
2. `git gc --prune=now` (or `git repack -ad`) to compact 289 MiB of loose objects.
3. Remove finished worktrees (`_sc_pr26_temp`, `pr25-light-theme`, `pr26-release-readiness`, and merged-branch worktrees), then prune the merged local branches (Section 4.1).
4. Prune merged remote branches (Section 4.2) and collapse the 5 duplicate `setup-dev-environment-*` remotes (Section 4.4).
5. Decide on media-zip storage strategy (Section 3.2 / 7).
6. Review untracked real content (Section 3.4) for proper commit; archive/delete the diagnostic Python (Section 3.3) per file.
7. Follow `docs/UNTRACKED-RECOVERY-TRIAGE.md` for the recovery folder + zip.
8. Reconcile `overnight/test-audit-2026-07-21` (stray `REPOSITORY-HEALTH`/`SECURITY-PRIVACY` files pulled in by the shared-worktree race) and give each overnight agent its own worktree.

---

*End of audit. No files deleted, no branches removed, no remote pushed, not merged to `master`.*
