# Production installation packet — Reliability Command Center

**Status:** Ready for Production Installation (repository + view specs)  
**Airtable Interface:** Designed only — **not installed** by this packet  
**Date:** 2026-07-24  
**Scope:** Shooting Challenge only

## Preconditions

- [ ] On branch/PR for RCC reviewed
- [ ] `node tests/reliability-command-center/run-all.js` PASS
- [ ] Related contract tests PASS (`tests/was-email-contracts`, `tests/homework-contracts`)
- [ ] Mike authorizes any Airtable view/Interface creation (OMNI in-base)
- [ ] No Team Shot Tracker changes
- [ ] Weekly email ownership unchanged: `118 → 072 → 119 → 074 → Make Bulk Email May 18 → Gmail → writeback`
- [ ] PROD 074 `sendMode` is **Live** (or blank inheriting WAS Live) — never fixed Test

## Files and scripts involved

| Path | Role |
|------|------|
| `lib/reliability-command-center/**` | Health model, helpers, workflow checkers |
| `tools/reliability-command-center/cli.js` | Offline audit runner |
| `tools/reliability-command-center/repair-preview.js` | Dry-run repair preview |
| `tests/reliability-command-center/**` | Fixtures + tests |
| `docs/reliability-command-center/**` | Authoritative docs |
| This checklist | Production steps |

## Proposed new fields

**None required** for repository audit usage.

Optional accelerators (Mike-authorized only) — see [AIRTABLE-VIEW-SPEC.md](../reliability-command-center/AIRTABLE-VIEW-SPEC.md):

- `RCC Email Conflict?` (WAS formula)
- `RCC Level Conflict?` (Enrollments formula)
- Future `RCC Findings` table

**Do not create these fields in this install unless Mike explicitly asks.**

## Proposed Airtable views

Create in PROD (or DEV first) using exact filters from the view spec:

1. P0 Blocking Errors — Weekly Email (multiple saved filters OK)
2. Retryable Errors (or use RCC export until helpers exist)
3. Missing Dependencies — Submissions
4. Duplicate Risks — XP Events grouped by Source Key
5. Stale Processing — WAS Build flag / Enrollment recalc
6. Weekly Email Health
7. XP Integrity
8. Achievement Integrity
9. Level Integrity
10. Current Challenge-Year Problems
11. Recently Resolved — defer until findings log exists

Interface name if created later: **Reliability Command Center** — mark status **Installed** only after Mike confirms.

## Automation changes

**None.** Do not add/enable/disable Airtable automations for RCC v1.

## Test procedure (repository)

```bash
node tests/reliability-command-center/run-all.js
node tests/was-email-contracts/run-all.js
node tests/homework-contracts/run-all.js

node tools/reliability-command-center/cli.js \
  --fixture tests/reliability-command-center/fixtures/healthy.json

node tools/reliability-command-center/cli.js \
  --fixture tests/reliability-command-center/fixtures/mixed-health.json \
  --output /tmp/rcc-mixed
```

Expect healthy fixture ≈ 0 P0; mixed fixture many P0/P1 with recommended actions.

## Controlled production validation (read-only)

1. Export sanitized JSON slices (or use Scripting extension export) for:
   - Weekly Athlete Summary (email fields)
   - XP Events (Source Key, Enrollment, Points)
   - Submissions (Enrollment, Week, Activity Date, XP status)
   - Enrollments (Active?, Challenge Year, levels)
2. Strip/replace real emails with synthetic values before committing anything.
3. Run CLI `--input` → review P0 list.
4. For any repair: dry-run preview with **explicit record IDs** only.
5. Apply fixes via existing automations / Mike-authorized OMNI — not bulk RCC writes.

## Expected outputs

- `report.json` + `report.md` with P0–P3 counts
- Affected record IDs
- Retry eligibility per finding
- No live Airtable mutations from CLI

## Rollback procedure

See [ROLLBACK.md](../reliability-command-center/ROLLBACK.md).

## Confirm no duplicate XP / unlocks / summaries / emails

After any manual repair:

1. Re-export affected tables.
2. Re-run RCC audit.
3. Zero new `*_duplicate_*` / `already_sent_eligible_to_resend` / `sent_still_armed` findings attributable to the repair.
4. Spot-check Source Keys for repaired records in XP Events.

## How to mark statuses

| Evidence | Status to use |
|----------|----------------|
| Code + tests in repo | Built / Tested |
| View spec only | Designed |
| This packet ready | Ready for Production Installation |
| Mike created views/Interface | Installed |
| Controlled PROD export audit PASS | Live Tested in PROD |

Do **not** mark Interface as Installed until it exists in Airtable.
