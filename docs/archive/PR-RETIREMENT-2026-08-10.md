# Superseded Draft PR Package Retirement — 2026-08-10

> **Historical reference only — not an active source of truth.**

**Backlog:** `SCV2-SEASON-LAUNCH-CONSOLIDATION-001`
**Approval:** Mike Phase 5 close approval, 2026-08-10
**Baseline:** `origin/master` `36ac09dec81705742b62325c4eafba736f1c460e`

This record documents why draft PRs [#127](https://github.com/Schmidt127/127-si-shooting-challenge/pull/127),
[#129](https://github.com/Schmidt127/127-si-shooting-challenge/pull/129),
[#130](https://github.com/Schmidt127/127-si-shooting-challenge/pull/130), and
[#131](https://github.com/Schmidt127/127-si-shooting-challenge/pull/131)
are retired without merging or deleting their branches.

## Dispositions

| PR | Exact disposition | Preserved | Intentionally excluded |
|---|---|---|---|
| #127 — Homework Library / PHA cross-year audit | Close as superseded historical evidence | Existing audit document and read-only audit script remain in their original paths; the document is explicitly historical | No stale PROD assertions, fixed record IDs, or old 020 v3.3 conclusions become current release status |
| #129 — Automation launch closeout | Close as superseded stale promotion package | Current repository automation source and existing validated tests remain authoritative | Old paste runbook, Mike action list, stale version/PROD matrix, and candidate Program Instance test are not cherry-picked |
| #130 — 2026–27 launch package | Close as obsolete fixed-snapshot package | Current challenge-year contracts and manually maintained Weeks authority remain | Generated 2026–27 IDs, fixed 9/10-week assumptions, decision sheet, and old Fillout/Make launch package are not retained |
| #131 — Automation 020 v3.4.1 | Close as superseded by master | Current `020` v3.5 PHA-first source and `tests/homework/automation-005-020-pha-direct.test.js` remain authoritative | v3.4.1 source, tests, paste card, and claims are not merged or reused |

## Current authority

Current release status remains in the
[Completion Master](../SHOOTING_CHALLENGE_COMPLETION_MASTER.md), machine-readable
release control remains in [`agent-runs/CONTROL.json`](../agent-runs/CONTROL.json),
and ownership/evidence boundaries remain in the
[Authority Map](../AUTHORITY-MAP.md). Airtable Weeks remains manually maintained
and is the season-calendar authority.

The current 2027 policy is May 1–June 30, 2027; normal Early Bird is April 25–
May 1; Week 1 begins May 2; there is no fixed week count; a new season starts at
Level 1 with 0 season XP; Fillout availability is manual; and the current
today-based Early Bird is temporary testing only.

No old branch was cherry-picked. No Airtable, Fillout, Make, Vercel, secret,
deployment, web, schema, or production-data change was made.
