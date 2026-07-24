# Project state — live snapshot

**Read this first** in new Cursor sessions. Update after major deploys, audit passes, or architecture changes.

Last updated: **2026-07-24** (PR #41 Season Launch rebased on merged PR #40; Softr Obsolete; C-011 weekly email Live; **118/119 ON**)

**Engineering law:** [ENGINEERING_CONSTITUTION.md](./ENGINEERING_CONSTITUTION.md)
**New session:** [SESSION_HANDOFF-2026-07-06.md](./SESSION_HANDOFF-2026-07-06.md)
**Known issues:** [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)
**Softr:** Obsolete / Not Used — Historical Reference Only: [deploy-checklists/SOFTR-CUTOVER-READINESS.md](./deploy-checklists/SOFTR-CUTOVER-READINESS.md)

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
| **H-002 — Automation 066 v3.3** | **Installed in PROD** (2026-07-24) — repo + docs v3.3 (link-ID grade-band match); live OMNI/natural Schmidt proof still open (offline harness historically PASS) |
| **C-013 — Video upload Lambda** | **COMPLETE** (2026-07-11) — 070b v4.4 + 070c v1.1 PROD E2E PASS |
| **C-020 — Engineering Test Framework** | Schema on DEV complete — pipeline-ready Fillout-shaped Submission still blocking live sequencing |
| **C-025 — Zoom recording credit** | **Stage 17 COMPLETE** — rollup `ARRAYJOIN(ARRAYUNIQUE(values), "\n")`; conflict PASS (ZA `recfqsgM7zDobxsPf` Conflict=1/Approved=0; XP `recOceuW34jQz7suD` inactive); **117 / 057 / 042 ON**; 101 unchanged; webhook blank ([live](./deploy-checklists/C-025-stage17-prod-live-2026-07-20.md) · [progress](./status/C-025-stage17-current-prod-progress.md)) |
| **C-011 — Automatic weekly email** | **PROD E2E PASS** (2026-07-24) — flow `118→072 v4.0→119→074→Make Bulk Email May 18→Gmail`; empty-week **`send_short`** verified; **074 PROD sendMode=Live** (never fixed Test) + Make Live writeback (`Sent?` / status / timestamp) **PASS**; **118/119 schedules ON** (Sun 5:00 / 10:00 AM America/Denver); 072+074+Make **ON**; architecture [WAS-WEEKLY-EMAIL-ARCHITECTURE.md](./next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md) |
| **Automation standards (doc 06)** | **Active** — **066 v3.3** current V2 rewrite reference (v3.2 Week date-key retained in history) |
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
| Architecture | **Stage 17 Zoom Attendance** — 117 Orchestrator + **057/042 combined Zoom credit** |
| Hard rule | **Never** write `Zoom Meetings.Attendees` (101 double-credit risk) |
| Preconflict rollup | **`ARRAYJOIN(ARRAYUNIQUE(values), "\n")`** (PROD verified) |
| Scripts | 117 **v1.1.1** (**ON**) · **057 v1.3** (**ON**) · **042 v3.1** (**ON**) · **101 unchanged** |
| PROD Stage 17 | **COMPLETE 2026-07-20** — Conflict PASS; webhook **blank** (email deferred) · **115 not installed** |
| Final verify | ZA `recfqsgM7zDobxsPf` Conflict=1 / Approved=0; XP `recOceuW34jQz7suD` inactive; LIVE+REC tags present |
| Immediate rollback | Attendees write from recording; dup `ZOOM_CREDIT`; live XP rewrite; unexpected email; 115 in PROD — [rollback](./deploy-checklists/C-025-stage17-rollback-plan.md) |
| Packet | [live](./deploy-checklists/C-025-stage17-prod-live-2026-07-20.md) · [progress](./status/C-025-stage17-current-prod-progress.md) · [verification](./deploy-checklists/C-025-stage17-prod-117-verification-2026-07-20.md) |

---

## C-011 — Automatic weekly parent email

| Item | Status |
|------|--------|
| Scripts | **118 v1.4 / 119 v1.4 / 072 v4.0 / 074 v2.1** — installed + live-proven |
| PROD schedules | **ON** — 118 Sun 5:00 AM Denver; 119 Sun 10:00 AM Denver (**verified_prod** 2026-07-24) |
| 072 / 074 / Make | **ON** — Make `Weekly Athlete Summary - Bulk Email - May 18` |
| 074 sendMode | **Live** (or blank + WAS Live) — **never** fixed Test |
| Live writeback | **PASS** — `Weekly Email Sent?`, `Make Send Status=Sent`, timestamp |
| Architecture | [WAS-WEEKLY-EMAIL-ARCHITECTURE.md](./next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md) |
| Activation checklist | [C-011-weekly-email-schedule-activation-checklist.md](./deploy-checklists/C-011-weekly-email-schedule-activation-checklist.md) — activation **COMPLETE** |
| Stale OFF notes | Superseded — see [STALE-CLAIM-CORRECTION.md](./next-wave/reliability-audit-2026-07-24/STALE-CLAIM-CORRECTION.md) |

Manual Build/Send checkboxes remain available for controlled one-offs; scheduled path is the production path.

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

## Front end (Softr Obsolete)

| System | Role today |
|--------|------------|
| **Softr.io** | **Obsolete / Not Used** — Historical Reference Only — not a season-launch gate |
| **This Next.js app** | Replacement in progress at `/shoot` |
| **SEO** | Sitewide `robots: noindex` until cutover approval |
| **Publish flag** | Field may still be named `OK to Publish on Softr` (SC-144 rename) — not an active Softr dependency |

**Do not remove `noindex` or perform cutover** without explicit Mike approval. Checklist: [SOFTR-CUTOVER-READINESS.md](./deploy-checklists/SOFTR-CUTOVER-READINESS.md)

---

## Make.com (summary)

| Scenario | Status |
|----------|--------|
| **PROD Upload Engine — Lambda v1** (video) | **Live** — 070b/070c |
| Homework upload (070a) | PROD **OFF** |
| Weekly summary email | Verified `118→072→119→074→Make Bulk Email May 18`; **118/119 schedules ON**; 072+074+Make ON; RCC monitors writeback mismatches |
| Daily / homework / video parent emails | Make webhooks + Airtable scripts |

---

## Reliability Command Center

| Item | Status |
|------|--------|
| Repository framework | **Built / Tested** — `lib/reliability-command-center/`, CLI + dry-run repair preview |
| Docs | [reliability-command-center/README.md](./reliability-command-center/README.md) |
| Install packet | [deploy-checklists/RELIABILITY-COMMAND-CENTER-PRODUCTION-INSTALL.md](./deploy-checklists/RELIABILITY-COMMAND-CENTER-PRODUCTION-INSTALL.md) — **Ready for Production Installation** (views) |
| Airtable Interface / views | **Designed** only — **not installed** (MVP = Weekly Email Health + P0 views; no new fields) |
| Live PROD export audit | Not yet run — required before SC-147 → Live Tested |
| Complements | Agent 1+2 reliability audit docs (merged via go-live); does not duplicate ownership/trust-band packets |

```bash
node tests/reliability-command-center/run-all.js
node tools/reliability-command-center/cli.js --fixture tests/reliability-command-center/fixtures/mixed-health.json --output /tmp/rcc
```

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
| **RCC (repo)** | Offline fixture suite PASS — complements Stages F–J; does not replace in-base audits |

---

## Current known risks (summary)

Full register: [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)

| Severity | Theme |
|----------|--------|
| High | 066 live OMNI sandbox still unconfirmed; automation version inventory largely UNKNOWN in live bases; athlete E2E matrix mostly untested |
| Medium | C-025 Stage 17 COMPLETE (email webhook still deferred); C-011 weekly email Live path proven (118/119 ON); 070a homework PROD off; web auth/dashboard incomplete; Softr Obsolete / Not Used |
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
