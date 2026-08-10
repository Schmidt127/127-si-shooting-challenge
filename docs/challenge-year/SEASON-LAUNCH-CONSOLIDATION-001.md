# Season-launch consolidation — SCV2-SEASON-LAUNCH-CONSOLIDATION-001

**Authoritative PR:** #137 (`agent/season-launch-control-closeout`)  
**Scope:** Offline tooling, import preview/reconciliation, tests, and controlled-launch instructions only.  
**Not evidence of:** Airtable state, automation installation/testing, Fillout state, web/Vercel state, production activation, or final Mike approvals.

## PR #130 / #137 reconciliation

| PR #130 artifact or claim | Disposition in #137 | Reason |
| --- | --- | --- |
| `DECISION-SHEET.md` | Incorporated as generated `mike-decision-sheet.md` and this package's decision gate | Its fail-closed decision-record idea is useful. The old sheet's dates, week count, and production assertions are not authoritative. |
| `tools/season-launch/validate-2026-2027-package.mjs` | Rejected | Validates a static, dated snapshot and writes a report into source documentation. #137 validates caller-provided local fixtures and read-only exports without making production claims. |
| Generated Config, Program Instance, Weeks, ID maps, rule, Zoom, and feature-switch JSON | Rejected | These embed point-in-time record IDs, unverified PROD state, an undecided 2026–27 calendar, and cross-lane automation/Fillout concerns. Importing them would turn a snapshot into false launch authority. |
| Canonical Week CSV/JSON | Rejected | It hard-codes an unapproved Week 0 Sunday and 9-week calendar. #137 generates the import CSV only from Mike-approved fixture values. |
| Fillout mapping/reopen checklist | Rejected | Fillout configuration is outside this lane and must be UI-attested by Mike/ChatGPT. |
| Public-content audit and `web/.env.local.example` edit | Rejected | Web/Vercel work is owned by the Web Agent. |
| Welcome, Zoom, and broad Schmidt test cards | Rejected | They make automation and production-test claims outside this package, including reserved 067/115 work. The existing generic controlled Schmidt plan remains the correct linked gate. |
| Residual matrix / handoff / package README | Rejected as source artifacts | They are snapshot-oriented and contain claims such as partially installed or live-proven state that repository evidence cannot establish. #137's runbook is limited to required evidence and gates. |

## Authoritative behavior retained in #137

- `launch-dry-run` is offline-only and reports `Airtable writes: 0`.
- It requires a valid config, an explicit `reset` or `carry` level policy, a Sunday Week 0, and a positive regular-week count.
- It produces proposed Weeks, expected count, first/last dates, timezone, a manual-import CSV, duplicate/key/date-conflict checks when a read-only Weeks export is supplied, and activation blockers.
- It emits `mike-decision-sheet.md`; values in a fixture remain proposed until Mike signs the sheet.
- Manual import, export reconciliation, controlled Schmidt testing, activation, and rollback remain distinct gated stages in `SEASON-LAUNCH-DRY-RUN-AND-ACTIVATION.md`.

## Remaining Mike decisions

1. Final challenge year, Early Bird (Week 0) Sunday, and regular-week count.
2. `reset` or `carry` level policy.
3. Intake dates and activation approval in their respective Mike-owned workflows.
4. Read-only target-year Weeks export before any import, followed by the manual Airtable reconciliation and controlled Schmidt evidence.

After #137 is merged, PR #130 may be closed because its only reusable control (a decision sheet) is preserved here; its static snapshot artifacts are intentionally not carried forward.
