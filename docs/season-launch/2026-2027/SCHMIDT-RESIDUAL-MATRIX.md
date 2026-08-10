# Schmidt residual test matrix — 2026–2027

**Reconciled:** 2026-08-10 against repo evidence (not stale dashboard totals)  
**Athlete:** `recgqVstObQRzgXJF` · **Enrollment (2026–27):** `recCyFEPeATOVNlr9`  
**Plan reference:** [`SCHMIDT-SEASON-LAUNCH-TEST-PLAN.md`](../../challenge-year/SCHMIDT-SEASON-LAUNCH-TEST-PLAN.md) tests 1–22

Legend: **PROVEN** = live or operator-attested evidence in repo · **PARTIAL** = some path proven, season-shaped gap remains · **OPEN** = no acceptable proof

---

## Season configuration (tests 1–4)

| # | Case | Status | Evidence |
|---|------|--------|----------|
| 1 | New Config 2026–27 | **PROVEN** | Config `rechc1f9f4kVM1tHP`; snapshot 2026-07-24 |
| 2 | Week 0 / Early Bird | **PARTIAL** | `recWeVrSabnsYaHc2` exists; **test dates Aug 2026** — not launch calendar |
| 3 | First regular Week | **PROVEN** | Week 1 `recBrZ1sV8byWEHZU`; 005 PASS on Early Bird week mapping |
| 4 | Post-Challenge | **PARTIAL** | Row exists; **end date verify live** (export anomaly) |

---

## Enrollment & submissions (tests 5–9)

| # | Case | Status | Evidence |
|---|------|--------|----------|
| 5 | New Enrollment | **PROVEN** | `recCyFEPeATOVNlr9`; 001 unload fix 2026-08-05 |
| 6 | Daily Submission | **PROVEN** | `recElDBcFvuE6jWwc`; 005/023 isolation PASS |
| 7 | Backdated Submission | **OPEN** | Needs Activity Date in canonical Early Bird **2027** window |
| 8 | Week assignment | **PROVEN** | 005 PI-scoped; Early Bird selected |
| 9 | Submission XP | **PROVEN** | Foundation reset + reliability evidence |

---

## Homework & media (test 10)

| # | Case | Status | Evidence |
|---|------|--------|----------|
| 10a | Photo homework (070a path) | **PROVEN** | SC-009 2026-08-04 PASS |
| 10b | PDF homework (SC-010) | **OPEN** | Listed in agent1 homework README as next re-test |
| 10c | Written-only homework (SC-012) | **OPEN** | No 2026-08+ live proof |
| 10d | Video-as-homework routing | **OPEN** | Distinct from video feedback XP path |
| 10e | Multi-file / routing variations (SC-015) | **OPEN** | |
| 10f | Canonical HC reuse (020 identity) | **PROVEN** | SC-016 PASS 0 dupes; offline 020 identity PASS |
| 10g | 033 PHA assign + 067 HW17 | **PARTIAL** | CASE-01 PASS; **067 still uses curriculum Week** — season-safe only after Worker 1 paste |

---

## Video, Zoom, streaks (tests 11–13)

| # | Case | Status | Evidence |
|---|------|--------|----------|
| 11 | Video feedback XP | **PARTIAL** | 114 path proven historically; **073 parent email OPEN** |
| 12 | Zoom live attendance | **PARTIAL** | C-025 Stage 17 PROD complete; **season meeting re-proof OPEN** |
| 12b | Zoom recording credit | **PARTIAL** | Conflict PASS; **117f live send OPEN** |
| 13 | Streak XP | **PROVEN** | Foundation reset inventory 2026-08-05 |

---

## Milestones, Perfect Week, levels (tests 14–16)

| # | Case | Status | Evidence |
|---|------|--------|----------|
| 14 | Shot milestone (066) | **PARTIAL** | 8 unlocks PASS 2026-08-05; **v3.5 PROD paste pending** per isolation matrix |
| 15 | Perfect Week | **PARTIAL** | CASE-01 + 057 manual PASS; remaining PW cases (6/7 day, Zoom optional) **OPEN** |
| 16 | Level recalculation | **PROVEN** | Gate blocking PASS; 041/042 enrollment-scoped |

---

## Weekly email & web (tests 17–20)

| # | Case | Status | Evidence |
|---|------|--------|----------|
| 17 | WAS creation | **PROVEN** | Multiple WAS on `recCyFEPeATOVNlr9` |
| 18 | 072 package build | **PARTIAL** | Architecture proven; **2026–27 Week End re-arm OPEN** |
| 19 | Make Live writeback | **PARTIAL** | C-011 historical PASS; **not re-run on 2026–27 Weeks** |
| 20 | `/shoot` display | **PROVEN** | Playwright prod smoke 41/41 2026-08-04 |

---

## Safety (tests 21–22)

| # | Case | Status | Evidence |
|---|------|--------|----------|
| 21 | Duplicate prevention | **PARTIAL** | XP Source Key proven; **weekly threshold XP GAP** per coverage matrix |
| 22 | Rollback drill | **OPEN** | Run `rollback-preview` when export available |

---

## Season-shaped dry run

| Case | Status | Notes |
|------|--------|-------|
| End-to-end week 1 shape | **OPEN** | Requires: canonical dates, PWTEST off, Fillout OFF or Schmidt-only, 033/067 prod paste, one full week submission→HW→WAS→optional email |

---

## Residual count summary

| Status | Count |
|--------|-------|
| PROVEN | 14 |
| PARTIAL | 12 |
| OPEN | 11 |

**Executable cards for all OPEN + PARTIAL items:** [`SCHMIDT-TEST-CARDS.md`](./SCHMIDT-TEST-CARDS.md)
