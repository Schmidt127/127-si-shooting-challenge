# Project state — live snapshot

**Read this first** in new Cursor sessions. Update after major deploys, audit passes, or architecture changes.

Last updated: **2026-07-18** (C-025: 115 v1.4 ETF scenario `C025_STAGE17_DOWNSTREAM` repo-ready — Mike paste 115 + Run Test? card)

**Engineering law:** [ENGINEERING_CONSTITUTION.md](./ENGINEERING_CONSTITUTION.md)
**New session:** [SESSION_HANDOFF-2026-07-06.md](./SESSION_HANDOFF-2026-07-06.md)
**Known issues:** [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)
**Softr cutover:** [deploy-checklists/SOFTR-CUTOVER-READINESS.md](./deploy-checklists/SOFTR-CUTOVER-READINESS.md)

> **Do not treat** [agent-runs/CONTROL.json](./agent-runs/CONTROL.json) as live production truth. CONTROL is for four-agent run coordination only. This file and git `origin/master` are the ops snapshot.

---

## Production commit and URLs

| Item | Value |
|------|--------|
| **Production branch** | `master` |
| **Current production commit** | `bd2c2b4` — *Merge shooting challenge reliability and web readiness improvements* |
| **Public URL** | https://www.hoopchallenges.com/shoot |
| **Local dev** | http://localhost:3001/shoot |
| **Health check** | `GET /shoot/api/airtable` → `{ ok: true, airtable: { tokenValid: true } }` |
| **Vercel root** | `web/` |
| **CI** | `.github/workflows/web.yml` (lint, typecheck, test on `web/**` changes) |

Verify with: `git fetch origin && git rev-parse origin/master`

---

## V2 progress snapshot

| Milestone | Status |
|-----------|--------|
| **Wave 0 — 2025–26 close-out** | **Closed** — C-001, C-002, C-003, C-008, newspaper + radio outreach complete |
| **H-001 — 090F audit fix** | **Complete** |
| **H-002 — Automation 066 v3.2** | **DEV + PROD pasted** (2026-07-06) — live OMNI sandbox still **pending** (offline harness PASS 2026-07-16) |
| **C-013 — Video upload Lambda** | **COMPLETE** (2026-07-11) — 070b v4.4 + 070c v1.1 PROD E2E PASS |
| **C-020 — Engineering Test Framework** | Schema on DEV complete — pipeline-ready Fillout-shaped Submission still blocking live sequencing |
| **C-025 — Zoom recording credit** | **Stage 17:** 057/042 pasted · **115 v1.4** ETF scenario `C025_STAGE17_DOWNSTREAM` (`recEuHFTjBftoJGMc`) · [ETF packet](./deploy-checklists/C-025-stage17-etf-downstream-dev-packet.md) · 117 OFF |
| **C-011 — Automatic weekly email** | **Repo ready** (118/119 dry-run default + 072/074 patches) — **DEV paste pending**; schedules **must stay off**; Make webhook live-blocked |
| **Automation standards (doc 06)** | **Active** — **066 v3.2** current V2 rewrite reference |
| **Multi-year architecture** | **Decided** — one base + Program Instance; **V2-013 queued** |
| **Phase 2 — Platform Modernization** | Wave 2A planning + Phase 2B docs complete — implementation staged via backlog |
| **V2-015 — Development base** | **Ready** — DEV-first pipeline permanent |

---

## Repos and public URLs

| Program | GitHub repo | Public URL | Vercel root |
|---------|-------------|------------|-------------|
| **Hoop Challenges landing** | `hoopchallenges-landing` | https://www.hoopchallenges.com | landing project |
| **Shooting Challenge** (this repo) | `127-si-shooting-challenge` | https://www.hoopchallenges.com/shoot | `web/` |
| **JR Referee Clinics** | `127-si-jr-ref` (separate) | `/refclinic` on landing | separate project |

This repo is **Shooting Challenge only** — not the multi-program hub.

---

## Airtable — Shooting Challenge

### Production

| Item | Value |
|------|--------|
| Base name (Airtable UI) | `127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026` |
| Base ID | `appn84sqPw03zEbTT` |
| Role | **Live season** — system of record |

### Development (V2-015)

| Item | Value |
|------|--------|
| Base name | `127SI - SHOOTING CHALLENGE - DEV` |
| Base ID | `appTetnuCZlCZdTCT` |
| Status | **Ready** — first testing environment |
| Setup | [development-base-setup.md](./development-base-setup.md) |

**Deploy rule:** GitHub → paste **dev** → audit → approve → paste **prod** → `CHANGELOG.md`.

### Schema documentation (important)

