# Automation Trigger Map

Maps Airtable automations and extension scripts to triggers, tables, and downstream effects (XP, Make webhooks, email).

## Airtable Native Automations

| Automation name | Trigger | Table / View | Script location | Downstream |
|-----------------|---------|--------------|-----------------|------------|
| Shooting challenge — submission XP | Record created / updated | Submissions | [../../automations/shooting-challenge/](../../automations/shooting-challenge/) | XP Events, streak fields |
| Homework complete XP | Field matches | Homework | *(TBD)* | XP Events |
| Weekly summary builder | Scheduled | Athletes (active view) | *(TBD)* | Weekly Summaries |
| *(add rows)* | | | | |

## Trigger Types Reference

| Trigger | Use when | Caution |
|---------|----------|---------|
| When record created | New submission, new athlete | Run idempotency check before creating XP Events |
| When record matches conditions | Status flips to Complete | Avoid loops if script writes same record |
| At scheduled time | Weekly summaries, reminders | Use views to limit record set |
| When webhook received | External systems (rare in Airtable) | Prefer Make for external ingress |

## Make.com Webhooks (Outbound from Airtable)

| Airtable action | Webhook / scenario | Payload highlights |
|-----------------|-------------------|-------------------|
| Homework video uploaded | *(scenario name)* | athleteId, homeworkId, driveUrl |
| Weekly summary ready | *(scenario name)* | athleteId, weekStart, summaryHtml |
| *(add rows)* | | |

Document scenario names and blueprint paths under [../../../make/blueprints/](../../../make/blueprints/).

## Extension Scripts (Manual / Button)

| Script | Entry point | Mode | Purpose |
|--------|-------------|------|---------|
| Audit — XP vs submissions | Extension | Dry-run default | [../../extension-scripts/audits/](../../extension-scripts/audits/) |
| Safe backfill — XP Events | Extension | Dry-run default | [../../extension-scripts/safe-backfills/](../../extension-scripts/safe-backfills/) |

## Idempotency Keys

Automations that create XP Events or send email must set or check:

- **XP Events:** `Dedupe Key` field (see [field-map.md](./field-map.md))
- **Weekly Summaries:** `Email Sent` checkbox
- **Make:** Include stable `eventId` in webhook body; scenario filters duplicates

## Testing Checklist (Per Automation)

1. Dry-run or test athlete in a sandbox view
2. Confirm no duplicate XP Events on retry
3. Confirm Make scenario receives expected payload ([test payloads](../../../make/test-payloads/))
4. Update this map and `CHANGELOG.md` on deploy
