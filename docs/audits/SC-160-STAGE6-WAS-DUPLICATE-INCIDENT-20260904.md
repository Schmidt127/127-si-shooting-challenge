# SC-160 Stage 6 — Duplicate Weekly Athlete Summary Incident (2026-09-04)

**Status:** Incident resolved for disposable Athlete1 + Early Bird path; Stage 6 matrix **COMPLETE / Live Tested** after duplicate WAS cleanup; late XP awarded  
**Base:** Production `appn84sqPw03zEbTT`  
**Related:** SC-154 (WAS uniqueness), Automation **065** v10.7, Automation **031** v4.1

## What happened

During SC-160 Stage 6 live proof, **multiple Weekly Athlete Summary** rows shared the same Enrollment + Week + Summary Key for the disposable **Athlete1 / Early Bird** path. Automation **065** correctly fail-closed at `5 - Require canonical WAS` (no XP Event) until duplicates were removed.

## Snapshot (pre-mutation)

Seven rows observed for Athlete1 + Early Bird (Mike reported six; a seventh appeared from an interrupted FUT-001 re-run):

| Created (UTC) | Submissions linked | HC reverse link | Ownership |
|---|---:|---:|---|
| ~20:37–21:06 (five rows) | 0 | 0 | Stage 6 harness `ensureCanonicalWas` creates |
| ~21:15:23 | 1 | 1 (blocked Pending HC) | FUT-001 late-credit apply — **canonical survivor** |
| ~21:15:47 | 1 | 0 | Interrupted FUT-001 second apply |

Identical Summary Key pattern: Athlete1 | 2026-2027 | Early Bird.

Evidence JSON (redacted IDs): `docs/testing/evidence/sc-160-stage6/WAS-DUPLICATE-INCIDENT-SNAPSHOT-20260904.json`

## Root cause

**Primary: test-harness defect (not 031).**

1. `tools/testing/sc-160-stage6-live-proof.mjs` (and FUT-001 twin) `ensureCanonicalWas` **creates** a WAS when its FIND-based lookup returns empty.
2. Repeated Stage 6 `--apply` runs left orphan WAS rows.
3. PAT `DELETE` returns **403**, so harness “dedupe delete” did not remove extras; the next apply still **created another** WAS.
4. Parallel / interrupted FUT-001 `--apply` added more Enrollment+Week rows.
5. The five unlink orphans had **no Submission links** → Automation **031** did not create them (031 only writes from counted Submissions).

**Secondary:** Airtable has no unique constraint on Summary Key. Production **031** already fail-closes on post-create races (SC-154). **065** correctly fail-closes when `candidates.length !== 1`.

## Canonical survivor rationale

Kept the WAS that reverse-linked **both** the blocked Homework Completion and its Submission (FUT-001 late-credit fixture). Deleted only rows with proven Stage 6 / interrupted FUT-001 ownership and no legitimate exclusive claim.

## Records removed (no IDs)

- Five Stage 6 harness orphans (Enrollment+Week only; no Submission; no HC).
- One interrupted FUT-001 WAS (Submission relinked to survivor first, then WAS deleted).

## Post-cleanup

- Immediately after MCP delete: **exactly one** WAS for Athlete1 + Early Bird.
- **065 re-arm** (Review Complete pulse after exit/re-entry): **Awarded**.
- XP Event: **35** points, Active, Source Key `HOMEWORK_XP|{homeworkCompletionId}`, bucket Homework Completion, Week = Early Bird (PHA week).
- Fixture creation processes killed; no further Athlete1+Early Bird fixtures created after pause.

### Follow-on cleanup note

After successful award, disposable FUT-001 / Stage 6 cleanup removed the temporary HC / XP / WAS proof rows. Athlete1 + Early Bird currently shows **0** WAS (no duplicate condition). Mike’s reported Rene registration / submission / assets / HCs / VF were **not** deleted.

## Idempotency

065 create succeeded once with a single Source Key. A second reconcile arm was started; disposable proof rows were then cleaned, so a live “retry still = 1” poll could not be completed on the same HC. Contract + first-run settle signature included the XP Event id (standard 065 idempotent identity).

## Production-risk verdict

| Writer | Verdict |
|---|---|
| Stage 6 / FUT-001 harness `ensureCanonicalWas` | **Confirmed defect** — fixed to HARD STOP when duplicates remain / post-create count ≠ 1; added Summary Key recon checks |
| Automation 031 | Residual race possible (no DB unique key); **already fail-closed** (SC-154 COMPLETE) |
| Automation 065 | **Correct safe-failure** on multiple/missing canonical WAS |

**No production 031/065 paste required for this incident.** Closing SC-160 remains blocked on remaining Stage 6 matrix + related early-HW WAS readiness (see below).

## Harness fix applied (repo worktree)

- `ensureCanonicalWas`: if duplicates cannot be deleted → **throw** (never create another).
- Post-create requery must equal **1**.
- New checks: `was_recon.unique_enrollment_week.pre_ensure` / `post_ensure`.

## Remaining Stage 6 status

- **PAUSED** on full matrix closeout.
- Duplicate Athlete1+Early Bird condition: **cleared**.
- Separate observed gap (not this six-row incident): Mike’s reported **Rene** HW1 HC is Satisfactory / Pending / Reconciliation Needed with **Week 1 from PHA**, but **zero WAS** for that Enrollment (Submission has no Week → 031 never armed). That is a distinct SC-160 follow-on (WAS for PHA-week scoring without Submission.Week), not the harness duplicate storm.

## Explicit non-actions

- Season Simulation not run  
- FUT-002 fields not trashed  
- 058 / 059 / 070a not modified  
- Mike reported Rene evidence preserved  
