# Make.com Blueprints

Export and document **Make.com scenarios** that support the shooting challenge (Google Drive, Gmail, webhooks, Airtable modules).

## Scenarios (Inventory)

| Blueprint file | Scenario name (Make) | Trigger | Airtable / external |
|----------------|----------------------|---------|---------------------|
| [upload-asset-engine-v1.json](./upload-asset-engine-v1.json) | Shooting Challenge - GAME - Upload Engine | Webhook (070a/070b) | Airtable + Google Drive |
| [c025-117f-zoom-recording-approval-email-dev-v1.template.json](./c025-117f-zoom-recording-approval-email-dev-v1.template.json) | Shooting Challenge - DEV - Zoom Recording Approval Email - 117f - v1 | Custom webhook (117f) | DEV Airtable + Gmail + Data Store — **OFF** |
| *(add)*.json | Weekly summary email | Webhook / schedule | Airtable + Gmail |
| *(add)*.json | Parent notification | Webhook | Gmail |

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
