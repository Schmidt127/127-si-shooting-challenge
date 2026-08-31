# Transactional record reset — 2026-08-31

**Base:** `appn84sqPw03zEbTT` (Production)  
**Type:** Record deletion only — **not** a schema reset  
**Authorization:** Mike explicit full transactional wipe (all program years + test fixtures)  
**Tool:** `tools/airtable/transactional_record_reset.py`  
**External sends:** None (no Resend / Make / Gmail / email invocation)

## Totals

| Metric | Value |
|--------|--------|
| Planned deletes (pass 1) | **955** |
| Remnants deleted (pass 2, automation side-effects) | **4** |
| **Total records deleted** | **959** |
| Failed deletions | **0** |
| Tables / fields changed | **0** (33 tables, field IDs unchanged) |

## Deleted by table

| Table | Pass 1 | Remnant pass | Total |
|-------|--------|--------------|-------|
| Email Handoff Queue | 105 | 1 | 106 |
| Award Recipients | 9 | 0 | 9 |
| Payment Transactions | 4 | 0 | 4 |
| XP Events | 283 | 1 | 284 |
| Athlete Achievement Unlocks | 38 | 0 | 38 |
| Streak Occurrences | 8 | 0 | 8 |
| Video Feedback | 111 | 0 | 111 |
| Zoom Attendance | 2 | 0 | 2 |
| Homework Completions | 17 | 0 | 17 |
| Final Reflection Quiz Submissions | 0 | 0 | 0 |
| Submission Assets | 69 | 2 | 71 |
| Submissions | 208 | 0 | 208 |
| Program Homework Assignments | 18 | 0 | 18 |
| Weekly Athlete Summary | 31 | 0 | 31 |
| Enrollments | 28 | 0 | 28 |
| Athletes | 24 | 0 | 24 |
| **Total** | **955** | **4** | **959** |

Post-delete: all of the above tables = **0** records.

## Preserved by table (unchanged counts)

| Table | Count | Notes |
|-------|------:|-------|
| Weeks | 13 | Early Bird + Weeks 1–9 + Post-Challenge + 2 archived test Weeks |
| Config | 4 | Unchanged |
| Program Instance - Sync | 3 | Unchanged |
| Homework Library | 76 | Reusable curriculum preserved |
| XP Reward Rules | 31 | Unchanged |
| Achievements | 15 | Unchanged |
| Target Goal Shots | 7 | Unchanged |
| Grade Bands | 7 | Unchanged |
| Tutorials & Assets | 32 | Unchanged |
| Automations | 49 | **075 absent** (retired) |
| Awards | 31 | Catalog preserved (recipients deleted) |
| Levels | 12 | Ambiguous → PRESERVE |
| Level Gate Rules | 12 | Ambiguous → PRESERVE |
| Shot Milestones | 61 | Ambiguous → PRESERVE |
| Zoom Meetings | 2 | Catalog preserved (attendance deleted) |
| School - Synced | 1241 | Sync/config → PRESERVE |
| Testing Scenarios | 1 | Ambiguous → PRESERVE |

## Weeks confirmation

Seasonal Weeks retained with `Config - Lnk` + `Program Instance`:

- Early Bird: 2027-04-25 … 2027-05-01 (links intact)
- Weeks 1–9 + Post-Challenge (links intact)

Also preserved (Weeks table, per “preserve all Weeks”):

- `PWTEST|…` (`recfcJM0LyJBfNZJq`) — no `Config - Lnk` (pre-existing)
- `COREWF|ARCHIVED|…` (`recyh2t4pzlpuYWJl`) — no `Config - Lnk` (pre-existing)

## Not in base (reported no-op)

- Coach Summary Queue — table does not exist
- Communications Hub — external system; transactional queue is **Email Handoff Queue**

## Remnant note

During pass 1, automations briefly recreated 4 orphan rows (HOMEWORK_FEEDBACK handoff, HOMEWORK_XP event, 2 Video Feedback assets) tied to deleted source `rec8E94Jg7mpmuMW9`. Pass 2 deleted them. Final recount = **0** across all delete tables.

## Verification

| Check | Result |
|-------|--------|
| All delete tables at 0 | PASS |
| Preserve counts stable | PASS |
| Field IDs unchanged | PASS |
| Table count 33 unchanged | PASS |
| Automation 075 absent | PASS |
| No external messages sent | PASS |
| Vitest | **496/496** PASS |
| Airtable contract pytest | **172/172** PASS |
| `GET /shoot` | **200** |
| `GET /shoot/api/airtable` | **200** `tokenValid: true` |
| HTTP smoke (prod) | PASS |

## Evidence files

| File | Purpose |
|------|---------|
| `01-schema-refresh-*.json` | Pre-delete live schema |
| `02-pre-delete-manifest-*.json` | Full record IDs + primary names |
| `03-dry-run-*.json` | Safety gate (`safe_to_delete: true`) |
| `04-deletion-report-*.json` | Pass 1 deletion results |
| `05-post-delete-verification-*.json` | Immediate post counts |
| `06-remnant-inspect-*.json` | Remnant identity |
| `07-remnant-cleanup-*.json` | Pass 2 cleanup |
| `08-final-verification-*.json` | Final checks + Weeks sample |

## Ready for clean workflow testing

Yes — transactional athlete/enrollment/submission/XP/payment/comms history is empty. Configuration, Weeks, Homework Library, rules, and automations remain. **Program Homework Assignments are empty** (by design); recreate PHA before season homework testing.
