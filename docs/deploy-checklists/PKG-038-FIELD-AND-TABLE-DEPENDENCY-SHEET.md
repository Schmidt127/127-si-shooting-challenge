# PKG-038 — Field and table dependency sheet (053 / 054 / 059 / 066)

**Base:** Production `appn84sqPw03zEbTT` · DEV `appTetnuCZlCZdTCT`  
**Schema source:** `airtable/schema/snapshots/prod-foundation-reset-20260723-post-ts/schema_doc_appn84sqPw03zEbTT_20260723_152229.md`  
**Repository SHA:** verify `git rev-parse HEAD` before paste  
**Last updated:** 2026-08-16

Field IDs below come from the 2026-07-23 Production schema snapshot. **Do not proceed** if live Airtable field names, types, or select options differ — see [PKG-038-DO-NOT-PROCEED-GATE.md](./PKG-038-DO-NOT-PROCEED-GATE.md).

---

## Ownership summary

| Domain | Topology / unlock writer | XP Event writer | Submission Base XP owner |
|--------|--------------------------|-----------------|---------------------------|
| Streak | **053** | **054** | **010** (unchanged) |
| Shot milestone | **066** | **059** | **010** (unchanged) |
| Perfect Week | 058 | 059 | — |

**Never deleted by this package:** XP Events, Athlete Achievement Unlocks, Streak Occurrences, Submissions, Enrollments.

---

## Canonical source keys

| Family | Pattern | Writer |
|--------|---------|--------|
| Streak XP | `STREAK_XP\|<Enrollment ID>\|<Achievement ID>\|<Streak End Date YYYY-MM-DD>` | 054 |
| Shot milestone unlock | `SHOT_MILESTONE\|<Enrollment ID>\|<Shot Milestone ID>` | 066 |
| Shot milestone XP | same `SHOT_MILESTONE` key as unlock | 059 |
| Submission Base XP | `SUBMISSION_XP\|<Submission ID>` | **010 only** |

---

## Table: Submissions (`tblEVjVpGGlPTsYSt`)

**053 trigger table.** 066 reads counted submissions for the linked Enrollment.

| Field | Field ID | Type | Required by | Written by | Notes |
|-------|----------|------|-------------|------------|-------|
| Enrollment | `fldpkkSBsx8kQRZos` (link via inverse) | multipleRecordLinks → Enrollments | 053, 066 | 023 intake | Must be exactly one Enrollment on trigger row |
| Activity Date | `fldpkkSBsx8kQRZos` area — confirm in live UI | date | 053, 066 | 005 / intake | America/Denver week boundaries |
| Total Shots Counted | per snapshot on Submissions | number | 053, 066 | intake / rollup chain | Must be > 0 for streak day |
| Count This Submission? | formula | formula → numeric 1/0 | 053, 066 | upstream intake | **053 v5.5+** and **066 v3.7+** require formula-backed value; 066 sums only rows where = 1 |
| XP Events | link | multipleRecordLinks | audit | **010** | PKG-038 must not create Submission Base XP here |

**053 watched trigger fields (minimum):** Enrollment, Activity Date, `Count This Submission?`, Total Shots Counted. Trigger must fire on positive, exclusion, date, and Enrollment-owner corrections.

---

## Table: Enrollments (`tbl3PFmwbRoabu1YV`)

**066 trigger table.** Linked from 053/054/059 context.

