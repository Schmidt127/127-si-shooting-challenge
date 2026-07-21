# Automation 117f — Airtable input variables

Companion config for `117f-zoom-recording-send-approval-email.js`  
(**Automation name:** 117 — Zoom — Send Recording Approval Email to Make · **v1.1**).

Configure these four **Scripting** action input variables in Airtable. Do not paste webhook URLs into git.

| Input variable | Required | How to configure |
|----------------|----------|------------------|
| `webhookUrl` | Yes | Map to the Make **US1** custom webhook URL (`https://hook.us1.make.com/…`). Store only in Airtable / ops secrets — never commit. |
| `recordId` | Yes | Map to the triggering **Zoom Attendance** record ID (`rec…`). Used as `zoomAttendanceId` in the Make payload. |
| `enrollmentRid` | Yes | Map to the Enrollment record ID (`rec…`) for the attendance row (formula/lookup or linked record ID field). |
| `zoomMeetingRid` | Yes | Map to the Zoom Meeting record ID (`rec…`) for the attendance row. |

## Notes

- Script validates `webhookUrl` host = `hook.us1.make.com` and that all IDs start with `rec`.
- Fixed payload values (not inputs): `automationNumber=117f`, `templateKey=ZOOM_RECORDING_APPROVED`, `timing=On Satisfactory`.
- Send key: `ZOOM_REC_EMAIL|{enrollmentRid}|{zoomMeetingRid}|{zoomAttendanceId}`.
- Script outputs only (`makeStatus`, `sendKey`, `zoomAttendanceId`) — no Airtable record writes.
