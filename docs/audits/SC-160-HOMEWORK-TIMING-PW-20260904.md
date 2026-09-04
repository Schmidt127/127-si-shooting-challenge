# SC-160 — Homework Timing and Perfect Week (Agent 3)

**Date:** 2026-09-04  
**Agent:** 3 — Homework Timing and Perfect Week  
**Branch:** `sc160/a3-homework-timing`  
**Base SHA:** `95e83bf2e691cc589a3cfc836a37727ad9af4107` (`origin/master`)  
**Worktree:** `~/.cursor/worktrees/sc160-a3-d0a45cb6`  
**Backlog ID:** SC-160  

## Task Classification

| Field | Value |
|---|---|
| Type | Implementation — homework timing / Perfect Week policy |
| Priority | P0 (blocks early/out-of-week homework processing) |
| Difficulty | Medium–High |
| Owner | Cursor Agent 3 |
| Dependencies | Agent 2 (009 asset intake decoupling); FUT-001 late-credit (complete) |
| Backlog ID | SC-160 |
| Estimated Scope | Contracts + 020/065/057 + tests + docs |
| Phase | 3 Implementation |
| Correct tool | Cursor |
| Repo | `127-si-shooting-challenge` |
| Mike's role | Paste 020/065/057 after PR merge; verify disposable early fixture |

## Root cause (Agent 3 scope)

Automation **020** required `Submission.Week` exactly once and validated PHA Week against that Submission Week. Early submissions (Activity Date before the 2026–27 calendar, Week empty / Needs Assignment) could not create/link Homework Completions even when a Program Homework Assignment already carried the authoritative assigned Week.

Timing was binary on-time/late by Activity Date day vs due date. Missing:

- Explicit **Early** (before assigned Week Start)
- Qualifying timestamp from **latest asset Uploaded At** (placeholder → late replacement)
- Denver end-of-day semantics for Week End / due date
- Documentation that Perfect Week **award** waits for week evaluation even when early homework counts

## Policy implemented

| Timing | HC / review / HOMEWORK_XP | Perfect Week homework count | Perfect Week award |
|---|---|---|---|
| **Early** | Process now; HC Week = PHA Week | Counts (same as on-time) | Held until after Week End 11:59:59pm America/Denver (Eligible? still needs daily/video/zoom for the official week) |
| **On Time** | Normal | Counts | Normal after evaluation window |
| **Late** | Accept, review, full XP | **Excluded** (FUT-001) | N/A for that requirement |

Additional rules:

- Coach review delay does not change athlete timeliness (Submission Date / Uploaded At, not grade time).
- Placeholder before deadline + satisfactory replacement after → **late** for Perfect Week (latest Uploaded At wins).
- Deadline: PHA Due Date if present; else Week End Saturday (inclusive through Denver calendar day / EOD in contracts).
- One HC per Enrollment + PHA (unchanged).
- Automation **059** not modified (SC-159 open).

## Trace (PHA → SA → HC → Week → XP → PW)

```
Submission (may lack Week)
  → Agent 2: 009 creates SA without Week gate
  → 020 v4.0: resolve PHA → HC Week = PHA.Week
       qualifying date = latest asset Uploaded At (else Activity Date)
       Notes: Early / Late timing
  → 065 v10.7: HOMEWORK_XP when satisfactory (early or late OK)
  → WAS for PHA Week → 057 v2.5: PW homework count = early|on_time satisfactory
       dailyDetail notes evaluation-window hold
  → Eligible? formula → 058 unlock → 059 XP (unchanged; 059 not touched)
```

## Files changed

| Path | Change |
|---|---|
| `lib/homework-contracts/assignment-identity.js` | Early/on-time/late; PHA Week resolver; qualifying timestamp; Denver EOD; evaluation-time helper |
| `airtable/automations/.../020-...js` | **v4.0** — PHA Week ownership; no Submission.Week hard fail; timing notes |
| `airtable/automations/.../065-...js` | **v10.7** — early timing status; XP unchanged for early/late |
| `airtable/automations/.../057-...js` | **2.5** — early counts for PW homework; evaluation-window detail |
| `tests/automation-contracts/sc160-homework-timing-pw.test.js` | New contract suite |
| `tests/automation-contracts/065-homework-late-credit-policy.test.js` | Version asserts |
| `tests/homework/automation-005-020-pha-direct.test.js` | Version asserts |
| `tests/homework/pha-grade-band-metadata-contract.test.js` | Version asserts |
| `docs/deploy-checklists/SC-160-homework-timing-pw-020-057-065.md` | Mike paste checklist |
| `docs/audits/SC-160-HOMEWORK-TIMING-PW-20260904.md` | This report |

## Tests run

```
node tests/automation-contracts/sc160-homework-timing-pw.test.js          PASS
node tests/automation-contracts/065-homework-late-credit-policy.test.js PASS
node tests/homework-contracts/assignment-identity.test.js                 PASS
node tests/homework/automation-005-020-pha-direct.test.js                 PASS (28)
node tests/homework/pha-grade-band-metadata-contract.test.js              PASS
node tests/automation-contracts/057-perfect-week-video-minimum.test.js    PASS
```

## Coordination

- **Agent 2** owns 009 / Ready-for-009 Week decoupling. This branch does not change 009.
- **Agent 3** assumes SA can exist without Submission.Week; 020 consumes PHA.Week.
- **Agent 4** owns live disposable E2E proof after paste.
- Did **not** run Season Simulation.
- Did **not** trash FUT-002 quarantined fields.
- Did **not** delete Mike’s reported submission; no record IDs published.

## Visible status (no new schema)

Reuses existing fields:

- HC `Notes` — Early submission / Late submission text
- HC `Review Status`, `Completion Status`, `Satisfactory?`
- HC `Submission Date` — set/refined from qualifying upload day
- 020 outputs `timingStatus`, `assignedWeekId`, `assignedWeekSource`
- WAS `Perfect Week Homework *` + `dailyDetail` evaluation-window line

## Mike paste (after merge)

See [`docs/deploy-checklists/SC-160-homework-timing-pw-020-057-065.md`](../deploy-checklists/SC-160-homework-timing-pw-020-057-065.md).

| Script | GitHub version |
|---|---|
| 020 | v4.0 |
| 065 | v10.7 |
| 057 | 2.5 |

Prefer DEV paste first when available; Production only after disposable verify.

## Closeout

| Item | Status |
|---|---|
| Contracts Early/On Time/Late | Done |
| PHA Week for HC | Done (020 v4.0) |
| Qualifying asset timestamp / placeholder rule | Done |
| Late XP + PW exclusion preserved | Done |
| Early PW award hold documented in 057 | Done (Eligible gates + dailyDetail) |
| 059 untouched | Confirmed |
| Season Sim / FUT-002 trash | Not run |
| Live Airtable paste | **Mike / UI** |
| Live disposable proof | Agent 4 after paste |
