# Reliability Command Center — Audit Report

Generated: 2026-07-25T19:10:04.389Z
Source: `/workspace/tests/reliability-command-center/fixtures/mixed-health.json`

## Summary

| Metric | Count |
|--------|------:|
| Total findings | 79 |
| P0 | 53 |
| P1 | 25 |
| P2 | 0 |
| P3 | 1 |

## By workflow

- **Submission Base XP**: 10
- **Weekly Athlete Summary**: 9
- **Enrollment intake**: 8
- **Weekly email build**: 7
- **Perfect Week**: 6
- **Submission intake**: 5
- **Zoom attendance**: 5
- **Homework Completion**: 4
- **Airtable-to-Make handoff**: 3
- **Make-to-Airtable sent-status writeback**: 3
- **Streak achievements**: 3
- **Video Feedback**: 3
- **Homework XP**: 2
- **Level assignment**: 2
- **Streak XP**: 2
- **Zoom XP**: 2
- **Level gates**: 1
- **Shot milestones**: 1
- **Level recalculation**: 1
- **Submission Assets**: 1
- **Video Feedback XP**: 1

## P0 findings

### live_forced_test_handoff

- [P0] Airtable-to-Make handoff Test Only (rec00000000000053) — Set 074 sendMode=Live (or blank + WAS Live). Fixed Test blocks Live writeback.
- Health: Test Only
- Retry: production_action_prohibited_without_verification
- Action: Set 074 sendMode=Live (or blank + WAS Live). Fixed Test blocks Live writeback.
- Owning automation: 074
- Evidence: Ready=true; Sent=false; SendToMake=true; MakeStatus=; sendMode=test

### production_parent_test_send_mode

- [P0] Airtable-to-Make handoff Test Only (rec00000000000053) — PROD parents must use sendMode=Live (074 input Live or WAS Live). Test mode skips Sent? writeback.
- Health: Test Only
- Retry: production_action_prohibited_without_verification
- Action: PROD parents must use sendMode=Live (074 input Live or WAS Live). Test mode skips Sent? writeback.
- Owning automation: 074

### sent_still_armed

- [P0] Airtable-to-Make handoff Duplicate Risk (rec00000000000054) — Clear Send/Build arms on already-sent WAS; never resend without verification.
- Health: Duplicate Risk
- Retry: never_retry_already_completed
- Action: Clear Send/Build arms on already-sent WAS; never resend without verification.
- Owning automation: 074
- Evidence: Ready=true; Sent=true; SendToMake=true; MakeStatus=Queued; sendMode=live

### multiple_active_enrollments_same_athlete_year

- [P0] Enrollment intake Duplicate Risk (rec00000000000013) — Keep one Active enrollment per athlete+challenge year; deactivate extras.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep one Active enrollment per athlete+challenge year; deactivate extras.
- Owning automation: 001/002/003
- Evidence: key=rec00000000000014|2026-2027; count=2

### multiple_active_enrollments_same_athlete_year

- [P0] Enrollment intake Duplicate Risk (rec00000000000015) — Keep one Active enrollment per athlete+challenge year; deactivate extras.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep one Active enrollment per athlete+challenge year; deactivate extras.
- Owning automation: 001/002/003
- Evidence: key=rec00000000000014|2026-2027; count=2

### inactive_enrollment_still_processing

- [P0] Enrollment intake Blocking Error (rec00000000000016) — Clear Active? workflow queues or set Active?=true only if intentionally testing (Schmidt).
- Health: Blocking Error
- Retry: manual_review_required
- Action: Clear Active? workflow queues or set Active?=true only if intentionally testing (Schmidt).
- Owning automation: 001/002/003
- Evidence: Active?=false; receiving active workflow processing

### duplicate_homework_completion_same_asset_slot

- [P0] Homework Completion Duplicate Risk (rec00000000000039) — Keep one HC per enrollment+assignment+slot; merge/deactivate extras.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep one HC per enrollment+assignment+slot; merge/deactivate extras.
- Owning automation: 020/067
- Evidence: key=rec00000000000013|rec00000000000040|HW1; count=2

### duplicate_homework_completion_same_asset_slot

- [P0] Homework Completion Duplicate Risk (rec00000000000041) — Keep one HC per enrollment+assignment+slot; merge/deactivate extras.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep one HC per enrollment+assignment+slot; merge/deactivate extras.
- Owning automation: 020/067
- Evidence: key=rec00000000000013|rec00000000000040|HW1; count=2

