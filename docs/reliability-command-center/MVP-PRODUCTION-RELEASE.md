# Minimum viable PROD release — Reliability Command Center (SC-147)

**Status:** Ready for Production Installation (views + first export run)  
**Interface:** Designed only — **not required** for MVP  
**Optional RCC fields / Findings table:** **Deferred**  
**Date:** 2026-07-24

## Verified PROD weekly email facts (do not regress)

| Fact | Value |
|------|--------|
| Flow | `118 → 072 → 119 → 074 → Make Bulk Email May 18 → Gmail → writeback` |
| 072 | **ON** |
| 074 | **ON**, `sendMode=Live` (never fixed Test) |
| 118 | **ON** (Sun 5:00 AM America/Denver) |
| 119 | **ON** (Sun 10:00 AM America/Denver) |
| Writeback | `Weekly Email Sent?` checked · `Make Send Status=Sent` · timestamp populated |
| Timestamp fields (real PROD) | Prefer **`Weekly Summary Sent At`**; also accept **`Weekly Email Sent At`** |

Do **not** recommend turning 118/119 OFF. Older OFF guidance is stale.

## MVP definition (first production release)

1. Repository code merged to `master`
2. Current Airtable PROD export obtained (format below)
3. RCC CLI run against that export
4. JSON + Markdown findings generated
5. **Weekly Email Health** view created (existing fields)
6. **P0 Blocking Errors — Weekly Email** view(s) created (existing fields)
7. Duplicate-risk findings reviewed (from CLI report; optional XP Source Key grouped view)
8. **No automatic repairs enabled**
9. Production installation + rollback evidence recorded

## Export format needed for first live RCC run

Provide a JSON file (no PII in git commits):

```json
{
  "currentChallengeYear": "2026-2027",
  "expectedWeekId": "rec…",
  "nowMs": 1784894400000,
  "tables": {
    "Enrollments": [{ "id": "rec…", "fields": { } }],
    "Submissions": [{ "id": "rec…", "fields": { } }],
    "XP Events": [{ "id": "rec…", "fields": { } }],
    "Weekly Athlete Summary": [{ "id": "rec…", "fields": { } }],
    "Weeks": [{ "id": "rec…", "fields": { } }],
    "Homework Completions": [],
    "Submission Assets": [],
    "Athlete Achievement Unlocks": [],
    "Video Feedback": [],
    "Zoom Attendance": [],
    "Zoom Meetings": []
  }
}
```

**Minimum tables for weekly-email MVP:** `Weekly Athlete Summary`, `Enrollments`, `Weeks`, `XP Events`.

**Sanitize before any commit:** replace real emails/names with `@example.test` synthetics.

### CLI

```bash
node tools/reliability-command-center/cli.js \
  --input /path/to/prod-export.sanitized.json \
  --output /tmp/rcc-prod-$(date +%Y%m%d)
```

## Exact minimum Airtable views (existing fields only)

Create in PROD via OMNI / UI. **No new fields required.**

### View A — Weekly Email Health

| Item | Spec |
|------|------|
| Table | **Weekly Athlete Summary** |
| Filter | `OR({Build Weekly Email Now?}, {Weekly Email Ready?}, {Send to Make?}, {Weekly Email Sent?})` |
| Sort | Last Modified Time → descending |
| Group | `Make Send Status` (optional) |
| Visible fields | Enrollment, Week, `Build Weekly Email Now?`, `Weekly Email Ready?`, `Send to Make?`, `Weekly Email Sent?`, `Weekly Email Subject`, `Weekly Email Recipients`, `Weekly Email HTML`, `Make Send Status`, `Weekly Summary Sent At`, `Weekly Email Sent At`, `sendMode`, `Weekly Email Error` |
| New field? | **No** — create directly |
| Action | Walk ownership 118→072→119→074→Make |

### View B — P0 Blocking Errors (Ready package incomplete)

| Item | Spec |
|------|------|
| Table | **Weekly Athlete Summary** |
| Filter | `AND({Weekly Email Ready?}, OR({Weekly Email Subject}="", {Weekly Email Recipients}="", {Weekly Email HTML}=""))` |
| Sort | Last Modified Time → descending |
| Visible fields | Same as View A |
| New field? | **No** — create directly |

### View C — P0 Blocking Errors (Send armed not Ready)

| Item | Spec |
|------|------|
| Table | **Weekly Athlete Summary** |
| Filter | `AND({Send to Make?}, NOT({Weekly Email Ready?}))` |
| Sort | Last Modified Time → descending |
| New field? | **No** — create directly |

### View D — P0 Blocking Errors (Sent / Make writeback mismatch)

| Item | Spec |
|------|------|
| Table | **Weekly Athlete Summary** |
| Filter | `OR(AND({Weekly Email Sent?}, {Make Send Status}!="Sent"), AND({Make Send Status}="Sent", NOT({Weekly Email Sent?})), AND({Weekly Email Sent?}, {Send to Make?}))` |
| Sort | Last Modified Time → descending |
| Visible fields | Include `Weekly Summary Sent At`, `Weekly Email Sent At`, `Make Send Status`, `sendMode` |
| New field? | **No** — create directly |

### View E — Duplicate risk review aid (optional for MVP day-1)

| Item | Spec |
|------|------|
| Table | **XP Events** |
| Filter | none (or Active? = checked if field exists) |
| Group | `Source Key` |
| Sort | Created time descending |
| Visible fields | Source Key, XP Dedupe Key, Enrollment, XP Source, XP Points, Active? |
| New field? | **No** — create directly |
| Note | True duplicate detection still relies on RCC CLI report; grouping helps operator review |

## Filters that need optional helper formulas (deferred)

These are **not** required for MVP:

| Desired single-view filter | Why deferred | Optional later |
|----------------------------|--------------|----------------|
| One combined “any email conflict” view | Airtable filter UI may not express all XOR cases cleanly in one saved view | Formula `RCC Email Conflict?` |
| Current Level equals Next Level | Link equality filters are awkward | Formula `RCC Level Conflict?` |
| “Retryable across tables” | Cross-table health needs export or Findings table | Future `RCC Findings` |

**MVP uses multiple simple views (B–D) instead of one formula field.**

## Overlap with other 2026-07-24 work (do not duplicate)

| Branch / pack | Relationship to RCC |
|---------------|---------------------|
| `integration/go-live-promotion-2026-07-24` (merged to master) | Authoritative schedule ON + completion dashboard — RCC rebases onto this |
| `audit/agent1-2-reliability-2026-07-24` | Docs audit of automation trust / ownership — **complementary**; RCC is the runnable health CLI |
| `agent2/airtable-data-model-cleanup` | Field ownership / cleanup plans — RCC consumes field names; does not replace ownership matrix |

Canonical architecture remains [`WAS-WEEKLY-EMAIL-ARCHITECTURE.md`](../next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md).

## Rollback

See [ROLLBACK.md](./ROLLBACK.md). Delete Views A–E if needed. Never clear `Weekly Email Sent?` to force resend.

## Status gates

| Gate | Status word |
|------|-------------|
| Repo + tests | **Built / Tested** |
| This MVP packet | **Ready for Production Installation** |
| Views A–D created in Airtable | **Installed** (SC-147 partial) |
| CLI run on current PROD export + findings reviewed | **Live Tested in PROD** |
