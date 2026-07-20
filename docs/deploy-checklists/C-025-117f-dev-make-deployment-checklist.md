# C-025 — 117f DEV Make deployment checklist

**Scenario:** `Shooting Challenge - DEV - Zoom Recording Approval Email - 117f - v1`  
**Base:** DEV `appTetnuCZlCZdTCT` only  
**State:** Build **OFF** — do not enable until checklist PASS  
**Blueprint:** [c025-117f-zoom-recording-approval-email-dev-v1.template.json](../../make/blueprints/c025-117f-zoom-recording-approval-email-dev-v1.template.json)  
**Contract:** [C-025-117f-dev-make-scenario-contract.md](./C-025-117f-dev-make-scenario-contract.md)  
**Offline helpers:** `make/lib/c025-117f-make-scenario.js`

---

## Pre-build

- [ ] Confirm DEV base only (never PROD `appn84sqPw03zEbTT`)
- [ ] Confirm 117 `webhookUrl` remains blank
- [ ] Confirm 117f not installed/enabled yet
- [ ] Mike has a controlled test inbox ready (value stays ops-only)

## Make UI build (scenario OFF)

- [ ] Create Custom webhook (JSON). **Do not** auto-respond 2xx.
- [ ] Create Data Store `C025_117f_DEV_SendKeys` with schema from blueprint
- [ ] Wire Router validation: `117f` + `ZOOM_RECORDING_APPROVED` + `ZOOM_REC_EMAIL|` + rec ids
- [ ] Invalid → Webhook response **400**
- [ ] Data Store lookup by `sendKey` → duplicate → **200** `already_sent` (no Gmail)
- [ ] Airtable Get: Zoom Attendance, Enrollments, Zoom Meetings (DEV connection)
- [ ] Revalidate filters: Recording Quiz, Satisfactory, Conflict ≠ 1, link IDs match
- [ ] Invalid revalidation → **422**
- [ ] Scenario vars: `sendMode=test`, `testRecipientEmail=REPLACE…` then set real test inbox in Make only
- [ ] Recipient missing → **422**
- [ ] Compose subject + HTML from offline helper / 071 brand
- [ ] Gmail To = **test inbox only**; Reply-To = `coach@127sportsintensity.com`
- [ ] Gmail fail → **502**; **no** Data Store write
- [ ] After Gmail success → Data Store write → Webhook response **200** `sent`
- [ ] Confirm no Airtable write modules for XP / Attendees / Send Key / Sent At

## Offline validation (repo)

```bash
node make/lib/c025-117f-make-scenario.test.js
node airtable/automations/shooting-challenge/lib/c025-stage17-zoom-attendance.test.js
```

- [ ] Both suites PASS
- [ ] Secrets scan: no webhook URL / real parent inbox in committed files

## Manual Make tests (after build, scenario still scheduled OFF; use Run once)

| # | Action | Pass |
|---|--------|------|
| M1 | POST invalid automationNumber | HTTP 400; no Gmail |
| M2 | POST wrong templateKey | HTTP 400 |
| M3 | POST valid payload with DEV fixture ids; sendMode=test | Gmail to **Mike test inbox only**; DS has sendKey; HTTP 200 |
| M4 | Repeat same sendKey | No second Gmail; HTTP 200 `already_sent` |
| M5 | Conflict=1 fixture | HTTP 422; no Gmail |

**Do not** map 117f Airtable input until Agent 2 / Mike authorizes.

## Stop / handoff

If Custom webhook URL or Mike test inbox is required and not available in-repo: stop. See [C-025-117f-agent2-handoff.md](./C-025-117f-agent2-handoff.md).