### homework_xp_without_completion

- [P0] Homework XP Blocking Error (rec00000000000031) — Link XP Event to Homework Completion or deactivate orphan XP.
- Health: Blocking Error
- Retry: retryable_after_correcting_data
- Action: Link XP Event to Homework Completion or deactivate orphan XP.
- Owning automation: 064/065

### level_exceeds_xp

- [P0] Level assignment Blocking Error (rec00000000000018) — Current Level minimum XP exceeds earned Lifetime XP — run 042 after data fix if safe.
- Health: Blocking Error
- Retry: retryable_after_correcting_data
- Action: Current Level minimum XP exceeds earned Lifetime XP — run 042 after data fix if safe.
- Owning automation: 042

### gate_blocked_not_rolled_back

- [P0] Level gates Blocking Error (rec00000000000018) — Gate blocked but level not rolled back correctly — run 042 after data fix if safe.
- Health: Blocking Error
- Retry: retryable_after_correcting_data
- Action: Gate blocked but level not rolled back correctly — run 042 after data fix if safe.
- Owning automation: 042

### sent_checkbox_make_status_mismatch

- [P0] Make-to-Airtable sent-status writeback Blocking Error (rec00000000000054) — Verify Make scenario is Live (not Test). Confirm writeback of Sent?/status/timestamp. Do not clear Sent? from 074.
- Health: Blocking Error
- Retry: never_retry_already_completed
- Action: Verify Make scenario is Live (not Test). Confirm writeback of Sent?/status/timestamp. Do not clear Sent? from 074.
- Owning automation: Make Bulk Email May 18 (Live branch)
- Evidence: Ready=true; Sent=true; SendToMake=true; MakeStatus=Queued; sendMode=live

### make_sent_checkbox_blank

- [P0] Make-to-Airtable sent-status writeback Blocking Error (rec00000000000055) — Verify Make scenario is Live (not Test). Confirm writeback of Sent?/status/timestamp. Do not clear Sent? from 074.
- Health: Blocking Error
- Retry: manual_review_required
- Action: Verify Make scenario is Live (not Test). Confirm writeback of Sent?/status/timestamp. Do not clear Sent? from 074.
- Owning automation: Make Bulk Email May 18 (Live branch)
- Evidence: Ready=true; Sent=false; SendToMake=false; MakeStatus=Sent; sendMode=live

### duplicate_perfect_week_xp

- [P0] Perfect Week Duplicate Risk (rec00000000000036) — Deactivate duplicate Perfect Week XP for same Source Key.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Deactivate duplicate Perfect Week XP for same Source Key.
- Owning automation: 059

### achievement_xp_without_unlock

- [P0] Perfect Week Blocking Error (rec00000000000036) — Link XP to unlock or deactivate orphan achievement XP.
- Health: Blocking Error
- Retry: retryable_after_correcting_data
- Action: Link XP to unlock or deactivate orphan achievement XP.
- Owning automation: 059

### duplicate_perfect_week_xp

- [P0] Perfect Week Duplicate Risk (rec00000000000037) — Deactivate duplicate Perfect Week XP for same Source Key.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Deactivate duplicate Perfect Week XP for same Source Key.
- Owning automation: 059

### achievement_xp_without_unlock

- [P0] Perfect Week Blocking Error (rec00000000000037) — Link XP to unlock or deactivate orphan achievement XP.
- Health: Blocking Error
- Retry: retryable_after_correcting_data
- Action: Link XP to unlock or deactivate orphan achievement XP.
- Owning automation: 059

### perfect_week_unlock_without_eligibility

- [P0] Perfect Week Blocking Error (rec00000000000049) — Do not keep Perfect Week unlock without 057 eligibility.
- Health: Blocking Error
- Retry: retryable_after_correcting_data
- Action: Do not keep Perfect Week unlock without 057 eligibility.
- Owning automation: 057/058

### milestone_wrong_grade_band

- [P0] Shot milestones Blocking Error (rec00000000000048) — Detach milestone unlock from wrong grade band; re-run 066 if needed.
- Health: Blocking Error
- Retry: retryable_after_correcting_data
- Action: Detach milestone unlock from wrong grade band; re-run 066 if needed.
- Owning automation: 066
- Evidence: enrollmentBand=3-5; milestoneBand=9-12

### duplicate_streak_unlock_key

