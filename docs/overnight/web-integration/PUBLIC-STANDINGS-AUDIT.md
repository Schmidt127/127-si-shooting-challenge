# Public Standings Audit — Schmidt visibility + privacy

**Agent 6 overnight audit** · 2026-07-23 · Routes: `/shoot/leaderboard`, `/shoot/public-display`

---

## Query inventory

Both standings surfaces use one query: `fetchLeaderboard()` in `web/lib/airtable/queries.ts`.

| Property | Value |
|----------|-------|
| Table | `Enrollments` |
| Primary source | `Web - Leaderboard` Airtable view (Mike-controlled filter) |
| Fallback (view missing) | `AND({Active?}, {Lifetime XP Total} >= 0)` formula |
| Fields requested | Full Athlete Name, School Name Lookup, Grade, Current Level - Public Facing Display, Level Sort Order - For Softr, Athlete Headshot, Lifetime XP Total, Total Shots Counted, School Year |
| Max records | 200 |
| Cache | 120 s revalidate; leaderboard page ISR 120 s |

## Verification results

| Check | Result | Evidence |
|-------|--------|----------|
| Schmidt included | **PASS** — web code is name-blind; no athlete-name filters anywhere | Unit test scans `queries.ts` + `leaderboard.ts` for "schmidt" (must be absent) and renders a Schmidt-named record normally (`web/lib/release/public-standings.test.ts`) |
| Active Enrollment filtering | PASS — view first; fallback formula requires `{Active?}` | `LEADERBOARD_FALLBACK_FILTER` |
| Season filtering | PARTIAL — season label inferred from `School Year` field; actual season scoping is the view's job. On the rebuilt PROD base with a single test season this is correct; multi-season needs SC-067 | `inferSeasonLabel` |
| Grade Band filtering | PASS — client-side band filter (K–5 / 6–8 / 9–12 / other) re-ranks within band; accessible label present | `grade-bands.ts` + `ACCESSIBILITY_LABELS.gradeBandFilter` |
| Totals | PASS — XP/shots read from rollup fields, never computed in web | `LEADERBOARD_FIELDS` |
| Sorting | PASS — level sort order desc → XP desc → shots desc | `compareLeaderboardSortKeys` + tests |
| Ties | **FIXED this session** — full ties previously kept Airtable arrival order (unstable across fetches); now deterministic name → record id tiebreak | `sortLeaderboardRecords` + new test |
| Empty state | PASS — dedicated empty state, no crash on 0 records (matches emptied PROD) | `LeaderboardEmptyState` |
| Invalid records | PASS — `asText`/`asNumber` normalize missing/malformed fields (name falls back to "Unknown Athlete", numbers to 0) | `airtable-values.ts` tests |
| Hidden/private data | PASS — only the 9 presentation fields above are requested; no email/phone/parent/address/birth fields; enforced by unit test on `LEADERBOARD_FIELDS` and on rendered entry keys | `public-standings.test.ts` |
| Email exposure | PASS — no email-like fields requested; API route returns config health only | Package J audit |

## SC-004 note (Schmidt standings exclusion)

Per the Foundation Reset decision, Schmidt's testing enrollment stays `Active?=true`
for processing, and if Mike wants it hidden from public standings the **only**
sanctioned mechanism is the `Web - Leaderboard` view filter (exclude the specific
enrollment record ID). Confirmed direction for this overnight run: **Schmidt remains
visible everywhere** — so no exclusion filter should be added to the view yet either.
The website will faithfully render whatever the view returns.

**Warning:** if the `Web - Leaderboard` view is missing on the rebuilt base, the
fallback formula (`Active?`) includes Schmidt — consistent with confirmed direction.

## Tests added

- `web/lib/release/public-standings.test.ts` — Schmidt render + name-blind source scan + privacy-safe field patterns + deterministic tie ordering (5 tests).
- Total web unit suite after Agent 6 close-out: 109 tests, all passing.
