# Project state — live snapshot

**Read this first** in new Cursor sessions. Update after major deploys, audit passes, or architecture changes.

Last updated: **2026-07-05** (Wave 2A planning complete; Phase 2 next sequence)

---

## V2 progress snapshot (2026-07-05)

| Milestone | Status |
|-----------|--------|
| **Wave 0 — 2025–26 close-out** | **Closed** — C-001, C-002, C-003, C-008, newspaper + radio outreach complete |
| **H-001 — 090F audit fix** | **Complete** — audit v1.1; shot milestones dedupe on Milestone Source Key; **0 data deleted** |
| **H-002 — Automation 066 v3.1** | **DEV ready** — OMNI confirmed automation ON; sandbox test **waiting** on enrollment `rec…` + expected milestone behavior from OMNI |
| **C-020 — Engineering Test Framework** | **Schema on DEV complete** — script **blocked** on **066 DEV audit** — [checklist](./deploy-checklists/C-020-testing-scenarios-script-checklist.md) |
| **Automation standards (doc 06)** | **Active** — 066 v3.1 canonical V2 rewrite pattern |
| **Multi-year architecture** | **Decided** — one base + **Program Instance** (not separate bases per year); **V2-013 queued** — do not implement until dedicated wave |
| **Phase 2 — Platform Modernization** | **Wave 2A planning complete** — [classification](./v2-014-wave-2a-classification.md); **implementation not started** (2b+) |
| **V2-015 — Development base** | **Ready** — DEV-first pipeline is permanent ([doc 04](./v2/04-ai-development-standards.md)) |
| **Wave 1** | Hygiene items done; **V2-001 base cutover deferred** pending V2-013 architecture wave |

**Engineering principle (H-001):** **Fix the audit, not the data** — see [v2/08-testing-standards.md](./v2/08-testing-standards.md).

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

### Production

| Item | Value |
|------|--------|
| Base name (Airtable UI) | `127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026` |
| Base ID | `appn84sqPw03zEbTT` |
| Role | **Live season** — system of record; V2-013 multi-year history |

### Development (V2-015)

| Item | Value |
|------|--------|
| Base name | `127SI - SHOOTING CHALLENGE - DEV` |
| Base ID | `appTetnuCZlCZdTCT` |
| Status | **Ready** — first testing environment for Phase 2 work |
| Clone + scrub | **2026-07-05** — production **unchanged** |
| Test enrollments retained | **6 total** — Schmidt/testing enrollment + **5** additional test enrollments |
| Test data scope (Mike 2026-07-05) | Test rows in **registrant/pipeline tables** only — Submissions, Submission Assets, Homework Completions, Video Feedback, XP Events, Weekly Athlete Summary, etc. **Not** config/reference tables (Milestones, Levels, Gates, XP Rules, Weeks, …). Document enrollment record IDs when OMNI exports them (C-019). |
| Setup runbook | [development-base-setup.md](./development-base-setup.md) |
| Architecture | [v2-015-development-base-architecture.md](./v2-015-development-base-architecture.md) |

**DEV is the first testing location for:**

- Automation **066 v3.1** — **ON in DEV** (OMNI confirmed); sandbox test **waiting on OMNI** test enrollment + expected milestone behavior (H-002)
- Automation merge experiments (V2-014)
- Schema changes (Stage K, C-026, etc.)
- Extension backfills (`CONFIRM_WRITE` rehearsal)
- **C-020** Engineering Test Framework — **Testing Scenarios** DEV schema complete; script blocked until **066 DEV** passes
- Make dry-runs (when dev scenarios configured)

**V2-015 completion gate:** base ID recorded ✓ · **066 ON in DEV** ✓ · **066 sandbox test** — waiting on OMNI enrollment `rec…` + expected milestone behavior · webhook/Make isolation — verify per runbook

### Phase 2 next sequence (locked 2026-07-05)