- [P0] Streak achievements Duplicate Risk (rec00000000000046) — Keep one streak unlock per key; deactivate extras before any XP retry.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep one streak unlock per key; deactivate extras before any XP retry.
- Owning automation: 053/054/055/056

### invalid_streak_threshold

- [P0] Streak achievements Blocking Error (rec00000000000046) — Fix streak threshold to a positive integer from config rules.
- Health: Blocking Error
- Retry: retryable_after_correcting_data
- Action: Fix streak threshold to a positive integer from config rules.
- Owning automation: 053/054/055/056

### duplicate_streak_unlock_key

- [P0] Streak achievements Duplicate Risk (rec00000000000047) — Keep one streak unlock per key; deactivate extras before any XP retry.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep one streak unlock per key; deactivate extras before any XP retry.
- Owning automation: 053/054/055/056

### achievement_xp_without_unlock

- [P0] Streak XP Blocking Error (rec00000000000035) — Link XP to unlock or deactivate orphan achievement XP.
- Health: Blocking Error
- Retry: retryable_after_correcting_data
- Action: Link XP to unlock or deactivate orphan achievement XP.
- Owning automation: 059

### submission_processed_without_xp_event

- [P0] Submission Base XP Blocking Error (rec00000000000028) — Investigate 010 — processed status without XP Event; create only if Source Key absent.
- Health: Blocking Error
- Retry: retryable_after_correcting_data
- Action: Investigate 010 — processed status without XP Event; create only if Source Key absent.
- Owning automation: 010
- Evidence: XP Award Status=Awarded

### xp_duplicate_source_key

- [P0] Submission Base XP Duplicate Risk (rec00000000000029) — Keep one Active XP Event per Source Key; deactivate extras (never double-award).
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep one Active XP Event per Source Key; deactivate extras (never double-award).
- Owning automation: 010
- Evidence: count=2

### xp_duplicate_dedupe_key

- [P0] Submission Base XP Duplicate Risk (rec00000000000029) — Resolve duplicate XP Dedupe Key; keep single Active event.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Resolve duplicate XP Dedupe Key; keep single Active event.
- Evidence: count=2

### xp_duplicate_source_key

- [P0] Submission Base XP Duplicate Risk (rec00000000000030) — Keep one Active XP Event per Source Key; deactivate extras (never double-award).
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep one Active XP Event per Source Key; deactivate extras (never double-award).
- Owning automation: 010
- Evidence: count=2

### xp_duplicate_dedupe_key

- [P0] Submission Base XP Duplicate Risk (rec00000000000030) — Resolve duplicate XP Dedupe Key; keep single Active event.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Resolve duplicate XP Dedupe Key; keep single Active event.
- Evidence: count=2

### xp_duplicate_source_key

- [P0] Submission Base XP Duplicate Risk (rec00000000000032) — Keep one Active XP Event per Source Key; deactivate extras (never double-award).
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep one Active XP Event per Source Key; deactivate extras (never double-award).
- Owning automation: 010
- Evidence: count=2

### xp_duplicate_source_key

- [P0] Submission Base XP Duplicate Risk (rec00000000000034) — Keep one Active XP Event per Source Key; deactivate extras (never double-award).
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep one Active XP Event per Source Key; deactivate extras (never double-award).
- Owning automation: 010
- Evidence: count=2

### xp_duplicate_source_key

- [P0] Submission Base XP Duplicate Risk (rec00000000000036) — Keep one Active XP Event per Source Key; deactivate extras (never double-award).
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep one Active XP Event per Source Key; deactivate extras (never double-award).
- Owning automation: 010
- Evidence: count=2

### xp_duplicate_source_key

- [P0] Submission Base XP Duplicate Risk (rec00000000000037) — Keep one Active XP Event per Source Key; deactivate extras (never double-award).
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep one Active XP Event per Source Key; deactivate extras (never double-award).
- Owning automation: 010
- Evidence: count=2

### submission_week_activity_date_mismatch

- [P0] Submission intake Blocking Error (rec00000000000024) — Re-run 005 or relink Week so it matches Activity Date.
- Health: Blocking Error
- Retry: retryable_after_correcting_data
- Action: Re-run 005 or relink Week so it matches Activity Date.
- Owning automation: 005
- Evidence: activity=2026-07-15; week=2026-07-20..2026-07-26; backdated=false

### duplicate_submission_source_key

