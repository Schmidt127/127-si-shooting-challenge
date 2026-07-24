# XP Idempotency Audit — Overnight Agent 1 (2026-07-24)

**Base:** PROD `appn84sqPw03zEbTT`  
**Related SC:** SC-007, SC-049, SC-070–SC-077, SC-124  
**Structured twin:** `xp-idempotency-audit.json`  
**Contracts mirror:** `airtable/automations/shooting-challenge/lib/v2-engine-contracts.js`

Honesty rule: amounts are documented as observed/config; this audit does **not** change XP economics.

---

## Summary

| Source | Automation | Source Key pattern | Post-reset PROD evidence | Rerun safety |
|--------|------------|--------------------|--------------------------|--------------|
| Submission Base | 010 | `SUBMISSION_XP\|{submissionId}` | PASS (3 events, 0 dup keys) | Safe (recheck-before-create) |
| Homework Completion | 065 | `HOMEWORK_XP\|{homeworkCompletionId}` | No HC rows post-reset | Code-safe; unproven live |
| Video Feedback | 114 | `VIDEO_SUBMISSION\|{videoFeedbackId}` | 1 legacy/linked video XP | Code-safe; steal-guard present |
| Zoom Attendance | 101 | `ZOOM_ATTEND_BASE\|{meetingId}\|{enrollmentId}` (+ bonuses) | Legacy only | Code-safe; unproven post-reset |
| Zoom Recording Credit | 117 / 117c | `ZOOM_CREDIT\|{enrollmentId}\|{meetingId}` | 1 post-reset event observed | Soft-void; exclusivity vs live |
| Streak | 054 | `STREAK_XP\|{enrollmentId}\|{achievementId}\|{streakEndDate}` | None post-reset | Code-safe; unproven live |
| Shot Milestone | 066 → 059 | Unlock `SHOT_MILESTONE\|{enr}\|{ms}`; XP via unlock Source Key | None post-reset | Unlock + XP both keyed |
| Perfect Week | 058 → 059 | `PERFECT_WEEK\|{enrollmentId}\|{weekId}` | None post-reset | Unlock + XP keyed |
| Weekly Threshold | **writer missing in repo** | Expected family `WEEKLY_THRESHOLD_*` (rules exist) | Schema fields on WAS; no script found | **BLOCKED / Decision Needed** |
| Manual Bonus | Manual / field | No `MANUAL_BONUS` rule; `Lifetime XP Manual Adjustments` on Enrollments | N/A | Manual process |

---

## 1. Submission Base

| Item | Value |
|------|-------|
| Source automation | `010-submission-intake-create-xp-event.js` |
| Source table / record | Submissions / submission RID |
| Source Key | `SUBMISSION_XP\|{submissionId}` |
| XP Dedupe Key | `{enrollmentId}\|{submissionId}\|{xpSource}` (+ normalized lowercase twin) |
| XP date source | Submission Activity Date (Denver) |
| Writer | 010 only (intended) |
| Duplicate prevention | Recheck Source Key / dedupe / submission link before create; refuse steal |
| Blank-key risk | Low — key built from recordId |
| Key-collision risk | Low — RID-scoped |
| Test coverage | Offline contracts; live inventory 2026-07-23 (0 blank, 0 dup Source Keys among active checks) |
| PROD evidence | `recOodD23MQrP1O9F` = `SUBMISSION_XP\|recuuTBgstSTGg2E3` (20 XP) |

## 2. Homework Completion

| Item | Value |
|------|-------|
| Source automation | `065-homework-review-and-xp-create-homework-xp-event.js` |
| Source table | Homework Completions |
| Source Key | `HOMEWORK_XP\|{homeworkCompletionId}` |
| Writer | 065 after satisfactory review |
| Duplicate prevention | Recheck-before-create by Source Key |
| PROD evidence | **0 Homework Completions** post-reset — not live-tested |
| Notes | Multiple Submission Assets may link one HC; XP still one-per-HC |

## 3. Video Feedback

| Item | Value |
|------|-------|
| Source automation | `114-video-review-and-xp-create-or-update-video-xp-event.js` |
| Source Key | `VIDEO_SUBMISSION\|{videoFeedbackId}` |
| Also checks | `XP Dedupe Key Normalized` must reference same VF RID |
| Steal guard | Refuses reuse if key owned by another VF |
| PROD evidence | `recYQ10pOoFlApmjZ` (`VIDEO_SUBMISSION\|reccXspFIiNIPMPcm`) |

