# SC-PW-E2E — Disposable Perfect Week end-to-end harness

| Field | Value |
|-------|--------|
| Backlog | **SC-PW-E2E** |
| Status | **COMPLETE** (MCP-verified award on WAS `recl3DmBh22ADPWWe`) |
| Harness | `tools/testing/sc-pw-e2e.mjs` |
| Library | `tools/testing/lib/sc-pw-e2e-lib.mjs` |
| Contract tests | `tools/testing/tests/test_sc_pw_e2e_contract.mjs` |
| Evidence | `docs/testing/evidence/sc-pw-e2e/award-was-recl3DmBh22ADPWWe-2026-08-29-mcp.json` |

## Purpose

Verify the production Perfect Week pipeline on **throwaway data only**:

**057** → WAS formulas → **Perfect Week Eligible?** → **058** unlock → **059** XP Event

**Authoritative award proof (do not re-`--apply`):** WAS `recl3DmBh22ADPWWe` → unlock `recJ5umer4J4FHTOz` (Awarded, `Milestone Source Key` = `PERFECT_WEEK|rec93mAfo5jKqP3g5|recNzl4dNOtDmJqnV`) → XP `reczehlzkA8fjiQh0` (100 pts). Evidence: `docs/testing/evidence/sc-pw-e2e/award-was-recl3DmBh22ADPWWe-2026-08-29-mcp.json`. Harness timeout JSON `qualifying-2026-08-28T2252.json` is historical pre-award. Local `sc-pw-e2e-lib.mjs` WIP must stay uncommitted until intentional.

No email. No writes to formula outputs, `Perfect Week Eligible?`, unlocks (except `trigger-only`), XP Events, or Lifetime XP.

## Safety

| Rule | Enforcement |
|------|-------------|
| Dry-run default | No Airtable writes without `--apply` |
| PWTEST prefix | Every created Week name starts with `PWTEST\|` |
| Gated enrollment only | `rec93mAfo5jKqP3g5` (Perfect Week Testing) · PI `rec5mEM0YPqPqq0hZ` |
| Cleanup guard | `--cleanup` deletes only manifest records; Week name must still start with `PWTEST\|` |
| Stop on failure | Exits immediately with diagnostic JSON |

## Prerequisites

- `AIRTABLE_API_TOKEN` in `web/.env.local`, `.env.local`, or `.env` — **must include schema.bases:read** and write access to Weeks, WAS, Submissions, Video Feedback, Enrollments, Unlocks, XP Events
- Production automations **057**, **058**, **059** enabled (059 trigger: Pending unlock, no Shot Milestone filter)
- **058** must be **Live** with a lifecycle trigger on Weekly Athlete Summary updates (Eligible?, Automation Status, Perfect Week Unlock). Historical CASE-01 (2026-08-05) auto-fired 058; SC-PW-E2E 2026-08-28 did not — verify trigger in Airtable UI before relying on harness auto-poll.
- Production unlock schema uses **`Milestone Source Key`** and **`Coach Note`** (not `Source Key` / `Notes`). Repo **058 v1.4** still requires `Source Key` in script — live prod **v1.3** may differ; manual run may write `058 error:` if pasted v1.4 without field alias.
- Gated test timestamp fields per [`PERFECT-WEEK-FIXTURE-METHOD.md`](./PERFECT-WEEK-FIXTURE-METHOD.md)

`--apply` runs a **preflight** that fails fast when the PAT cannot read schema metadata, the gated enrollment is invisible, or required fields are missing (including unlock `Source Key` vs `Milestone Source Key` for trigger-only).

## Usage

### Dry-run (default)

Prints the plan only — no records created.

```bash
node tools/testing/sc-pw-e2e.mjs --case qualifying
node tools/testing/sc-pw-e2e.mjs --case nonqualifying-video
node tools/testing/sc-pw-e2e.mjs --case trigger-only
```

### Apply (live disposable run)

Creates PWTEST fixtures, polls each automation stage, prints final report.

```bash
node tools/testing/sc-pw-e2e.mjs --case qualifying --apply
node tools/testing/sc-pw-e2e.mjs --case nonqualifying-video --apply
node tools/testing/sc-pw-e2e.mjs --case trigger-only --apply
```

Manifest (created record IDs): `docs/testing/perfect-week/fixtures/_sc-pw-e2e-last.json`  
Evidence: `docs/testing/evidence/sc-pw-e2e/`

### Cleanup

Deletes **only** records listed in the manifest (XP → unlocks → videos → submissions → WAS → Week).

