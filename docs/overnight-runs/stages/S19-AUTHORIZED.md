# Stage S19 — C-025 DEV activation closeout (117a–f)

| Field | Value |
|-------|-------|
| Stage ID | S19 |
| Package ID | `C-025-dev-activation-117-closeout` |
| Base SHA | `43a1e3013437d3846bb82afabdd8b873e03ba249` |
| Date | 2026-07-14 |
| Feature brief | Mike-authorized execution: DEV Airtable activation docs + paste sheet for 117a–f (this session) |

## Objective

Produce deployable Airtable activation instructions for GitHub-authoritative scripts **117a–117f** in **DEV only**: triggers, inputs, paste boundaries, ON/OFF, test plan, rollback. Stop at first Mike Airtable UI action.

## Authorized scope

- Repo/docs verification of scripts vs Stage 17 design + live DEV schema (read/API)
- Agent A: deployment requirements, conditions, inputs, activation order, rollback, script defects
- Agent B: independent schema review + live trigger-based E2E test plan
- Lead: integrate, deployment sheet, Mike action sheet, CONTROL/status, commit/push

## Not authorized

PROD · archive · real email · production webhook · C-027 · enabling Make prod · secret changes

## Lane assignments

| Role | Lane | Deliverables |
|------|------|--------------|
| Agent A | research / impl verify | Deploy requirements + defect findings |
| Agent B | research / test | Schema review + live trigger E2E plan |
| Lead | `overnight/lead-integration` | Integration, sheets, CONTROL, commit/push |

## Definition of done

- Concise Airtable deployment sheet for 117a–f (name, trigger, table, conditions, inputs, paste boundary, ON/OFF, test setup, expected output, rollback)
- Mike action sheet stops at first UI action
- CONTROL + UNATTENDED milestone updated; Lead local = remote
