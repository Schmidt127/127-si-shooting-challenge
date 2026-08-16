# PKG-009 — Season-Scope Safety and 2027 Activation

**Status:** Repository-ready — Mike decision required before live activation  
**Owner:** Mike (Production operator); Cursor (repository source)  
**Repository boundary:** Read-only audits and checklists only. No Airtable schema,
data, view, automation, Make, Fillout, Vercel, domain, secret, or env-var
changes from this packet.

**Inventory:** [`PKG-009-SEASON-SCOPE-INVENTORY.md`](../investigations/PKG-009-SEASON-SCOPE-INVENTORY.md)

## Purpose

Audit every selection, lookup, view assumption, API query, automation, and
email path that determines:

- Program Instance
- School Year
- active Enrollment
- current Week
- active rules/configuration
- public standings scope

## Pre-season activation checklist

Mike attests each item in Airtable UI / export before activation:

- [ ] Exactly one `Program Instance - Sync` row is `Registering` for Shooting Challenge
- [ ] Registering PI name is exactly `Shooting Challenge | {Active School Year}`
- [ ] Exactly one active Config row; `Active School Year` matches registering PI
- [ ] Weeks calendar attested: challenge window May 1–Jun 30, 2027; Early Bird Apr 25–May 1; Week 1 May 2
- [ ] No overlapping active Weeks within the same Program Instance
- [ ] Temporary Early Bird testing fixture shortened or replaced per Authority Map
- [ ] `Web - Leaderboard` view filters verified (active, one Athlete, one PI, one School Year)
- [ ] Fillout daily form remains OFF until SC-135 dry-run approval
- [ ] 2027 Levels, Gate Rules, and XP Reward Rules scoped to correct School Year / Rule Set
- [ ] Prior-season Enrollments remain accurate and excluded from public scope
- [ ] `node tools/challenge-year/cli.js launch-preflight` run against current export — PASS
- [ ] `audit-pkg-009-season-readiness.js` JSON — zero `error` findings

## Read-only preflight order

1. Record `git rev-parse HEAD`.
2. Export current Config, Program Instance, Weeks, and Enrollments (read-only).
3. Run `audit-pkg-009-season-readiness.js` in Scripting Extension — save JSON.
4. Run `audit-pkg-040-standings-integrity.js` for public standings scope cross-check.
5. Run challenge-year CLI:
   ```bash
   node tools/challenge-year/cli.js launch-preflight --input <export.json>
   node tools/challenge-year/cli.js activation-preview --input <export.json>
   ```
6. Stop on any ambiguous PI, multiple active Config, week overlap, or duplicate
   active Enrollment identity.

## Controlled Production verification plan

| Step | Mike action | Expected outcome | Pass criteria | Evidence |
|---:|---|---|---|---|
| 1 | Verify registering PI row | One `rec…` id; correct School Year | Cardinality = 1 | Screenshot + record id |
| 2 | Verify active Config | One active row; year match | No broad fallback used | Export snippet |
| 3 | Verify Weeks export | Calendar matches 2027 policy | No overlap; Week 1 = May 2 | CSV/export |
| 4 | Read `/shoot/leaderboard` | Only current-season athletes | No prior-season leakage | URL + timestamp screenshot |
| 5 | Read one prior-season Enrollment | Historical totals unchanged | No cross-link to 2027 PI | Record id + field capture |
| 6 | Attempt ambiguous PI test in DEV only | Selection fails with explicit reason | No silent first-row pick | Automation output / thrown error |
| 7 | Re-run season audit | JSON unchanged or improved | Zero `error` findings | Audit JSON path |

## Rollback plan (no data deletion)

1. Set registering PI / Config / Fillout availability back to captured pre-activation state.
2. Do not delete historical Enrollments, XP Events, or Weeks.
3. If a wrong-season link was created during verification, repair links manually
   with read-only audit guidance — do not bulk-delete.
4. Re-run `audit-pkg-009-season-readiness.js` and `launch-preflight`.
5. Record rollback evidence in `docs/prod-completion/` dated folder.

## Offline validation

```bash
node tests/challenge-year/pkg-009-season-scope-safety.test.js
node tests/challenge-year/season-launch-control.test.js
node airtable/extension-scripts/audits/audit-pkg-009-season-readiness.test.js
node tests/challenge-year/challenge-year-engine.test.js
```

## Dependency gates

| Package | Gate |
|---|---|
| **PKG-006** | Intake proof should use correct 2027 Weeks before season activation |
| **PKG-009** | Blocks **PKG-014**, **PKG-023**, and full **PKG-027** pre-season audit |
| **PKG-037** | End-to-end certification requires registering PI + School Year attestation |
| **PKG-040** | Standings scope already verified 2026-08-15; re-run after any PI/Config change |

## Future recommendation (not in this package)

See inventory doc § Future schema recommendation for **V2-013**. Do not start
incremental Program Instance schema edits under PKG-009.
