# PKG-038 — Field and table dependency sheet (053, 054, 059, 066)

**Schema authority:** `airtable/schema/snapshots/prod-foundation-reset-20260723-post-ts/schema_doc_appn84sqPw03zEbTT_20260723_152229.md` (Production base `appn84sqPw03zEbTT`). **Mike must re-verify field names, types, and select options in the live UI before paste** — this sheet is repository evidence only.

**Legend**

| Column | Meaning |
|---|---|
| **Writer** | Sole automation allowed to create/update this field in PKG-038 scope |
| **Read** | Required input; script reads but does not write |
| **Formula/Rollup** | Computed; never written by these automations |

---

## Canonical identities

| Family | Identity | Source Key pattern |
|---|---|---|
| Streak occurrence | Enrollment + Achievement + streak-end date (America/Denver) | Formula `Streak Occurrence Key` (not written) |
| Streak XP | One event per canonical occurrence | `STREAK_XP\|{enrollmentId}\|{achievementId}\|{YYYY-MM-DD}` |
| Shot milestone unlock | Enrollment + Shot Milestone | `SHOT_MILESTONE\|{enrollmentId}\|{shotMilestoneId}` |
| Shot milestone XP | One event per exact unlock | Same `SHOT_MILESTONE\|…` key on XP Event |

---

## Automation 053 — Streak Occurrences Rebuild (v5.5)

**Trigger table:** `Submissions` (`tbl…` — confirm in UI)  
**Writer:** 053 only for Streak Occurrence lifecycle fields listed below. **Does not write XP Events.**

### Tables touched

| Table | Table ID (2026-07-23 snapshot) | Role |
|---|---|---|
| Submissions | operational | Trigger + read eligibility |
| Enrollments | `tbl3PFmwbRoabu1YV` | Read Program Instance |
| Achievements | `tblrADEQbvH9kBfMZ` | Read streak config |
| Streak Occurrences | `tbl9VxLdBiNcev4He` | Create/update canonical rows |
| Weeks | `tblcsKugv1cla36A6` | Resolve Week by PI + date range |

### Submissions — read only

| Field | Type | Requirement |
|---|---|---|
| `Enrollment` | multipleRecordLinks → Enrollments | Exactly one; defines scope |
| `Activity Date` | dateTime | Non-empty for counted day |
| `Count This Submission?` | formula (number 0/1) | Must be settled `1` before 066 counts; 053 treats `1` as counted |
| `Total Shots Counted` | formula (number) | Must be `> 0` for streak day |

### Achievements — read only

| Field | Type | Requirement |
|---|---|---|
| `Active?` | checkbox | Must be checked |
| `Trigger Type` | singleSelect | Option `Streak Length` |
| `Trigger Threshold` | number | Days required per achievement |
| `Reward Rule Key` | singleLineText | Used by 054 via linked achievement |
| `Achievement Name` | singleLineText | Audit/display |

### Streak Occurrences — written by 053

| Field | Type | Linked / select | Writer | Notes |
|---|---|---|---|---|
| `Active?` | checkbox | — | **053** | `false` when unsupported; `true` on restore |
| `Enrollment` | multipleRecordLinks | → Enrollments, single | **053** | Canonical owner link |
| `Achievement` | multipleRecordLinks | → Achievements, single | **053** | Canonical owner link |
| `Streak Days` | number | — | **053** | Threshold reached at end date |
| `Streak Start Date` | date (iso) | — | **053** | Block start |
| `Streak End Date` | date (iso) | — | **053** | Canonical date segment for XP key |
| `Week` | multipleRecordLinks | → Weeks, single | **053** | PI-scoped week of end date |
| `Source Status` | singleSelect | `Pending`, `Ready for XP`, `Awarded`, `Duplicate`, `Error` | **053** | v5.5: create without `Ready for XP`, then separate update to fire 054 |
| `Source Submission Date` | dateTime | — | **053** | Audit |
| `Trigger Submission Date` | dateTime | — | **053** | Triggering submission |
| `Last Evaluated At` | dateTime | — | **053** | Audit |
| `Notes` | multilineText | — | **053** | Reconciliation notes |

### Streak Occurrences — formula/rollup (never write)

| Field | Type | Dependency |
|---|---|---|
| `Streak Occurrence Name` | formula | Enrollment, Achievement, Streak End Date |
| `Streak Occurrence Key` | formula | Enrollment Record ID, Achievement Key, Streak Date Key |
| `Gate Eligible Streak Days` | formula | Active?, Streak Days |
| `Enrollment Record ID` | lookup | Enrollment → Record Id |
| `Achievement Key` | lookup | Achievement → Achievement Key |
| `Streak Date Key` | formula | Streak End Date |
| `XP Events` | multipleRecordLinks | **054** appends link; 053 does not create XP |

