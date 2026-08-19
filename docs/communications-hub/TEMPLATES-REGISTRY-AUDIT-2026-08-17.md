# Communications Hub Templates registry audit — 2026-08-17

**Hub base:** `appYG1t5DBRimHBCT` (`127SI - COMMUNICATIONS HUB`)  
**Table:** `Templates` (`tblTztep867mryDHk`)  
**Hard stops:** No production email behavior change · Do not add `ZOOM_RECORDING_APPROVED` as an Airtable Event Type · Do not edit Welcome / Daily / Weekly / TST rows · Do not change test mode, allowlist, Resend, or routing

## Verdict

| Question | Answer |
|----------|--------|
| Is the Templates table **runtime-authoritative** for sends? | **No — documentation / catalog metadata** |
| What is runtime-authoritative? | Shooting Challenge **Email Handoff Queue** `Template Key` + Hub ingress mapping (`WELCOME`, `HOMEWORK_FEEDBACK`, `VIDEO_FEEDBACK`, `WEEKLY_ATHLETE_SUMMARY`, `ZOOM_RECORDING_APPROVED`) |
| Safe to seed the three missing SC rows? | **Yes**, as metadata-only stubs matching the Aug 7 catalog pattern (leave Channel / Status / Classification / Auto-Send blank) |

## Evidence (production read)

### Current Templates rows (5)

| Name | `communication_type` (Version Notes) | `source_system` | Auto-Send Eligible? |
|------|--------------------------------------|-----------------|---------------------|
| SC — Welcome Registration | `welcome_registration` | `shooting_challenge` | `0` |
| SC — Daily Submissions | `daily_submission` | `shooting_challenge` | `0` |
| SC — Weekly Athlete Summary | `weekly_athlete_summary` | `shooting_challenge` | `0` |
| TST — Daily Submissions | `daily_submission` | `team_shot_tracker` | `0` |
| JR Ref Clinic — Welcome Registration | `clinic_welcome` | `jr_ref` | `0` |

**Absent SC communication types:** `homework_feedback`, `video_feedback`, `zoom_recording_approval`.

### Why Templates are not runtime-authoritative

1. **No Template Key field** on `Templates`. Catalog identity lives in **Name** + free-text **Version Notes** (`communication_type=…`).
2. Existing rows leave **Channel / Classification / Status / Approved Transactional Auto-Send?** blank → formula **Auto-Send Eligible?** stays `0`.
3. Version Notes explicitly say: `source supplies final rendered content and recipient(s)`.
4. Live Hub **Messages** for the controlled WELCOME test carry **Subject / Body HTML on the Message** and do **not** link a Templates record.
5. SC Automations **071 / 073 / 117 / 079** post **`templateKey`** strings (`HOMEWORK_FEEDBACK`, `VIDEO_FEEDBACK`, `ZOOM_RECORDING_APPROVED`, …). Those keys are validated in GitHub and are independent of this catalog table.

### Why the three records are absent

The Aug 7, 2026 seed batch covered Welcome / Daily / Weekly (+ JR Ref + TST). Homework Feedback, Video Feedback, and Zoom Recording Approval Hub handoffs were added later on the SC side (071 / 073 / 117 + 079). The Hub **Templates** catalog was never extended.

This is a **registry gap**, not a send-path failure.

## Expected SC communication-type coverage

| Communication type (catalog) | Deployed Hub `templateKey` | SC Event Type (queue) | Catalog row |
|------------------------------|----------------------------|------------------------|-------------|
| `welcome_registration` | `WELCOME` | `WELCOME` | Present — do not change |
| `daily_submission` | `DAILY_SUBMISSION` | `DAILY_SUBMISSION` | Present — do not change |
| `weekly_athlete_summary` | `WEEKLY_ATHLETE_SUMMARY` | `WEEKLY_ATHLETE_SUMMARY` | Present — do not change |
| `homework_feedback` | `HOMEWORK_FEEDBACK` | `HOMEWORK_FEEDBACK` | **Missing** |
| `video_feedback` | `VIDEO_FEEDBACK` | `VIDEO_FEEDBACK` | **Missing** |
| `zoom_recording_approval` | `ZOOM_RECORDING_APPROVED` | `ZOOM_RECORDING_APPROVAL` | **Missing** |

**Zoom note:** Event Type remains `ZOOM_RECORDING_APPROVAL`. Template Key remains `ZOOM_RECORDING_APPROVED`. Do **not** add `ZOOM_RECORDING_APPROVED` as an Event Type option.

## Exact fields for the three new records

Match existing stub style. Leave auto-send fields blank so **Auto-Send Eligible?** stays `0`.

Seed file: [`seeds/sc-missing-templates-seed.json`](./seeds/sc-missing-templates-seed.json)

| Field | SC — Homework Feedback | SC — Video Feedback | SC — Zoom Recording Approval |
|-------|------------------------|---------------------|------------------------------|
| Name | `SC — Homework Feedback` | `SC — Video Feedback` | `SC — Zoom Recording Approval` |
| Subject Template | `Shooting Challenge — Homework Feedback` | `Shooting Challenge — Video Feedback` | `Shooting Challenge — Zoom Recording Approval` |
| Body HTML | stub with `{{guardian_name}}`, `{{athlete_name}}`, `{{homework_feedback_html}}` | stub with video placeholders | stub with recording placeholders |
| Body Text | plain stub | plain stub | plain stub |
| Version Notes | `communication_type=homework_feedback; template_key=HOMEWORK_FEEDBACK; source_system=shooting_challenge; source supplies final rendered content and recipient(s).` | `…video_feedback…VIDEO_FEEDBACK…` | `…zoom_recording_approval…ZOOM_RECORDING_APPROVED…` |
| Channel | *(blank)* | *(blank)* | *(blank)* |
| Classification | *(blank)* | *(blank)* | *(blank)* |
| Status | *(blank)* | *(blank)* | *(blank)* |
| Approved Transactional Auto-Send? | *(unchecked)* | *(unchecked)* | *(unchecked)* |
| Program | *(blank)* | *(blank)* | *(blank)* |
| Tokens Used | optional list in seed | optional | optional |

## Safest apply method

**Manual / OMNI create in the Hub base** using the seed JSON — one row at a time — is safest.

| Method | Recommendation |
|--------|----------------|
| Manual / OMNI create | **Preferred** — no SC automation paste, no Resend/test-mode touch |
| Scripted Hub write with `--confirm-write` | Optional later; default dry-run only |
| Auto-create from Cursor without Mike confirm | **Do not** |

Do **not** paste SC automations, change 079, flip Test Mode, edit allowlist, or alter Resend as part of this catalog fill.

## After create (verify)

1. Three new Names exist; Welcome / Daily / Weekly / TST unchanged.
2. Each new row has **Auto-Send Eligible?** = `0`.
3. No Message auto-send or Resend activity from the create alone.
4. SC queue still uses Event Type / Template Key contract above (unchanged).
