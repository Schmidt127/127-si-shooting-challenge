# Goal Conquer Reconciliation

_Generated 2026-07-02 17:36 — read-only._

## How to read this report

- **Goal Met?** on Enrollment = live shot line vs target **today** (rollup can move).
- **Conquered Goal Award Recipient** = your manual record that they hit the pinnacle and the gift card was logged.
- **Rule:** an athlete only conquers the full target **once**; the recipient row is the permanent fulfillment log.
- **Goal Met Date** lookup currently pulls dates from **all** award recipients — use Conquered Goal rows for gift-card truth until a filtered field exists.

## Summary (active enrollments)

- Active enrollments: **91**
- Goal Met? true today: **14**
- Conquered Goal recipient rows: **14** athletes with **14** rows
- Aligned (row + Goal Met? today): **14**
- **Need manual award row** (Goal Met? today, no row): **0**
- **Row is fulfillment truth** (row exists, Goal Met? blank today): **0**
- Neither row nor Goal Met? today: **77**

## Cleanup: create Conquered Goal recipient + Date Awarded

_These athletes meet the shot target on today’s line but have no Conquered Goal row yet._

_No rows._


## Cleanup: trust existing row (do not delete if card was sent)

_Recipient row exists; Goal Met? is blank because today’s rollup is below target. Under the once-only pinnacle rule, treat the row as the conquer record unless the card was never sent._

_No rows._


## Aligned

| Athlete | Shots | Target | Week | Status | Date |
| --- | --- | --- | --- | --- | --- |
| Andrew Brady | 5232 | 5000 | Week 5 | Sent | 2026-06-01 |
| Benny Brady | 8801 | 2000 | Week 5 | Sent | 2026-06-01 |
| Camden Clark | 16850 | 10000 | Week 7 | Sent | 2026-06-11 |
| Dayton Fox | 14618 | 5000 | Week 5 | Sent | 2026-06-01 |
| Eli Cowgill | 10010 | 10000 | Week 10 | In Amazon Cart | 2026-06-29 |
| Jackson  Elders | 5100 | 5000 | Week 10 | In Amazon Cart | 2026-06-28 |
| Jacob Schwenk | 8280 | 8000 | Week 7 | Sent | 2026-06-11 |
| Kinsley  Heidema | 8423 | 8000 | Week 9 | Sent | 2026-06-25 |
| Leyton  Bakken | 18110 | 12000 | Week 10 | In Amazon Cart | 2026-06-30 |
| Lyle Kimm | 10736 | 8000 | Week 8 | Sent | 2026-06-21 |
| McKinley Clark | 13633 | 8000 | Week 7 | Sent | 2026-06-11 |
| Riley Geraghty | 15404 | 10000 | Week 7 | Sent | 2026-06-09 |
| Tracen  Heidema | 3338 | 2000 | Week 6 | Sent | 2026-06-11 |
| William  Buresh | 12000 | 12000 | Week 8 | Sent | 2026-06-21 |


## Duplicate Conquered Goal rows (same athlete + week + date)

_No rows._


## Recommended Airtable views

1. **Need Conquered Goal award** — Enrollment: Goal Met? is not empty AND no linked Conquered Goal recipient (or use this report).
2. **Conquered Goal fulfillment** — Award Recipients filtered to Conquered Goal award.
3. **Duplicate weekly award** — Award Recipients: group by Enrollment + Award + Week; flag count > 1.

## Optional schema (when ready)

- **Goal Conquered?** — true if Conquered Goal recipient exists OR shots ≥ target.
- **Conquered Goal Date** — lookup `Date Awarded` from Conquered Goal recipients only.