| Field | Field ID | Type | Required by | Written by | Notes |
|-------|----------|------|-------------|------------|-------|
| Active? | `fld…` (checkbox) | checkbox | 066 | manual / intake | 066 skips inactive without error |
| Grade Band | `fldmM5UET9wsL1lwy` | multipleRecordLinks | 066 | 002 / 003 | Exactly one linked Grade Band for milestone ladder |
| Program Instance | per snapshot | multipleRecordLinks | 053, 066 | intake | Week resolution scoped to PI — never date-only across years |
| Run Shot Milestone Check? | checkbox | checkbox | 066 | **010** reconciliation, Mike controlled test | 066 clears on success/skip; leaves checked on error |
| Total Shots Submitted | rollup/display | number | 066 (display only) | rollup | **066 calculates from Submissions**, not this field |
| Streak Occurrences | `fldanl05JKEhuwysG` inverse | link | audit | 053 | Read-only for operators |
| Athlete Achievement Unlocks | `fldelG3oIUxOwE7dv` inverse | link | audit | 066 | Read-only for operators |
| Lifetime XP Total | formula/rollup | computed | evidence checklist | rollup from XP Events | Observe after inactive/active lifecycle |

**Controlled test Enrollment (2026-27 Schmidt):** `recCyFEPeATOVNlr9`  
**Athlete:** `recgqVstObQRzgXJF` · **Program Instance:** `rec5mEM0YPqPqq0hZ`

---

## Table: Achievements (`tblrADEQbvH9kBfMZ`)

| Field | Type | Required by | Written by | Notes |
|-------|------|-------------|------------|-------|
| Active? | checkbox | 053 | config | Only active achievements evaluated |
| Trigger Type | singleSelect | 053 | config | Must include option `Streak Length` |
| Trigger Threshold | number | 053 | config | Streak day count (e.g. 3, 5, 7) |
| Reward Rule Key | singleLineText / select | 053, 054, 059, 066 | config | Streak: `STREAK_3DAY`, etc.; milestone: `SHOT_MILESTONE` |
| Achievement Name | text | 054, 059 | config | Drives XP Source display |

**Known streak achievement IDs on Schmidt 2026-27 (2026-08-05 evidence):**

| Achievement | Record ID | Threshold |
|-------------|-----------|-----------|
| 3-Day Streak | `recQuAtXyT2wKJNGI` | 3 |
| 5-Day Streak | `rechOec7g8LBLcdgl` | 5 |
| 7-Day Streak | `recP8QP4uhEXaiZAX` | 7 |

---

## Table: Streak Occurrences (`tbl9VxLdBiNcev4He`)

**054 trigger table.** Created/reconciled by **053**.

| Field | Field ID | Type | Required by | Written by | Notes |
|-------|----------|------|-------------|------------|-------|
| Active? | `fld74jFfDfp1huinA` | checkbox | 053, 054 | 053 | Withdrawal = unchecked; restoration = checked |
| Enrollment | `fldq1NyyZe71Xxjvr` | link (single) | 053, 054 | 053 | Exactly one |
| Achievement | `fldlyvz2Uk9u7AImn` | link (single) | 053, 054 | 053 | Exactly one |
| Streak Days | `fldgtic43J4s14jbK` | number | 053 | 053 | Threshold reached |
| Streak Start Date | `fld3PLLvMlzz2KSPD` | date (ISO) | 053 | 053 | |
| Streak End Date | `fld0xqXER4sVq2jhr` | date (ISO) | 053, 054 | 053 | **Source Key date segment** |
| Week | `fldmtG66BIfAPqtk3` | link (single) | 053, 054 | 053 | PI-scoped week containing Streak End Date |
| Source Status | `fldwKO0ZF2dkI2ix2` | singleSelect | 053, 054 | 053, 054 | Options: Pending, **Ready for XP**, Awarded, Duplicate, Error |
| XP Events | `fldQXrDK7TivJ9DIZ` | link | 054 | 054 | Append link; do not replace unrelated families |
| Streak Occurrence Key | `fldetuPZCoQzFbulB` | formula | audit | — | **Never written by 053** |
| Source Submission Date | `fldpzbwdbCzaca6Yp` | date | 053 | 053 | Audit trail |
| Trigger Submission Date | per snapshot | date | 053 | 053 | Triggering submission |
| Last Evaluated At | per snapshot | dateTime | 053, 054 | 053, 054 | |
| Notes | `fldv8mFyd11gZBkkL` | multilineText | 053 | 053 | |

