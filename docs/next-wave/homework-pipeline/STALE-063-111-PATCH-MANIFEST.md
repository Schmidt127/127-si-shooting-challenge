# Stale 063 / 111 documentation — patch manifest

**Agent:** 11 · **Date:** 2026-07-24  
**Purpose:** Exact stale statements for Agent 14 to reconcile later.  
**Rule:** This agent does **not** edit shared docs during concurrent work.

Confirmed conclusions this manifest encodes:

- Repo **013 v2.0** replaces **111** for Video Feedback Grade Band create/repair.
- PROD **020 v3.0.0** only **partially** replaces **063** (asset-driven blank repair; no HC-triggered orphan repair; no overwrite-if-different).
- Agent 1 overnight baseline claims **063** and **111** deleted in PROD (UI attestation still required).

---

## Patch rows

| ID | File | Exact stale statement / location | Recommended replacement (Agent 14) | Risk if left |
|---|---|---|---|---|
| P01 | `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` | Conflict note: earlier “Do not delete 032/033/063/111 for capacity” vs overnight delete claims | Keep conflict visible until Mike UI-attests; then resolve to: 111 deleted **safe if 013 v2.0 live**; 063 deleted **forward-path only** / orphans may need one-time blank-GB backfill | Operators reinstall 063/111 or ignore orphan HC GB blanks |
| P02 | `docs/overnight/FINAL-OVERNIGHT-RECONCILIATION.md` | “Deleted automations — 043, 032, 033, 063, 111” + “attestation required” without 020/013 classification | Add: 020=`PARTIALLY REPLACES 063`; 013=`FULLY REPLACES 111` for GB create/repair | Treats 063/111 as equal risk |
| P03 | `docs/foundation-reset/MIKE-ACTION-INSTALL-115-PROD.md` L11 | “Do **not** delete **032 / 033 / 063 / 070c / 111** … not proven superseded.” | Split: do not delete 032/033/070c without new design; **111** superseded by **013 v2.0**; **063** only partially superseded by **020 v3.0.0** — delete OK for new assets, orphans need repair plan | Blocks capacity planning with outdated “not proven” claim |
| P04 | `docs/automation-index.md` § Homework | Lists **063** as live homework automation | Mark **063** `DELETED in PROD (attestation)` / absorbed partially by 020; keep repo file as historical | Audits/operators try to run 063 |
| P05 | `docs/automation-index.md` § Video | Lists **111** as live | Mark **111** deleted; Grade Band owned by **013 v2.0** | Same |
| P06 | `docs/automation-index.md` Stage E row | `020, 070a, 022, 063` | `020, 070a, 022` (063 retired) | Stage E still depends on 063 |
| P07 | `docs/automation-index.md` Stage G row | `013 … 111` | `013` (111 retired) | Stage G still depends on 111 |
| P08 | `airtable/extension-scripts/audits/README.md` Stage E | `020, 070a, 022, 063` | Drop 063; note blank GB check via 020 coverage + orphan audit | Audit docs point at deleted automation |
| P09 | `airtable/extension-scripts/audits/README.md` Stage G | `013, 070b, 022, 111` | Drop 111; 013 owns VF GB | Same |
| P10 | `airtable/schema/current/automation-trigger-map.md` Homework section title | `(020, 063–065, 070a, 071)` + 063 row | Retitle without 063; annotate 063 deleted / partial absorb by 020 | Trigger map lies |
| P11 | `airtable/schema/current/automation-trigger-map.md` Video section | 111 row active | Annotate deleted; GB via 013 | Trigger map lies |
| P12 | `airtable/extension-scripts/audits/audit-video-pipeline-integrity.js` ~L511 | `recommendedAction: "Run 111 - Copy Enrollment Grade Band to Video Feedback"` | `recommendedAction: "Run 013 repair path (Grade Band) — do not reinstall 111"` | Operators reinstall deleted 111 |
| P13 | `docs/overnight/testing-integrity/MIKE-ACTIONS.md` | Confirm deleted set includes 063, 111; “Do not reinstall … without new design” | Keep “do not reinstall”; add exception notes: 111 unnecessary if 013 v2.0; 063 only if orphan HC blank-GB backfill requires a temporary repair script (not full 063 restore) | Ambiguous reinstall guidance |
| P14 | `docs/foundation-reset/DEV-PROD-AUTOMATION-RECONCILIATION-2026-07-23.json` | `gradeBand_063_111.claim` / `063→020` Planned only / “Do NOT delete 063/111” | Update claims to Agent 11 classifications; mark 111→013 proven; 063→020 partial | Stale JSON drives wrong capacity decisions |

---

## Out of scope for this manifest

- Editing the files above (Agent 14).
- Deleting repo `063-*.js` / `111-*.js` source files (keep as historical references until Agent 14 archive pass).
- Completion master status column churn beyond the conflict note.

---

## Evidence pointers

- `docs/next-wave/homework-pipeline/020-PROD-VS-REPO-COMPARISON.md` → `PARTIALLY REPLACES 063`
- `airtable/automations/shooting-challenge/013-…js` v2.0 Grade Band create/repair
- `docs/overnight/testing-integrity/CURRENT-PROD-BASELINE.md` delete set claims