- [P0] Submission intake Duplicate Risk (rec00000000000025) — Keep one counted submission per Source Key; mark extras Duplicate - Remove.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep one counted submission per Source Key; mark extras Duplicate - Remove.
- Owning automation: 007
- Evidence: count=2

### duplicate_submission_source_key

- [P0] Submission intake Duplicate Risk (rec00000000000026) — Keep one counted submission per Source Key; mark extras Duplicate - Remove.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep one counted submission per Source Key; mark extras Duplicate - Remove.
- Owning automation: 007
- Evidence: count=2

### video_graded_without_feedback

- [P0] Video Feedback Blocking Error (rec00000000000043) — Add coach feedback text before treating as graded.
- Health: Blocking Error
- Retry: retryable_after_correcting_data
- Action: Add coach feedback text before treating as graded.
- Owning automation: 013

### duplicate_was_enrollment_week

- [P0] Weekly Athlete Summary Duplicate Risk (rec00000000000050) — Keep lowest-id WAS for Enrollment+Week; stop creators from inserting extras.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep lowest-id WAS for Enrollment+Week; stop creators from inserting extras.
- Owning automation: 031/118
- Evidence: key=rec00000000000013|rec00000000000007; count=4

### duplicate_was_enrollment_week

- [P0] Weekly Athlete Summary Duplicate Risk (rec00000000000051) — Keep lowest-id WAS for Enrollment+Week; stop creators from inserting extras.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep lowest-id WAS for Enrollment+Week; stop creators from inserting extras.
- Owning automation: 031/118
- Evidence: key=rec00000000000013|rec00000000000022; count=3

### duplicate_was_enrollment_week

- [P0] Weekly Athlete Summary Duplicate Risk (rec00000000000052) — Keep lowest-id WAS for Enrollment+Week; stop creators from inserting extras.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep lowest-id WAS for Enrollment+Week; stop creators from inserting extras.
- Owning automation: 031/118
- Evidence: key=rec00000000000013|rec00000000000022; count=3

### duplicate_was_enrollment_week

- [P0] Weekly Athlete Summary Duplicate Risk (rec00000000000053) — Keep lowest-id WAS for Enrollment+Week; stop creators from inserting extras.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep lowest-id WAS for Enrollment+Week; stop creators from inserting extras.
- Owning automation: 031/118
- Evidence: key=rec00000000000013|rec00000000000007; count=4

### duplicate_was_enrollment_week

- [P0] Weekly Athlete Summary Duplicate Risk (rec00000000000054) — Keep lowest-id WAS for Enrollment+Week; stop creators from inserting extras.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep lowest-id WAS for Enrollment+Week; stop creators from inserting extras.
- Owning automation: 031/118
- Evidence: key=rec00000000000013|rec00000000000007; count=4

### duplicate_was_enrollment_week

- [P0] Weekly Athlete Summary Duplicate Risk (rec00000000000055) — Keep lowest-id WAS for Enrollment+Week; stop creators from inserting extras.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep lowest-id WAS for Enrollment+Week; stop creators from inserting extras.
- Owning automation: 031/118
- Evidence: key=rec00000000000013|rec00000000000022; count=3

### was_wrong_config_year

- [P0] Weekly Athlete Summary Blocking Error (rec00000000000056) — Relink WAS/Config to enrollment challenge year.
- Health: Blocking Error
- Retry: retryable_after_correcting_data
- Action: Relink WAS/Config to enrollment challenge year.
- Evidence: configYear=2024-2025; enrollmentYear=2025-2026

### duplicate_was_enrollment_week

- [P0] Weekly Athlete Summary Duplicate Risk (rec00000000000070) — Keep lowest-id WAS for Enrollment+Week; stop creators from inserting extras.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep lowest-id WAS for Enrollment+Week; stop creators from inserting extras.
- Owning automation: 031/118
- Evidence: key=rec00000000000013|rec00000000000007; count=4

### email_ready_missing_required_fields

- [P0] Weekly email build Blocking Error (rec00000000000053) — Rebuild package with 072 or clear Ready? until fields present.
- Health: Blocking Error
- Retry: retryable_after_correcting_data
- Action: Rebuild package with 072 or clear Ready? until fields present.
- Owning automation: 072

### ready_subject_blank

