# Agent 11 — Homework / Learning-Activity pipeline — REPORT

**Date:** 2026-07-24  
**Branch work under:** `docs/next-wave/homework-pipeline/`, `lib/homework-contracts/`, `tests/homework-contracts/`  
**Automation 020:** Not re-edited — PROD v3.0.0 already canonical in Git (`444046e`).

## Task Classification

| Field | Value |
|---|---|
| Type | Implementation / pipeline completion |
| Priority | P0–P1 (homework uniqueness + 063 classification) |
| Difficulty | Medium–Hard |
| Owner | Agent 11 |
| Dependencies | Overnight PROD 020 copy; confirmed schema facts |
| Backlog ID | SC-009–SC-020 cluster |
| Phase | 3 Implementation |
| Correct tool | Cursor |
| Repo | `127-si-shooting-challenge` |
| Mike's role | Decide quiz Option A vs B; UI-attest deletes; authorize LA schema later |

## Verdicts

| Topic | Conclusion |
|---|---|
| **020 classification** | `PARTIALLY REPLACES 063` |
| **063 deletion safety** | Forward-path safe for asset-driven intake; **not** fully safe for historical blank-GB HCs that never re-enter 020 |
| **013 / 111** | **013 v2.0 replaces 111** for VF Grade Band create/repair |
| **Quiz recommendation** | **Option B** (attachment-less) given current PROD schema; product decision remains Mike's |
| **Learning Activities readiness** | Repository contracts/schemas/tests ready; **Airtable schema blocked** until Mike authorizes |

## Deliverables

| Artifact | Path |
|---|---|
| 020 comparison | `020-PROD-VS-REPO-COMPARISON.md` |
| Pipeline map | `HOMEWORK-PIPELINE-MAP.md` |
| Quiz decision | `QUIZ-PATH-DECISION.md` |
| LA schema | `LEARNING-ACTIVITIES-SCHEMA.md` |
| LA routing | `LEARNING-ACTIVITY-ROUTING-CONTRACT.md` |
| Stale doc manifest | `STALE-063-111-PATCH-MANIFEST.md` |
| JSON schemas | `schemas/*.schema.json` |
| Fixtures | `fixtures/homework-identity-cases.json` |
| Helpers | `lib/homework-contracts/{uniqueness,quiz-path,learning-activity-routing,index}.js` |
| Tests | `tests/homework-contracts/*` (all green) |

## Tests

```
node tests/homework-contracts/run-all.js
→ all homework-contracts tests passed
```

Coverage: uniqueness identity keys, 020/067 match keys, sufficiency matrix, LA routing + XP ownership guard, quiz Option A/B packets + recommendation.

## Explicit non-edits

Completion master, Config helpers, WAS/email scripts, Zoom scripts, website code, other agents’ folders — untouched.

## Git

| Item | Value |
|---|---|
| Branch | `agent11/homework-pipeline` |
| Package commit | `dee4206940a38fb299cd979e030518bf331cc70c` |
| PROD 020 align (prior) | `444046e73bd8071c5cc0d7125013a1e1b0fc6630` |
| 020 body edited by Agent 11 | No |
