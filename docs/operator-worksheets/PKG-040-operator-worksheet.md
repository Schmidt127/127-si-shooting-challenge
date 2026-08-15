# PKG-040 — Standings and Leaderboard Operator Worksheet

**Status:** **Complete — production public-data repair and live verification passed on 2026-08-15.** Retain this worksheet for future scoped data-correction observations; it is not an open package gate.
**Canonical packet:** [PKG-040 standings verification](../deploy-checklists/PKG-040-STANDINGS-LEADERBOARD-PRODUCTION-VERIFICATION.md)
**Boundary:** No Airtable record, schema, view, automation, XP, email, configuration, or deployment changes.

## Scope and read-only preflight

- [ ] Base / environment / operator / timestamp recorded: `________________`
- [ ] `Config.Active School Year` captured without editing: `________________`
- [ ] Exactly one current `Shooting Challenge | <year>` Program Instance captured: RID/name `________________`
- [ ] `Enrollments` view **`Web - Leaderboard`** exists; missing/renamed view is a stop.
- [ ] View filter captured verbatim and limits to active Enrollments, one Athlete, selected School Year, selected Program Instance, and settled progression/XP/shots.
- [ ] Visible fields captured: `Active?`, `Athlete`, `Athlete ID Lookup`, `Program Instance`, `School Year`, `Current Level`, `Current Level - Public Facing Display`, `Level Status`, `Level Sort Order - For Softr`, `Full Athlete Name`, `School Name Lookup`, `Grade`, `Athlete Headshot`, `Lifetime XP Total`, `Total Shots Counted`.
- [ ] Field types checked: Athlete/Program Instance/Current Level links; `Active?` checkbox; `School Year` select; active XP fields; active level `Sort Order`; computed XP/shots.
- [ ] Read-only audit `audit-pkg-040-standings-integrity.js` run; JSON path `________`; errors `________`; warnings `________`.

## Three-athlete observation

- [ ] Three approved athletes share the current Program Instance/year; private Enrollment RIDs recorded separately.
- [ ] Baseline captured: active status, Athlete, Program Instance, School Year, Current Level, Level Rank, Lifetime XP, counted shots, and public order.
- [ ] Deterministic order confirmed: Level Rank → Lifetime XP → counted shots → public name → internal Enrollment identity.
- [ ] Exact tie replay is stable; no Enrollment record ID is exposed publicly.
- [ ] Inactive Enrollment is absent from view and website; no record changed solely for this worksheet.
- [ ] Prior-year/program rows are absent; no cross-year test row created.
- [ ] Duplicate Athlete + Program Instance + School Year causes stop; no winner selected or row altered.

## 120-second cache-window readback

- [ ] For each approved correction observation, formula/rollup settlement completed before web reads.
- [ ] Read timestamps captured at upstream settlement, first web read, and **after at least 120 seconds**.
- [ ] `/shoot/leaderboard` readback after cache window: order/result `________________`.
- [ ] `/shoot/public-display` readback after cache window: result `________________`.
- [ ] Old order does not persist beyond the settlement + 120-second cache boundary.
- [ ] No manual cache purge or second cache/ISR assumption used; stale response after the boundary is a stop.

## Privacy-field inspection

- [ ] Public payload contains only approved name, school, grade, level, headshot, XP, shots, rank, and optional public slug.
- [ ] No Airtable record IDs, email, phone, address, parent/guardian, birthday, debug, Source Key, or XP Event fields appear.
- [ ] Rendered page and serialized response both inspected; evidence path `________________`.

## Evidence row and stop

| Check | Private IDs/timestamps | Airtable result | Website result | Pass/stop |
|---|---|---|---|---|
| Scope + `Web - Leaderboard` | | | | |
| Read-only audit | | | n/a | |
| Three-athlete ranking | | | | |
| Tie replay | | | | |
| Inactive/prior-year exclusion | | | | |
| XP/level/shots correction | | | | |
| 120-second cache readback | | | | |
| Privacy fields | | | | |

- [ ] Stop for missing view, duplicate identity, noncurrent row, invalid/unsettled input, stale level/total, or private field leakage.
