# C-025 Zoom Recording Credit — DEV install attempt (Online Agent 1)

**Date:** 2026-07-16  
**Agent:** Online Agent 1 (cloud)  
**Branch:** `cursor/c025-dev-install-attempt-e6f3`  
**Starting `master` SHA:** `1d403df38a335237e69715de98efb0cb75182ab5`  
**Authorization:** Mike-authorized named DEV install for 117a/117b on confirmed Shooting Challenge DEV base only  
**Live Airtable writes:** **None** — blocked before Phase 2  

---

## Task Classification

| Field | Value |
|-------|--------|
| Type | DEV automation install + verification (C-025) |
| Priority | High (authorized next live step after #25–#28) |
| Difficulty | Schema + automation paste + smoke (blocked on credentials) |
| Owner | Online Agent 1 |
| Dependencies | Merged install packet; DEV PAT or Airtable UI session; DEV Make webhook for 117b |
| Backlog ID | C-025 |
| Estimated Scope | Schema create + 117a/117b paste + smoke + docs |
| Phase | 3 (Implementation) — stopped at credential gate |
| Correct tool | Cursor + live DEV Airtable |
| Repo | `127-si-shooting-challenge` |
| Mike's role | Provide DEV Airtable access (PAT or UI login) + confirm DEV Make webhook |

---

## 0. Merge / repo gate (verified)

| Check | Result |
|-------|--------|
| `git rev-parse HEAD` on `master` at start | `1d403df38a335237e69715de98efb0cb75182ab5` |
| Matches expected SHA | **Yes** |
| PR #25 on master | **Yes** (`c1f135f`) |
| PR #26 on master | **Yes** (`6ef60fd`) |
| PR #27 on master | **Yes** (`efa3322`) |
| PR #28 on master | **Yes** (`4728723`) |
| Working tree | Clean on expected tip before branch |
| Offline validator | **PASS** (0 failures / 0 warnings) |
| `c025-zoom-recording-credit.test.js` | **PASS** |
| `test_c025_recording_watch_contract` | **PASS** (15) |
| 117a/117b in repo | Present at v1.0 — **not** claimed live-installed |

---

## 1. DEV base identity

### Documentation evidence (consistent)

| Source | Base ID | Base name |
|--------|---------|-----------|
| [PROJECT_STATE.md](../PROJECT_STATE.md) | `appTetnuCZlCZdTCT` | `127SI - SHOOTING CHALLENGE - DEV` |
| [development-base-setup.md](../development-base-setup.md) | `appTetnuCZlCZdTCT` | same |
| [ENGINEERING_CONSTITUTION.md](../ENGINEERING_CONSTITUTION.md) | `appTetnuCZlCZdTCT` | Development |
| [ZOOM_RECORDING_CREDIT_DEV_INSTALL.md](../v2/ZOOM_RECORDING_CREDIT_DEV_INSTALL.md) | `appTetnuCZlCZdTCT` | DEV only |
| Schema snapshot folder | `airtable/schema/snapshots/dev-20260706/` filenames contain `appTetnuCZlCZdTCT` | — |
| PROD (do not touch) | `appn84sqPw03zEbTT` | Production |

### Live / API confirmation

| Method | Result |
|--------|--------|
| `AIRTABLE_TOKEN` / `AIRTABLE_API_TOKEN` in env | **Missing** |
| `tools/airtable/.env` / `web/.env.local` | **Missing** |
| Browser session to airtable.com | **Not logged in** (marketing + login wall) |
| Direct open `https://airtable.com/appTetnuCZlCZdTCT` | Redirects to login (`continue=%2FappTetnuCZlCZdTCT`) — ID string accepted by Airtable URL router, but **base contents not readable** without auth |

**Identity verdict:** Repository documentation + snapshot filenames + Airtable login redirect unanimously identify `appTetnuCZlCZdTCT` as the intended DEV base. **Live metadata (base name from API/UI, current schema) could not be confirmed** without credentials.

**Hard stop applied:** No schema create, no automation paste, no record writes, no PROD access attempted.

---

## 2. Phase 1 — Pre-install checklist (from authoritative packet + DEV snapshot 2026-07-06)

Snapshot authority: `airtable/schema/snapshots/dev-20260706/schema_enhanced_appTetnuCZlCZdTCT_20260706_161606.json`  
**Caveat:** Snapshot is **10 days old**. Fields may have been added since; live re-export required before paste.

### Already present (do not recreate / do not rename)

| Area | Item | Evidence |
|------|------|----------|
| Tables | Config, Zoom Meetings, Homework Completions, XP Events, XP Reward Rules, Enrollments, Weeks | Snapshot 30 tables |
| Zoom Meetings | `Recording Link - Video` (url) | Present |
| Zoom Meetings | `Recording Link - Audio Only` (url) | Present |
| Zoom Meetings | `Zoom Meeting Key` formula `RECORD_ID()` | Present |
| Zoom Meetings | `Attendees` (link → Enrollments) — **live path only** | Present — **must remain unchanged** |
| Zoom Meetings | `Week` | Present |
| Homework Completions | `Completion Status` incl. `Satisfactory` | Present |
| Homework Completions | `Satisfactory?` (checkbox) | Present |
| Homework Completions | `Enrollment`, `Week` | Present |
| Homework Completions | `XP Events` (plural link) | Present (script optional singular `XP Event` may be missing) |
| Homework Completions | `Submission Date` (date) | Present (`Activity Date` name **missing**) |
| XP Events | `Source Key`, `Enrollment`, `XP Points`, `XP Bucket`, `XP Source`, `Week`, `Active?` | Present |
| XP Events | `Zoom Meeting`, `Homework Completion` links | Present |
| XP Events | `XP Reason Public` / `XP Reason Debug` / `XP Activity Date` | Present (script CONFIG names `Reason Public` / `Reason Debug` / `Activity Date` — **name mismatch**; writes skipped via `fieldExists`) |
| Enrollments | `Total Zoom Attendances` (**count** of `Zoom Meetings`) | Present — **must remain unchanged** until OMNI union review |
| XP Bucket options | Includes `Zoom Attendance` (not `Zoom`) | Present — see Must create / reconcile |
| XP Source options | Live Zoom family present; **no** `Zoom Recording` | See Must create |

### Must be created (DEV)

| Table | Field / object | Type / notes |
|-------|----------------|--------------|
| Config | `Zoom Recording XP Percent of Live` | Number — default 50 |
| Config | `Recording Gives Full Zoom Gate Credit?` | Checkbox — default checked |
| Config | `Zoom Recording Makeup Window Days` | Number — default 7 |
| Config | `Zoom Recording Deadline Mode` | Single select: Days After Recording Available · End of Program Week · Later of Both · Earlier of Both — default Later of Both |
| Config | `Recording Makeup Counts for Perfect Week?` | Checkbox — default checked |
| Config | `Recording Quiz Requires Coach Approval?` | Checkbox — default checked |
| Config | `Recording Approval Email Enabled?` | Checkbox — default checked when created |
| Config | `Recording Approval Email Timing` | Single select: `On Satisfactory` |
| Config | `Recording Approval Email Template Key` | Single line text — `ZOOM_RECORDING_APPROVED` |
| Zoom Meetings | `Recording Available At` | DateTime (America/Denver preferred) |
| Zoom Meetings | `Makeup Window Days Override` | Number |
| Zoom Meetings | `Deadline Mode Override` | Single select (same options as Config) |
| Zoom Meetings | `Recording Attendees` | Link → Enrollments (multiple) — **not** live Attendees |
| Homework Completions | `Zoom Meeting` | Link → Zoom Meetings — **required for credit identity** |
| Homework Completions | `Send Recording Approval Email?` | Checkbox — 117b trigger |
| Homework Completions | `Recording Approval Email Sent?` | Checkbox — idempotent send flag |
| XP Events | option `Zoom Recording` on `XP Source` | Required for 117a write |
| XP Events | option reconciliation for bucket | Script writes bucket name **`Zoom`**; live options have **`Zoom Attendance` only** — **must add `Zoom` option or Mike-approved script/CONFIG reconcile before enable** |
| Views | `117a - Recording Quiz Ready for XP` | Homework Completions |
| Views | `117b - Recording Approval Email Queue` | Homework Completions |
| Views | `C-025 - Zoom Meetings with Recording` | Zoom Meetings (optional ops view) |
| Automations | `117a - Zoom Recording Credit - Award XP from Quiz Completion` | Paste repo script; start OFF |
| Automations | `117b - Zoom Recording Credit - Send Approval Email Webhook` | Paste repo script; start OFF |

### Must be modified (DEV, after create)

| Item | Modification |
|------|----------------|
| Config active season row | Set C-025 defaults (percent 50, window 7, deadline Later of Both, email flags) |
| 117a automation | Map `recordId`; conditions Satisfactory + Zoom Meeting + Enrollment; enable **only for smoke** |
| 117b automation | Map `recordId` + **DEV-safe** `makeWebhookUrl`; enable only after webhook proof |
| XP Reward Rules | Verify active `ZOOM_ATTEND_BASE` + XP Amount (read-only check; create optional display `ZOOM_ATTEND_RECORDING`) |

### Must remain unchanged

| Item | Why |
|------|-----|
| PROD base `appn84sqPw03zEbTT` | Authorization is DEV-only |
| Automation **101** live attendance | Recording must not ride live Attendees |
| Zoom Meetings.`Attendees` | Live path only |
| Enrollments.`Total Zoom Attendances` formula/count | OMNI review required for live∪recording union |
| Existing recording URL field names | Do not duplicate |
| 070a PROD OFF decision | [AUTOMATION_070A_LAUNCH_DECISION.md](../v2/AUTOMATION_070A_LAUNCH_DECISION.md) |
| Credentials / webhooks in git | Never commit secrets |

---

## 3. Behavioral contract confirmed from repo (offline)

| Topic | Authoritative behavior |
|-------|------------------------|
| Script versions | 117a/117b `SCRIPT.version` **v1.0** (2026-07-15) |
| XP % | Config `Zoom Recording XP Percent of Live`; fallback 50 |
| Deadline | Config days + mode + meeting overrides; America/Denver date keys |
| XP bucket / source (script) | `Zoom` / `Zoom Recording` |
| Source Key | `ZOOM_RECORDING\|{meetingId}\|{enrollmentId}` |
| Idempotency | Rerun → `skipped_already_awarded` |
| Exclusivity | Live family `ZOOM_ATTEND_BASE\|` / `ZOOM_LIVE\|` blocks recording |
| Bonuses | Recording must **not** award `ZOOM_ATTEND_BONUS_2/3` |
| 117b email | Config enabled + Satisfactory; webhook POST; clear send trigger **only on success** |
| Rollback | Turn 117a/117b OFF; leave fields; do not delete XP Events; deactivate by Source Key if bad |

---

## 4. Phases 2–4 — Live install / smoke (not executed)

| Phase | Status | Detail |
|-------|--------|--------|
| 2 — Install 117a OFF then review | **Blocked** | No Airtable write access |
| 3 — 117a smoke (10 checks) | **Not run** | No test records created |
| 4 — 117b + DEV webhook | **Blocked** | No webhook credentials in env; cannot prove DEV-safe endpoint |

### Smoke matrix (planned — all U)

| # | Check | Result |
|---|-------|--------|
| 1 | Eligible approved recording creates XP Event | U — not run |
| 2 | XP amount uses Config % | U |
| 3 | Bucket/source correct | U (also blocked by option mismatch until reconciled) |
| 4 | Source Key `ZOOM_RECORDING\|…` | U |
| 5 | Rerun no duplicate | U |
| 6 | Ineligible/unapproved no XP | U |
| 7 | Deadline handling | U |
| 8 | Competing paths exclusive | U |
| 9 | Failure details visible | U |
| 10 | No unrelated athletes affected | U |
| 117b webhook success / clear trigger | U |
| 117b webhook fail keeps retryable | U |
| 117b duplicate email prevention | U |

**XP Event evidence:** none (no writes)  
**Idempotency evidence:** offline contract tests only  
**Airtable records affected:** **none**

---

## 5. Blockers (exact)

1. **No Airtable PAT** in cloud environment (`AIRTABLE_TOKEN` / `AIRTABLE_API_TOKEN` absent; no `.env` files).  
2. **No authenticated Airtable browser session** — login wall at airtable.com; cannot paste automations via UI.  
3. **No DEV Make webhook URL** available to prove 117b destination is DEV-safe.  
4. **Schema option mismatch risk:** script `xpBucket: "Zoom"` vs snapshot option `Zoom Attendance`; `Zoom Recording` XP Source missing.  
5. **Snapshot age:** 2026-07-06 export — live schema may differ; must re-confirm after credentials.

---

## 6. PROD / 070a confirmation

| Claim | Status |
|-------|--------|
| PROD Airtable changed | **No** — no API/UI access used against PROD; no writes |
| 117a/117b PROD installed | **No** — remain repo-only |
| 070a remains OFF in PROD | **Confirmed in repo decision record** — live UI re-confirm still Mike/OMNI |

---

## 7. Rollback readiness (if install later succeeds)

1. Turn **117a** and **117b** **OFF** in DEV.  
2. Leave Config/fields in place (do not delete).  
3. Do **not** delete XP Events; deactivate/audit by `ZOOM_RECORDING|*` Source Key if needed.  
4. Re-paste prior script SHA only if a bad paste occurred (none yet).  
5. Do not enable on PROD.

---

## 8. Exact next recommendation

1. Mike provides **DEV-scoped Airtable PAT** (schema + data read/write on `appTetnuCZlCZdTCT` only) **or** logs into Airtable in the agent browser / completes OMNI paste.  
2. Re-export live DEV schema; reconcile **XP Bucket `Zoom` vs `Zoom Attendance`** and add **`Zoom Recording`** XP Source before enabling 117a.  
3. Execute [ZOOM_RECORDING_CREDIT_DEV_INSTALL.md](../v2/ZOOM_RECORDING_CREDIT_DEV_INSTALL.md) §1–9 on DEV only.  
4. For 117b: prove webhook is DEV Make hook before ON; else leave OFF.  
5. Keep **070a OFF in PROD**; do not install 117a/117b in PROD.

---

## 9. Screenshots (access proof)

| File | Meaning |
|------|---------|
| `/tmp/computer-use/4c8ce.webp` | airtable.com marketing — not logged in |
| `/tmp/computer-use/6e9ad.webp` | Airtable login page |
| `/tmp/computer-use/aa490.webp` | Login required for `/appTetnuCZlCZdTCT` |