**Canonical identity:** Enrollment + Achievement + Streak End Date (not Streak Occurrence Key formula).

**053 v5.5 handoff:** create occurrence **without** Ready for XP → separate update sets Ready for XP → 054 native update trigger fires.

---

## Table: Athlete Achievement Unlocks (`tblyT2AQo1JbvmvZS`)

**059 trigger table.** Shot milestones created/reconciled by **066**.

| Field | Field ID | Type | Required by | Written by | Notes |
|-------|----------|------|-------------|------------|-------|
| Active? | `fldmDBm7IIP2yTGaA` | checkbox | 066, 059 | 066 | Below-threshold → inactive; never deleted |
| Enrollment | `fldxCHW5Yc4kahb4Z` | link (single) | 066, 059 | 066 | |
| Achievement | `fldeeKnA7u6p3AoqV` | link (single) | 059 | 066 | Shot Milestone achievement row |
| Shot Milestone | `fldop6wVgfxwKck0h` | link (single) | 066, 059 | 066 | Required for milestone path |
| Milestone Source Key | `fldHwWWMESmhYX2Da` | singleLineText | 066, 059 | 066 | `SHOT_MILESTONE\|enr\|ms` |
| Milestone Activity Date | per snapshot | date | 066, 059 | 066 | Crossing submission date |
| Week | `fldnsr1zuKjy17fxV` | link (single) | 066, 059 | 066 | PI-scoped |
| XP Award Status | `fldHUsIkp3hF8W5kd` | singleSelect | 059 | 059 | Options: **Pending**, Awarded, Skipped, Error |
| XP Events | `fldnxSYwXBl2q61Aa` | link | 059 | 059 | |
| XP Awarded | `fldTbTn6dvrI0izps` | number | 059 | 059 | |
| Weekly Athlete Summary | `fldcplpAaSHYEMa3C` | link | 059 | 059 / 066 | Resolved from unlock or Enrollment+Week |
| Source Key | per snapshot | text | 059 | 058 (Perfect Week) | Perfect Week uses `PERFECT_WEEK\|…`; milestones use Milestone Source Key |
| Unlock Key | `fld5yPKklaMYQbxyO` | formula | — | — | **Never written by 066** |
| Notes | per snapshot | multilineText | 066 (optional v3.8) | 066 | Optional — missing must not block |

**Known Schmidt 2026-27 milestone source keys (8 unlocks, 2026-08-05 evidence):** see [PKG-038-EVIDENCE-CHECKLIST.md](./PKG-038-EVIDENCE-CHECKLIST.md).

---

## Table: Shot Milestones (`tbl5C4TsQpOigIyRz`)

Config table — read by **066** only.

| Field | Type | Required by | Written by | Notes |
|-------|------|-------------|------------|-------|
| Active / Active? | checkbox | 066 | config | Both names supported in script |
| Grade Band | link | 066 | config | Match Enrollment Grade Band by linked ID first |
| Milestone Shot Count | number | 066 | config | Threshold |
| Points Awarded | number | 066 | config | Informational; XP amount from XP Reward Rules |

---

## Table: XP Reward Rules (`tbl…`)

| Field | Type | Required by | Written by | Notes |
|-------|------|-------------|------------|-------|
| Active? | checkbox | 054, 059 | config | Duplicate active rows for same Rule Key → **error** (054 v5.6+, 059) |
| Rule Key | text | 054, 059 | config | e.g. `STREAK_3DAY`, `SHOT_MILESTONE` |
| XP Amount | number | 054, 059 | config | |

---

## Table: XP Events (`tblmGSiNA1akW8KnU`)

