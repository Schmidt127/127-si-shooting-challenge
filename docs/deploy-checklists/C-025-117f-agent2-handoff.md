# C-025 — Agent 2 handoff (117f DEV Make)

**From:** Agent 1 (repo package + offline validation)  
**Branch:** `feature/c025-stage17-zoom-attendance`  
**Date:** 2026-07-20

## Agent 1 complete

- 117f v1.2.0 contract + neutralized 117 email key prep (repo)
- DEV Make blueprint template (sanitized, no webhook URL)
- Offline Make scenario simulator + tests
- Deployment checklist + sample payload

## Exact single next action for Agent 2

**In Make.com (DEV): create the Custom webhook module for scenario `Shooting Challenge - DEV - Zoom Recording Approval Email - 117f - v1`, leave the scenario OFF, set scenario variable `testRecipientEmail` to Mike’s controlled test inbox (ops only), and store the generated webhook URL only in Make — then run checklist M1–M5 using Run once.**

Do **not** paste the webhook URL into git, chat logs, or Airtable 117f until Mike explicitly authorizes the controlled 117f DEV wiring step.

## Blockers Agent 1 cannot clear

| Need | Why |
|------|-----|
| Make.com account UI access | Custom webhook URL generation |
| Mike-controlled test inbox value | Real Gmail To: for DEV tests |
| Optional: real DEV fixture record IDs | Replace sample `rec…` placeholders for live Airtable Gets |

## Do not

- Enable scenario permanently
- Send to parent addresses
- Write PROD Airtable
- Populate Automation 117 `webhookUrl`
- Install/enable 117f until M1–M5 PASS and Mike approves

## References

- [Blueprint](../../make/blueprints/c025-117f-zoom-recording-approval-email-dev-v1.template.json)
- [Deployment checklist](./C-025-117f-dev-make-deployment-checklist.md)
- [Contract](./C-025-117f-dev-make-scenario-contract.md)
- Offline: `node make/lib/c025-117f-make-scenario.test.js`
