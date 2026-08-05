# Perfect Week PROD Fixture Specification

| Field | Value |
|-------|--------|
| Authority | [`docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](../../SHOOTING_CHALLENGE_COMPLETION_MASTER.md) |
| Automation | **057** Calculate Perfect Week Eligibility (**v1.5**, PROD installed 2026-08-05) |
| Downstream | **058** unlock → **059** XP (`PERFECT_WEEK\|{enrollmentId}\|{weekId}`) |
| Environment | **PROD** (`appn84sqPw03zEbTT`) — controlled Schmidt test data only |
| Fixture batch | `PWTEST\|2026-08-05` |
| Status | Spec ready — live verification **not** Complete |

## Version alignment

| Layer | Version | Match? |
|-------|---------|--------|
| Repository canonical script | **1.5** (Last updated 2026-08-05) | — |
| PROD Automation 057 (Mike attestation) | **1.5** (Last updated 2026-08-05) | **Yes — match** |
| Prior paste runbook | v1.4 | Superseded — do **not** paste/downgrade to v1.4 |

Canonical file: `airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js`

## Implemented product rules (verified from script + schema)

| Rule | Implementation | Notes |
|------|----------------|-------|
| Week boundary | Sunday–Saturday from Weeks.`Start Date` + 7 keys | `requiredDailyCount: 7` |
| Daily shots | Each of 7 dates ≥ `ceil(weeklyGoal / 7)` | Goal from WAS `Weekly Goal Shots Target` (fallback `Goal Shots Target`) |
| Same-day only | Formula `Submitted Same Day?` (Denver) → `Perfect Week Countable Submission?` | 057 reads countable flag only |
| Videos | ≥ 3 Video Feedback rows matching WAS Enrollment **and** linked to a WAS Submission | Hardcoded `requiredVideoCount: 3` |
| Zoom | If Zoom Meeting count for Week = 0 → met; else attendance ≥ 1 | Formula `Perfect Week Zoom Requirement Met?` |
| Homework | 100% of assigned homework satisfactory; **0 assigned → met** | v1.2+; fixtures leave homework empty unless testing HW |
| Eligibility | Formula `Perfect Week Eligible?` when Ready + daily + homework + video + zoom | 057 does **not** write Eligible |
| Unlock | Automation **058** when Eligible=1 and Unlock empty | |
| XP | Automation **059**; Source Key `PERFECT_WEEK\|{enr}\|{week}`; amount from rule (**100**) | XP date via Weekly Summary End / Saturday |
| Date keys | America/Denver via `Intl` for Date objects (v1.4+); unloadData guarded (v1.5) | **Risk:** ISO datetime *strings* still take the `YYYY-MM-DD` UTC prefix before Intl — safe for date-only Activity Date; CASE-16 must use Denver calendar dates |

### Field name map (canonical)

| Common label | Actual field | Owner |
|--------------|--------------|-------|
| Enrollment / Week | WAS `Enrollment`, `Week` | Manual / 031 |
| Week Start | Weeks `Start Date` | Manual |
| Days Logged | WAS `Days Logged This Week` (rollup) | Formula/rollup — not written by 057 |
| Shots | Submission `Total Shots Counted` | Manual / intake |
| Daily Requirement Met? | WAS `Perfect Week Daily Requirement Met?` | **057** |
| Perfect Week Countable Submission? | Submissions formula | Formula |
| Submitted Same Day? | Submissions formula | Formula |
| Video Count | WAS `Perfect Week Video Count` | **057** |
| Video Met? | WAS `Perfect Week Video Requirement Met?` | Formula (≥3) |
| Zoom Meeting Count | WAS `Perfect Week Zoom Meeting Count` | **057** |
| Zoom Met? | WAS `Perfect Week Zoom Requirement Met?` | Formula |
| Perfect Week Status | Use `Perfect Week Daily Check Status` + `Perfect Week Eligible?` + Unlock | Mixed |
| Perfect Week Applied? | Prefer `Perfect Week Unlock` present; ZA `Perfect Week Credit Applied?` for recording credit | 058 / 057 |
| XP Dedupe Key | XP Events Source Key `PERFECT_WEEK\|…` | 059 |

## Isolation rules

1. Athlete: Schmidt testing athlete only (`recgqVstObQRzgXJF` or current PROD Schmidt).
2. Create **isolated Enrollments** per case (or pair for cross-program) — do not reuse production season enrollments for contamination cases.
3. Create **dedicated Week** records with explicit Sunday Start Date and Saturday end (or use labeled fixture Weeks).
4. Prefix all operator-visible names/notes with `PWTEST|2026-08-05|CASE-XX`.
5. Avoid real parent emails; disable/suppress email send triggers for fixture enrollments where possible.
6. Do **not** manually set formula, lookup, rollup, or 057/058/059 result fields.
7. Record every created record ID in `docs/testing/perfect-week/fixtures/PWTEST-MANIFEST.json` (from template).
8. Delete fixtures only after verifier evidence is captured.

## Shared calendar (target week)

Unless a case says otherwise:

| Role | Date key (America/Denver) |
|------|---------------------------|
| Sunday (Week Start) | `2026-08-02` |
| Monday … Friday | `2026-08-03` … `2026-08-07` |
| Saturday (Week End / Perfect Week date) | `2026-08-08` |
| Adjacent prior Saturday | `2026-08-01` |
| Adjacent next Sunday | `2026-08-09` |

**Weekly goal for fixtures:** `70` shots → daily minimum `ceil(70/7) = 10`.

**Per qualifying day:** one Submission with `Total Shots Counted ≥ 10`, Activity Date = that day, Submitted At same Denver calendar day, Enrollment + Week linked, `Count This Submission? = 1` (or equivalent that yields Countable = 1).

## Case catalog (record-by-record)

### CASE-01 — Clean passing week

| Create | Detail |
|--------|--------|
| Enrollment | `PWTEST\|2026-08-05\|CASE-01` Shooting Challenge |
| Week | Start `2026-08-02` |
| WAS | Enrollment + Week; goal 70; **no homework assigned** |
| Submissions ×7 | One per day Sun–Sat, 10+ shots, same-day |
| Video Feedback ×3 | Enrollment = CASE-01; Submission ∈ WAS submissions |
| Zoom | None |

**Expect:** Daily Met true; Video Met 1; Zoom Met 1 (not required); Eligible 1; one unlock; one XP 100; XP date Saturday `2026-08-08`; Source Key `PERFECT_WEEK\|{enr}\|{week}`.

### CASE-02 — All shots on one day

Same Enrollment/Week pattern; put **all** shots on `2026-08-02` only (total may equal Case 1 weekly total). Videos optional (daily will fail first).

**Expect:** Days Logged = 1; Daily Met false; Eligible 0; no PERFECT_WEEK XP.

### CASE-03 — Six of seven days

Qualifying submissions on six dates only (omit Saturday).

**Expect:** Days Logged = 6; Daily Met false; no award.

### CASE-04 — Cross-week contamination

Six in-week days + one submission Activity Date `2026-08-09` (next Sunday) linked/labeled for audit + one on `2026-08-01` (prior Saturday). Prefer **not** linking outside-week rows to target WAS (normal 031 behavior). Also include a variant that **force-links** the outside-week row to WAS to prove 057 `outsideOfficialWeekCount` path.

**Expect:** Outside dates do not satisfy missing day; Daily Met false; no award.

### CASE-05 — Cross-program contamination

Enrollment A (target) + Enrollment B (different program/instance), same athlete. Six days on A; seventh day on B only.

**Expect:** B does not count for A; A fails; no award for A.

### CASE-06 — Wrong linked Week

Submission Activity Date inside target week, but Submission.`Week` = different Week; still linked to target WAS (manual link).

**Preferred safety:** does not count; mismatch visible in detail.

**Canonical 057 behavior:** counts by Activity Date if countable and linked to WAS — **does not re-check Submission.Week === WAS.Week**. If it awards using this row, record **DEFECT**.

### CASE-07 — Backdated submission

Activity Date in week; Submitted At on a later Denver date.

**Expect:** Submitted Same Day? = 0; Countable = 0; ignored by 057; no award if that day was required.

### CASE-08 — Video requirement failure

Seven daily days + only **2** Video Feedback rows.

**Expect:** Video Count = 2; Video Met = 0; Eligible 0; no award.

### CASE-09 — Cross-week video contamination

Seven daily days; 2 videos on target-week submissions; 1 video on adjacent-week submission (not in WAS.Submissions).

**Expect:** Video Count = 2; no award.

### CASE-10 — Zoom not required

Same as CASE-01 (no Zoom Meeting).

**Expect:** Zoom Meeting Count = 0; Zoom Met = 1; award occurs.

### CASE-11 — Zoom required and attended

Seven days + 3 videos; one Zoom Meeting linked to target Week; enrollment on Meeting.Attendees (or qualifying live path).

**Expect:** Zoom required; Zoom Met = 1; award occurs.

### CASE-12 — Zoom required but not attended

Meeting for Week; no attendance for Enrollment.

**Expect:** Zoom Met = 0; no award.

### CASE-13 — Cross-program Zoom attendance

Target Enrollment needs Zoom; attendance linked to **other** Enrollment for same athlete.

**Expect:** does not satisfy target; no award.

### CASE-14 — Duplicate submissions on one date

Multiple qualifying submissions on one date (e.g. three on Sunday) plus other six days.

**Expect:** shots aggregate for that date; Days Logged / distinct dates do not inflate beyond 7; still can pass if all seven dates covered.

### CASE-15 — Idempotency

Use CASE-01 (or clone) passing WAS; run 057 (and allow 058/059) **multiple times**.

**Expect:** one Eligible result; one Unlock; one PERFECT_WEEK XP; stable Source Key; no duplicates.

### CASE-16 — Week boundary and timezone

| Submission | Activity / Submitted At intent |
|------------|--------------------------------|
| A | Saturday `2026-08-08` 23:55 America/Denver |
| B | Sunday `2026-08-09` 00:05 America/Denver |

**Expect:** A belongs only to ending week (`2026-08-02` start); B only to new week; UTC conversion must not flip either.

## Upstream writers / downstream dependents

| Direction | Component |
|-----------|-----------|
| Upstream | 031 WAS create/link; Submission formulas (Countable / Same Day); Video Feedback create; Zoom Meeting/Attendance; Homework Completions |
| 057 | Writes daily/video/zoom/homework helper fields + Automation Status |
| Formulas | Video Met, Zoom Met, Eligible |
| 058 | Perfect Week Unlock |
| 059 | PERFECT_WEEK XP Event |
| Downstream consumers | 042 gates (indirect), weekly email presentation, web achievements |

## Safety

- Label every record `PWTEST|2026-08-05|…`
- Safe to delete after evidence
- Do not mark SC-021 / SC-028 / SC-077 / SC-091 **Complete** from install alone