## 4. Zoom Attendance (live)

| Item | Value |
|------|-------|
| Source automation | `101-zoom-attendance-xp-award-meeting-xp.js` |
| Source Key family | `ZOOM_ATTEND_BASE\|…`, `ZOOM_ATTEND_BONUS_2\|…`, `ZOOM_ATTEND_BONUS_3\|…` |
| Hard rule | Recording path must **never** write `Zoom Meetings.Attendees` |
| PROD evidence | Legacy season rows remain among orphan XP; no new Schmidt live attendance post-reset |

## 5. Zoom Recording Credit

| Item | Value |
|------|-------|
| Source automation | 117 orchestrator / 117c create |
| Source Key | `ZOOM_CREDIT\|{enrollmentId}\|{meetingId}` |
| Disjoint from | `ZOOM_ATTEND_BASE\|…` |
| PROD evidence | `recOceuW34jQz7suD` (`ZOOM_CREDIT\|recgP9qZYjAhE7NXm\|reczeUT0AJUWMmEOb`, 30 XP) |

## 6. Streak

| Item | Value |
|------|-------|
| Source automation | 054 (from Streak Occurrences ready) |
| Source Key | `STREAK_XP\|{enrollmentId}\|{achievementId}\|{streakEndDate}` |
| PROD evidence | None post-reset |

## 7. Shot Milestone

| Item | Value |
|------|-------|
| Unlock writer | 066 — `SHOT_MILESTONE\|{enrollmentId}\|{shotMilestoneId}` |
| XP writer | 059 from unlock |
| PROD evidence | Athlete Achievement Unlocks = 0 post-reset |

## 8. Perfect Week

| Item | Value |
|------|-------|
| Unlock writer | 058 — `PERFECT_WEEK\|{enrollmentId}\|{weekId}` |
| XP writer | 059 |
| PROD evidence | None post-reset |

## 9. Weekly Threshold — DEFECT / GAP

| Item | Value |
|------|-------|
| Config | 15 `WEEKLY_THRESHOLD_{100\|125\|150}_{band}` rules live in XP Reward Rules |
| WAS fields | `Threshold XP Ready?`, `Threshold XP Status`, `Requeue Threshold XP`, etc. |
| Repo writer | **No automation script in `airtable/automations/shooting-challenge/` references Threshold XP fields or creates WEEKLY_THRESHOLD Source Keys** |
| Impact | Threshold XP cannot be proven; may be missing automation, renamed, or deleted historically |
| Severity | **High** for SC-022/SC-049 completeness |
| Fix status | Documented only — do not invent a second writer overnight |
| Mike action | Confirm whether a Threshold XP automation still exists in Airtable UI; if deleted, schedule rebuild |

## 10. Manual Bonus

| Item | Value |
|------|-------|
| Pattern | `Lifetime XP Manual Adjustments` on Enrollments; XP Source select may include Manual Adjustment |
| Rule row | None (`MANUAL_BONUS` absent — confirmed by config-xp overnight audit) |
| Risk | Manual XP Events without Source Key discipline → blank-key risk if operators create freeform rows |

---

## Cross-cutting inventory (2026-07-23 probe, still authoritative)

| Check | Result |
|-------|--------|
| Blank Source Keys | 0 / 2,543 |
| Duplicate Source Keys | 0 |
| Duplicate XP Dedupe Key Normalized | 0 |
| Submissions with >1 XP Event | 0 |

Caveat: 2,538 XP Events are orphaned legacy rows (no Enrollment/Submission). Keys reference deleted RIDs and do not collide with new Schmidt keys, but they pollute views/scans.

---

## Safe code fixes applied tonight

None to XP amount/key formats. Verifier + scenario fixtures encode contracts for regression tests.

## Recommended next live proofs (Schmidt only)

1. Re-run 010 on `recuuTBgstSTGg2E3` (expect skip).
2. Homework satisfactory → 065 once HC exists.
3. Video path → 114 once VF exists.
4. Locate/restore Weekly Threshold writer before season XP completeness claims.
