# Make.com Documentation

Human-readable notes for **Make scenarios** connected to the 127 SI Shooting Challenge Airtable base.

## Integration Overview

| Direction | Pattern | Examples |
|-----------|---------|----------|
| Airtable → Make | Webhook module | Homework video uploaded, weekly summary ready |
| Make → Airtable | Create/update record | Drive URL on Homework, `Email Sent` flag |
| Make → External | Gmail, Google Drive | Parent emails, video storage |

## Scenario Notes Template

For each scenario, add a section (or separate file) with:

### Scenario: *(name)*

- **Trigger:**
- **Modules (high level):**
- **Airtable tables/fields:**
- **Idempotency:**
- **Failure behavior:**
- **Owner / last reviewed:**

## Webhook Payload Standards

Use consistent JSON keys for ChatGPT/Make debugging:

```json
{
  "eventId": "unique-stable-id",
  "eventType": "homework.submitted",
  "baseId": "...",
  "recordId": "...",
  "athleteId": "...",
  "timestamp": "ISO-8601"
}
```

See [../test-payloads/](../test-payloads/) for examples.

## Environment Separation

| Environment | Make folder | Airtable base |
|-------------|-------------|---------------|
| Production | *(fill in)* | Production base |
| Test | *(fill in)* | Copy or sandbox base |

Never point test scenarios at production Gmail without explicit routing rules.

## Change Management

1. Document change here and in blueprint export.
2. Test with sample payload.
3. Update Airtable automation-trigger-map if webhook source changed.
4. `CHANGELOG.md` entry for production-impacting deploys.

## C-013 Upload Engine (Lambda)

| Doc | Environment | Routes |
|-----|-------------|--------|
| [C-013-dev-070a-homework-lambda-runbook.md](./C-013-dev-070a-homework-lambda-runbook.md) | **DEV** | `homework_completion` (070a) + video |
| [C-013-dev-s3-make-ui-runbook.md](./C-013-dev-s3-make-ui-runbook.md) | DEV (legacy S3 notes) | Superseded by Lambda |
| [C-013-prod-upload-engine-lambda-runbook.md](./C-013-prod-upload-engine-lambda-runbook.md) | PROD | `video_feedback` (070b) only |

## Related

- [Blueprints](../blueprints/README.md)
- [Homework flow](../../docs/data-flow/homework-flow.md)
- [Emergency recovery](../../docs/recovery/emergency-recovery.md)
