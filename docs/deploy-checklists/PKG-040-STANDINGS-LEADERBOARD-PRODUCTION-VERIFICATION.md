# PKG-040 — Standings and Leaderboard Production Verification

Status: Repository-ready only — the read-only inventory/audit may run while
PKG-006R / PKG-036 locks are active, but **no correction observation or data
manipulation may begin until the relevant lock owner releases it**.
Owner: Mike (Production operator)
Repository boundary: This packet performs read-only inspection and public
readback only. It does not change Airtable records, fields, views,
automations, configuration, XP, emails, or deployments.

## Purpose

Certify that the one approved public standings scope returns one settled,
active Enrollment per Athlete + Program Instance + School Year; ranks
deterministically by Level Rank → Lifetime XP → counted shots; and does not
leak private data or a different season/program.

Offline tests and this packet do not prove Production state. Treat any
unexpected row, blank computed value, duplicate canonical identity, missing
view, or stale response beyond the cache window as a stop condition.

## Repository contract

| Owner / input | Contract |
|---|---|
| XP Events | Only `Active?` events contribute through `Active XP Points`; `Lifetime XP Total` is the Enrollment formula/rollup result. |
| 041 | Queue/reconciliation only; detects positive and negative source changes. |
| 042 | Sole writer of `Current Level`, `Level Status`, and settled progression output. |
| Enrollments | Public candidate identity is exactly one `Athlete`, one `Program Instance`, and one `School Year`; active only. |
| `Web - Leaderboard` | Required, scoped public view. A missing/renamed view fails closed; there is no table-wide public fallback. |
| Web adapter | Resolves one active Config School Year and one `Shooting Challenge | <year>` Program Instance, validates every view row, sorts Level Rank → XP → shots → public name → Enrollment record id, then removes record ids from the public model. |
| Cache | Airtable fetch, `/leaderboard`, and `/public-display` use 120-second revalidation. A correction is expected after upstream formula settlement plus one revalidation window; no manual cache purge is part of this package. |

The current schema snapshot demonstrates that `Program Instance` and `Athlete`
are linked fields, `School Year` is a select, `Current Level` is a link,
`Level Sort Order - For Softr` is a Current Level lookup, `Lifetime XP Total`
is based on active XP points, and `Total Shots Counted` is a submission rollup.
The snapshot cannot prove current Production data or view filters.

## Preflight inventory — read only

1. Record the Production base URL, date/time, `Config.Active School Year`,
   and the exact current Program Instance record ID/name. Do not edit either.
2. Inspect `Web - Leaderboard`. Confirm it is present and includes only:
   active Enrollments; exactly one Athlete; the chosen School Year; the chosen
   Program Instance; settled Current Level / level lookup / XP / counted shots.
   Record the filter and visible field names verbatim.
3. Verify field types from the current UI: `Athlete`, `Program Instance`, and
   `Current Level` links; `Active?` checkbox; `School Year` select; active XP
   event fields; Current Level active `Sort Order`; computed XP and shots.
4. Paste/run `audit-pkg-040-standings-integrity.js` in the Scripting
   Extension. Save its JSON output without modifying findings.
5. Stop on any `error` finding, including duplicate canonical Enrollment,
   missing/multiple Athlete or Program Instance links, inactive Current Level,
   invalid rank, invalid/negative totals, or XP mismatch. Warnings for formula
   settlement require a reread after settlement; do not substitute zero.

## Controlled observation order (after locks release)

Use three approved test athletes in the same current Program Instance/year.
Record Enrollment record IDs privately in the worksheet; do not publish them.

1. Capture baseline for all three: active status, Athlete link, Program
   Instance, School Year, Current Level, Level Rank, Lifetime XP, counted
   shots, and the public `/shoot/leaderboard` order.
2. **Three-athlete ranking:** prove higher Level Rank wins; within equal level,
   higher XP wins; within equal XP, higher counted shots wins.
3. **Exact tie:** make all three ranking values equal for two approved
   athletes only if a separately authorized test already permits it. Confirm
   repeat reads have the same order. The final key is public name then internal
   Enrollment identity; the identity is never returned publicly.
4. **Inactive exclusion:** observe one inactive Enrollment absent from the
   view and website. Do not change a record solely for this packet.
5. **Prior-year/program exclusion:** observe pre-existing noncurrent examples
   absent from the view and website. Do not create cross-year test rows.
6. **Duplicate stop:** if the audit reports a duplicate Athlete + Program
   Instance + School Year, stop. Do not choose a winner, deactivate a row, or
   alter links under this package.
7. **XP correction:** after the PKG-006R owner explicitly releases its
   observation window, hand this worksheet to that package’s operator and
   observe its approved XP increase then withdrawal/downward correction through
   settled `Lifetime XP Total`, 041, 042, the view, and public readback.
8. **Level correction:** after the PKG-036 owner explicitly releases its
   observation window, hand this worksheet to that package’s operator and
   observe Current Level / Level Rank move upward and downward after 041/042
   settlement. Never edit Current Level directly.
9. **Shot correction:** observe an existing authorized counted-shot correction
   move ranking in both directions after the rollup settles.
10. After each correction, wait for formula/rollup settlement plus at least one
    120-second web cache window, then read `/shoot/leaderboard` and
    `/shoot/public-display`. If the old order persists after that boundary,
    stop and preserve timestamps/response evidence.
11. Inspect the public response/rendered payload: allow only name, school,
    grade, level, headshot, XP, shots, rank, and optional public slug. Confirm
    it contains no Airtable record IDs, emails, phones, address, parent,
    guardian, birthday, debug, source-key, or XP-event fields.

## Evidence worksheet

| Check | Input timestamps / IDs (private) | Airtable settled result | Website result | Pass / stop |
|---|---|---|---|---|
| Scope + view inventory | | | | |
| Read-only audit JSON | | | n/a | |
| Three-athlete level/XP/shots | | | | |
| Exact tie replay | | | | |
| Inactive exclusion | | | | |
| Prior-year/program exclusion | | | | |
| Duplicate identity stop check | | | n/a | |
| XP up + down | | | | |
| Level up + down (041/042) | | | | |
| Counted shots up + down | | | | |
| Cache-window readback | | | | |
| Public-field privacy | | | | |

## Stop conditions and rollback

- Stop for a missing/renamed view, any duplicate identity, a noncurrent row,
  invalid or unsettled standings input, unverified active XP total, stale level
  output, or any private field in the public model.
- This package has no Production write rollback because it makes no Production
  writes. For a web-query rollback, revert the PKG-040 web commit and redeploy
  through the normal approved web process; do not reintroduce a broad fallback.
- Keep PKG-006R and PKG-036 locks active until their own approved observation
  packets are complete. PKG-040 must not release, alter, or bypass either lock.

## First step after lock release

Run the read-only PKG-040 audit against the current Production base, save its
full JSON, and stop on any error before beginning a PKG-006R or PKG-036
correction observation.
