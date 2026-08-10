# 2026–2027 Season Launch — Operator Index

**Worker 2 deliverable** · Branch `cursor/season-intake-closeout-c592`  
**Package:** [`docs/challenge-year/generated/2026-2027/`](../challenge-year/generated/2026-2027/)

## Start here

| Step | Document |
|------|----------|
| 1 | [`DECISION-SHEET.md`](./DECISION-SHEET.md) — Mike decisions with recommended defaults |
| 2 | [`../challenge-year/generated/2026-2027/README.md`](../challenge-year/generated/2026-2027/README.md) — import package + record IDs |
| 3 | Run `node tools/season-launch/validate-2026-2027-package.mjs` |
| 4 | [`SCHMIDT-RESIDUAL-MATRIX.md`](./SCHMIDT-RESIDUAL-MATRIX.md) — what is already proven |
| 5 | [`SCHMIDT-TEST-CARDS.md`](./SCHMIDT-TEST-CARDS.md) — executable cards for remaining cases |
| 6 | [`FILLOUT-REOPEN-CHECKLIST.md`](./FILLOUT-REOPEN-CHECKLIST.md) |
| 7 | [`WELCOME-FINAL-TEST.md`](./WELCOME-FINAL-TEST.md) · [`ZOOM-FINAL-TEST.md`](./ZOOM-FINAL-TEST.md) |
| 8 | [`PUBLIC-CONTENT-AUDIT.md`](./PUBLIC-CONTENT-AUDIT.md) |
| 9 | [`HANDOFF.md`](./HANDOFF.md) — execution order |

## Current state (audited 2026-08-10)

| Area | Status |
|------|--------|
| Program Instance `rec5mEM0YPqPqq0hZ` | **Exists in PROD** |
| Config `rechc1f9f4kVM1tHP` | **Exists** — Zoom fields sparse |
| Weeks 2026–27 | **Imported** — 12 rows + PWTEST hazard |
| XP Reward Rules (2026–27 set) | **31 rules in snapshot** |
| Level Gate Rules 2026–27 | **Missing from snapshot** — decision required |
| PHA schedule | **Restored** 2026-08-08 (90 rows) |
| Fillout enrollment | **OFF** |
| Schmidt tests | **Partial** — see residual matrix |
| Public `/shoot` | **Certified** 2026-08-04 smoke PASS |

## Hard rules

- DEV/repo only from this package — no prod paste, Fillout reopen, or mass email without Mike.
- Do not edit Worker 1 automation files (010, 020, 023, 031, 043, 053, 066, 118, 119).
- Keep 118/119 ON unless aborting launch.