| Location | Status |
|----------|--------|
| `airtable/schema/current/` | **Stale** — hand-maintained maps; **do not treat as current** until Agent A refreshes |
| Latest dated snapshot (treat as current until refresh) | **`airtable/schema/snapshots/prod-20260706/`** (prod) and **`dev-20260706/`** (DEV) — export stamp `20260706_161830` / `20260706_161606` |
| Older loose exports | Root of `snapshots/` includes `20260629_045741` and earlier |

**Agent A** owns refreshing `airtable/schema/**`. Agent B documented staleness only. Lead integration did **not** refresh schema snapshots or claim live XP Reward Rules verification (offline fixture verifier only).

### Schema snapshot counts (2026-07-06 export notes)

| Base | Folder | Tables | Views |
|------|--------|--------|-------|
| **Production** | `airtable/schema/snapshots/prod-20260706/` | **29** | **118** |
| **Development** | `airtable/schema/snapshots/dev-20260706/` | **30** | **120** |

DEV-only table vs prod: **Testing Scenarios** (C-020). See [snapshots/README.md](../airtable/schema/snapshots/README.md).

---

## Intake and upload status

| Workflow | Status |
|----------|--------|
| **Fillout daily submission form** | **OFF** — contest intake closed (**C-008** done 2026-07-05) |
| **Video upload (070b/070c + Lambda)** | **PROD complete** — async `Accepted` handoff verified 2026-07-11 |
| **Homework upload (070a)** | **PROD intentionally OFF** — keep OFF per [v2/AUTOMATION_070A_LAUNCH_DECISION.md](./v2/AUTOMATION_070A_LAUNCH_DECISION.md); DEV package exists separately |
| **C-023 Drive/attachment retirement** | Deferred |

---

## C-025 — Zoom recording credit

| Item | Status |
|------|--------|
| Architecture | **Stage 17 Zoom Attendance** — 117 Orchestrator + **057/042 combined Zoom credit** (repo) |
| Hard rule | **Never** write `Zoom Meetings.Attendees` (101 double-credit risk) |
| Scripts | 117 **v1.1.1** (OFF) · **057 v1.3** · **042 v3.1** — [PW/gate packet](./deploy-checklists/C-025-stage17-perfect-week-level-gate-dev-installation-packet.md) |
| DEV XP Source option | **`Zoom Meeting Recording Quiz`** added (2026-07-18) |
| DEV preflight | **PASS** — ZA 22/22; `ZOOM_ATTEND_BASE` = 60; Config % = 50 → expect **30** XP |
| Live DEV paste | **057 v1.3 · 042 v3.1 · 117 v1.1.1 OFF** · **115 v1.4** ETF scenario ready ([packet](./deploy-checklists/C-025-stage17-etf-downstream-dev-packet.md)) · scenario row `recEuHFTjBftoJGMc` |
| Live PROD | **Blocked** — untouched; **101 unchanged** |
| Downstream gaps | ETF live run pending Mike: paste 115 v1.4 → ON 057/042 → Run Test? → OFF |
| Packet | [recording](./deploy-checklists/C-025-stage17-zoom-recording-dev-installation-packet.md) · [PW/gate](./deploy-checklists/C-025-stage17-perfect-week-level-gate-dev-installation-packet.md) |
| Results | [C-025-stage17-dev-install-results-2026-07-18.md](./deploy-checklists/C-025-stage17-dev-install-results-2026-07-18.md) |

---

## C-011 — Automatic weekly parent email

| Item | Status |
|------|--------|
| Scripts | **118 / 119** schedule arm + **072 / 074** patches — repository ready |
| DEV paste | **Pending** |
| Schedules | **Must remain OFF** until Mike authorizes |
| Make DEV webhook | **Live-blocked** / requires approval |
| Packet | [C011_AUTOMATIC_WEEKLY_EMAIL_DEV_INSTALL.md](./v2/C011_AUTOMATIC_WEEKLY_EMAIL_DEV_INSTALL.md) |
| Activation checklist | [C-011-weekly-email-schedule-activation-checklist.md](./deploy-checklists/C-011-weekly-email-schedule-activation-checklist.md) — keep schedules off until authorized |

Manual Build/Send checkboxes remain the production path today.

---

## Vercel / web app

| Setting | Value |
|---------|--------|
| `NEXT_PUBLIC_BASE_PATH` | `/shoot` |
| `NEXT_PUBLIC_LANDING_URL` | `https://www.hoopchallenges.com` |
| `NEXT_PUBLIC_SITE_URL` | Production shoot URL (set in Vercel) |
| `NEXT_PUBLIC_GAME_MANUAL_URL` | Optional — game manual embed URL |
| `SITE_ACCESS_TOKEN` | Optional preview gate (middleware + `/api/airtable`) |
| `AIRTABLE_API_TOKEN` / `AIRTABLE_BASE_ID` | Server-only; **production base on Vercel** |
| Local / tools DEV base | `web/.env.local` or `tools/airtable/.env` |