- [P0] Weekly email build Blocking Error (rec00000000000053) — Fix package fields via 072; do not arm Send until Ready package is valid.
- Health: Blocking Error
- Retry: production_action_prohibited_without_verification
- Action: Fix package fields via 072; do not arm Send until Ready package is valid.
- Owning automation: 072
- Evidence: Ready=true; Sent=false; SendToMake=true; MakeStatus=; sendMode=test

### ready_recipients_blank

- [P0] Weekly email build Blocking Error (rec00000000000053) — Fix package fields via 072; do not arm Send until Ready package is valid.
- Health: Blocking Error
- Retry: production_action_prohibited_without_verification
- Action: Fix package fields via 072; do not arm Send until Ready package is valid.
- Owning automation: 072
- Evidence: Ready=true; Sent=false; SendToMake=true; MakeStatus=; sendMode=test

### ready_html_blank

- [P0] Weekly email build Blocking Error (rec00000000000053) — Fix package fields via 072; do not arm Send until Ready package is valid.
- Health: Blocking Error
- Retry: production_action_prohibited_without_verification
- Action: Fix package fields via 072; do not arm Send until Ready package is valid.
- Owning automation: 072
- Evidence: Ready=true; Sent=false; SendToMake=true; MakeStatus=; sendMode=test

### email_package_wrong_week

- [P0] Weekly email build Blocking Error (rec00000000000055) — Stop send; rebuild package for the intended Week record.
- Health: Blocking Error
- Retry: retryable_after_correcting_data
- Action: Stop send; rebuild package for the intended Week record.
- Owning automation: 072
- Evidence: wasWeek=rec00000000000022; expectedWeek=rec00000000000007

### zoom_requirement_without_meeting

- [P0] Zoom attendance Blocking Error (rec00000000000033) — Do not apply Zoom requirement/credit when no meeting exists for the week.
- Health: Blocking Error
- Retry: manual_review_required
- Action: Do not apply Zoom requirement/credit when no meeting exists for the week.
- Owning automation: 101/057/042

### zoom_meeting_wrong_week

- [P0] Zoom attendance Blocking Error (rec00000000000045) — Relink Week so scheduled meeting date falls inside week bounds.
- Health: Blocking Error
- Retry: retryable_after_correcting_data
- Action: Relink Week so scheduled meeting date falls inside week bounds.
- Owning automation: 117
- Evidence: meetingDate=2026-07-15; week=2026-07-20..2026-07-26

### zoom_xp_awarded_twice

- [P0] Zoom XP Duplicate Risk (rec00000000000032) — Deactivate duplicate Zoom XP; never write Zoom Meetings.Attendees from recording path.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Deactivate duplicate Zoom XP; never write Zoom Meetings.Attendees from recording path.
- Owning automation: 101/057/042
- Evidence: count=2

### zoom_xp_awarded_twice

- [P0] Zoom XP Duplicate Risk (rec00000000000034) — Deactivate duplicate Zoom XP; never write Zoom Meetings.Attendees from recording path.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Deactivate duplicate Zoom XP; never write Zoom Meetings.Attendees from recording path.
- Owning automation: 101/057/042
- Evidence: count=2

## P1 findings

### enrollment_missing_config

- [P1] Enrollment intake Missing Dependency (rec00000000000011) — Link Enrollment to Config before processing workflows.
- Health: Missing Dependency
- Retry: retryable_after_correcting_data
- Action: Link Enrollment to Config before processing workflows.
- Owning automation: 001/002/003
- Evidence: Config link blank

### enrollment_missing_challenge_year

- [P1] Enrollment intake Missing Dependency (rec00000000000011) — Set Challenge Year (or inherit from Config).
- Health: Missing Dependency
- Retry: retryable_after_correcting_data
- Action: Set Challenge Year (or inherit from Config).
- Owning automation: 001/002/003

### enrollment_missing_grade_band

- [P1] Enrollment intake Missing Dependency (rec00000000000011) — Run 002/003 grade-band assignment or set Grade/Grade Band.
- Health: Missing Dependency
- Retry: retryable_after_correcting_data
- Action: Run 002/003 grade-band assignment or set Grade/Grade Band.
- Owning automation: 001/002/003

### enrollment_missing_email

- [P1] Enrollment intake Missing Dependency (rec00000000000011) — Add Parent Email or Athlete Email before email workflows.
- Health: Missing Dependency
- Retry: retryable_after_correcting_data
- Action: Add Parent Email or Athlete Email before email workflows.
- Owning automation: 001/002/003

### historical_enrollment_active_processing

