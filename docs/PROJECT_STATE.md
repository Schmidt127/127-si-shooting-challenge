# Project state — live snapshot

**Read this first** in new Cursor sessions. Update after major deploys, audit passes, or architecture changes.

Last updated: **2026-07-04**

---

## Repos and public URLs

| Program | GitHub repo | Public URL | Vercel root |
|---------|-------------|------------|-------------|
| **Hoop Challenges landing** | `hoopchallenges-landing` (local: `127si-landing-page`) | https://www.hoopchallenges.com | landing project |
| **Shooting Challenge** (this repo) | `127-si-shooting-challenge` (local: `127-si-shooting-challenge`) | https://www.hoopchallenges.com/shoot | `web/` |
| **JR Referee Clinics** | `127-si-jr-ref` (separate) | `/refclinic` on landing | separate project |

This repo is **Shooting Challenge only** — not the multi-program hub.

---

## Airtable — Shooting Challenge

| Item | Value |
|------|--------|
| Base name (Airtable UI) | `127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026` |
| Base ID | `appn84sqPw03zEbTT` |
| Tables (schema export) | **29** (see `base_summary_*_20260629_045741.json`) |
| Schema snapshot (latest) | `airtable/schema/snapshots/` — **`20260629_045741`** + `manifest_appn84sqPw03zEbTT_latest.json` |
| Hand-maintained maps | `airtable/schema/current/` |
| Web view docs | [web/docs/airtable-views.md](../web/docs/airtable-views.md) — **views are not exported from Airtable** (by policy); see [snapshots/README.md](../airtable/schema/snapshots/README.md) |

**Web env vars (Vercel project `127-si-shooting-challenge`, never commit values):**

`AIRTABLE_API_TOKEN`, `AIRTABLE_BASE_ID`, `NEXT_PUBLIC_BASE_PATH` (`/shoot`), `NEXT_PUBLIC_LANDING_URL`, `NEXT_PUBLIC_SITE_URL`

**Schema export PAT (`tools/airtable/.env`):** `AIRTABLE_TOKEN` or `AIRTABLE_API_TOKEN` with **`schema.bases:read`** (optional `data.records:read` for audits).

---

## Pipeline audit status (extension scripts)

Last verified clean on historical repair pass (re-run after bulk imports):

| Stage | Audit | Status |
|-------|-------|--------|
| F — Homework XP | `audit-homework-pipeline-integrity.js` | **0 issues** (12 `not_ready` expected) |
| G — Video upload | `audit-video-pipeline-integrity.js` | **0 issues** |
| H — Video XP | `audit-video-xp-pipeline-integrity.js` | **96 OK / 0 issues** (38 `not_ready` expected) |
| I — Achievements | `audit-achievement-xp-pipeline-integrity.js` | Run perfection pass — see [stage-j-legacy-cleanup.md](./airtable/stage-j-legacy-cleanup.md) |
| J — Legacy cleanup | `audit-field-coverage-report.js`, `audit-legacy-cleanup-candidates.js` | In progress |
| **Final 090** | `audit-final-090a` … `090g` (Active enrollments) | **Ready to run** |

Full order: [extension-scripts/audits/README.md](../airtable/extension-scripts/audits/README.md)

### Award Recipients close-out (2026-07-02)

| Check | Status |
|-------|--------|
| Extension scripts 1–6 (Airtable) | **Done** — recipients, goal/conquer, catalog, cart **70/$595**, 090F hygiene, **090G reviewed** |
| June 29 snapshot vs live (`compare_award_recipients_snapshot.py`) | **Done** — wrong award links 0, manual review 0, duplicates 0 |
| Goal Met vs Conquered Goal | **Done** — 14/14 aligned |
| Reference CSV | `Award Recipients-Grid view from June 29 FINAL.csv` (repo root) |
| **Post-close hygiene backlog** | [post-close-hygiene-2025-26.md](./post-close-hygiene-2025-26.md) — H-001 unlock dedupe, H-002 automation 066, scope/catalog cleanup |

**Note:** Re-linking wrong **Award** fields on historical rows fixed both the recipient table and Conquered Goal alignment (rows existed but pointed at homework/video/etc. before fix).

