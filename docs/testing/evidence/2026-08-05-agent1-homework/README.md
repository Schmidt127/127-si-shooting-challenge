# Overnight Agent 1 — Final Handoff

Appended to master handoff 2026-08-05 ~18:15 America/Denver.

## Executive summary

MVP homework scheduling is now operable in PROD: **Program Homework Assignments** has operator fields + **92** active season rows; **SC-016** duplicate Completions cleaned and repo **020 v3.2.0** prefers Enrollment+Week+Homework+Slot; **033 v3.3** PHA-first assign is ready to paste. CASE-01 Perfect Week homework remains **2/2** / Eligible **1**. Mike must paste **033 v3.3** and **020 v3.2.0**, then re-submit once to prove merge identity.

## SC items addressed

| SC | Change |
|----|--------|
| SC-016 | Installed → **Live Tested in PROD** (cleanup + identity fix in repo; paste still needed for Complete) |
| PHA MVP (unnumbered) | Operator UX + season seed + live assign proof |
| SC-010 / 012 / 015 / 071 | Not advanced this package (capacity → identity + schedule first) |
| SC-018 / 019 / 020 LA | Explicitly not claimed |

## PROD changes

- PHA fields: descriptions; **Operator Status** formula; **Operator Notes**; **Completions Count**
- HC/WAS field descriptions (legacy WAS text vs Link; PHA; Homework Completion Key)
- **92** PHA Active rows seeded (curriculum Week × grade bands × PI `rec5mEM0YPqPqq0hZ`)
- CASE-01 PHA HW2 realigned to library `rec6WmXjpLtIWDERo`
- Deleted **4** duplicate HCs + orphan `HOMEWORK_XP|*` XP events (Schmidt test data)

## Repository changes

- `020-…js` **v3.2.0** — enrollment-scoped identity, unloadQuerySafe, PHA link fix
- `033-…js` **v3.3** — unloadQuerySafe, matchSourceOut
- Tools: harden/seed/audit/live-test/consolidate/align/probe
- Operator guide + evidence pack
- Offline test `tests/homework/automation-020-sc016-identity.test.js`

## Automations changed

| Script | Version | PROD paste |
|--------|---------|------------|
| 020 | v3.2.0 | **Required** |
| 033 | v3.3 | **Required** |
| 064 / 065 / 070a / 071 | unchanged | — |

## Tests performed

| Test | Result | IDs |
|------|--------|-----|
| PHA seed | PASS | 92 active; 0 Schedule Key dups; 0 slot collisions |
| 033 PHA match (CASE-01) | PASS | WAS `recKebuZ79QFTwivA` → 2 libraries |
| 033 assign write | PASS (after REST ID fix) | same WAS |
| CASE-01 verify | PASS | Assigned 2 / Sat 2 / Eligible 1; HCs `recqXxlOpATQI3sD4`, `rechzFmWrUp1tonto` |
| SC-016 audit pre | WARN 3 groups | |
| SC-016 consolidate | PASS | extras deleted |
| SC-016 audit post | **PASS 0 dupes** | 7 HC total |
| Offline 020 identity | PASS | |

## Remaining homework gaps

1. Paste **033 v3.3** + **020 v3.2.0** in Airtable UI
2. Live re-submit same Enrollment+Week+HW+Slot → prove single HC (Complete SC-016)
3. PDF (SC-010), multi-file (SC-015), written (SC-012) re-tests
4. Backfill HC→PHA on older Schmidt HCs lacking junction link
5. Learning Activities SC-018/019/020 still Planned/Built only

## Blockers

| Blocker | Mike required? | Next action |
|---------|----------------|-------------|
| Airtable script paste cannot be done via API | **Yes** | Paste 033 v3.3 + 020 v3.2.0 |
| Live re-submit for SC-016 Complete | Optional (agent can do with fixture) | After paste, run Schmidt HW asset through 020 |

## Decisions made without Mike

- Seed all active grade bands from curriculum Week links for 2026-2027 PI
- SC-016 product identity = Enrollment+Week+Homework+Slot (merge re-submits)
- Delete duplicate Schmidt HCs + orphan XP (test data; historical protection not required)
- Align CASE-01 PHA HW2 library to match satisfactory HC

## Risks

| Risk | Status |
|------|--------|
| WAS homework briefly cleared during failed `{id}` REST write | **Retired** — restored + verified |
| Merge failed before deletes (assets may have been on deleted HCs) | **Watch** — keepers retained; spot-check orphan assets if review UI blank |
| Seeded PHA may not match Mike’s intended curriculum order forever | Acceptable MVP; Operator Notes mark seed origin |

## Exact completion-master status changes

- SC-016: Installed → **Live Tested in PROD**
- Dashboard: LT 24→**25**; Installed 47→**46**
- PHA/033/020 reconciliation notes updated to v3.3 / v3.2.0 / 92 rows

## Recommended next actions

1. Mike: paste 033 v3.3 + 020 v3.2.0
2. Agent/Mike: one Schmidt HW re-submit → confirm no new HC / no second XP
3. Optional: PDF path SC-010 live proof
4. Read operator guide before editing library Week links

Evidence folder: `docs/testing/evidence/2026-08-05-agent1-homework/`
