# Make.com Blueprints

Export and document **Make.com scenarios** that support the shooting challenge (Google Drive, Gmail, webhooks, Airtable modules).

## Scenarios (Inventory)

| Blueprint file | Scenario name (Make) | Trigger | Airtable / external |
|----------------|----------------------|---------|---------------------|
| [upload-asset-engine-v1.json](./upload-asset-engine-v1.json) | Shooting Challenge - GAME - Upload Engine | Webhook (070a/070b) | Airtable + Google Drive / AWS path — **asset upload only; keep** |
| [c025-117f-zoom-recording-approval-email-dev-v1.template.json](./c025-117f-zoom-recording-approval-email-dev-v1.template.json) | Shooting Challenge - DEV - Zoom Recording Approval Email - 117f - v1 | Custom webhook (117f) | **RETIRED for email** (Mike 2026-08-19: no Make emails). Keep blueprint as archive only; do not re-enable Make Gmail for Zoom. |
| [awards-send-tremendous-sandbox-reward-v2.json](./awards-send-tremendous-sandbox-reward-v2.json) | Integration Airtable, Tremendous Sandbox v2 | Airtable Watch Records | **Current implementation snapshot** (not production-live). Production Award Recipients → HTTP POST Tremendous **Sandbox** (`testflight`). Sandbox send validated 2026-08-19. Production API pending. Keep **OFF**. [current state](../../docs/integrations/tremendous-award-fulfillment.md) · [docs](../documentation/awards-send-tremendous-sandbox-reward-v2.md) |
| [awards-send-tremendous-sandbox-reward-v1.json](./awards-send-tremendous-sandbox-reward-v1.json) | Integration Airtable, Tremendous | Airtable Watch Records | **Historical.** First design (Recipient Email, no Get a Record). Preserve. Do not use as current. [docs](../documentation/awards-send-tremendous-sandbox-reward.md) |
| ~~Weekly summary email~~ | Retired for email | — | Current: Hub → **079** → Resend (Mike 2026-08-19). Historical Make/Gmail path preserved in WAS architecture doc. |
| ~~Parent notification (homework/video/welcome/daily)~~ | Retired for email | — | Current: source → queue → **079** → Resend. Do not re-enable Make Gmail. |

## Naming Convention

```
{domain}-{action}-v{major}.json
```

Example: `homework-upload-drive-v1.json`

## Blueprint Checklist

Each scenario README or blueprint header should note:

- Airtable base ID and table/field mappings
- Webhook URL (store in Make, not secrets in repo)
- Idempotency (filter on `eventId`, check Airtable checkbox before send)
- Error handling route (Ops email, Slack, or log table)

## Deploy Workflow

1. Edit scenario in Make **dev** clone when possible (dev base ID + test inbox).
2. Production scenario stays on prod base ID only.
3. Export blueprint JSON to this folder.
3. Document payload shape in [../test-payloads/](../test-payloads/).
4. Update [../documentation/](../documentation/) and [automation-trigger-map.md](../../airtable/schema/current/automation-trigger-map.md).
5. Commit to GitHub; note in `CHANGELOG.md`.

## GitHub as Source of Truth

Make runtime lives in Make.com; this repo holds **versioned exports** and mapping docs so changes are reviewable in Cursor and recoverable after incidents.

## Related

- [Make documentation](../documentation/README.md)
- [Test payloads](../test-payloads/README.md)
- [Weekly summary flow](../../docs/data-flow/weekly-summary-flow.md)
