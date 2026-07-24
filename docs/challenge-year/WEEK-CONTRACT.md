# Week Contract (Challenge Year)

**Timezone:** America/Denver  
**Week shape:** Sunday start → Saturday end (inclusive)  
**Implementation:** `lib/challenge-year/week-keys.js`, `week-generator.js`, `week-validator.js`, `activity-date.js`

## Display label vs unique key

| Concept | Field / property | Example |
|---------|------------------|---------|
| Display label | Weeks.`Week Name` (primary) | `Week 0`, `Week 1`, `Post-Challenge` |
| Live Airtable Week Key | Weeks.`Week Key` formula | `RECORD_ID()` today |
| Canonical repository key | `{challengeYear}|{Week Name}` | `2026-2027|Week 0` |
| Week End Key | **Not on Weeks today**; derived from End Date Denver date | `2026-07-18` |
| WAS Summary Key | formula `{Enrollment Key}\|{Week Key}` | uses live Week Key (record id) |

Do **not** assume display label == Airtable `Week Key`.

## Canonical plan

For regular week count `N`:

1. `Week 0`
2. `Week 1` … `Week N`
3. `Post-Challenge`

Generator command:

```bash
node tools/challenge-year/cli.js generate-weeks \
  --challenge-year 2027-2028 \
  --week-zero-start 2027-05-30 \
  --regular-weeks 8 \
  --output tmp/weeks-2027-2028
```

Outputs: `weeks.json`, `weeks.csv` (Airtable import oriented), `weeks.md`, `validation-report.json`.

## Validation checks

- missing Week 0 / regular week / Post-Challenge  
- duplicate Week Key / Week End Key  
- overlapping ranges / gaps  
- start not Sunday / end not Saturday  
- wrong Config link / wrong year prefix  
- display label mismatch / week number mismatch  
- invalid chronological order  
- historical marked current / multiple current Weeks  
- malformed dates  

## Activity Date → Week

- Use **Activity Date**, not Submitted At  
- Support backdated submissions  
- Sunday–Saturday inclusive in America/Denver  
- Reject cross-year matches  
- Exact unresolved reasons: `before_week_0`, `after_post_challenge`, `outside_configured_challenge`, `malformed_activity_date`, `overlapping_or_duplicate_weeks`

Automation **005** remains the live writer that assigns Week on Submissions (homework-first, Activity Date fallback). This engine validates and plans offline; it does not replace 005.