```bash
node tools/testing/sc-pw-e2e.mjs --cleanup
node tools/testing/sc-pw-e2e.mjs --cleanup --manifest docs/testing/perfect-week/fixtures/_sc-pw-e2e-last.json
```

## Test cases

### `--case qualifying`

Creates: Week, WAS, 7 gated submissions (Sun–Sat), 3 Video Feedback rows.

Verifies:

- Seven distinct qualifying dates; daily requirement met
- Video Count ≥ 3; Video Requirement Met? = 1
- Homework Requirement Met? = 1 (or 0 assigned → met)
- Zoom Requirement Met? = 1 when no meeting
- Automation Status → Ready; Eligible? → 1
- Exactly one active unlock (Pending before 059)
- Exactly one XP Event (100 pts, Source Key `PERFECT_WEEK|enrollment|week`)
- XP Activity Date = Week End Date
- Second 057 run creates no duplicate unlock or XP

### `--case nonqualifying-video`

Same as qualifying but **2** videos only.

Verifies: Video Count = 2, Video Met = 0, Eligible? = 0, no unlock, no XP, no Lifetime XP increase.

### `--case trigger-only`

Creates a disposable **Pending** Perfect Week unlock (`Reward Rule Key = PERFECT_WEEK`, `Shot Milestone` blank). Does **not** manually create an XP Event.

Verifies 059 processes the record under the create/update trigger.

## Polling

Uses project convention from WAS email fixtures:

- Interval: **8s**
- Timeout: **600s** per stage
- Status + record IDs logged each cycle
- Each 058/059 poll cycle includes **`outcome`** classification (see below)

### Stage outcome classification (diagnostics)

| Outcome | Meaning |
|---------|---------|
| `058_never_ran` | Eligible + Ready, empty Automation Error, no unlock — trigger gap or automation OFF |
| `058_ran_failed` | `Perfect Week Automation Error` starts with `058 error:` |
| `058_ran_skipped` | `Perfect Week Automation Error` starts with `058 skipped:` |
| `058_created_unlock_unlinked` | Unlock row exists but WAS link empty |
| `058_created_unlock` | One active unlock linked to WAS |
| `059_never_ran` | Unlock Pending, no XP Event |
| `059_ran_zero_xp` | Unlock Awarded but no XP for source key |
| `059_created_xp` | One XP Event; unlock Awarded |

Timeout failures set `failurePoint` to the stage name (e.g. `058-unlock`), not `preflight`.

## Operator — manual 058 on blocked WAS

When harness stops at 058 with `058_never_ran`, run **058 - Create Perfect Week Unlock** manually in Airtable (see Saturday runbook). Use WAS `recordId` (not unlock id). For the 2026-08-28 fixture: `recl3DmBh22ADPWWe`.

## Related tools

| Tool | Role |
|------|------|
| `create_pw_case01_fixtures.mjs` | Historical CASE-01 gated fixture |
| `poll_pw_case01.mjs` | Single-shot CASE-01 poll |
| `verify_perfect_week_chain.mjs` | CASE-01 chain proof (fixed IDs) |
| `tests/test_057_runtime.mjs` | Offline 057 runtime |
| `tests/test_058_perfect_week_lifecycle_runtime.mjs` | Offline 058 runtime |

## Validation (offline)

```bash
node tools/testing/tests/test_sc_pw_e2e_contract.mjs
node --test tools/testing/tests/test_057_runtime.mjs
node --test tools/testing/tests/test_058_perfect_week_lifecycle_runtime.mjs
node tests/automation-contracts/057-perfect-week-video-minimum.test.js
node tests/automation-contracts/automation-io-conventions.test.js
```

## Fixture create notes (2026-08-29)

- Set **`Duplicate Review Status = Count It`** (and Simple Total) on create — otherwise duplicate review can force `Needs Review` → `Count This Submission? = 0` → not countable.
- Arm WAS as **Error** until submissions/videos exist, then a **single Pending** write (Calculation Queue). Do not re-write Pending after 057 may have set Ready.
- Unlock lookup uses **`Milestone Source Key`** + WAS-linked unlock IDs — never `FIND(rec…, ARRAYJOIN({Enrollment}))` (ARRAYJOIN returns names).
- `rearm057` must cycle **Error → Pending** (Queue is 1 for both Pending and Ready).

## Operator note

**SC-PW-E2E** marked complete after MCP-verified award on WAS `recl3DmBh22ADPWWe`. Do **not** create another test week for this requirement. Optional: `--case nonqualifying-video` for the fail path.