| # | Step |
|---|------|
| 1 | **066 DEV sandbox test** — **waiting on OMNI** (enrollment `rec…` + expected milestone behavior) |
| 2 | After DEV pass → Mike decides **066 prod promote** |
| 3 | Approved prod maintenance window → delete **112**, retire **043** |
| 4 | **C-020** — DEV **Testing Scenarios** schema done; Cursor script **after** **066 DEV pass** | DEV |

**Testing architecture (OMNI correction):** No test flags on pipeline tables — [testing-and-intake-architecture.md § OMNI correction](./testing-and-intake-architecture.md#omni-correction--rejected-2026-07-05).

**Deploy rule:** GitHub → paste **dev** → audit → approve → paste **prod** → `CHANGELOG.md`.

### Schema (production export)

| Item | Value |
|------|--------|
| Tables (schema export) | **29** (see `base_summary_*_20260629_045741.json`) |
| Schema snapshot (latest) | `airtable/schema/snapshots/` — **`20260629_045741`** + `manifest_appn84sqPw03zEbTT_latest.json` |
| Hand-maintained maps | `airtable/schema/current/` |
| Web view docs | [web/docs/airtable-views.md](../web/docs/airtable-views.md) — **views are not exported from Airtable** (by policy); see [snapshots/README.md](../airtable/schema/snapshots/README.md) |

**Web env vars (Vercel project `127-si-shooting-challenge`, never commit values):**

`AIRTABLE_API_TOKEN`, `AIRTABLE_BASE_ID` (**production only on Vercel**), `NEXT_PUBLIC_BASE_PATH` (`/shoot`), `NEXT_PUBLIC_LANDING_URL`, `NEXT_PUBLIC_SITE_URL`

**Local / tools:** optional dev base via `web/.env.local` or `tools/airtable/.env` — see [development-base-setup.md](./development-base-setup.md).

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
| **Final 090** | `audit-final-090a` … `090g` (Active enrollments) | **090A–090E PASS** · **090F PASS** (v1.1, 2026-07-05) · 090G historical weekly gaps only |

Full order: [extension-scripts/audits/README.md](../airtable/extension-scripts/audits/README.md)

### Award Recipients close-out (2026-07-02)

| Check | Status |
|-------|--------|
| Extension scripts 1–6 (Airtable) | **Done** — recipients, goal/conquer, catalog, cart **70/$595**, 090F hygiene, **090G reviewed** |
| June 29 snapshot vs live (`compare_award_recipients_snapshot.py`) | **Done** — wrong award links 0, manual review 0, duplicates 0 |
| Goal Met vs Conquered Goal | **Done** — 14/14 aligned |
| Reference CSV | `Award Recipients-Grid view from June 29 FINAL.csv` (repo root) |
| **Post-close hygiene backlog** | [post-close-hygiene-2025-26.md](./post-close-hygiene-2025-26.md) — **H-001 done** (audit fix) · **H-002 GitHub done** (066 v3.1, paste pending) · H-003/H-004 deferred |

**Note:** Re-linking wrong **Award** fields on historical rows fixed both the recipient table and Conquered Goal alignment (rows existed but pointed at homework/video/etc. before fix).

### Individual final summary emails (2026-07-05 — complete)

| Step | Status |
|------|--------|
| Template revision | **`final-summary-2026-07-03-v2`** |
| Staged + sent via **074** / Make | **Done** — Mike confirmed all final summary emails sent **2026-07-05** |
| Prior partial run (2026-07-03) | 53 armed first batch; remaining families completed in follow-up |

Reports (historical): `tools/airtable/_preview/final-emails/stage-report-v2.json`, `arm-send-report.json`.

### Wave 0 close-out (2026-07-05 — **closed**)

| ID | Status |
|----|--------|
| C-001 Lyle Kimm shots | **Done** |
| C-002 Final summary emails | **Done** |
| C-003 Koen HW17 review + email | **Done** |
| C-008 Fillout off | **Done** |
| Newspaper + radio outreach | **Done** |

**Wave 0 is closed.** No further close-out work in this wave.

**Live re-audit (2026-07-05):** 090A–090E **PASS** · 090F **PASS** (v1.1 — Milestone Source Key dedupe) · 090G historical weekly gaps only (close-out complete).

### Post-close hygiene (Wave 1)

| ID | Status |
|----|--------|
| H-001 090F audit | **Done** — fix audit, not data; 0 rows deleted |
| H-002 Automation 066 v3.1 | **GitHub done** — V2 reference; **Airtable paste not done** |
| H-003 / H-004 | Deferred (scope metadata, catalog bucket) |

### V2 automation standard

| Item | Status |
|------|--------|
| **066 v3.1** | First V2-standard automation — SCRIPT/CONFIG split, batched writes, Week resolution, idempotent Source Key |
| **Doc 06** | [v2/06-automation-standards.md](./v2/06-automation-standards.md) **Active** — 066 is canonical template |
| **Commit** | `45b17d7` — `docs: set 066 v3.1 as V2 automation standard` |

### Automation capacity (V2-014)

| Item | Status |
|------|--------|
| **Airtable limit** | 50 automations per base |
| **GitHub scripts** | 46 numbered files (`012` gap — deleted in Airtable) |
| **012** | **Deleted** — legacy, unused (+1 slot) |
| **112** | **OFF** — monitor before delete; **013** is production Video Feedback path |
| **066 deploy** | v3.1 — **DEV paste/test** ([checklist](./deploy-checklists/066-v3.1-dev-deploy.md)); prod after pass |
| **Roadmap** | [v2-014-automation-modernization-roadmap.md](./v2-014-automation-modernization-roadmap.md) — complexity-first modernization; Category A–F; capacity secondary |
| **Dev base (V2-015)** | **Ready** — `appTetnuCZlCZdTCT`; 6 test enrollments; prod unchanged; **not complete** until 066 dev test |

### Multi-year architecture (2026-07-05 decision)

| Decision | Detail |
|----------|--------|
| **One Airtable base** | Multiple program years in same base — **not** separate bases per season |
| **Season identifier** | **Program Instance** (org table; e.g. `Shooting Challenge \| 2025-2026`) — not a new Program Year table |
| **Historical accuracy** | Config changes must not alter historical reports |
| **Backlog** | **V2-013** — Program Instance integration; **queued**; dedicated future wave only |
| **Do not implement now** | 2026–2027 config mixed with production — requires architecture wave, not incremental edits |
| **Prior plan** | Archive + clone ([base-cutover](./shooting-challenge-v2-base-cutover.md)) **superseded** by V2-013 direction |

**Program Instance investigation (read-only, 2026-07-05):** Reviewed Shot Milestones, Levels, Level Gate Rules, XP Reward Rules, Achievements, Weeks, Awards. No records modified; no Program Instance links created. 125% milestone briefly added; 120% rows restored Active; 125% rows reserved for future config.

---

| Step | Status |
|------|--------|
| Fillout daily submission form | **OFF** — contest intake closed (**C-008** done) |

### Media & publicity (2026-07-05)

| Item | Status |
|------|--------|
| Top-level `media/` folder | **Done** — season layout under `media/2025-2026/` |
| 2025–26 radio | **12** kits in `media/2025-2026/radio/` — **station outreach emails sent 2026-07-05** |
| 2025–26 newspapers | **10** regional packets — **articles completed and sent 2026-07-05** |
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
| V2 milestone (wave close, hygiene, architecture decision) | This file + [v2-change-backlog.md](./v2-change-backlog.md) + [CHATGPT-MASTER-PLAN-BRIEF.md](./CHATGPT-MASTER-PLAN-BRIEF.md) |
| New automation deployed | [automation-index.md](./automation-index.md) + [automation-trigger-map.md](../airtable/schema/current/automation-trigger-map.md) |
| Schema field/table change | `airtable/schema/current/` + new dated snapshot |
| New public page | [web/docs/site-hierarchy.md](../web/docs/site-hierarchy.md) + [web/docs/airtable-views.md](../web/docs/airtable-views.md) |
| Vercel env change | [deployment-notes.md](./deployment-notes.md) |