| Field | Field ID | Type | Required by | Written by | Notes |
|-------|----------|------|-------------|------------|-------|
| Active? | `fldIp6N4ppccSX1Ot` | checkbox | 054, 059, audit | 054, 059 | **Inactive ≠ deleted** |
| Source Key | `fldEz2RLvrYqyj2vB` | singleLineText | 054, 059, audit | 054, 059 | Exact canonical identity |
| Enrollment | link | 054, 059 | 054, 059 | |
| Week | link | 054, 059 | 054, 059 | |
| Weekly Athlete Summary | link | 054, 059 | 054, 059 | One canonical WAS per Enrollment+Week |
| Streak Occurrence | `fld2CP0yc4yZvxCWF` | link | 054 | 054 | Streak XP only |
| Achievement Unlock | `fldfxic1XHlipDqET` | link | 059 | 059 | Milestone / Perfect Week XP |
| XP Points | number | 054, 059 | 054, 059 | |
| XP Source | singleSelect | 054, 059 | 054, 059 | Streak: achievement name; milestone: `Shot Milestone` |
| XP Bucket | `fldOQBVTSNODRhRcd` | singleSelect | 054, 059 | 054, 059 | Streak / Shot Milestone options must exist |
| XP Activity Date | dateTime | 054, 059 | 054, 059 | |
| XP Activity Date Source | singleSelect | 054, 059 | 054, 059 | Streak End Date / Shot Milestone Activity Date |
| XP Dedupe Key | `fld6Ey3SBbzxWXiAo` | formula | audit | — | Rollup dependency — do not write |
| Event Identity ID | formula | formula | audit | — | Derived from Source Key |

**054 does not write:** Submission link, Homework link, Video link (append-only backlink policy for streak family).

---

## Table: Weeks (`tblcsKugv1cla36A6`)

| Field | Type | Required by | Written by | Notes |
|-------|------|-------------|------------|-------|
| Start Date | date | 053, 066 | config | America/Denver date keys (005/034 pattern) |
| End Date | date | 053, 066 | config | |
| Program Instance | link | 053, 066 | config | Required for PI-scoped resolution |
| Active Week? / Active? | checkbox | 053, 066 | config | Script checks either name |

---

## Table: Weekly Athlete Summary (`tbl9520d72adxlAKQ`)

| Field | Type | Required by | Written by | Notes |
|-------|------|-------------|------------|-------|
| Enrollment | link | 054, 059, audit | 031 | |
| Week | link | 054, 059, audit | 031 | |
| XP rollups | formula/rollup | evidence | — | Observe after lifecycle test |

**031 remains sole WAS creator.** PKG-038 scripts only link existing WAS when resolvable.

---

## Formula / rollup dependencies (read-only for PKG-038)

| Computed field | Table | Depends on | Risk if wrong |
|----------------|-------|------------|---------------|
| Count This Submission? | Submissions | intake / exclusion fields | 053/066 skip or mis-count |
| Streak Occurrence Key | Streak Occurrences | Enrollment, Achievement, dates | audit only — not writer input |
| Unlock Key | Athlete Achievement Unlocks | Enrollment, Achievement, Week, Shot Milestone | audit only |
| XP Dedupe Key | XP Events | Source Key, Enrollment, XP Source | duplicate detection in audits |
| Lifetime XP Total | Enrollments | XP Events Active? + points | evidence checklist settling |
| Total Shots Counted rollups | Enrollments / WAS | Submissions | milestone threshold evidence |

**Observation window:** After correction/restoration, wait for formula/rollup settlement before recording pass/fail (same boundary as PKG-006R / PKG-036).

---

## Automation output contracts

| Automation | statusOut | actionOut (when applicable) |
|------------|-----------|------------------------------|
| 053 | success / skipped / error | — |
| 054 | created / updated / skipped / error | yes |
| 059 | created / updated / skipped / error | yes |
| 066 | success / skipped / error | created / updated / skipped_* |

All four require `errorOut` and `debugStep`.

---

## Related read-only audit

`airtable/extension-scripts/audits/audit-achievement-xp-pipeline-integrity.js` **v2.1** — no write capability. Run before and after Production paste.
