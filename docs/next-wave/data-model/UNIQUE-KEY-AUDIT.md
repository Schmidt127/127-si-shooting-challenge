# Unique-Key Audit

**Canonical XP/email prefixes:** `docs/next-wave/automation-ownership/xp-source-key-registry.json` (Agent 9) — this audit adds schema-level identity fields and collision analysis.

---

## Identity keys by domain

| Domain | Field / key | Format | Mutable after create? | Year-safe? | Collision risk | Evidence |
|--------|-------------|--------|----------------------|------------|----------------|----------|
| Enrollment | `Enrollment Key` (formula) | `{Athlete ID}\|{School Year}` | Changes if Athlete ID lookup or School Year changes | Yes (year in key) | Low if Athlete ID stable | `schema-snapshot` |
| Week (formula) | `Week Key` | `RECORD_ID()` | No (RID stable) | N/A | None | `schema-snapshot` |
| Week (display/seed) | `Week Name` primary text | e.g. `Week 0` … `Post-Challenge` | **Yes** if renamed | No year in name alone | Cross-year if used as sole key | ops pattern + architecture doc |
| Week (ops composite) | Config year + Week Name | `2026-2027\|Week 0` style | Depends on name | Yes if Config year included | Docs conflict — see note | architecture doc (`inferred` as seed/display, **not** Week Key formula) |
| WAS | `Summary Key` (formula) | `{Enrollment Key}\|{Week Key}` → e.g. `ATH-…\|2025-2026\|rec…` | If Enrollment Key changes | Yes | Race duplicates possible (no unique index) | overnight live shape + schema |
| WAS | `Weekly Summary Key` (formula) | Enrollment primary display \| Week primary display | **Yes** if names change | Weak | High if used for dedupe | `schema-snapshot` |
| Submission XP | `Source Key` | `SUBMISSION_XP\|{submissionId}` | No | RID-scoped | Low | registry + **010** |
| Homework XP | `Source Key` | `HOMEWORK_XP\|{hcId}` | No | RID-scoped | Legacy `HOMEWORK_COMPLETION\|` dual | registry + **065** |
| Zoom live XP | `Source Key` | `ZOOM_ATTEND_BASE\|{meetingId}\|{enrollmentId}` | No | RID-scoped | Bonus keys enrollment-only | registry + **101** |
| Zoom recording XP | `Source Key` | `ZOOM_CREDIT\|{enrollmentId}\|{meetingId}` | No | RID-scoped | **117 XOR 117c** | registry |
| Video XP | `Source Key` | `VIDEO_SUBMISSION\|{vfId}` | No | RID-scoped | If duplicate VF | registry + **114** |
| Streak XP | `Source Key` | `STREAK_XP\|{enr}\|{ach}\|{streakEndDate}` | Date format sensitive | Enrollment-scoped | Denver date required | registry + **054** |
| Shot milestone unlock | `Milestone Source Key` | `SHOT_MILESTONE\|{enr}\|{milestoneId}` | No | Enrollment-scoped | Low | registry + **066** |
| Perfect Week unlock | Source Key family | `PERFECT_WEEK\|{enr}\|{weekId}` | No | Enrollment+week | Low | registry + **058** |
| Unlock formula | `Unlock Key` | Enrollment\|Achievement\|WEEK:…\|optional SHOT/STREAK | Link display / dates | Partial | Different from Source Key — scripts must not write | `schema-snapshot` |
| HC identity | `Homework Completion Key` | ARRAYJOIN(Enrollment)\|ARRAYJOIN(Week)\|ARRAYJOIN(Homework) | **Yes** if primary labels change | Weak | Medium–High | `schema-snapshot` |
| VF identity | `Video Feedback Key` | `VIDEO_FEEDBACK\|{assetId}` | No | RID-scoped | **112** raw RID incompatible | registry |
| Weekly email event | Make `eventId` | `WEEKLY_EMAIL\|{enr}\|{week}` | No | Yes | Low | registry + **074** |
| Weekly threshold XP | — | **Missing writer in repo** | — | — | Gap | registry `WEEKLY_THRESHOLD_` |
| Manual bonus | — | Operator process | — | — | Blank Source Key risk | registry |

---

## Critical documentation correction

| Claim | Status |
|-------|--------|
| “Week Key formula = `2026-2027\|Week 0`” | **False** against `schema-snapshot`. `Week Key` = `RECORD_ID()`. |
| “`2026-2027\|Week 0` … Post-Challenge” | **Ops / Week Name + Config year pattern** documented in WAS architecture — useful for seeding, **not** the Week Key field. |
| “Weeks.Week End Key field” | **Absent** in PROD snapshot; 118/119 derive Saturday key from `End Date` Denver (`repo-script` + WAS-GUARANTEE). |
| “Weeks.Config - Lnk” | **Not present** in 2026-07-23 Weeks fields; Weeks link `Program Instance` instead. Architecture wording is outdated. |

---

## Failure modes to watch

1. **Keys from display names** — HC Completion Key, WAS Weekly Summary Key, Unlock Key segments using ARRAYJOIN of links.  
2. **Date format inconsistency** — Streak end date must be America/Denver `YYYY-MM-DD`.  
3. **Legacy prefixes** — `HOMEWORK_COMPLETION|`, `ZOOM_RECORDING|`, VF raw asset RID.  
4. **Missing challenge year** — Week Name alone (`Week 1`) collides across seasons if used without Program Instance / School Year.  
5. **Formula vs Source Key mismatch** — Scripts must dedupe on `Source Key` / Normalized per registry; do not invent writes to formula dedupe fields.  
6. **Enrollment Key mutability** — Changing School Year or re-linking Athlete reshapes Enrollment Key and thus Summary Key strings for existing WAS rows (links remain; string identity drifts).

---

## Recommended key usage (no schema change required)

| Use case | Use this | Do not use |
|----------|----------|------------|
| WAS find-or-create | Enrollment RID + Week RID links; optionally read `Summary Key` | `Weekly Summary Key` display formula |
| XP idempotency | `Source Key` text + registry format | Athlete name, Week Name |
| Week matching for schedules | Week RID + Denver End Date key | UTC date slice of End Date |
| Season scoping | Enrollment.`School Year` + Config.`Active School Year` + Program Instance | Hardcoded year in scripts |
