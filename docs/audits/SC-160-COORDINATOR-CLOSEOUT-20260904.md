# SC-160 Coordinator Closeout — Early/late asset intake (2026-09-04)

## Verdict

**COMPLETE / Live Tested (Stage 6).** Systemic root cause fixed in repo. Live Production still blocks asset intake on Missing Week until Mike pastes **009 v1.3** then Ready formulas, then **020 / 065 / 057**.

## Task classification

| Field | Value |
|---|---|
| Type | Reliability / automation + formula |
| Priority | P0 |
| Backlog ID | **SC-160** |
| Phase | 3 Implementation → 5 Close (blocked on UI paste) |
| Correct tool | Cursor (repo) + Mike UI paste for customScript |
| Repo | `127-si-shooting-challenge` |

## Starting / ending SHAs (coordinator wave)

| Checkpoint | SHA |
|---|---|
| User start (approx) | `89181368c482e440d6e6d7c4f899c5a518a6a1ef` |
| A4 E2E already on master | `4f62d192` (#423) |
| SC-159 live closeout | #422 merged earlier same day |
| Integrate branch tip | see PR after merge |

## Agent worktrees / branches

| Agent | Branch | Worktree | Outcome |
|---|---|---|---|
| A1 Truth | `sc160/a1-workflow-truth` | `sc160-a1-8a36df07` | Dependency map; no impl |
| A2 Intake | `sc160/a2-asset-intake-decouple` | (agent) | **009 v1.3** + formula checklist; PR #420 |
| A3 Timing | `sc160/a3-homework-timing` | (agent) | **020 v4.0 / 065 v10.7 / 057 2.5**; PR #421 |
| A4 E2E | `sc160/a4-e2e-verify` | `sc160-a4-0498bcd7` | Independent verify; **do not close** until live; PR #423 **MERGED** |
| Coord | `sc160/coord-integrate` | `sc160-coord-integrate` | Merge A2+A3 + A1 report + master paste order |

## Root cause

1. Submissions formula `Ready for 009 Asset Creation?` required linked Week.  
2. `Why Not Ready for 009?` returned **Missing Week**.  
3. Automation **009 v1.2** hard-required Week before creating assets.  
4. Pre-season Activity Date (calendar starts 2027-04-25) → empty Week → Processing forever → zero Submission Assets.

## Target workflow

**Intake:** Enrollment + attachments → Ready (no Week) → 009 creates SA per attachment (dedupe by source attachment ID).  
**Homework:** SA → 020 → HC Week = **PHA.Week** (not Submission Activity Date Week). Timeliness from qualifying upload vs Due Date / Week End (America/Denver).  
**XP:** 065 awards normal homework XP for early/on-time/late when satisfactory.  
**Perfect Week:** 057 counts early+on-time HW for assigned Week at evaluation time; late excluded.  
**Video:** Reviewable without Submission.Week; Week-dependent XP/PW held visibly when Week unresolved.

## Week dependencies

| Removed from intake | Retained |
|---|---|
| Ready for 009 Week gate | Week assign / Needs Assignment (calendar) |
| 009 hard-require Week | HC Week from PHA for scoring |
| Why Not Ready “Missing Week” | Perfect Week / Week XP paths |
| | Video Week-owned credit rules |

## Holds confirmed

- Season Simulation: **not run**  
- FUT-002 Batch 2 field trash: **not run** (still gated on SC-160 live proof)  
- Reported registration/submission: **not deleted**  
- Automation **059**: **not modified** under SC-160  

## Mike next action

Stage 6 live verification closed SC-160. Mike next: FUT-002 Batch 2 UI trash of four quarantined stubs. Evidence [`SC-160-STAGE6-LIVE-VERIFICATION-20260904.md`](./SC-160-STAGE6-LIVE-VERIFICATION-20260904.md).
