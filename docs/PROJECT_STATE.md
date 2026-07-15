# Project state — infrastructure & identifiers

**Role (Delivery System v2.0 · D6):** Stable infrastructure, base IDs, URLs, and env **names** only.  
**Not for:** live queue, branch tip, test results, next Mike action, or capacity countdown.

| Need | Open |
|------|------|
| **Ops tip / next action / queue / tests** | [`docs/overnight-runs/CONTROL.json`](./overnight-runs/CONTROL.json) |
| **Pilot / process** | [`docs/architecture/DELIVERY-SYSTEM-V2-PILOT.md`](./architecture/DELIVERY-SYSTEM-V2-PILOT.md) |
| **Deployed script claims** | [`docs/delivery/DEPLOYMENT-REGISTRY.json`](./delivery/DEPLOYMENT-REGISTRY.json) |
| **Backlog IDs** | [`docs/v2-change-backlog.md`](./v2-change-backlog.md) |
| **Engineering law** | [`docs/ENGINEERING_CONSTITUTION.md`](./ENGINEERING_CONSTITUTION.md) |

Last infrastructure edit: **2026-07-15** (stripped live tip per Delivery System v2.0 D6).

---

## Repos and public URLs

| Program | GitHub repo | Public URL | Vercel root |
|---------|-------------|------------|-------------|
| **Hoop Challenges landing** | `hoopchallenges-landing` | https://www.hoopchallenges.com | landing project |
| **Shooting Challenge** (this repo) | `127-si-shooting-challenge` | https://www.hoopchallenges.com/shoot | `web/` |
| **JR Referee Clinics** | `127-si-jr-ref` | `/refclinic` on landing | separate project |

This repo is **Shooting Challenge only**.

---

## Airtable — base identifiers

### Production

| Item | Value |
|------|--------|
| Base name (UI) | `127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026` |
| Base ID | `appn84sqPw03zEbTT` |
| Role | Live season system of record |

### Development (V2-015)

| Item | Value |
|------|--------|
| Base name | `127SI - SHOOTING CHALLENGE - DEV` |
| Base ID | `appTetnuCZlCZdTCT` |
| Role | Mandatory test / construction environment |
| Setup | [development-base-setup.md](./development-base-setup.md) |
| Architecture | [v2-015-development-base-architecture.md](./v2-015-development-base-architecture.md) |

**Deploy rule (permanent):** GitHub → paste/test **DEV** → approve → paste **PROD** → `CHANGELOG.md`.

**Automation hard cap:** 50 automations per base (ON + OFF consume). Live occupancy → capacity ledger + CONTROL — not this file.

---

## Schema snapshot locations (reference)

| Base | Example folder |
|------|----------------|
| Production | `airtable/schema/snapshots/prod-20260706/` |
| Development | `airtable/schema/snapshots/dev-20260706/` |
| Maps | `airtable/schema/current/` |
| Web views | [web/docs/airtable-views.md](../web/docs/airtable-views.md) |

New dated snapshots supersede older folders; do not treat this table as “latest tip.”

---

## Web / Vercel identifiers

| Setting | Value |
|---------|--------|
| `NEXT_PUBLIC_BASE_PATH` | `/shoot` |
| `NEXT_PUBLIC_LANDING_URL` | `https://www.hoopchallenges.com` |
| `NEXT_PUBLIC_SITE_URL` | Production shoot URL (Vercel dashboard) |
| Local dev | `http://localhost:3001/shoot` |
| Health | `GET /shoot/api/airtable` |
| CI | `.github/workflows/web.yml` |
| Adapter policy (v2.0) | **mock-default**; separate mock / DEV / protected PROD adapters |

**Env var names (never commit values):**  
`AIRTABLE_API_TOKEN`, `AIRTABLE_BASE_ID` (production on Vercel), `NEXT_PUBLIC_BASE_PATH`, `NEXT_PUBLIC_LANDING_URL`, `NEXT_PUBLIC_SITE_URL`

**Tools PAT scopes (names):** `AIRTABLE_TOKEN` / `AIRTABLE_API_TOKEN` with `schema.bases:read` (optional `data.records:read`).

Deploy notes: [deployment-notes.md](./deployment-notes.md)

---

## Make.com — blueprint map (identifiers)

| Scenario | Blueprint path | Related scripts |
|----------|----------------|-----------------|
| PROD Upload Engine — Lambda v1 | `make/blueprints/upload-asset-engine-lambda-prod-v1.template.json` | 070b / 070c |
| Legacy Upload Asset Engine | `make/blueprints/upload-asset-engine-v1.json` | 070a / 070b legacy |
| Weekly / daily / feedback | Export paths in `make/` as added | 072/074 legacy, 076/077, 071, 073 |

Upload ladder: [make/documentation/upload-asset-engine.md](../make/documentation/upload-asset-engine.md)

---

## Stable architecture decisions (not live queue)

| Decision | Detail |
|----------|--------|
| Multi-year | One Airtable base + **Program Instance** (V2-013 queued; do not implement ad hoc) |
| XP | XP Events ledger; one source → one XP Event |
| Automation SoT | GitHub scripts under `airtable/automations/shooting-challenge/` |
| V2 automation pattern | Doc 06; 066 v3.1 reference template |
| Testing architecture | No test flags on pipeline tables — [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) |

---

## Softr vs this app

| System | Role |
|--------|------|
| Softr.io | Legacy public UI (may still be live for some views) |
| This web app | Replacement in progress; `robots: noindex` until cutover |
| Publish gate | Airtable `OK to Publish on Softr` still used in queries |

---

## Known permanent exceptions

- Video / homework `not_ready_for_xp` rows are expected for pending/testing cases.  
- Airtable automation UI names may differ from GitHub filenames — confirm in UI when debugging.  
- JR Ref is not this repo (`127-si-jr-ref`).

---

## What belongs where (update guide)

| Event | Update |
|-------|--------|
| Base ID / URL / env **name** change | **This file** |
| Live next action / queue / tests / SHA tip | **CONTROL.json** only |
| Script paste claim / content hash | **DEPLOYMENT-REGISTRY.json** |
| Backlog priority | **v2-change-backlog.md** |
| Production-impacting ship | **CHANGELOG.md** |
| New automation trigger map | `airtable/schema/current/` + automation-index |

---

*End of infrastructure project state.*
