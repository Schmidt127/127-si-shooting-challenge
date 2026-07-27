# Reliability Command Center — Audit Report

Generated: 2026-07-25T19:10:04.423Z
Source: `/workspace/tests/reliability-command-center/fixtures/weekly-email-writeback.json`

## Summary

| Metric | Count |
|--------|------:|
| Total findings | 6 |
| P0 | 6 |
| P1 | 0 |
| P2 | 0 |
| P3 | 0 |

## By workflow

- **Airtable-to-Make handoff**: 3
- **Weekly Athlete Summary**: 2
- **Weekly email build**: 1

## P0 findings

### live_forced_test_handoff

- [P0] Airtable-to-Make handoff Test Only (rec00000000000060) — Set 074 sendMode=Live (or blank + WAS Live). Fixed Test blocks Live writeback.
- Health: Test Only
- Retry: production_action_prohibited_without_verification
- Action: Set 074 sendMode=Live (or blank + WAS Live). Fixed Test blocks Live writeback.
- Owning automation: 074
- Evidence: Ready=true; Sent=false; SendToMake=true; MakeStatus=; sendMode=test

### production_parent_test_send_mode

- [P0] Airtable-to-Make handoff Test Only (rec00000000000060) — PROD parents must use sendMode=Live (074 input Live or WAS Live). Test mode skips Sent? writeback.
- Health: Test Only
- Retry: production_action_prohibited_without_verification
- Action: PROD parents must use sendMode=Live (074 input Live or WAS Live). Test mode skips Sent? writeback.
- Owning automation: 074

### already_sent_eligible_to_resend

- [P0] Airtable-to-Make handoff Duplicate Risk (rec00000000000061) — Do not resend — Weekly Email Sent? is checked. Clear any accidental resend eligibility.
- Health: Duplicate Risk
- Retry: never_retry_already_completed
- Action: Do not resend — Weekly Email Sent? is checked. Clear any accidental resend eligibility.
- Owning automation: 074

### duplicate_was_enrollment_week

- [P0] Weekly Athlete Summary Duplicate Risk (rec00000000000060) — Keep lowest-id WAS for Enrollment+Week; stop creators from inserting extras.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep lowest-id WAS for Enrollment+Week; stop creators from inserting extras.
- Owning automation: 031/118
- Evidence: key=rec00000000000058|rec00000000000057; count=2

### duplicate_was_enrollment_week

- [P0] Weekly Athlete Summary Duplicate Risk (rec00000000000061) — Keep lowest-id WAS for Enrollment+Week; stop creators from inserting extras.
- Health: Duplicate Risk
- Retry: possible_duplicate_risk
- Action: Keep lowest-id WAS for Enrollment+Week; stop creators from inserting extras.
- Owning automation: 031/118
- Evidence: key=rec00000000000058|rec00000000000057; count=2

### email_package_wrong_week

- [P0] Weekly email build Blocking Error (rec00000000000062) — Stop send; rebuild package for the intended Week record.
- Health: Blocking Error
- Retry: retryable_after_correcting_data
- Action: Stop send; rebuild package for the intended Week record.
- Owning automation: 072
- Evidence: wasWeek=rec00000000000063; expectedWeek=rec00000000000057

## Affected record IDs

- `rec00000000000060`
- `rec00000000000061`
- `rec00000000000062`

---

_Repository audit only. Does not modify Airtable. Interface installation is separate._
