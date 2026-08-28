# SC-PW-E2E — Disposable Perfect Week end-to-end harness

| Field | Value |
|-------|--------|
| Backlog | **SC-PW-E2E** |
| Status | **READY** (pending Mike production run) |
| Harness | `tools/testing/sc-pw-e2e.mjs` |
| Library | `tools/testing/lib/sc-pw-e2e-lib.mjs` |
| Contract tests | `tools/testing/tests/test_sc_pw_e2e_contract.mjs` |

## Purpose

Verify the production Perfect Week pipeline on **throwaway data only**:

**057** → WAS formulas → **Perfect Week Eligible?** → **058** unlock → **059** XP Event

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

## Operator note

Mark **SC-PW-E2E** complete in the Master Future Work List only after Mike runs `--case qualifying --apply` on production and evidence is archived.
