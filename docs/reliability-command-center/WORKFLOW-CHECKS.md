# Workflow checks

**Status:** Built / Tested

Each checker emits `WorkflowIssue` objects with `code`, health, retry class, and recommended action.

## Enrollment

| Code | Detects |
|------|---------|
| `enrollment_missing_config` | Config link blank |
| `enrollment_missing_challenge_year` | Challenge Year blank |
| `enrollment_missing_grade_band` | Grade and Grade Band blank |
| `multiple_active_enrollments_same_athlete_year` | >1 Active enrollment same athlete+year |
| `inactive_enrollment_still_processing` | Active?=false but still in active workflows |
| `enrollment_missing_email` | Email required but Parent/Athlete email blank |
| `enrollment_conflicting_status` | Explicit conflicting status flag |
| `historical_enrollment_active_processing` | Prior year still processing as current |

## Submissions

| Code | Detects |
|------|---------|
| `submission_missing_enrollment` | No Enrollment |
| `submission_missing_activity_date` | No Activity Date |
| `submission_missing_week` | No Week |
| `submission_week_activity_date_mismatch` | Week bounds ≠ Activity Date |
| `duplicate_submission_source_key` | Shared Submission Source Key |
| `submission_processed_without_xp_event` | Processed/Awarded without XP Event |
| `submission_awaiting_assets_too_long` | Awaiting assets beyond threshold |
| `submission_invalid_source_key` | Malformed source key |

## XP Events

| Code | Detects |
|------|---------|
| `xp_missing_enrollment` / `xp_missing_source` / `xp_missing_amount` | Required XP fields |
| `xp_missing_source_record` | No source link and no Source Key |
| `xp_duplicate_source_key` / `xp_duplicate_dedupe_key` | Duplicate identity |
| `source_completed_without_xp_event` | Source completed, XP missing |
| `xp_historical_enrollment_year_mismatch` | Historical year XP on active enrollment |

## Homework

| Code | Detects |
|------|---------|
| `asset_ready_without_homework_completion` | Ready homework asset, no HC |
| `homework_completion_no_linked_source` | HC with no enrollment/homework/submission |
| `duplicate_homework_completion_same_asset_slot` | Dup enrollment+assignment+slot |
| `homework_awarded_without_xp` | Awarded HC without XP Event |
| `homework_xp_without_completion` | Homework XP orphan |
| `homework_multiple_assets_linked_incorrectly` | Unexpected multi-asset mapping |

## Zoom

| Code | Detects |
|------|---------|
| `zoom_attendance_without_meeting` / `_without_enrollment` | Missing links |
| `zoom_missing_source_date` | Required date blank |
| `zoom_meeting_wrong_week` | Meeting date outside linked week |
| `zoom_requirement_without_meeting` | Requirement applied with no meeting |
| `zoom_xp_awarded_twice` | Duplicate Zoom Source Key |

## Video Feedback

| Code | Detects |
|------|---------|
| `video_feedback_missing_activity_date` / `_grade_band` | Missing fields |
| `video_graded_without_feedback` | Graded status, blank feedback |
| `video_xp_without_valid_feedback_source` / `video_xp_marked_without_event` | XP integrity |
| `duplicate_video_feedback_xp` | Dup Source Key |

## Achievements (streak / milestone / Perfect Week)

| Code | Detects |
|------|---------|
| `duplicate_streak_unlock_key` | Dup streak unlock keys |
| `streak_unlock_without_xp` | Unlock awarded, XP missing |
| `invalid_streak_threshold` | Non-positive threshold |
| `duplicate_shot_milestone_unlock` | Dup milestone unlock |
| `milestone_wrong_grade_band` | Milestone band ≠ enrollment band |
| `perfect_week_unlock_without_eligibility` | Unlock without 057 eligibility |
| `perfect_week_eligible_without_unlock` | Eligible WAS without 058 unlock |
| `duplicate_perfect_week_xp` | Dup `PERFECT_WEEK|…` XP |
| `achievement_xp_without_unlock` | Orphan achievement XP |

## Levels

| Code | Detects |
|------|---------|
| `level_recalc_flag_stuck` | Recalc flag stale |
| `current_equals_next` | Current Level = Next Level |
| `gate_blocked_not_rolled_back` | Gate blocked without rollback |
| `level_exceeds_xp` | Level min XP > lifetime XP |
| `missing_level_rule` / `missing_gate_rule` | Config gaps |
| `level_status_inconsistent_with_gate` | Status ≠ gate result |

## Weekly Athlete Summary

| Code | Detects |
|------|---------|
| `duplicate_was_enrollment_week` | Dup Enrollment+Week |
| `was_missing_enrollment` / `was_missing_week` | Missing links |
| `was_wrong_config_year` | Config year ≠ enrollment year |
| `was_build_flag_stuck` / `was_calculation_status_stuck` | Stale processing |
| `was_missing_expected_totals` | Expected totals absent |
| `historical_was_processed_as_current` | Historical WAS armed |
| `email_ready_missing_required_fields` | Ready without subject/recipients/HTML |

## Weekly email / Make handoff / writeback

| Code | Detects |
|------|---------|
| `ready_subject_blank` / `ready_recipients_blank` / `ready_html_blank` | Ready package incomplete |
| `send_armed_not_ready` | Send to Make? while not Ready |
| `sent_checkbox_make_status_mismatch` | Sent? but Make status ≠ Sent |
| `make_sent_checkbox_blank` | Make Sent without Sent? checkbox |
| `sent_timestamp_blank` | Sent? without timestamp |
| `sent_still_armed` / `sent_build_armed` | Sent but still armed |
| `live_forced_test_handoff` | Armed with sendMode=Test |
| `production_parent_test_send_mode` | Production parent on Test |
| `already_sent_eligible_to_resend` | Resend eligibility on sent record |
| `handoff_writeback_missing` | Handoff without final writeback |
| `email_package_wrong_week` | Package week ≠ expected week |
