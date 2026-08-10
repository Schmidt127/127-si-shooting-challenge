# Shooting Challenge Authority Map

**Status:** Active
**Backlog:** `SCV2-SEASON-LAUNCH-CONSOLIDATION-001`
**Last updated:** 2026-08-10

This map defines ownership. It does not assert that a repository document proves
current live configuration.

## Current authority

| Concern | Authority | Owner / update trigger |
|---|---|---|
| Source code and automation source | GitHub `master` and the committed repository paths | Cursor; update on approved code changes |
| Human-readable release status | [`SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](./SHOOTING_CHALLENGE_COMPLETION_MASTER.md) | Cursor; update when release evidence or blockers change |
| Machine-readable run control | [`agent-runs/CONTROL.json`](./agent-runs/CONTROL.json) | Lead / Integrator; update when a controlled agent package starts, completes, or changes state |
| Live Airtable configuration and records | Airtable UI / named base, not repository text | Mike; verify with a dated read-only export or controlled UI evidence |
| Live Fillout enrollment availability | Fillout UI | Mike; verify before launch activation |
| Live Make, Gmail, Lambda, and email state | Respective service UI / logs | Mike; verify with service evidence; no repository claim substitutes for it |
| Live Vercel deployment and settings | Vercel project `127-si-shooting-challenge` | Vercel / Mike; verify with read-only CLI or dashboard inspection |
| Release evidence | Dated evidence packages under `docs/prod-completion/`, `docs/testing/evidence/`, and focused deploy checklists | Cursor records evidence boundaries; Mike supplies live-system evidence |
| 2027 season calendar | Airtable **Weeks** table, manually maintained | Mike; verify the target-year export before import or activation |
| Historical records | Dated files under `docs/archive/` and historical evidence folders | Preserve; never treat as current status |

## 2027 season policy

- Challenge window: **May 1–June 30, 2027**.
- Early Bird normal calendar: **April 25–May 1, 2027**.
- Week 1 starts **May 2, 2027**.
- Airtable Weeks is the season-calendar authority.
- There is no fixed number of weeks.
- Every new season starts at Level 1 with 0 season XP.
- Fillout manually controls enrollment availability.
- The current today-based Early Bird record is a temporary testing fixture and
  must be shortened or replaced before the 2027 launch.

## Evidence boundaries

Repository code and offline tests can prove contracts, deterministic behavior,
and expected outputs. They cannot prove current Airtable installation, Fillout
availability, Make/Gmail sends, or Vercel settings. Controlled automation-action
testing is not natural-trigger proof, offline tests are not controlled PROD
proof, and successful 115 creation does not prove 005/009/020/064/XP/summary or
email behavior.

Automation 115 intentionally creates one new production-shaped Submission per
explicit checked Run Test request. That behavior is not idempotency. Downstream
Homework Completion reuse is a separate contract.

## Document routing

- Release status: Completion Master.
- Run coordination: `agent-runs/CONTROL.json`.
- Backlog: `v2-change-backlog.md`.
- Live operations snapshot: `PROJECT_STATE.md`; it must link here and must not
  present itself as the release-status master.
- Architecture, operator runbooks, test specifications, and release evidence
  retain their narrow purpose and link current status here.
- Historical status packets are preserved under `docs/archive/` or carry the
  required historical-reference notice.

## Stale-reference audit

Run from the repository root:

```powershell
node tools/testing/audit-source-of-truth.mjs
```

The audit scans active source-of-truth and operational paths. Historical
material under `docs/archive/`, dated evidence directories, and files explicitly
listed in its exception manifest are allowed to retain superseded versions,
branches, PRs, and claims when their historical context is clear.