- [P1] Enrollment intake Historical (rec00000000000018) — Stop active processing on historical challenge-year enrollment; isolate by year.
- Health: Historical
- Retry: production_action_prohibited_without_verification
- Action: Stop active processing on historical challenge-year enrollment; isolate by year.
- Owning automation: 001/002/003
- Evidence: year=2025-2026; current=2026-2027

### asset_ready_without_homework_completion

- [P1] Homework Completion Missing Dependency (rec00000000000038) — Run 020/067 to link or create Homework Completion.
- Health: Missing Dependency
- Retry: retryable_after_correcting_data
- Action: Run 020/067 to link or create Homework Completion.
- Owning automation: 020/067

### homework_completion_no_linked_source

- [P1] Homework Completion Missing Dependency (rec00000000000042) — Link Enrollment + Homework Assignment (and Submission when file path).
- Health: Missing Dependency
- Retry: retryable_after_correcting_data
- Action: Link Enrollment + Homework Assignment (and Submission when file path).
- Owning automation: 020/067

### homework_awarded_without_xp

- [P1] Homework XP Retryable Error (rec00000000000039) — Retry 065 only after confirming Source Key HW|… does not already exist.
- Health: Retryable Error
- Retry: automatically_retryable
- Action: Retry 065 only after confirming Source Key HW|… does not already exist.
- Owning automation: 064/065

### current_equals_next

- [P1] Level assignment Needs Manual Review (rec00000000000018) — Current Level and Next Level point to the same level — run 042 after data fix if safe.
- Health: Needs Manual Review
- Retry: retryable_after_correcting_data
- Action: Current Level and Next Level point to the same level — run 042 after data fix if safe.
- Owning automation: 042

### level_recalc_flag_stuck

- [P1] Level recalculation Stale (rec00000000000018) — Re-trigger 041→042 after confirming gate/level rules exist.
- Health: Stale
- Retry: automatically_retryable
- Action: Re-trigger 041→042 after confirming gate/level rules exist.
- Owning automation: 041
- Evidence: exceeded_threshold; ageHours=564

### sent_timestamp_blank

- [P1] Make-to-Airtable sent-status writeback Blocking Error (rec00000000000054) — Verify Make scenario is Live (not Test). Confirm writeback of Sent?/status/timestamp. Do not clear Sent? from 074.
- Health: Blocking Error
- Retry: never_retry_already_completed
- Action: Verify Make scenario is Live (not Test). Confirm writeback of Sent?/status/timestamp. Do not clear Sent? from 074.
- Owning automation: Make Bulk Email May 18 (Live branch)
- Evidence: Ready=true; Sent=true; SendToMake=true; MakeStatus=Queued; sendMode=live

### perfect_week_eligible_without_unlock

- [P1] Perfect Week Retryable Error (rec00000000000070) — Run 058 to create Perfect Week unlock (after eligibility confirmed).
- Health: Retryable Error
- Retry: automatically_retryable
- Action: Run 058 to create Perfect Week unlock (after eligibility confirmed).
- Owning automation: 057/058

### streak_unlock_without_xp

- [P1] Streak XP Retryable Error (rec00000000000046) — Retry 059 only after Source Key uniqueness check.
- Health: Retryable Error
- Retry: automatically_retryable
- Action: Retry 059 only after Source Key uniqueness check.
- Owning automation: 053/054/055/056

### submission_awaiting_assets_too_long

- [P1] Submission Assets Stale (rec00000000000027) — Check 009/070b asset pipeline; clear stuck upload errors or re-queue assets.
- Health: Stale
- Retry: automatically_retryable
- Action: Check 009/070b asset pipeline; clear stuck upload errors or re-queue assets.
- Owning automation: 009
- Evidence: ageHours=252; exceeded_threshold

### source_completed_without_xp_event

- [P1] Submission Base XP Retryable Error (rec00000000000028) — Safe retry of 010 only after confirming Source Key does not already exist.
- Health: Retryable Error
- Retry: automatically_retryable
- Action: Safe retry of 010 only after confirming Source Key does not already exist.
- Owning automation: 010

### submission_missing_enrollment

- [P1] Submission intake Missing Dependency (rec00000000000023) — Link Enrollment (023 / intake) before XP and assets.
- Health: Missing Dependency
- Retry: retryable_after_correcting_data
- Action: Link Enrollment (023 / intake) before XP and assets.
- Owning automation: 023

### submission_missing_week

