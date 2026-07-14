# Stage S18 — C-025 Zoom recording attendance DEV DoD

| Field | Value |
|-------|-------|
| Stage ID | S18 |
| Package ID | `C-025-recording-credit-dev-dod` |
| Base SHA | `7dcf7c807b0fe38b0fd89ba0f20e65dc3079ba53` |
| Date | 2026-07-14 |
| Feature brief | `docs/deploy-checklists/C-025-feature-brief-approved.md` |

## Objective

Complete C-025 Zoom recording attendance path in DEV to Definition of Done: cleanup scaffolding, ship 117a–f, provide DEV-only E2E testable intake, promotion package — no PROD.

## Authorized scope

- DEV Airtable cleanup of C-025 temp/legacy/probe/draft fields after dependency checks
- GitHub automation scripts 117a–f + DEV paste/test tooling
- DEV fixture/E2E harness writes (Schmidt / labeled test records)
- Controlled DEV XP Event create only via 117c path on labeled fixtures (idempotent)
- Docs: intake gap, promotion package, consolidated result

## Not authorized

PROD · archive · real communications · Make prod · public Fillout cutover · Vercel/AWS prod · C-027 Airtable · secrets changes

## Lane assignments

| Role | Lane | Deliverables |
|------|------|--------------|
| Agent A | Lead worktree / implementation lane | 117a–f scripts, cleanup tooling, DEV intake path |
| Agent B | Lead worktree / test lane | Offline contracts, E2E harness, failure analysis |
| Lead | `overnight/lead-integration` | Integration, live verify, promotion package, report, commit/push |

## Definition of done

Per feature brief + DEV Execution Model §4.
