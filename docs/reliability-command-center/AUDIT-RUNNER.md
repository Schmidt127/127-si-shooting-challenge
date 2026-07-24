# Audit runner usage

**Status:** Built / Tested

## Commands

```bash
# Fixture mode (tests / CI)
node tools/reliability-command-center/cli.js \
  --fixture tests/reliability-command-center/fixtures/mixed-health.json

# Export mode → report files
node tools/reliability-command-center/cli.js \
  --input /path/to/airtable-export.json \
  --output /tmp/rcc-report

# JSON or Markdown to stdout
node tools/reliability-command-center/cli.js --fixture … --json
node tools/reliability-command-center/cli.js --fixture … --markdown

# Limit checkers
node tools/reliability-command-center/cli.js \
  --fixture … \
  --workflows weeklyEmail,xpEvents,enrollment
```

## Input shapes

1. Flat bag:

```json
{
  "currentChallengeYear": "2026-2027",
  "enrollments": [{ "id": "rec…", "fields": { } }],
  "submissions": [],
  "xpEvents": [],
  "weeklyAthleteSummaries": []
}
```

2. Tables map:

```json
{
  "tables": {
    "Enrollments": [],
    "Submissions": [],
    "XP Events": [],
    "Weekly Athlete Summary": []
  }
}
```

Records may be Airtable-shaped (`{ id, fields }`) or flat objects with an `id`.

## Output

| Artifact | Contents |
|----------|----------|
| `report.json` | Full findings + summary counts + affected IDs |
| `report.md` | P0–P3 sections, recommended actions, retry eligibility |
| stdout summary | `{ ok, total, byPriority, byWorkflow, affectedRecordIds }` |

## Privacy

Committed fixtures use **synthetic** names, emails (`@example.test`), and record IDs only. Never commit real athlete PII exports.

## Tests

```bash
node tests/reliability-command-center/run-all.js
```
