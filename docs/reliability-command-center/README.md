# Reliability Command Center (Shooting Challenge)

**Status:** Built / Tested (repository) · Airtable Interface: **Designed** (specification only — not installed)  
**Scope:** Shooting Challenge App only — not Team Shot Tracker  
**Last updated:** 2026-07-24

## Purpose

Make automation failures, incomplete records, duplicate risks, broken links, stale queues, failed Make handoffs, and inconsistent statuses visible **before** they become production problems.

Mike should be able to answer:

- Which workflows are healthy?
- Which records are stuck?
- Which automations have failed?
- Which records are safe to retry?
- Which records may create duplicates?
- Which Make handoffs have not completed?
- Which weekly summary emails were built but not sent?
- Which XP or achievement records are missing?
- Which records have conflicting statuses?
- What exact action should be taken to fix each problem?

## What exists in this repository

| Component | Path | Status |
|-----------|------|--------|
| Health model + helpers | `lib/reliability-command-center/` | **Built / Tested** |
| Workflow checkers | `lib/reliability-command-center/workflows/` | **Built / Tested** |
| Offline audit CLI | `tools/reliability-command-center/cli.js` | **Built / Tested** |
| Dry-run repair preview | `tools/reliability-command-center/repair-preview.js` | **Built / Tested** |
| Synthetic fixtures + tests | `tests/reliability-command-center/` | **Built / Tested** |
| Airtable view / Interface spec | [AIRTABLE-VIEW-SPEC.md](./AIRTABLE-VIEW-SPEC.md) | **Designed** |
| Production install packet | [../deploy-checklists/RELIABILITY-COMMAND-CENTER-PRODUCTION-INSTALL.md](../deploy-checklists/RELIABILITY-COMMAND-CENTER-PRODUCTION-INSTALL.md) | **Ready for Production Installation** (views only; no auto field creates) |

## Quick start (offline)

```bash
# Run all RCC tests (no Airtable access)
node tests/reliability-command-center/run-all.js

# Audit a fixture
node tools/reliability-command-center/cli.js \
  --fixture tests/reliability-command-center/fixtures/mixed-health.json \
  --output /tmp/rcc-report

# Dry-run repair preview (explicit record IDs required)
node tools/reliability-command-center/repair-preview.js \
  --fixture tests/reliability-command-center/fixtures/mixed-health.json \
  --record-ids rec00000000000054
```

## Document map

| Doc | Contents |
|-----|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, ownership, boundaries |
| [HEALTH-STATUS-CONTRACT.md](./HEALTH-STATUS-CONTRACT.md) | Normalized health statuses + issue contract |
| [AUDIT-RUNNER.md](./AUDIT-RUNNER.md) | CLI usage, input/output shapes |
| [WORKFLOW-CHECKS.md](./WORKFLOW-CHECKS.md) | Per-workflow detection rules |
| [RETRY-POLICY.md](./RETRY-POLICY.md) | Safe retry classification |
| [AIRTABLE-VIEW-SPEC.md](./AIRTABLE-VIEW-SPEC.md) | Recommended views / Interface (not installed) |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Operator playbook |
| [ROLLBACK.md](./ROLLBACK.md) | How to roll back install attempts |
| [MAKE-INTEGRATION-OPTIONS.md](./MAKE-INTEGRATION-OPTIONS.md) | Future Make options (none required now) |

## Verified weekly email ownership (do not redesign)

```text
118 → 072 → 119 → 074 → Make.com → Gmail → Make.com Airtable writeback
```

Make scenario: **Weekly Athlete Summary - Bulk Email - May 18**  
PROD rule: 074 `sendMode=Live` (never fixed Test) so Live writeback can set `Weekly Email Sent?`, `Make Send Status=Sent`, and sent timestamp.

## Explicit non-goals

- No live Airtable writes from the audit runner
- No automatic bulk retry
- No Team Shot Tracker inactivity alerts / coach digests / standings
- No production field creation without Mike authorization
- No claim that the Airtable Interface is installed
