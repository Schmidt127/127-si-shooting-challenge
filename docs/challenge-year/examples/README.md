# Challenge-year example outputs

Synthetic **example** outputs only — not a committed real production season calendar.

Generated with:

```bash
node tools/challenge-year/cli.js generate-weeks \
  --challenge-year 2027-2028 \
  --week-zero-start 2027-05-30 \
  --regular-weeks 8 \
  --output docs/challenge-year/examples/weeks-2027-2028

node tools/challenge-year/cli.js manifest \
  --config tests/fixtures/challenge-year/rollover-preflight-pass.json \
  --output docs/challenge-year/examples/rollover-2027-2028
```

Replace dates with Mike-approved season dates before any Airtable import.
