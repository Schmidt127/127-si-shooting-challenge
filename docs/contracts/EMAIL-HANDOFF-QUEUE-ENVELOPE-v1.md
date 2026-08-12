# Email Handoff Queue Envelope v1

**Status:** Post-app architecture contract; repository implementation only
**Backlog:** PKG-028
**Production blocker:** No
**Last updated:** 2026-08-12

## Purpose

Every Airtable email producer writes the same envelope to `Email Handoff Queue`.
Automation 079 validates and forwards that envelope without knowing the email's
business rules. The Communications Hub owns supported event types, template
selection, payload validation, rendering, replay, and delivery.

Adding `HOMEWORK_FEEDBACK`, `VIDEO_FEEDBACK`, `WEEKLY_SUMMARY`, or another future
event must not require another Automation 079 code change.

## Required queue values

| Field | Contract |
| --- | --- |
| `Status` | `Ready` before dispatch |
| `Event Type` | Non-empty single-select value; producer and Hub contract own the value |
| `Template Key` | Non-empty value; Hub decides whether it is supported |
| `Handoff Key` | Canonical deterministic key described below |
| `Source Table` | Non-empty Airtable source table name |
| `Source Record ID` | Airtable record ID beginning with `rec` |
| `Recipients JSON` | Non-empty JSON array of objects; each object has a valid `email` |
| `Payload JSON` | JSON object; event-specific keys are validated by the Hub |
| `Test Mode?` | Boolean checkbox |

`Enrollment Record ID` and `Program Instance Record ID` are optional. When
present, each must be an Airtable record ID beginning with `rec`. Blank optional
IDs are omitted from the Hub request.

## Canonical Handoff Key

```text
<EVENT_TYPE>|<SOURCE_TABLE_TOKEN>|<SOURCE_RECORD_ID>
```

- `EVENT_TYPE` is Event Type uppercased with non-alphanumeric runs converted to
  underscores.
- `SOURCE_TABLE_TOKEN` is Source Table normalized the same way.
- The final segment exactly equals `Source Record ID`.

Examples:

```text
DAILY_SUBMISSION|SUBMISSIONS|rec58gdymfPKKeVRI
HOMEWORK_FEEDBACK|HOMEWORK_COMPLETIONS|recHomework0790001
VIDEO_FEEDBACK|VIDEO_FEEDBACK|recVideoFeedback0001
```

The producer owns key construction. A meaningful payload change cannot reuse an
existing key unless the Hub contract explicitly treats it as the same event.

## Dispatcher boundary

Automation 079 validates only universal transport rules:

- queue record is Ready;
- envelope fields and JSON are structurally valid;
- recipient emails are valid and unique case-insensitively;
- canonical key matches Event Type, Source Table, and Source Record ID;
- optional Airtable record IDs are valid when present.

Automation 079 does **not** validate homework fields, shooting totals, review
status, XP values, template-specific recipient roles, or supported event types.
The Hub accepts or rejects those contracts and 079 records that response.

## Legacy WELCOME compatibility

Previously created WELCOME keys beginning with `WELCOME|` remain dispatchable
when `Template Key = WELCOME` and `Source Table = Enrollments`. This is a
compatibility path only. New WELCOME producers must use the canonical key.

## Failure, retry, and replay

- 079 increments `Attempt Count` immediately before the Hub request.
- Hub or transport failure writes `Failed`; the third failed attempt writes
  `Needs Review`.
- Acceptance writes `Accepted`, Hub Event ID, response JSON, and Accepted At.
- A Hub duplicate response writes `accepted_duplicate`; the Hub remains the
  authority that prevents another Delivery.
- An Accepted row is not sent again unless an operator intentionally re-arms it.

## Cross-base reuse

Each Airtable base may require its own installed automation and local queue
table, but each installation should use the same authoritative Automation 079
source and this envelope contract. Secrets remain local Airtable inputs and are
never placed in queue records or GitHub.
