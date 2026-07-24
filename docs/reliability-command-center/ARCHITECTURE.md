# Reliability Command Center — Architecture

**Status:** Built / Tested (repository)  
**Date:** 2026-07-24

## Design principle

Extend the existing repository contract pattern (`lib/was-email-contracts`, `lib/homework-contracts`, `lib/config-selection`) rather than invent a competing framework.

The Command Center is a **normalized health layer** over existing Airtable fields and automations. It does not require every workflow to share identical status fields.

## Layers

```text
Fixture / Airtable export JSON
        │
        ▼
normalizeInput()  →  shared bag of table arrays
        │
        ▼
Workflow checkers (enrollment, submissions, XP, …)
        │  uses helpers: normalize / validate / conflicts / stale / retry
        ▼
WorkflowIssue[]  (normalized contract)
        │
        ├── JSON report
        ├── Markdown report
        └── Repair preview (dry-run only)
```

## Health model

See [HEALTH-STATUS-CONTRACT.md](./HEALTH-STATUS-CONTRACT.md).

Statuses include: Healthy, Waiting, Ready, Processing, Sent or Completed, Retryable Error, Blocking Error, Duplicate Risk, Missing Dependency, Stale, Historical, Test Only, Needs Manual Review.

## Workflow coverage

| Workflow | Checker module | Primary tables |
|----------|----------------|----------------|
| Enrollment intake | `workflows/enrollment.js` | Enrollments |
| Submission intake / assets / base XP | `workflows/submissions.js`, `xp-events.js` | Submissions, XP Events |
| Homework completion / XP | `workflows/homework.js` | Submission Assets, Homework Completions, XP Events |
| Video Feedback / XP | `workflows/video-feedback.js` | Video Feedback, XP Events |
| Zoom attendance / XP | `workflows/zoom.js` | Zoom Attendance, Zoom Meetings, XP Events |
| Streak / milestones / Perfect Week | `workflows/achievements.js` | Athlete Achievement Unlocks, WAS, XP Events |
| Level recalc / assign / gates | `workflows/levels.js` | Enrollments |
| Weekly Athlete Summary | `workflows/weekly-athlete-summary.js` | Weekly Athlete Summary |
| Weekly email build / schedule / Make / writeback | `workflows/weekly-email.js` | Weekly Athlete Summary |

## Weekly email ownership (locked)

```text
118 schedules/initiates build   (PROD ON — Sun 5:00 AM Denver)
072 builds package + empty-week policy  (PROD ON)
119 only arms Send to Make?     (PROD ON — Sun 10:00 AM Denver)
074 posts Make webhook          (PROD ON; sendMode=Live)
Make Bulk Email May 18 → Gmail
Make Live branch → Airtable writeback (Sent? / Make Send Status / Weekly Summary Sent At)
```

RCC detects conflicts across this chain. It does **not** change ownership and must **not** recommend disabling 118/119.

## Integration with existing audits

| Existing asset | Relationship |
|----------------|--------------|
| `airtable/extension-scripts/audits/*` | In-base dry-run audits — remain authoritative for live base scanning |
| `lib/was-email-contracts` | Reused conceptually; RCC adds cross-workflow health |
| `docs/overnight/testing-integrity/*` | Evidence audits; RCC is the operator-facing consolidation layer |
| `docs/next-wave/reliability-audit-2026-07-24/*` | Agent 1+2 trust/ownership audit — complementary docs; not replaced by RCC |
| Field ownership matrix | RCC recommends actions; does not reassign writers |

## Safety boundaries

- Offline by default (fixtures / exports)
- No webhook invocation
- No Gmail send
- Repair preview refuses unbounded IDs and never writes Airtable
- Dedupe / Source Key protections are never weakened
