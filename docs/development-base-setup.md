# Development base — setup and operations

**Backlog:** V2-015  
**Architecture:** [v2-015-development-base-architecture.md](./v2-015-development-base-architecture.md)  
**Last updated:** 2026-07-05

Use this runbook when creating or refreshing the **Development** Airtable base. Production base stays the system of record for live season data.

**Permanent rule:** Nothing ships to Production until tested in DEV — full pipeline in [v2/04-ai-development-standards.md](./v2/04-ai-development-standards.md) § DEV-first delivery pipeline.

---

## Base registry

| Environment | Base name (recommended) | Base ID | Status |
|-------------|-------------------------|---------|--------|
| **Production** | `127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026` | `appn84sqPw03zEbTT` | Live |
| **Development** | `127SI - SHOOTING CHALLENGE - DEV` | `appTetnuCZlCZdTCT` | **Ready** — 6 test enrollments; prod unchanged |

**Data policy (2026-07-05):** DEV retains Schmidt/testing enrollment plus **5** additional test enrollments. All other registered athlete/enrollment records were **removed from DEV only**. Production was **not changed**.

**First testing location:** 066 v3.1 paste, merge tests, schema changes, backfills, Test Intake / Schmidt work, Make dry-runs (when configured).

After clone: update [PROJECT_STATE.md](./PROJECT_STATE.md) with the dev base ID.

---

## Step 1 — Create the clone (Mike, Airtable UI)

1. Open the **production** base in Airtable.
2. Click the base name → **Duplicate base**.
3. Rename the duplicate: **`127SI - SHOOTING CHALLENGE - DEV`**
4. Copy the new **base ID** from the URL: `https://airtable.com/appXXXXXXXXXXXXXX/...`
5. Paste the ID into [PROJECT_STATE.md](./PROJECT_STATE.md) → Development row.

The clone includes automations, interfaces, and data — treat post-clone steps as **required**.

---

## Step 2 — PAT token scopes (Mike)

At [airtable.com/create/tokens](https://airtable.com/create/tokens), ensure the PAT includes **both** bases:

| Scope | Production | Development |
|-------|------------|-------------|
| `data.records:read` | Yes | Yes |
| `data.records:write` | If used for tools | Dev only for experiments |
| `schema.bases:read` | Yes | Yes |

Store token in:

- `tools/airtable/.env` — `AIRTABLE_TOKEN` + `BASE_ID` (switch to dev ID for dev exports)
- `web/.env.local` — local Next.js (optional dev reads)
- Vercel — **production base ID only** (never dev)

---

## Step 3 — Critical: isolate webhooks and email (Mike)

A clone copies **production Make webhook URLs** into dev automations. Until changed, dev runs can **email real parents** or **upload to production Drive paths**.

### Option A — Disable (safest for first week)

In the **dev base only**, turn **OFF** these automations until dev Make scenarios exist:

| # | Name | Risk if left ON |
|---|------|-----------------|
| **070a** | Homework upload to Make | Prod upload engine |
| **070b** | Video upload to Make | Prod upload engine |
| **071** | Homework feedback email | Real parent email |
| **072** | Build weekly email | Staging fields only — lower risk |
| **073** | Video feedback email | Real parent email |
| **074** | Send weekly to Make | Real email send |
| **075** | Welcome email build | Lower risk |
| **076** | Daily email build | Lower risk |
| **077** | Send daily to Make | Real email send |

### Option B — Dev Make scenarios (recommended long-term)

1. In Make.com, **duplicate** each webhook scenario (see [make/blueprints/README.md](../make/blueprints/README.md)).
2. Point dev scenarios at **dev base ID** and test Gmail / test Drive folder.
3. Update **dev base only** automation script inputs with dev webhook URLs.
4. Document dev webhook mapping in `make/documentation/` (no secrets in GitHub).

**Never** commit webhook URLs with tokens to GitHub.

---

## Step 4 — Fillout and public intake

| Rule |
|------|
| **Production Fillout forms** → production base only |
| **Do not** repoint live forms to dev |
| Optional: create separate test Fillout forms wired to dev for C-017 experiments |

---

## Step 5 — Dev base data hygiene (optional, recommended)

Dev can keep cloned data for realistic pipeline tests, or scrub PII:

| Action | When |
|--------|------|
| Keep Schmidt test enrollment (`Active?` false) | C-019 pipeline tests |
| Truncate operational tables before a fresh test wave | Before EMC / merge experiments |
| Never delete config tables (Levels, Gates, XP Rules, etc.) without a plan | — |

---

## Step 6 — Schema snapshot from dev (Cursor / Mike)

After clone stabilizes:

```powershell
cd tools/airtable
# Set BASE_ID to dev base ID in .env
python export_airtable_schema.py -v --out-dir ../../airtable/schema/snapshots/dev-YYYYMMDD
```

Commit snapshot only if dev schema intentionally diverges from prod. Normally prod export remains canonical until Stage K changes land in dev first.

---

## Step 7 — Automation paste workflow (ongoing)

```
GitHub commit → paste into DEV automation → audit (dev) → sandbox test → Mike approves → paste into PROD → CHANGELOG
```

First dev paste: **066 v3.1** (H-002) — [deploy-checklists/066-v3.1-dev-deploy.md](./deploy-checklists/066-v3.1-dev-deploy.md)

Extension scripts: run dry-run in **dev** base Scripting extension before any `CONFIRM_WRITE` on prod.

---

## Step 8 — Local web app (optional)

```powershell
cd web
copy .env.local.example .env.local
# Set AIRTABLE_BASE_ID to dev base ID for local UI testing
npm run dev
```

Vercel production deployment **always** uses production `AIRTABLE_BASE_ID`.

---

## Refresh policy

Re-duplicate prod → dev when:

- Before a major Phase 2 wave (066 deploy, EMC, merges)
- Dev schema has drifted >30 days from prod
- After intentional prod schema changes (mirror to dev within one week)

On refresh: repeat Steps 3–5 (webhook isolation is the most common mistake).

---

## Checklist (printable)

```
[ ] Clone created and renamed DEV
[ ] Dev base ID recorded in PROJECT_STATE.md
[ ] PAT includes dev base
[ ] Email/upload automations OFF or pointed at dev Make
[ ] Fillout still on prod only
[ ] tools/airtable/.env documented for dev exports
[ ] Team knows: paste automations DEV first, then PROD
```

---

## Related

- [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) — C-019, C-020
- [v2-014-automation-modernization-roadmap.md](./v2-014-automation-modernization-roadmap.md) — Phase 2
- [deployment-notes.md](./deployment-notes.md) — Vercel env