- [P1] Submission intake Missing Dependency (rec00000000000023) — Run 005 week assignment (or fix Activity Date boundaries).
- Health: Missing Dependency
- Retry: retryable_after_correcting_data
- Action: Run 005 week assignment (or fix Activity Date boundaries).
- Owning automation: 005

### video_feedback_missing_activity_date

- [P1] Video Feedback Missing Dependency (rec00000000000043) — Set Activity Date on Video Feedback.
- Health: Missing Dependency
- Retry: retryable_after_correcting_data
- Action: Set Activity Date on Video Feedback.
- Owning automation: 013

### video_feedback_missing_grade_band

- [P1] Video Feedback Missing Dependency (rec00000000000043) — Copy Enrollment Grade Band (063/111 pattern) onto Video Feedback.
- Health: Missing Dependency
- Retry: retryable_after_correcting_data
- Action: Copy Enrollment Grade Band (063/111 pattern) onto Video Feedback.
- Owning automation: 013

### video_xp_marked_without_event

- [P1] Video Feedback XP Retryable Error (rec00000000000043) — Retry 114 only after Source Key check; require valid feedback source.
- Health: Retryable Error
- Retry: retryable_after_correcting_data
- Action: Retry 114 only after Source Key check; require valid feedback source.
- Owning automation: 114

### was_build_flag_stuck

- [P1] Weekly email build Stale (rec00000000000053) — Re-run 072 or clear Build Weekly Email Now? after diagnosing error.
- Health: Stale
- Retry: automatically_retryable
- Action: Re-run 072 or clear Build Weekly Email Now? after diagnosing error.
- Owning automation: 072

### was_build_flag_stuck

- [P1] Weekly email build Stale (rec00000000000056) — Re-run 072 or clear Build Weekly Email Now? after diagnosing error.
- Health: Stale
- Retry: automatically_retryable
- Action: Re-run 072 or clear Build Weekly Email Now? after diagnosing error.
- Owning automation: 072

### zoom_attendance_without_meeting

- [P1] Zoom attendance Missing Dependency (rec00000000000033) — Link Zoom Meeting; do not invent attendance without a meeting.
- Health: Missing Dependency
- Retry: retryable_after_correcting_data
- Action: Link Zoom Meeting; do not invent attendance without a meeting.
- Owning automation: 117

### zoom_attendance_without_enrollment

- [P1] Zoom attendance Missing Dependency (rec00000000000033) — Link Enrollment on Zoom Attendance.
- Health: Missing Dependency
- Retry: retryable_after_correcting_data
- Action: Link Enrollment on Zoom Attendance.
- Owning automation: 117

### zoom_missing_source_date

- [P1] Zoom attendance Missing Dependency (rec00000000000033) — Set Zoom source/attendance date for week mapping and XP.
- Health: Missing Dependency
- Retry: retryable_after_correcting_data
- Action: Set Zoom source/attendance date for week mapping and XP.
- Owning automation: 117

## P3 findings

### historical_was_processed_as_current

- [P3] Weekly Athlete Summary Historical (rec00000000000056) — Clear build/send arms on historical-year WAS.
- Health: Historical
- Retry: production_action_prohibited_without_verification
- Action: Clear build/send arms on historical-year WAS.
- Owning automation: 072

## Affected record IDs

- `rec00000000000011`
- `rec00000000000013`
- `rec00000000000015`
- `rec00000000000016`
- `rec00000000000018`
- `rec00000000000023`
- `rec00000000000024`
- `rec00000000000025`
- `rec00000000000026`
- `rec00000000000027`
- `rec00000000000028`
- `rec00000000000029`
- `rec00000000000030`
- `rec00000000000031`
- `rec00000000000032`
- `rec00000000000033`
- `rec00000000000034`
- `rec00000000000035`
- `rec00000000000036`
- `rec00000000000037`
- `rec00000000000038`
- `rec00000000000039`
- `rec00000000000041`
- `rec00000000000042`
- `rec00000000000043`
- `rec00000000000045`
- `rec00000000000046`
- `rec00000000000047`
- `rec00000000000048`
- `rec00000000000049`
- `rec00000000000050`
- `rec00000000000051`
- `rec00000000000052`
- `rec00000000000053`
- `rec00000000000054`
- `rec00000000000055`
- `rec00000000000056`
- `rec00000000000070`

---

_Repository audit only. Does not modify Airtable. Interface installation is separate._
