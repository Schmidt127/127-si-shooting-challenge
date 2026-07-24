# Softr Season Activation — Obsolete

**Status:** Obsolete / Not Used / Historical Reference Only  
**Date reclassified:** 2026-07-24  

Softr is **no longer used** by the Shooting Challenge App.

Do **not**:

- include Softr in Season Launch planning, audits, testing, or production activation
- treat Softr filters, pages, or cutover checklists as launch blockers
- require Softr attestations (former S-ATT-*) for go-live

## Replacement

Active front-end season routing for launch is:

- Next.js app at **`/shoot`** — [`WEB-SEASON-ACTIVATION.md`](./WEB-SEASON-ACTIVATION.md)
- Airtable views / queries that feed `/shoot`
- Publish gate field may still be historically named `OK to Publish on Softr` — that name is a schema rename concern (SC-144), not an active Softr dependency

## Historical evidence (keep; do not use for launch)

| Path | Note |
|------|------|
| [`docs/deploy-checklists/SOFTR-CUTOVER-READINESS.md`](../deploy-checklists/SOFTR-CUTOVER-READINESS.md) | Historical Reference Only |
| [`docs/overnight/web-integration/SOFTR-CUTOVER-DECISION.md`](../overnight/web-integration/SOFTR-CUTOVER-DECISION.md) | Historical Reference Only |
| Former Softr dual-run notes in PROJECT_STATE | Reclassified Obsolete |

Launch lifecycle state **Softr Validated** is superseded by **Web Validated**.