### Weeks — read only

| Field | Type | Notes |
|---|---|---|
| `Start Date` | date | America/Denver week bounds |
| `End Date` | date | |
| `Program Instance` | multipleRecordLinks | Must match Enrollment PI |
| `Active Week?` / `Active?` | checkbox | Prefer active weeks |

### Downstream

| Automation | Fires when |
|---|---|
| **054** | Streak Occurrence updated: `Source Status` → `Ready for XP`, `Active?` withdrawal/restoration, XP link changes |

---

## Automation 054 — Streak XP Event (v5.8)

**Trigger table:** `Streak Occurrences`  
**Writer:** 054 for XP Event + occurrence status backlink.

### Tables touched

| Table | Role |
|---|---|
| Streak Occurrences | Trigger + read + write `Source Status`, `XP Events`, `Last Evaluated At`, `Notes` |
| Achievements | Read name, threshold, Reward Rule Key |
| XP Reward Rules | Read `Rule Key`, `XP Amount`, `Active?` |
| XP Events | Create/update canonical streak event |
| Weekly Athlete Summary | Link when Enrollment + Week resolves |

### Streak Occurrences — read/write

| Field | Type | Writer | Notes |
|---|---|---|---|
| `Active?` | checkbox | Read | Withdrawal path deactivates XP |
| `Enrollment` | link | Read | |
| `Achievement` | link | Read | |
| `Week` | link | Read | Copied to XP Event |
| `Streak End Date` | date | Read | Source Key date segment (Denver) |
| `Source Status` | singleSelect | **054** writes `Awarded` or `Error` | |
| `XP Events` | link | **054** appends canonical link | Never replace unrelated families |
| `Streak Occurrence Key` | formula | Read | Duplicate guard |
| `Last Evaluated At` | dateTime | **054** | |
| `Notes` | multilineText | **054** | |

### XP Events — written by 054

| Field | Type | Select / link options | Writer |
|---|---|---|---|
| `Enrollment` | multipleRecordLinks | → Enrollments | **054** |
| `Week` | multipleRecordLinks | → Weeks | **054** |
| `Weekly Athlete Summary` | multipleRecordLinks | → WAS | **054** when resolvable |
| `Streak Occurrence` | multipleRecordLinks | → Streak Occurrences | **054** |
| `XP Points` | number | From XP Reward Rule | **054** |
| `XP Source` | singleSelect | Achievement name (v2.1 audit) | **054** |
| `XP Bucket` | singleSelect | `Streak` | **054** |
| `Source Key` | singleLineText | `STREAK_XP\|…` | **054** |
| `XP Activity Date` | dateTime | Streak End Date | **054** |
| `XP Activity Date Source` | singleSelect | `Streak End Date` | **054** |
| `XP Reason Public` | singleLineText | | **054** |
| `Active?` | checkbox | `false` on withdrawal | **054** |
| `XP Award Status` | singleSelect | `Awarded` when active | **054** |
| `Award Mode` | singleSelect | `Automatic` | **054** |
| `Processed` | checkbox | | **054** |

### XP Events — formula (never write)

`Streak Occurrence Key`, `Event Identity ID`, `XP Date Resolved`, rollup WAS totals — downstream only.

---

## Automation 066 — Shot Milestone Unlocks (v3.8)

**Trigger table:** `Enrollments` — `Run Shot Milestone Check?` checked  
**Writer:** 066 for unlock rows + clears run-check. **Does not write XP Events.**

### Tables touched

| Table | Role |
|---|---|
| Enrollments | Trigger; read Grade Band, PI, Active?; clear `Run Shot Milestone Check?` |
| Submissions | Read counted shots for **this Enrollment only** |
| Shot Milestones | Read thresholds by Grade Band |
| Achievements | Read `SHOT_MILESTONE` achievement per milestone |
| Athlete Achievement Unlocks | Create/update canonical unlocks |
| Weeks | PI-scoped week for Milestone Activity Date |

### Enrollments — read/write

| Field | Type | Writer |
|---|---|---|
| `Active?` | checkbox | Read (skip if inactive) |
| `Grade Band` | multipleRecordLinks | Read |
| `Program Instance` | multipleRecordLinks | Read for Week scope |
| `Total Shots Submitted` | rollup | Read (display cross-check only; 066 sums submissions) |
| `Run Shot Milestone Check?` | checkbox | **066** clears on success/skip |

### Submissions — read only

| Field | Type | Requirement |
|---|---|---|
| `Enrollment` | link | Must match trigger enrollment |
| `Activity Date` | dateTime | Crossing date |
| `Total Shots Counted` | formula | `> 0` when counted |
| `Count This Submission?` | formula | Must be `1` (v3.7+) |

### Shot Milestones — read only