Deploy details: [deployment-notes.md](./deployment-notes.md), [web/docs/deployment-notes.md](../web/docs/deployment-notes.md)

### Current web routes (`/shoot` prefix)

| Route | Status |
|-------|--------|
| `/`, `/leaderboard`, `/homework`, `/homework/[id]` | Live (Airtable) |
| `/tutorials`, `/shoutouts`, `/articles` (+ detail) | Live (Airtable + Softr publish gate) |
| `/zoom-meetings`, `/levels`, `/achievements`, `/game-manual`, `/public-display` | Live |
| `/dashboard` | Live demo — **mock adapter** (no auth) |
| `/athletes/[slug]` | Demo/mock — slug resolution incomplete |
| `/admin` | Placeholder — roadmap only; **no write controls**; no sensitive diagnostics without auth |
| `/api/airtable` | Health check only |

Canonical map: [web/docs/site-hierarchy.md](../web/docs/site-hierarchy.md)
Admin roadmap: [web/docs/admin-roadmap.md](../web/docs/admin-roadmap.md)

### Admin page status

`/shoot/admin` is a **placeholder**. No staff authentication is wired. Until auth exists, the page must not expose private participant diagnostics. Safe future work: read-only health + aggregate pipeline readiness behind `SITE_ACCESS_TOKEN` or staff SSO — see admin roadmap.

---

## Softr vs Next.js (dual-state)

| System | Role today |
|--------|------------|
| **Softr.io** | Legacy public UI — still may serve some participant views |
| **This Next.js app** | Replacement in progress at `/shoot` |
| **SEO** | Sitewide `robots: noindex` until cutover approval |
| **Publish flag** | Airtable `OK to Publish on Softr` still gates public catalog queries |

**Do not remove `noindex` or perform cutover** without explicit Mike approval. Checklist: [SOFTR-CUTOVER-READINESS.md](./deploy-checklists/SOFTR-CUTOVER-READINESS.md)

---

## Make.com (summary)

| Scenario | Status |
|----------|--------|
| **PROD Upload Engine — Lambda v1** (video) | **Live** — 070b/070c |
| Homework upload (070a) | PROD **OFF** |
| Weekly summary email | Manual 072→074 path; C-011 automation pending |
| Daily / homework / video parent emails | Make webhooks + Airtable scripts |

---

## Pipeline audit status (extension scripts)

Last verified clean on historical repair pass (re-run after bulk imports):

| Stage | Status |
|-------|--------|
| F — Homework XP | **0 issues** (expected `not_ready` rows) |
| G — Video upload | **0 issues** |
| H — Video XP | **0 issues** (expected `not_ready`) |
| I — Achievements | Perfection pass / in progress |
| J — Legacy cleanup | In progress |
| **Final 090** | 090A–090E PASS · 090F PASS (v1.1) · 090G historical weekly gaps only |

---

## Current known risks (summary)

Full register: [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)

| Severity | Theme |
|----------|--------|
| High | 066 live OMNI sandbox still unconfirmed; automation version inventory largely UNKNOWN in live bases; athlete E2E matrix mostly untested |
| Medium | C-025 not installed; C-011 not live; 070a homework PROD off; web auth/dashboard incomplete; Softr dual-run |
| Low | Root marketing URL depends on landing hub; GitHub trigger headers often “confirm in Airtable” |

---

## Tests and build status (web)

Run from `web/`:

| Command | Expectation |
|---------|-------------|
| `npm test` | Vitest unit tests (mappers, security, formatters, route/config helpers) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint flat config (`eslint .`) |
| `npm run build` | Next.js production build |

CI mirrors lint / typecheck / test on `web/**` changes. Record results in the Agent B delivery report when refreshing this file.

---

## Known exceptions (accepted)

- **Video / homework `not_ready_for_xp`** — Sophia retakes, pending review, do-not-award, testing rows (not data bugs).
- **Automation names in Airtable** — may differ from GitHub filenames; confirm in Airtable UI when debugging.
- **`referee-clinics/` route** — removed; JR Ref belongs in `127-si-jr-ref`.

---

## What to update when things change

| Event | Update |
|-------|--------|
| Audit pass completed | This file + `CHANGELOG.md` + [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) |
| V2 milestone | This file + [v2-change-backlog.md](./v2-change-backlog.md) |
| New automation deployed | [automation-index.md](./automation-index.md) (Agent A) |
| Schema field/table change | Dated snapshot under `airtable/schema/snapshots/` (Agent A) — then refresh `current/` |
| New public page | [web/docs/site-hierarchy.md](../web/docs/site-hierarchy.md) |
| Vercel env change | [deployment-notes.md](./deployment-notes.md) |
| Softr cutover step | [SOFTR-CUTOVER-READINESS.md](./deploy-checklists/SOFTR-CUTOVER-READINESS.md) |
