# Automation 117 — Zoom Recording Approval Email → Make

| Field | Value |
|-------|--------|
| Date | 2026-08-05 |
| Status | Canonical repo copy matches PROD **v1.1** (2026-07-20) — **no paste required** unless Airtable drifts |
| Canonical file | `airtable/automations/shooting-challenge/117-zoom-send-recording-approval-email-to-make.js` |
| Airtable automation name | `117 — Zoom — Send Recording Approval Email to Make` |
| Make identifier | `117f` (payload `automationNumber` only — **not** a second Airtable slot) |

## Critical ownership rule

This is the **only** active Airtable Automation **117**.

Do **not**:

- paste the Stage 17 credit **orchestrator** into this slot
- create Airtable automations **117a / 117b / 117c / 117d / 117e**
- treat repository modular scripts as deployable PROD automations

Modular / orchestrator sources (design reference only):

`airtable/automations/shooting-challenge/_design-alternatives/stage17-modular-reference/`

## Inputs

| Variable | Required |
|----------|----------|
| `webhookUrl` | Yes — Make US1 `hook.us1.make.com` |
| `recordId` | Yes — Zoom Attendance `rec…` |
| `enrollmentRid` | Yes |
| `zoomMeetingRid` | Yes |

## Fixed payload

| Field | Value |
|-------|--------|
| `automationNumber` | `117f` |
| `templateKey` | `ZOOM_RECORDING_APPROVED` |
| `timing` | `On Satisfactory` |
| `sendKey` | `ZOOM_REC_EMAIL\|{enrollmentRid}\|{zoomMeetingRid}\|{zoomAttendanceId}` |

## Expected Make responses

| `status` | Meaning |
|----------|---------|
| `sent` | First send (Data Store write) |
| `already_sent` | Duplicate key — success, no second email |

Non-2xx HTTP, non-JSON body, or any other `status` → automation **error**.

## Current test-mode / go-live notes

See historical evidence: `docs/deploy-checklists/C-025-117f-prod-zoom-recording-approval-email.md`. Controlled tests have passed; permanent go-live remains an operator checklist item. Webhook URL stays in Airtable only.

## Safe live test (when authorized)

1. Confirm Automation 117 inputs map to webhook + three RIDs.
2. Use Schmidt / ops-only recipient path per Make scenario config.
3. Trigger one Satisfactory recording Zoom Attendance row.
4. Expect `makeStatus=sent` then rerun → `already_sent`.
5. Confirm **no** XP Event create and **no** Airtable field writes from this script.

## Paste

**Not required** when PROD already matches repo **v1.1** / **2026-07-20**.

If Airtable drifts: paste from production docblock through EOF (skip GitHub-only header). Preserve Version **v1.1**.
