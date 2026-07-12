# Make Test Payloads

Sample **JSON payloads** for testing webhooks and scenario branches without touching production athletes.

## Usage

1. Import payload into Make scenario "Run once" or webhook test tool.
2. Point scenario at **test Airtable base** or filtered test records.
3. Compare module output to expected field updates.
4. Store sanitized payloads here (no real parent emails or minors' PII).

## Payload Index

| File | eventType | Scenario |
|------|-----------|----------|
| [homework-completion-070a-dev.sample.json](./homework-completion-070a-dev.sample.json) | `070a` / `homework_completion` | DEV Make → Lambda upload engine |
| [video-feedback-070b-dev.sample.json](./video-feedback-070b-dev.sample.json) | `070b` / `video_feedback` | DEV Make → Lambda upload engine |
| [fixtures/](./fixtures/) | response + negative payloads | Offline T6 validator matrix |
| `homework-submitted.sample.json` | `homework.submitted` | Legacy Drive path |
| `weekly-summary.sample.json` | `weekly.summary.ready` | Parent weekly email |
| *(add)* | | |

## Example: Homework Submitted

```json
{
  "eventId": "test-hw-001",
  "eventType": "homework.submitted",
  "baseId": "appXXXXXXXXXXXXXX",
  "homeworkRecordId": "recXXXXXXXXXXXXXX",
  "athleteRecordId": "recXXXXXXXXXXXXXX",
  "athleteName": "Test Athlete",
  "videoFileName": "shooting-drill-test.mp4",
  "timestamp": "2026-06-20T12:00:00Z"
}
```

## Example: Weekly Summary Ready

```json
{
  "eventId": "test-ws-2026-w25-athlete001",
  "eventType": "weekly.summary.ready",
  "athleteRecordId": "recXXXXXXXXXXXXXX",
  "weekStart": "2026-06-16",
  "summaryHtml": "<p>Test summary: 5 submissions, 420 XP.</p>",
  "parentEmail": "test-parent@example.com"
}
```

## Validation Checklist

- [ ] `eventId` is unique per logical send
- [ ] Record IDs exist in target test base
- [ ] Scenario sets idempotency fields (`Email Sent`, etc.)
- [ ] Error path tested (invalid record ID, missing email)

## Related

- [Make documentation](../documentation/README.md)
- [Weekly summary flow](../../docs/data-flow/weekly-summary-flow.md)
