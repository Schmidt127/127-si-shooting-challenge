# Lead Integration Review — Overnight Run 2026-07-21

> ## ⚠️ REVISION 2 (AUTHORITATIVE) — recomputed against updated `origin/master`
>
> The repository owner **fast-forwarded and pushed `master`** after Revision 1 was written.
> **Everything in "Revision 1" below (the `4b5c91a` comparison) is STALE and SUPERSEDED.**
> Revision 1 assumed the C-025 Stage 17 feature was *un-merged*; it is now **part of `origin/master`**,
> which collapses the "31-commit shared base" concern entirely. Read only Revision 2 for current guidance.

**Repo:** `Schmidt127/127-si-shooting-challenge`
**Reviewer role:** Lead integration reviewer (read-only).
**Revision 2 date:** 2026-07-22
**Method:** `git fetch --all --prune` → compare each overnight branch against `origin/master`.
No merges, cherry-picks, pushes, deletes, or Airtable / Make / Gmail / Vercel / webhook / env-var /
prod-data / live-service changes were made.

### R2.1 Confirmed `origin/master` hash

```
git fetch --all --prune       → 4b5c91a..147b5f7  master -> origin/master
git rev-parse origin/master   → 147b5f737241ec4a2dfd7c4a9cfd849adbc9e6ec
git log --oneline origin/master -3
  147b5f7 feat(c025): ship 117f v1.1 Make handoff script (no Airtable writes)
  fe0b5f1 docs(c025): document PROD 117f Zoom recording approval email workflow
  23abbd4 docs(c025): re-verify DEV 117f fixtures and tighten Agent 2 action sheet
```

✅ **`origin/master` = `147b5f7` — confirmed as required.** Commit `147b5f7` contains the completed
C-025 Stage 17 feature history. (Note: the local `master` *ref* in the `-integration` worktree still
reads `4b5c91a`; that local ref is stale, but all Revision-2 analysis is computed against `origin/master`
per instruction. Owner should fast-forward the local ref when convenient — it does not affect this review.)

### R2.2 Unique commits per branch (relative to `origin/master` @ `147b5f7`)

| Branch | Unique commits | Files changed | What is genuinely new |
|---|---|---|---|
| `overnight/c025-send-key-reconciliation-2026-07-21` | **3**: `02b8a5f`, `845a3c4`, `6101924` | 37 | Four-part send-key **code fix** (lib + Make helper + tests + fixtures) + docs reconciliation + report. **Linear/fast-forwardable.** |
| `overnight/docs-cleanup-2026-07-21` | **1**: `02b8a5f` | 24 | Docs-only Stage 17 / 117f reconciliation + 1 new Make blueprint-repair doc. **(Fully contained in send-key.)** |
| `overnight/repository-health-2026-07-21` | **1**: `612403b` | 2 | `.gitignore` (+13) + `docs/audits/REPOSITORY-HEALTH-AUDIT-2026-07-21.md` (291-line, canonical). |
| `overnight/test-audit-2026-07-21` | **3**: `a6b7892`, `e0e498d`, `99ae8b1` | 28 | Test/syntax report (`99ae8b1`) **+** duplicate of docs-cleanup (`a6b7892`) **+** divergent repo-health + security + `.gitignore` (`e0e498d`). |
| `overnight/security-audit-2026-07-21` | **0** | 0 | **Nothing** — tip == `origin/master`. Deliverable stranded on test-audit (`e0e498d`). |
| `overnight/project-handoff-2026-07-21` | **0** | 0 | **Nothing** — tip == `origin/master`; isolated worktree clean. No deliverable at all. |

### R2.3 Duplicate commits / shared files (Task 3)

