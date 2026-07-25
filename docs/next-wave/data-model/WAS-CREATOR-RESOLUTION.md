# WAS Creator Resolution — 031 / 101 / 118

**Table:** Weekly Athlete Summary  
**Logical unique:** one row per Enrollment + Week  
**Formula:** `Summary Key` (never written)

---

## Per-automation analysis

| Auto | Creates WAS? | Primary job | Trigger | Unique-key logic | Overlap |
|------|--------------|-------------|---------|------------------|---------|
| **031** | **Yes** if none | Find/create from counted Submission | Submission Count This Submission? + WAS empty | Lookup Summary Key + Enrollment+Week; create links only | Primary activity path |
| **101** | **Yes** if none | Side-effect while awarding live Zoom XP | Zoom meeting XP path | `findWeeklySummaryId(enrollment, week)` then create | Only when Zoom XP and WAS missing |
| **118** | **Yes** if none | Sunday batch ensure + arm Build | Schedule Sun 5:00 AM Denver (**ON**) | Summary Key map else Enrollment for target week; create Enrollment+Week | Empty-week / no-submission athletes |

119 / 072 / 074 do **not** create WAS (flag / package / webhook only).

---

## Duplicate risk (narrowed)

Overlapping **create** writers exist in code (`createRecordAsync` in 031, 101, 118).  
Airtable has no unique index → concurrent miss-then-create can duplicate.

**Not a constant dual-writer of the same event.** Practical windows:

| Pair | When risk is real |
|------|-------------------|
| 031 vs 101 | Same Enrollment+Week, concurrent Submission XP and Zoom XP |
| 031 vs 118 | Sunday 05:00 batch while late Saturday/Sunday submissions still fire 031 |
| 101 vs 118 | Sunday Zoom XP same morning as 118 batch |

Historical Schmidt evidence: one WAS despite three Submissions (031 path stable when not concurrent).

---

## Recommended sole ownership

| Role | Owner |
|------|-------|
| Authoritative create from athlete activity | **031** |
| Allowed side-create when Zoom XP needs WAS | **101** (keep; throw on multiples) |
| Scheduled ensure for email (empty weeks) | **118** (required for empty-week email; ON in PROD) |
| Formula identity | `Summary Key` read-only |

**Do not** describe 118 as “keep OFF.” PROD ON is verified. Race is a **bounded concurrency residual**, not a reason to disable schedules.

---

## Operator rules

1. Do not manually create a second WAS for the same Enrollment+Week.  
2. If duplicates appear: stop writers, merge links onto keeper, archive extras (OMNI).  
3. Never script-write `Summary Key`.
