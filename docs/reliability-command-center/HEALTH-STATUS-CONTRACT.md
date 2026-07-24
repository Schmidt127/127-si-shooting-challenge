# Health-status contract

**Status:** Built / Tested

## Normalized health statuses

| Status | Meaning |
|--------|---------|
| Healthy | No issue for this check |
| Waiting | Upstream dependency not ready yet |
| Ready | Package/work ready for next step |
| Processing | In-flight flag/status set |
| Sent or Completed | Terminal success |
| Retryable Error | Failed but safe to re-run owning automation after uniqueness check |
| Blocking Error | Must fix data/config before any retry |
| Duplicate Risk | Multiple records share identity/key — do not retry |
| Missing Dependency | Required link/field absent |
| Stale | Processing/ready flag exceeded time threshold |
| Historical | Prior challenge-year; isolate from current season |
| Test Only | Test/sendMode=Test path — not Live writeback |
| Needs Manual Review | Ambiguous conflict |

## Issue object (machine-readable)

```json
{
  "id": "string",
  "workflow": "Weekly email build",
  "sourceTable": "Weekly Athlete Summary",
  "sourceRecordId": "rec…",
  "enrollmentRecordId": "rec…",
  "weekRecordId": "rec…",
  "sourceKey": "PREFIX|…",
  "dedupeKey": "…",
  "currentStatus": "Ready|SendArmed|…",
  "healthStatus": "Blocking Error",
  "priority": "P0",
  "lastAttemptedAt": "ISO-8601 or empty",
  "completedAt": "ISO-8601 or empty",
  "errorMessage": "human detail",
  "retryEligibility": "automatically_retryable|…",
  "recommendedAction": "exact operator action",
  "evidence": ["field=value", "…"],
  "owningAutomation": "072",
  "downstreamDependency": "119 → 074 → Make…",
  "code": "ready_subject_blank",
  "meta": {}
}
```

## Field mapping rule

Workflows keep their production field names. Checkers map those fields into the contract. RCC does **not** invent production field IDs or rename live fields.

Canonical weekly-email fields (WAS):

- `Build Weekly Email Now?`
- `Weekly Email Ready?`
- `Weekly Email Sent?`
- `Weekly Email Sent At`
- `Send to Make?`
- `Weekly Email Subject` / `Recipients` / `HTML` / `Text` / `Payload JSON`
- `Weekly Email Error`
- `sendMode`
- `Make Send Status`

## Priority bands

| Priority | Typical health |
|----------|----------------|
| P0 | Blocking Error, Duplicate Risk, Live/Test send mismatches |
| P1 | Retryable Error, Missing Dependency, Stale, Manual Review |
| P2 | Test Only (non-prod parents) |
| P3 | Waiting / Ready / Healthy informational |