| Field | Type |
|---|---|
| `Milestone Label` | singleLineText |
| `Grade Band` | multipleRecordLinks |
| `Milestone Shot Count` | number |
| `Milestone Percent` | number |
| `Points Awarded` | number |
| `Active` / `Active?` | checkbox |
| `Milestone Unique Key` | singleLineText |

### Athlete Achievement Unlocks — written by 066

| Field | Type | Select options | Writer |
|---|---|---|---|
| `Enrollment` | link | | **066** |
| `Achievement` | link | | **066** |
| `Shot Milestone` | link | single | **066** |
| `Milestone Source Key` | singleLineText | `SHOT_MILESTONE\|…` | **066** |
| `Milestone Activity Date` | dateTime | | **066** |
| `Week` | link | PI-scoped | **066** |
| `XP Award Status` | singleSelect | `Pending`, `Awarded`, `Skipped`, `Error` | **066** sets `Pending` on create/restore |
| `Active?` | checkbox | | **066** `false` below threshold; `true` on restore |
| `Notes` | multilineText | **optional** (v3.8) | **066** if field exists |

### Athlete Achievement Unlocks — formula (never write)

| Field | Type | Dependency |
|---|---|---|
| `Unlock Key` | formula | Do not write |
| `Ready for 059 XP?` | formula | Enrollment, Achievement, XP Award Status, XP Events — **do not use as 059 trigger filter** |
| `Source Status` | singleSelect | Separate from unlock XP status; not 059 gate |

### Downstream

| Automation | Fires when |
|---|---|
| **059** | Unlock updated: `Active?`, `XP Award Status`, `XP Events`, links change |
| **010** | Sets `Run Shot Milestone Check?` after submission reconciliation (upstream) |

---

## Automation 059 — Shot Milestone / Perfect Week XP (v3.6)

**Trigger table:** `Athlete Achievement Unlocks`  
**Writer:** 059 for XP Event + unlock status. Perfect Week path unchanged; shot-milestone gets lifecycle inactive/reactivate.

### Athlete Achievement Unlocks — read/write

| Field | Type | Writer |
|---|---|---|
| `Achievement` | link | Read |
| `Enrollment` | link | Read |
| `Week` | link | Read (Perfect Week required) |
| `Shot Milestone` | link | Read (shot milestone) |
| `Milestone Source Key` | singleLineText | Read |
| `Milestone Activity Date` | dateTime | Read → XP Activity Date |
| `XP Award Status` | singleSelect | **059** → `Awarded` / `Error` / `Skipped` |
| `XP Awarded` | number | **059** optional write |
| `Active?` | checkbox | Read; shot-milestone withdrawal deactivates XP |
| `XP Events` | link | **059** appends canonical link |
| `Weekly Athlete Summary` | link | Read if preset; else lookup |
| `Notes` | multilineText | **059** audit |

### XP Events — written by 059

| Field | Shot milestone | Perfect Week |
|---|---|---|
| `Source Key` | `SHOT_MILESTONE\|{enr}\|{milestone}` | `PERFECT_WEEK\|{enr}\|{week}` |
| `XP Bucket` | `Shot Milestone` | `Perfect Week` |
| `XP Source` | `Shot Milestone` | `Perfect Week` |
| `XP Activity Date Source` | `Shot Milestone Activity Date` | `Perfect Week End Date` |
| `Achievement Unlock` | link | link |
| `Shot Milestones` | link | — |
| `Active?` | lifecycle | Perfect Week: existing behavior |

### Achievements — read only

`Reward Rule Key` must be `SHOT_MILESTONE` or `PERFECT_WEEK`.

### XP Reward Rules — read only

| Field | Type | Notes |
|---|---|---|
| `Rule Key` | singleLineText | Unique active rule per key (fail closed on duplicates) |
| `XP Amount` | number | Fallback if milestone points blank |
| `Active?` | checkbox | |

---

## Cross-automation ownership (do not violate)

| Function | Owner | PKG-038 note |
|---|---|---|
| Submission Base XP | **010** | Sets `Run Shot Milestone Check?`; does not write streak/milestone XP |
| Streak topology | **053** | Never creates XP |
| Streak XP | **054** | Exact `STREAK_XP` same-event lifecycle |
| Milestone unlock eligibility | **066** | Deactivate unlock, not delete |
| Milestone / PW XP | **059** | Exact `SHOT_MILESTONE` lifecycle; PW preserved |
| WAS create | **031** | 054/059 link only |
| Progression | **041** → **042** | Observe only during test |

---

## Read-only preflight audit

Run extension `airtable/extension-scripts/audits/audit-achievement-xp-pipeline-integrity.js` (**v2.1**) before and after paste. Save JSON; zero unresolved ownership/duplicate/lifecycle findings required to proceed.