- **Docs reconciliation appears in 3 branches, identical content:** `docs-cleanup/02b8a5f`,
  `send-key/02b8a5f` (same commit inherited), and `test-audit/a6b7892` (different SHA, byte-identical —
  `git diff 02b8a5f a6b7892` shows only test-audit's 4 *extra* files). → Ship it **once** via send-key.
- **Divergent duplicate (contradiction):** `docs/audits/REPOSITORY-HEALTH-AUDIT-2026-07-21.md` and
  `.gitignore` exist in **two versions** — `repository-health/612403b` (291-line, +13 gitignore,
  includes the concurrency-incident note; canonical) vs `test-audit/e0e498d` (282-line, +23 gitignore,
  no incident note). Pick **`612403b`**; discard `e0e498d`'s variant.

### R2.4 Stranded deliverables (Task 4)

- **Security audit:** `docs/audits/SECURITY-PRIVACY-AUDIT-2026-07-21.md` (315 lines) lives **only** in
  `test-audit/e0e498d`, not on `overnight/security-audit-2026-07-21` (which has 0 commits). Recover the
  single file; do not merge the test-audit branch to get it.
- **Project handoff:** no deliverable exists on the branch or in its worktree.
- Root cause = the documented concurrency incident (all agents shared one working tree).

### R2.5 Secrets (Task 5) — CLEAN ✅

Scanned `origin/master...send-key` and `origin/master...test-audit` (the superset diffs, covering every
unique file across all branches) for `AIRTABLE_API_TOKEN=`, `pat…`, `key…`, `AKIA…`, `AIza…`, `ghp_…`,
`xoxb-`, `sk-…`, `hook.*make.com/…`, `-----BEGIN`. **Zero matches.** New `.gitignore` rules additionally
harden against committing recovery zips and `.env.*.local`.

### R2.6 Tests not weakened (Task 6) — CONFIRMED ✅

- Only `send-key` touches test code, and it **strengthened** it: the two removed lines are three-part
  assertions **replaced** by four-part ones, and a new `blank attendance → null` assertion was added.
- `docs-cleanup`, `repository-health`, `test-audit`, `security-audit`, `project-handoff`: **no `*.test.js`
  / `*test*.py` changes** (verified — empty diffstat).
- The C-025 base test edits are now part of `origin/master` (owner-approved), so they are no longer an
  overnight agent's change. This resolves the Revision-1 caveat.

### R2.7 Tests run on the most complete candidate (Task 7)

Ran on `overnight/c025-send-key-reconciliation-2026-07-21` tip `6101924` — the most complete candidate
(= `origin/master` + docs reconciliation + four-part code fix). Env: Node `v22.16.0`, Python `3.13.7`.

| Suite | Result |
|---|---|
| `066-milestone-crossing-harness.test.js` | PASS |
| `c011-weekly-email-schedule.test.js` | PASS |
| `c025-stage17-combined-zoom-credit.test.js` | PASS |
| `c025-stage17-etf-downstream.test.js` | PASS |
| `c025-stage17-zoom-attendance.test.js` | PASS |
| `c025-zoom-recording-credit.test.js` | PASS |
| `script-header-contract.test.js` | PASS |
| `upload-make-lambda-response.test.js` | PASS |
| `v2-engine-contracts.test.js` | PASS |
| `xp-date-normalization.test.js` | PASS |
| `make/lib/c025-117f-make-scenario.test.js` | PASS |
| `tools/airtable/v2_dev_runbook/cli.test.js` | PASS |
| `tools/airtable/v2_dev_runbook/scenarios.test.js` | PASS |
| `python -m unittest tools.airtable.tests.test_c025_stage17_contracts` | PASS (6) |

**13/13 JS suites + Python contract suite: all green.** Live-Airtable / network Python tools not run
(no live access, DEV-only guardrails).

### R2.8 Recommendation per branch (Task 8)

| Branch | Recommendation | Rationale |
|---|---|---|
| `send-key` | **Whole-branch merge (fast-forward)** | Linear descendant of `origin/master`; carries the four-part code fix + docs; tests green; supersedes docs-cleanup. |
| `repository-health` | **Cherry-pick `612403b`** | Single clean commit (`.gitignore` additive + new audit doc); canonical repo-health version. |
| `test-audit` | **Recreate a clean commit from selected files** | Do NOT merge whole (duplicate docs + divergent repo-health/`.gitignore`). Take only `99ae8b1`'s report + the stranded security doc. |
| `security-audit` | **Do not merge** (recover 1 file) | 0 commits; recover `SECURITY-PRIVACY-AUDIT-2026-07-21.md` from `e0e498d`. |
| `docs-cleanup` | **Do not merge** | Fully contained in send-key. |
| `project-handoff` | **Do not merge** | No deliverable. |

### R2.9 Exact safe merge / cherry-pick order (Task 9)

Run from the worktree that has `master` checked out (`…/127-si-shooting-challenge-integration`), after
`git fetch`. **These are proposals — nothing here was executed. Do not push without owner approval.**

```bash
# Precondition
git fetch --all --prune
git rev-parse origin/master            # must print 147b5f7...

# STEP 1 — send-key: fast-forward merge (brings code fix + docs reconciliation)
git switch master
git merge --ff-only overnight/c025-send-key-reconciliation-2026-07-21
#   master tip -> 6101924. (If ff-only is refused, master advanced; re-review before proceeding.)

# STEP 2 — repository-health: cherry-pick the single canonical commit
git cherry-pick 612403b4effd5d6860fac3af7a1c6e3f25c87676
#   If .gitignore conflicts, keep BOTH blocks (all additions are safe/idempotent).

# STEP 3 — test-audit report + stranded security doc: recreate a clean commit from selected files
#   (avoids e0e498d's divergent repo-health/.gitignore duplicate)
git checkout 99ae8b13284f19398ba88a10b7f0d75484d8a362 -- docs/overnight-runs/2026-07-21-test-audit.md
git checkout e0e498d12a603bfc999b36071546c4a4bb66594b -- docs/audits/SECURITY-PRIVACY-AUDIT-2026-07-21.md
git add docs/overnight-runs/2026-07-21-test-audit.md docs/audits/SECURITY-PRIVACY-AUDIT-2026-07-21.md
git commit -m "docs: overnight 2026-07-21 test-audit report + recovered security/privacy audit"

# (Do NOT run) whole-branch merges of docs-cleanup / test-audit / security-audit / project-handoff
```

**Branches NOT to merge:** `overnight/project-handoff-2026-07-21`, `overnight/security-audit-2026-07-21`,
`overnight/docs-cleanup-2026-07-21`, and `overnight/test-audit-2026-07-21` (whole). See §R2.8.

### R2.10 Final git status

- Active review branch: `overnight/c025-send-key-reconciliation-2026-07-21` @ `6101924` (unchanged;
  the review only *reads* it). Tracked working tree clean for review purposes; pre-existing untracked
  overnight artifacts (nested `127-si-shooting-challenge/`, `chatgpt-recovery-*`, `_tmp_*`, schema
  snapshots, diagnostic Python) remain as before.
- **Nothing merged, cherry-picked, pushed, or deleted.** `origin/master` unchanged at `147b5f7`.

---

<a name="revision-1-stale"></a>
# ~~Revision 1 (STALE — SUPERSEDED)~~

> 🛑 **STALE — DO NOT USE.** The section below was computed against the **old** `master`
> `4b5c91adf987f677ccb84b10556290a9381dffbe`, before the owner fast-forwarded `master` to `147b5f7`.
> Its central conclusion — that the six branches sit on a "31-commit un-merged C-025 base" — **no longer
> applies**, because that base is now part of `origin/master`. Retained only for audit trail.
> **Use Revision 2 above.**

**Original method note (stale):** All findings below computed against
`master` == the then-current `4b5c91adf987f677ccb84b10556290a9381dffbe`.

---

## 0. TL;DR for the owner  *(STALE — see Revision 2)*

- **The six overnight branches did NOT branch from `master`.** They all branch from
  `feature/c025-stage17-zoom-attendance` (tip `147b5f7`), which sits **31 commits / ~35,500 lines
  / 101 files ahead of `master`** — the entire un-merged **C-025 Stage 17 Zoom-recording feature**,
  including live-automation logic changes (042, 066, 101, 020 + new 117/117a–f).
- **Consequence:** merging *any* of these branches whole into `master` ships the entire C-025
  Stage 17 feature. That feature is **out of scope** for these six overnight tasks and must be a
  **separate owner decision**.
- **Canonical send key is intact** — live `117f` already uses the four-part key; the send-key branch
  reconciles all offline copies to match. ✅
- **Automation 117 vs 117f distinction is intact.** ✅
- **No secrets. No weakened tests. No unjustified live-behavior change by the overnight agents.** ✅
- **A concurrency incident occurred** (all agents shared one working tree). It stranded the
  **security-audit deliverable on the test-audit branch** and produced **duplicate / divergent**
  copies of the repo-health audit + `.gitignore`.
- **Two branches carry no unique deliverable at all** (`security-audit`, `project-handoff`).
- **Recommendation:** do **not** merge any branch whole. Cherry-pick the three clean, master-safe
  doc deliverables; defer everything bound to the C-025 base to a separate feature-promotion decision.

---

## 1. Branch base verification (Task 1)

| Branch | Tip | merge-base w/ master | == master tip? | Ahead of master | Actual base |
|---|---|---|---|---|---|
| `overnight/docs-cleanup-2026-07-21` | `02b8a5f` | `4b5c91a` | yes | 32 | `147b5f7` (C-025 feature) |
| `overnight/test-audit-2026-07-21` | `a6b7892` | `4b5c91a` | yes | 34 | `147b5f7` |
| `overnight/security-audit-2026-07-21` | `147b5f7` | `4b5c91a` | yes | 31 | `147b5f7` (no own commit) |
| `overnight/c025-send-key-reconciliation-2026-07-21` | `6101924` | `4b5c91a` | yes | 34 | `147b5f7` |
| `overnight/project-handoff-2026-07-21` | `147b5f7` | `4b5c91a` | yes | 31 | `147b5f7` (no own commit) |
| `overnight/repository-health-2026-07-21` | `612403b` | `4b5c91a` | yes | 32 | `147b5f7` |

**Interpretation.** The merge-base of every branch *is* the current `master` tip (`4b5c91a`), so each
branch is technically a descendant of `master`'s history — **but none was cut directly from `master`.**
All six share an identical **31-commit C-025 Stage 17 stack** (`5245cfe … 147b5f7`, the tip of
`feature/c025-stage17-zoom-attendance`) that is **not on `master`**. The overnight agents' own work is
only the handful of commits layered on top of that stack.

The repo-health and send-key reports both document *why*: `master` is checked out in a linked worktree
(`…/127-si-shooting-challenge-integration`) and the shared primary tree had churn, so agents based on
the current HEAD (`147b5f7`). Note: the send-key report's claim that "master is ~15 commits behind" is
**inaccurate** — `master` == `origin/master` == `4b5c91a` is the true current master; it is simply
checked out elsewhere and does not yet contain the C-025 feature.

**Verdict:** ⚠️ Started from a shared C-025 feature tip, **not** from `master`. This is the dominant
integration risk and the reason no branch is safe to merge whole.

---

## 2. Shared C-025 Stage 17 base (`master..147b5f7`) — carried by all six branches

`101 files changed, 35,557 insertions(+), 142 deletions(-)`. Highlights (live/production-impacting):

- **Live automation logic changes:** `042-…level…gate-blocking.js` (+/−154),
  `066-…perfect-week-eligibility.js` (+/−116), `101-zoom-attendance-xp-award-meeting-xp.js` (2),
  `020-…daily-submission.js` (+/−1026).
- **New Airtable automations:** `117-…orchestrator.js`, `117a`, `117b`, `117c`, `117d`, `117e`,
  `117f-…send-approval-email.js` (+ README).
- **Superseded moves:** old `117a/117b` relocated to `_superseded/`.
- **New libs + tests:** `lib/c025-stage17-*.{js,test.js}`, Make `c025-117f-make-scenario.{js,test.js}`,
  blueprints, fixtures, `CHANGELOG.md`, `PROJECT_STATE.md`, ~60 deploy-checklist / status docs, Python tools.

This is a **complete feature**, not part of the six overnight tasks. It should be promoted (or not) on
its own review, through the normal DEV → approval → prod path. It should **not** ride into `master` as a
side effect of merging an overnight docs/audit branch.

---

## 3. Per-branch unique work (Task 2)

| Branch | Unique commit(s) | Files | Nature |
|---|---|---|---|
| `docs-cleanup` | `02b8a5f` | 24 | Docs-only reconciliation of Stage 17 / 117f docs + 1 new Make blueprint-repair doc |
| `repository-health` | `612403b` | 2 | `.gitignore` (+13) + `docs/audits/REPOSITORY-HEALTH-AUDIT-2026-07-21.md` (291 lines) |
| `security-audit` | *(none)* | 0 | **No own commit** — tip == shared base `147b5f7` |
| `test-audit` | `a6b7892`, `e0e498d`, `99ae8b1` | see §4 | Test/syntax audit report **plus** swept-in copies of docs-cleanup + repo-health + security docs |
| `project-handoff` | *(none)* | 0 | **No own commit** — tip == `147b5f7`; isolated worktree clean (no uncommitted output either) |
| `send-key` | `02b8a5f` (docs-cleanup, inherited), `845a3c4`, `6101924` | see §7 | Canonical four-part send-key reconciliation + report |

---

## 4. Overlaps, duplicates, and contradictions (Task 3)

**A concurrency incident is documented** in `REPOSITORY-HEALTH-AUDIT-2026-07-21.md`: all overnight
agents operated in the **same primary working tree**, switching branches and committing on a shared
HEAD, which caused cross-branch collisions. Resulting artifacts:

1. **Duplicate docs reconciliation.** `docs-cleanup/02b8a5f` and `test-audit/a6b7892` contain the
   **identical** 24-file docs-reconcile change under different SHAs. (`git diff 02b8a5f a6b7892`
   shows only test-audit's *extra* files, confirming the reconcile content is byte-identical.)

2. **Divergent repo-health deliverable (contradiction).** The repo-health audit doc and `.gitignore`
   exist in **two different versions**:
   - `repository-health/612403b`: audit doc **291 lines** (includes the "Concurrency incident" note,
     carries a UTF-8 BOM); `.gitignore` **+13** lines.
   - `test-audit/e0e498d`: audit doc **282 lines** (no incident note, arrows/dashes normalized, no BOM);
     `.gitignore` **+23** lines (extra `chatgpt-recovery-*.zip`, `**/_tmp_*.json`, `**/.env.*.local`).
   `612403b` is the repo-health agent's **intended final** version (committed in an isolated worktree);
   `e0e498d` is the **stray earlier** version swept onto the test-audit branch during the race.

3. **Stranded security deliverable.** `docs/audits/SECURITY-PRIVACY-AUDIT-2026-07-21.md` (315 lines)
   exists **only** inside `test-audit/e0e498d` — **not** on `overnight/security-audit-2026-07-21`
   (which has no commit of its own). The security agent's output landed on the wrong branch.

4. **Send-key vs the other five (state contradiction).** After the four-part fix (`845a3c4`), the
   send-key branch's offline Make helper + Stage 17 lib use the **four-part** key. The other five
   branches still carry the **stale three-part** offline helper/validator. If any non-send-key branch
   ships the C-025 base to `master` **without** `845a3c4`, the live four-part `117f` script would be
   paired with an offline validator that **rejects** the live payload (see §7).

**No genuine code-vs-code contradictions** were found (the only code edit outside the shared base is
the send-key fix). All contradictions are in docs / `.gitignore` / branch placement.

---

## 5. Secret scan (Task 4)

Scanned combined diffs `master..6101924` (send-key) and `master..a6b7892` (test-audit, which holds the
security + repo-health docs) for token/key/webhook/PEM patterns
(`AIRTABLE_API_TOKEN=`, `pat…`, `key…`, `AKIA…`, `AIza…`, `ghp_…`, `xoxb-`, `sk-…`, `hook.*make.com/…`,
`-----BEGIN`, `Bearer …`).

**Result: no secrets.** The only pattern hits are (a) source identifiers containing the substrings
`assert`/`key`, and (b) the security audit doc **reporting that it scanned for and found none**. The
new `.gitignore` rules additionally harden against committing recovery zips and `.env.*.local`. ✅

---

## 6. Tests not weakened (Task 5)

- **Overnight agents' own commits:**
  - `send-key/845a3c4` **strengthened** tests — added a "blank attendance → null" assertion and
    upgraded all send-key assertions to the four-part key.
  - `docs-cleanup`, `repository-health`, `test-audit`, `security-audit`, `project-handoff`: **no test
    code changed** (docs / `.gitignore` / audit reports only).
- **Shared C-025 base** (belongs to the feature, not the overnight tasks): the three modified test files
  (`xp-date-normalization.test.js`, `script-header-contract.test.js`, `c025-zoom-recording-credit.test.js`)
  were **re-pointed at the renamed/superseded 117a files** — assertions were **preserved and expanded**
  (e.g. added `toDenverDateKey` / `XP Activity Date` checks). No assertions were deleted or loosened.

**Verdict:** No agent weakened tests. ✅

---

## 7. Production-behavior change review (Task 6) + Canonical send key (Task 7)

**Canonical send key — CONFIRMED intact:**

```
ZOOM_REC_EMAIL|EnrollmentRID|ZoomMeetingRID|ZoomAttendanceRID
```

- Live Airtable automation `airtable/automations/shooting-challenge/117f-zoom-recording-send-approval-email.js`
  already builds the **four-part** key (`sendKeyPrefix: "ZOOM_REC_EMAIL"`, key documented at line 45).
  **This live script was not modified by any overnight agent.**
- `send-key/845a3c4` aligns the **offline** copies to the same canonical four-part key: the Make
  offline helper (`make/lib/c025-117f-make-scenario.js`), the Stage 17 lib
  (`lib/c025-stage17-zoom-attendance.js` — `buildApprovalEmailSendKey` gains `zoomAttendanceId`),
  their tests, fixtures, sample payload, blueprint template, and schema-manifest description.
  Historical v1.2.0 paste packet retained with a clear **"SUPERSEDED — HISTORICAL"** banner.
- The fix is **DEV/repo-only** and **justified**: the prior three-part exact-equality check in the Make
  helper would have **rejected** the live four-part `117f` payload — a real latent bug.

**Live behavior change by overnight agents:** none. The send-key edit touches only offline
helpers/tests/docs; the live orchestrator path is unaffected (117 Section F is `deferred_to_117f` and
builds no keys). The **large** production-automation changes all live in the **shared C-025 base**, i.e.
they are the feature under separate review — not something an overnight task introduced.

**Residual state risk:** the four-part reconciliation exists **only on the send-key branch**. Any path
that promotes the C-025 base to `master` must include `845a3c4`, or ship a live/offline mismatch.

---

## 8. Automation 117 vs Make identifier 117f (Task 8) — CONFIRMED distinguished

- **Automation 117** = `117-zoom-recording-credit-orchestrator.js`. Header + Section F are explicit:
  - line 23: *"Email send owned by 117f only — this script never POSTs or stamps email keys."*
  - line 560–565: *"SECTION F — Email deferred to 117f"*, `emailAction = "deferred_to_117f"`.
- **117f** = `117f-zoom-recording-send-approval-email.js` = the approval-email / Make-handoff automation
  that owns the send key and dedupe.

The two are consistently and clearly separated in code and docs. No collision or ambiguity. ✅

---

## 9. Tests run against the combined changes (Task 9)

Executed on the **send-key branch tip `6101924`** — the most complete code state (C-025 base +
docs-cleanup + four-part reconciliation). It is the only branch whose code matches the live four-part
`117f`; the other branches contain no code deltas beyond the base, so this tip fully represents the
combined *code* changes. Environment: Node `v22.16.0`, Python `3.13.7`.

| Suite | Result |
|---|---|
| `066-milestone-crossing-harness.test.js` | PASS |
| `c011-weekly-email-schedule.test.js` | PASS |
| `c025-stage17-combined-zoom-credit.test.js` | PASS |
| `c025-stage17-etf-downstream.test.js` | PASS |
| `c025-stage17-zoom-attendance.test.js` | PASS |
| `c025-zoom-recording-credit.test.js` | PASS |
| `script-header-contract.test.js` | PASS |
| `upload-make-lambda-response.test.js` | PASS |
| `v2-engine-contracts.test.js` | PASS |
| `xp-date-normalization.test.js` | PASS |
| `make/lib/c025-117f-make-scenario.test.js` | PASS |
| `tools/airtable/v2_dev_runbook/cli.test.js` | PASS |
| `tools/airtable/v2_dev_runbook/scenarios.test.js` | PASS |
| `python -m unittest tools.airtable.tests.test_c025_stage17_contracts` | PASS (6) |

**13/13 JS suites + Python contract suite: all green.** Live-Airtable / network-dependent Python tools
were **not** run (no live access, per DEV-only guardrails).

---

## 10. Recommended safe merge order (Task 10)

**Prerequisite owner decision:** *Is the C-025 Stage 17 feature approved to enter `master` now?*
No overnight branch can merge to `master` without it.

**Path A — C-025 Stage 17 is NOT yet approved for master (recommended default):**
Do **not** merge any overnight branch. Cherry-pick only the master-safe doc deliverables (see §12).
Defer everything bound to the C-025 base.

**Path B — C-025 Stage 17 IS approved for master (separate review passed):**
1. Merge the C-025 feature via `feature/c025-stage17-zoom-attendance` **plus** the send-key fix.
   The cleanest single carrier is `overnight/c025-send-key-reconciliation-2026-07-21`
   (= base + docs-cleanup + four-part fix + report). This makes docs-cleanup redundant.
2. Then layer the repo-health deliverable (`612403b`).
3. Then layer the test-audit report + the recovered security deliverable.
4. Do **not** also merge `docs-cleanup` (contained in send-key), `test-audit` whole (duplicate +
   divergent copies), `security-audit`, or `project-handoff` (empty).

---

## 11. Branches that should NOT be merged (Task 11)

| Branch | Merge? | Why |
|---|---|---|
| `overnight/project-handoff-2026-07-21` | **NO** | Zero unique deliverable (tip == base; worktree clean). Merging only injects the C-025 base. |
| `overnight/security-audit-2026-07-21` | **NO (as-is)** | No own commit. Its deliverable is stranded on `test-audit/e0e498d`; recover the file via cherry-pick/extract instead. |
| `overnight/test-audit-2026-07-21` | **NO (whole)** | Duplicates docs-cleanup (`a6b7892`) and carries the **divergent** `.gitignore` + repo-health audit (`e0e498d`). Cherry-pick only its unique report + the stranded security doc. |
| `overnight/docs-cleanup-2026-07-21` | **Not standalone** | Edits C-025 base docs that don't exist on `master`; superseded by send-key branch. Only via Path B. |
| `overnight/c025-send-key-reconciliation-2026-07-21` | **Not standalone** | Correct + fully reconciled, but bound to the C-025 base. Merge only under Path B, as the C-025 carrier. |
| `overnight/repository-health-2026-07-21` | **Cherry-pick only** | Its unique commit (`612403b`) is the **only** overnight deliverable that cleanly applies to bare `master`. |

---

## 12. Exact cherry-pick commands (Task 12 — safer than merging whole branches)

These land the three clean, **master-safe** doc/audit deliverables **without** dragging in the C-025
Stage 17 feature. Run them yourself after review — **do not push without approval.**

```bash
# 0. Start from current master in a fresh integration branch (do NOT work on master directly)
git switch master                        # (master lives in the -integration worktree; use that tree)
git switch -c integ/overnight-2026-07-21-docs

# 1. Repository-health deliverable (.gitignore hardening + audit doc) — applies cleanly to master
git cherry-pick 612403b4effd5d6860fac3af7a1c6e3f25c87676

# 2. Test-audit report (standalone new doc) — pick the single report file to avoid e0e498d's
#    duplicate/divergent repo-health + .gitignore. Use -n and keep only the report:
git cherry-pick -n 99ae8b13284f19398ba88a10b7f0d75484d8a362
git restore --staged --worktree :/ 2>/dev/null || true
git checkout 99ae8b13284f19398ba88a10b7f0d75484d8a362 -- docs/overnight-runs/2026-07-21-test-audit.md
git add docs/overnight-runs/2026-07-21-test-audit.md
git commit -m "docs(test-audit): overnight 2026-07-21 test + syntax audit report"

# 3. Recover the stranded security-audit deliverable (file-extract, not a whole-commit pick)
git checkout e0e498d12a603bfc999b36071546c4a4bb66594b -- docs/audits/SECURITY-PRIVACY-AUDIT-2026-07-21.md
git add docs/audits/SECURITY-PRIVACY-AUDIT-2026-07-21.md
git commit -m "docs(security): recover overnight 2026-07-21 security + privacy audit"
```

**Notes / expected conflicts:**
- Step 1 (`612403b`) touches only `.gitignore` (additive) and a new `docs/audits/…` file → should apply
  clean. If `.gitignore` conflicts, keep both blocks (all additions are safe/idempotent).
- Steps 2–3 are **file extractions**, chosen specifically to avoid `e0e498d`'s divergent `.gitignore`
  and its duplicate repo-health audit. Prefer the repo-health branch's audit doc (`612403b`, 291-line
  version with the incident note) as canonical; discard `e0e498d`'s 282-line variant.
- **Do not** cherry-pick `02b8a5f` (docs-cleanup), `845a3c4` (send-key), or the C-025 base commits onto
  bare `master` — they edit files that exist only in the C-025 feature and will fail/conflict. They must
  travel with the feature under Path B.

---

## 13. Concurrency remediation (owner follow-up)

The root cause of the stray commits is that **all overnight agents shared one working tree**. Recommend:
1. Give each concurrent agent its **own worktree** (as `worker-*` already have).
2. Reconcile `overnight/test-audit-2026-07-21`: its `e0e498d` swept in another agent's security +
   repo-health files. After the cherry-picks above, the stray copies there can be ignored/abandoned.
3. Decide which repo-health audit version is canonical (recommend `612403b`).
4. Re-run the security-audit and project-handoff tasks **on their own branches** if their deliverables
   are required (project-handoff produced nothing; security-audit's output is only recoverable from
   test-audit).

---

## 14. Final owner decision checklist

- [ ] **C-025 Stage 17 feature:** Decide separately whether `feature/c025-stage17-zoom-attendance`
      (117/117a–f + 042/066/101/020 changes, ~35.5k lines) is approved to enter `master`. **No overnight
      branch may merge to `master` until this is decided.**
- [ ] **Path A (default):** Approve the three cherry-picks in §12 (repo-health audit + `.gitignore`,
      test-audit report, recovered security audit) onto a fresh `integ/overnight-2026-07-21-docs` branch.
- [ ] **Path B (only if C-025 approved):** Approve merge order in §10 using
      `overnight/c025-send-key-reconciliation-2026-07-21` as the C-025 carrier (includes the four-part
      send-key fix); skip docs-cleanup, security-audit, project-handoff, and whole-branch test-audit.
- [ ] **Do NOT merge** `overnight/project-handoff-2026-07-21` (empty) or
      `overnight/security-audit-2026-07-21` (empty; recover its doc via §12 step 3).
- [ ] **Do NOT merge** `overnight/test-audit-2026-07-21` whole (duplicate + divergent `.gitignore`/audit).
- [ ] **Confirm canonical send key** stays four-part `ZOOM_REC_EMAIL|EnrollmentRID|ZoomMeetingRID|ZoomAttendanceRID`
      in any promoted path (only the send-key branch reconciles the offline copies). ✅ verified here.
- [ ] **Pick canonical repo-health audit** version: recommend `612403b` (291-line, with incident note).
- [ ] **Concurrency fix:** give each overnight agent its own worktree before the next run.
- [ ] **Approve any push to `origin`** explicitly (nothing was pushed during this review).
- [ ] **Prod promotion docs:** if C-025 is promoted, confirm `docs/deploy-checklists/` prod steps exist
      before closing the session (per doc 04 promotion rule).

---

### Verification commands used (reproducible, read-only)

```bash
git rev-parse master origin/master                      # both == 4b5c91a
git merge-base master <branch>; git rev-list --count master..<branch>
git log --oneline master..<branch>
git diff --stat master..147b5f7                          # shared C-025 base
git show --stat <unique-commit>
git diff 612403b e0e498d -- .gitignore docs/audits/REPOSITORY-HEALTH-AUDIT-2026-07-21.md
git worktree list
node <each>.test.js ; python -m unittest tools.airtable.tests.test_c025_stage17_contracts
```

**No branch was merged. Nothing was pushed to `master` or any remote.**
