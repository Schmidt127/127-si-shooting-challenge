# Challenge-year rollover manifest — 2027-2028

Generated: 2026-07-24T21:52:21.872Z
Timezone: America/Denver
Preflight: **PASS**

## Configs

- Old: 2026-2027 (recOLDCONFIG202627)
- New: 2027-2028 (recNEWCONFIG202728)
- New dates: 2027-05-30 → 2027-08-14

## Weeks to create


| Seq | Label | Type | Start | End | Week Key | Week End Key |
|----:|-------|------|-------|-----|----------|--------------|
| 0 | Week 0 | week_0 | 2027-05-30 | 2027-06-05 | `2027-2028|Week 0` | 2027-06-05 |
| 1 | Week 1 | regular | 2027-06-06 | 2027-06-12 | `2027-2028|Week 1` | 2027-06-12 |
| 2 | Week 2 | regular | 2027-06-13 | 2027-06-19 | `2027-2028|Week 2` | 2027-06-19 |
| 3 | Week 3 | regular | 2027-06-20 | 2027-06-26 | `2027-2028|Week 3` | 2027-06-26 |
| 4 | Week 4 | regular | 2027-06-27 | 2027-07-03 | `2027-2028|Week 4` | 2027-07-03 |
| 5 | Week 5 | regular | 2027-07-04 | 2027-07-10 | `2027-2028|Week 5` | 2027-07-10 |
| 6 | Week 6 | regular | 2027-07-11 | 2027-07-17 | `2027-2028|Week 6` | 2027-07-17 |
| 7 | Week 7 | regular | 2027-07-18 | 2027-07-24 | `2027-2028|Week 7` | 2027-07-24 |
| 8 | Week 8 | regular | 2027-07-25 | 2027-07-31 | `2027-2028|Week 8` | 2027-07-31 |
| 9 | Post-Challenge | post_challenge | 2027-08-01 | 2027-08-07 | `2027-2028|Post-Challenge` | 2027-08-07 |


## Expected keys

- `2027-2028|Week 0`
- `2027-2028|Week 1`
- `2027-2028|Week 2`
- `2027-2028|Week 3`
- `2027-2028|Week 4`
- `2027-2028|Week 5`
- `2027-2028|Week 6`
- `2027-2028|Week 7`
- `2027-2028|Week 8`
- `2027-2028|Post-Challenge`

## Fields to update

- [ ] Config / Program Instance current flags and dates
- [ ] Enrollment School Year + Program Instance / Config links
- [ ] Weeks Program Instance link (and proposed Challenge Week Key if authorized)
- [ ] Fillout hidden year/config fields
- [ ] View filters for current year

## Automations to inspect

- [ ] 005 — assign Week from Activity Date
- [ ] 010 — submission base XP
- [ ] 031 — find/create Weekly Athlete Summary
- [ ] 034 — previous-week helpers
- [ ] 041/042 — level recalc
- [ ] 072 — build weekly email package
- [ ] 074 — send weekly email to Make
- [ ] 101 — Zoom attendance WAS ensure
- [ ] 114 — video XP
- [ ] 118 — schedule weekly summary email build
- [ ] 119 — schedule weekly summary email send

## Make scenarios to inspect

- [ ] Weekly Athlete Summary - Bulk Email - May 18 (sender + writeback)
- [ ] Upload Engine / Lambda routes (season slug prefixes)
- [ ] Zoom Recording Approval Email 117f (if used)

## Fillout forms to inspect

- [ ] Enrollment form — hidden Config / School Year / Program Instance
- [ ] Daily submission form — Activity Date validation + year linkage

## Softr pages and filters

- [ ] Current-year Enrollment visibility filters
- [ ] Weekly Athlete Summary visibility
- [ ] Levels / Achievements current-year separation
- [ ] Historical data pages (must not mix years)

## Views to inspect

- [ ] Enrollments — current year Active?
- [ ] Weeks — current challenge year
- [ ] Weekly Athlete Summary — current week / current year
- [ ] XP Events — current year reporting

## Test records to retain

- [ ] Schmidt enrollment (testing family) — retain identity; re-link to new year intentionally

## Test records to exclude

- [ ] Stale Testing Scenarios tied only to prior year Weeks
- [ ] Orphan WAS rows with empty Enrollment

## Validation steps

- [ ] Run week generator + validator
- [ ] Run rollover preflight (expect PASS or PASS WITH WARNINGS)
- [ ] Dry-run Airtable preview helpers with explicit Config ID + year label
- [ ] Controlled Schmidt Activity Date → Week assignment (005)
- [ ] Controlled empty-week email path in Test mode before Live schedules

## Rollback steps

- [ ] Keep prior Config isCurrent=true until new year proven
- [ ] Do not delete prior Weeks/Enrollments/WAS
- [ ] Turn 118/119 schedules OFF
- [ ] Point Fillout hidden fields back to prior year if activation aborted
- [ ] Re-run preflight after fixes before re-attempting activation

## Proof required before activation

- [ ] Preflight overall PASS or accepted PASS WITH WARNINGS with Mike sign-off
- [ ] Week import verified (keys, Sunday/Saturday, Config/year linkage)
- [ ] No multiple current Configs
- [ ] Schmidt controlled submission maps to correct new-year Week
- [ ] Weekly email Test send for one summary (no season-wide Live schedule yet)
