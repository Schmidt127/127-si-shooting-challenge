# Input-variable audit — Shooting Challenge automations

**Date:** 2026-07-24  
**Helper:** `tools/airtable/_extract_automation_inputs.js`

## High-risk inputs

| Automation | Inputs | Issue | Pri |
|------------|--------|-------|-----|
| **074** | `recordId`, `makeWebhookUrl`, `sendMode`/`sendModeInput`, `testRecipientEmail`, `replyTo` | Fixed Test blocks Make Live writeback | P0 |
| **072** | `recordId`, `emptyWeekPolicy`, `allowSchmidtInput`, `sendMode` | `allowSchmidtInput=false` in normal PROD | P1 |
| **118** | `dryRun` (default true), `sendMode`, `includeSchmidt`, `emptyWeekPolicy` | Refuses Live when dryRun=false | P0 |
| **119** | `dryRun`, `includeSchmidt`, exclusions | Must not include webhook | OK |
| **071/073/077** | webhook + sendMode + test recipient | Same Test/Live discipline | P1 |
| **075** | `webhookUrl` (not `makeWebhookUrl`), `runMode` | Naming inconsistency | P2 |
| **117f** | `recordId`, `webhookUrl`, `enrollmentRid`, `zoomMeetingRid` | All required | P1 |
| **056** | none | Confirm America/Denver schedule in UI | P2 |

Most record scripts require `recordId` starting with `rec`.