### Individual final summary emails (2026-07-03)

| Step | Status |
|------|--------|
| Template revision | **`final-summary-2026-07-03-v2`** (`preview_final_email.py`; Riley Geraghty reference) |
| Staged to WAS | **65** enrollments (`stage_final_emails_to_was.py --confirm-write`) |
| Skipped (≤ 50 shots) | **26** |
| Armed + sent via **074** | **53** families (`arm_final_emails_send.py --confirm-arm`) |
| Blocked (prior `Weekly Email Sent?`) | **12** — uncheck **Weekly Email Sent?** on WAS, re-arm if needed |

Reports: `tools/airtable/_preview/final-emails/stage-report-v2.json`, `arm-send-report.json`. Do **not** paste JSON into Airtable Scripting (use Python staging).

### Media & publicity (2026-07-04)

| Item | Status |
|------|--------|
| Top-level `media/` folder | **Done** — season layout under `media/2025-2026/` |
| 2025–26 newspapers | **10** regional packets in `media/2025-2026/newspapers/final-packets/` |
| 2025–26 radio | **12** kits in `media/2025-2026/radio/` |
| Build scripts | `tools/airtable/_build_*.py` → `media_paths.py` |
| Platform roadmap | **V2-028** — [media-kits.md](./media-kits.md), [ROADMAP](../media/2025-2026/future-enhancements/ROADMAP.md) |

---

## Vercel / web app

| Setting | Value |
|---------|--------|
| `NEXT_PUBLIC_BASE_PATH` | `/shoot` |
| `NEXT_PUBLIC_LANDING_URL` | `https://www.hoopchallenges.com` |
| `NEXT_PUBLIC_SITE_URL` | Production shoot URL (set in Vercel) |
| Local dev | `http://localhost:3001/shoot` |
| Health check | `GET /shoot/api/airtable` → `{ ok: true, airtable: { tokenValid: true } }` |
| Production status | Live at `/shoot` — Airtable token validated 2026-06-28 |
| CI | `.github/workflows/web.yml` (lint, typecheck, test on `web/**` changes) |

Deploy details: [deployment-notes.md](./deployment-notes.md), [web/docs/deployment-notes.md](../web/docs/deployment-notes.md)

---

## Softr vs this app

| System | Role today |
|--------|------------|
| **Softr.io** | Legacy public UI — still may be live for some views |
| **This web app** | Replacement in progress; `robots: noindex` until cutover |
| **Publish flag** | Airtable `OK to Publish on Softr` still used as public gate in queries |

Cutover checklist: Phase 6 in [web/docs/project-roadmap.md](../web/docs/project-roadmap.md)

---

## Make.com

| Scenario | Blueprint | Airtable scripts |
|----------|-----------|------------------|
| Upload Asset Engine | `make/blueprints/upload-asset-engine-v1.json` | 070a (homework), 070b (video) |
| Weekly summary email | *(export pending)* | 074 |
| Daily submission email | *(export pending)* | 077 |
| Homework parent feedback | *(webhook)* | 071 |
| Video parent feedback | *(webhook)* | 073 |

Upload ladder: [make/documentation/upload-asset-engine.md](../make/documentation/upload-asset-engine.md)

---

## Known exceptions (accepted)

- **Video / homework `not_ready_for_xp`** — Sophia retakes, pending review, do-not-award, testing rows (not data bugs).
- **Automation names in Airtable** — may differ from GitHub filenames; confirm in Airtable UI when debugging.
- **`referee-clinics/` route** — removed; JR Ref belongs in `127-si-jr-ref`.

---

## What to update when things change

| Event | Update |
|-------|--------|
| Audit pass completed | This file + `CHANGELOG.md` |
| New automation deployed | [automation-index.md](./automation-index.md) + [automation-trigger-map.md](../airtable/schema/current/automation-trigger-map.md) |
| Schema field/table change | `airtable/schema/current/` + new dated snapshot |
| New public page | [web/docs/site-hierarchy.md](../web/docs/site-hierarchy.md) + [web/docs/airtable-views.md](../web/docs/airtable-views.md) |
| Vercel env change | [deployment-notes.md](./deployment-notes.md) |
