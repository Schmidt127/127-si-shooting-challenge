# Project state — live snapshot

**Primary current-state document:** [`CURRENT-TRUTH.md`](./CURRENT-TRUTH.md) — read that first for branch/SHA, bases, email plane, automation overlays, and work ledger. This file is the detailed ops companion.

Update after major deploys, audit passes, or architecture changes.

Last updated: **2026-08-24** (weekly-summary E2E live-tested — documentation closeout)

**Release status authority:** [`SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](./SHOOTING_CHALLENGE_COMPLETION_MASTER.md)
**Authority map:** [`AUTHORITY-MAP.md`](./AUTHORITY-MAP.md)
**Integrity / security:** [`REPOSITORY-INTEGRITY-AUDIT.md`](./REPOSITORY-INTEGRITY-AUDIT.md) · [`SECURITY-AND-SENSITIVE-FILES.md`](./SECURITY-AND-SENSITIVE-FILES.md)
**Current reconciliation:** [`prod-completion/2026-08-16/SC-2026-08-16-CURRENT-STATE-RECONCILIATION.md`](./prod-completion/2026-08-16/SC-2026-08-16-CURRENT-STATE-RECONCILIATION.md) (path evidence 2026-08-16; **022 live version superseded** — see overlay below)

**Engineering law:** [ENGINEERING_CONSTITUTION.md](./ENGINEERING_CONSTITUTION.md)
**New session:** [SESSION_HANDOFF-2026-07-06.md](./SESSION_HANDOFF-2026-07-06.md)
**Known issues:** [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)
**Softr:** Obsolete / Not Used — Historical Reference Only: [deploy-checklists/SOFTR-CUTOVER-READINESS.md](./deploy-checklists/SOFTR-CUTOVER-READINESS.md)
**Launch certification:** [launch-certification/START-HERE.md](./launch-certification/START-HERE.md)

> **Do not treat** this repository file, `CONTROL.json`, or any dated packet as live production truth. Current Airtable, Fillout, Make, Gmail, Lambda, and Vercel state must be verified in those systems. This file is a live-ops pointer; the Completion Master owns release status.

> **Obsolete Production `Automations` table:** Not an authority source — never use for V2 audits or ops decisions ([`CURRENT-TRUTH.md`](./CURRENT-TRUTH.md)).

**C-028 overlay (Mike 2026-08-19):** Tremendous sandbox send validated; production API pending; Make scenario OFF. See [`integrations/tremendous-award-fulfillment.md`](./integrations/tremendous-award-fulfillment.md).

**Email overlay (Mike 2026-08-19):** Make.com does not handle any Shooting Challenge emails. All of those emails go through Resend (Communications Hub). See [`integrations/email-send-plane.md`](./integrations/email-send-plane.md). Automation **077** (Make daily send) is **deleted from Production** (2026-08-13 docs); daily path is **076 → 079 → Hub → Resend**.

**022 overlay (Mike 2026-08-19):** Production Airtable Automation 022 is **v2.1**. The 2026-08-16 packet’s v2.0 claim is historical for that day’s controlled path.

**020 overlay (Mike 2026-08-19, superseded for version string):** Historical note said Production 020 was **v3.6**. **Final 2026-08-21 verification: Production 020 = v3.7.**

**070b overlay (Mike 2026-08-19, v4.7 confirm 2026-08-21):** Production Airtable Automation 070b is **v4.7** (`fetch` replaces undefined `remoteFetchAsync`). GitHub synced 2026-08-21. C-013 **v4.4** E2E (2026-07-11) remains historical proof of the prior upload route; **v4.6** was Program Instance season cross-check.

**Lambda season overlay (Mike-requested 2026-08-19):** `127si-upload-asset` CodeOnly deploy succeeded (CodeSha256 `lwbLiBzB4cfWdzVmIVo7Z78AkiowqPuV2NmUXb+PK2w=`). Program Instance school-year resolution is live in code. Optional retry proof and secret rotation still open. [checklist](./deploy-checklists/2026-08-17-lambda-program-instance-season.md).

**117 overlay (final 2026-08-21):** Production Automation 117 is **v2.1 Live** — Hub handoff with dynamic inputs `recordId`, `enrollmentRid`, `zoomMeetingRid`. Creates Email Handoff Queue only; **079** → Hub → Resend. Not XP credit. Not Make 117f. Not the Stage 17 orchestrator. Older “Off / Orchestrator Name” notes are historical.

**066 overlay (Mike 2026-08-19):** Production Automation 066 is **v3.8**. Historical v3.3 failure / v3.4–v3.5 proofs remain history.

**010 overlay (2026-08-23 API read):** Production Automations Code column = **v10.10**. GitHub = **v10.12**. Paste needed per [`deploy-checklists/010-v10.12-formula-settlement-grace.md`](./deploy-checklists/010-v10.12-formula-settlement-grace.md). Prior v10.11 run-history note remains historical.

**057 overlay (2026-08-23 API read):** Production Automations Code column = **v1.8**. GitHub = **v1.9**. Paste needed per [`deploy-checklists/057-v1.9-goal-settlement-fix.md`](./deploy-checklists/057-v1.9-goal-settlement-fix.md).

**072 overlay (2026-08-24):** Production **072 v4.7**, **074 v3.3**, **079 v2.5** — weekly-summary E2E **live-tested** on disposable WAS `recdj8MD0szplMW5r` (Test Mode → Hub → Resend). Verified: 7/7 shooting days, 4/7 PW days, 48,066 shots, 1,280 XP, 40 events, 150%+, 8 videos, Attended, Homework Complete. Closeout: [`deploy-checklists/2026-08-24-weekly-email-e2e-closeout.md`](./deploy-checklists/2026-08-24-weekly-email-e2e-closeout.md). Historical WAS `reczxTIpVI8ZJLex0` and queue proof `recoikFrli3m0xDRa` preserved.

**065/066 overlay (2026-08-24):** Production automations **065** and **066** have **hardcoded reference `recordId`** in script inputs — disposable fixture XP settlement required canonical manual writes. **Not solved** for fixture automation triggering; follow-up engineering item (`optional/future`).

**Submission XP repair (2026-08-23):** Authorized idempotent repair created then **deleted** `SUBMISSION_XP` for submissions `rece0krfrEqiUEBVu`, `rec3zlR7xneAOatKh`, `recNqAXXzXAnac1GE`, `recLD7Fb6ph0yovyq` (XP Events `recWV95wEywdDJRO2`, `rec4M2QFrJFhSnvSG`, `recwWLcTOnTBQAwHo`, `recObGIdFNx7bfTMp`). Post-deletion reconciliation: Perfect Week **PASS**; Xavier/Testing3/Curtis show expected missing-XP **FINDING** (not recreated). Disposable live-create **PASS** on Testing3.

**Autonomous QA harness (2026-08-23):** `tools/testing/autonomous-qa-run.mjs` — `--live-create` uses `Count It` + extended poll; manifest at `docs/testing/autonomous-qa/latest-manifest.json`.

**Video XP / PKG-007 proof (2026-08-23):** PKG-006R/PKG-036 locks remain **complete**. Automations **113 v6.4** and **114 v6.1** are **Live**. **Controlled lifecycle proof PASS** — run `AUTONOMOUS_VIDEO_QA_20260823_164549` on Testing3 Schmidt (`recNu6fcBpF1GG3u5`): award/replay/withdrawal/restoration + 10 negative fail-closed cases. Report: [`testing/autonomous-qa/PKG-007_VIDEO_XP_PROOF_FINAL_REPORT.md`](./testing/autonomous-qa/PKG-007_VIDEO_XP_PROOF_FINAL_REPORT.md). Open: native 113/114 trigger UI attestation; 073 OFF confirmation; PAT cannot delete disposable assets (Mike cleanup).

**101 overlay (final 2026-08-21):** Production Automation 101 is **v6.7** (live script body). Midday Automations Code-column **v6.6** snapshot is **historical / superseded**. Meeting `recxtpMu4ONbdDD45` safely skipped when reconciliation not needed.

**Final production version reconciliation (2026-08-21):** See [`CURRENT-TRUTH.md`](./CURRENT-TRUTH.md) §8. Confirmed: **010 v10.11**, **041 v5.1**, **057 v1.7**, **058 v1.3**, **059 v3.6**, **101 v6.7**, **117 v2.1 Live**, **070a/070b v4.7**, **070c current live (repo v1.1)**, **020 v3.7**, **033 v4.4**, **064 Production-verified current live**, **065 v10.2**, **066 v3.8**. Perfect Week remains **pending** (Days Logged 5; Eligible false).

---

## Production commit and URLs

| Item | Value |
|------|--------|
| **Production branch** | `master` |
| **Current repository baseline** | Verify dynamically: `git fetch origin && git rev-parse HEAD origin/master` — recorded in [`CURRENT-TRUTH.md`](./CURRENT-TRUTH.md) (`0b1d634…` integrity ship on 2026-08-20). Do not trust older tip SHAs in dated packets. |
| **Public URL** | https://www.fairfieldbasketballclub.com/shoot |
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
| **H-002 — Automation 066** | **Airtable version v3.8** (Mike 2026-08-19). Historical v3.3 failure and v3.4/v3.5 proofs preserved. Optional OMNI sandbox confirmation (K-H1) remains a separate open check if still needed. |
| **C-013 — Video upload Lambda** | **Historical COMPLETE 2026-07-11** on 070b **v4.4** + 070c v1.1. **Airtable 070b now v4.7** (Production + GitHub 2026-08-21). **Lambda Program Instance season code deployed CodeOnly 2026-08-19** (Mike-requested). Optional retry proof + secret rotation still open. |
| **C-020 — Engineering Test Framework** | 115 v2.1 controlled PROD proof passed twice; this proves the test harness path only, not downstream XP, summary, Make, email, or full-season behavior |
| **C-025 — Zoom recording credit** | **Historical Stage 17 credit evidence 2026-07-20** preserved. **PROD Automation 117 today (Mike paste 2026-08-19) = Hub email handoff v2.1**, not the credit orchestrator. **057 / 042** remain gate/Perfect Week writers per older packets. Live Zoom XP = **101**. Recording `ZOOM_CREDIT` writer under slot 117 is **not** live. |
| **C-011 — Automatic weekly email** | **Historical Make/Gmail E2E 2026-07-24** (`118→072→119→074→Make Bulk Email May 18→Gmail`) is preserved as evidence. **Current send plane (Mike 2026-08-19):** Communications Hub → **Resend**. Make.com is not the email sender. [email send plane](./integrations/email-send-plane.md) |
| **Automation standards (doc 06)** | **Active** — **066** remains the V2 rewrite reference pattern. Live paste is **v3.8** (Mike 2026-08-19). Older “v3.4 current reference” wording is historical for the createRecords contract era. |
| **Multi-year architecture** | **Decided** — one base + Program Instance; **V2-013 queued** |
| **Phase 2 — Platform Modernization** | Wave 2A planning + Phase 2B docs complete — implementation staged via backlog |
| **V2-015 — Development base** | **Retired 2026-08-19** — production-only operation; historical snapshots remain |

---

## Repos and public URLs

| Program | GitHub repo | Public URL | Vercel root |
|---------|-------------|------------|-------------|
| **Official club landing** | landing project (historical repo name may still be `hoopchallenges-landing`) | https://www.fairfieldbasketballclub.com | landing project |
| **Shooting Challenge** (this repo) | `127-si-shooting-challenge` | https://www.fairfieldbasketballclub.com/shoot | `web/` |
| **JR Referee Clinics** | `127-si-jr-ref` (separate) | `/refclinic` on landing | separate project |

This repo is **Shooting Challenge only** — not the multi-program hub.

**Domain note (2026-08-04):** Primary public destination is `fairfieldbasketballclub.com`. Legacy `hoopchallenges.com` URLs in older docs/evidence are historical unless explicitly marked active config.

---

## Airtable — Shooting Challenge

### Production

| Item | Value |
|------|--------|
| Base name (Airtable UI) | `127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026` |
| Base ID | `appn84sqPw03zEbTT` |
| Role | **Live season** — system of record |

### Development (V2-015) — **RETIRED 2026-08-19**

| Item | Value |
|------|--------|
| Base name | ~~`127SI - SHOOTING CHALLENGE - DEV`~~ |
| Base ID | ~~`appTetnuCZlCZdTCT`~~ |
| Status | **Retired** — do not recreate or paste automations |
| Historical setup | [development-base-setup.md](./development-base-setup.md) (read-only) |

**Deploy rule (current):** GitHub → Mike-approved Production paste → `CHANGELOG.md`. Offline fixtures in `tools/airtable/v2_dev_runbook/` support contract tests only.

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
| **Video upload (070b/070c + Lambda)** | **Airtable 070b = v4.7** (Production + GitHub 2026-08-21) + **Lambda season CodeOnly deploy 2026-08-19** (CodeSha256 `lwbLiBzB4cfWdzVmIVo7Z78AkiowqPuV2NmUXb+PK2w=`). Historical async `Accepted` handoff proven 2026-07-11 on **v4.4**. Optional Storage Key retry proof still open. |
| **Homework upload (070a)** | **PROD intentionally OFF** — keep OFF per [v2/AUTOMATION_070A_LAUNCH_DECISION.md](./v2/AUTOMATION_070A_LAUNCH_DECISION.md); DEV package exists separately |
| **C-023 Drive/attachment retirement** | Deferred |

---

## C-025 — Zoom recording credit

| Item | Status |
|------|--------|
| Architecture | Stage 17 Zoom Attendance design historically; **PROD slot 117 is email Hub handoff**, not orchestrator |
| Hard rule | **Never** write `Zoom Meetings.Attendees` (101 double-credit risk) |
| Preconflict rollup | **`ARRAYJOIN(ARRAYUNIQUE(values), "\n")`** (PROD verified historically) |
| Automation **117** (final 2026-08-21) | **v2.1 Live** — Hub queue create; dynamic `recordId` / `enrollmentRid` / `zoomMeetingRid`. No XP. **079** → Hub → Resend |
| Credit writers | Stage 17 orchestrator / 117c = **design alternatives only**. Historical 2026-07-20 credit packets remain evidence, not current 117 paste target |
| Companion (historical packets) | **057 v1.3** / **042 v3.1** / **101** — treat live versions as unconfirmed until Mike reads UI |
| Make **117f** | **Historical** Gmail path only |
| Packet | [live historical](./deploy-checklists/C-025-stage17-prod-live-2026-07-20.md) · [progress](./status/C-025-stage17-current-prod-progress.md) · [numbering](./deploy-checklists/C-025-117-numbering.md) |

---

## C-011 — Automatic weekly parent email

| Item | Status |
|------|--------|
| **Current send plane (Mike 2026-08-19)** | Communications Hub → **Resend**. Make.com is not the email sender. [email send plane](./integrations/email-send-plane.md) |
| Historical Make/Gmail proof | 2026-07-24 E2E `118→072→119→074→Make Bulk Email May 18→Gmail` — **historical evidence only** |
| Architecture (historical Make path) | [WAS-WEEKLY-EMAIL-ARCHITECTURE.md](./next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md) |
| Airtable script versions | Unconfirmed in this pass |

Manual Build/Send checkboxes remain available for controlled one-offs.

---

## Vercel / web app

| Setting | Value |
|---------|--------|
| `NEXT_PUBLIC_BASE_PATH` | `/shoot` |
| `NEXT_PUBLIC_LANDING_URL` | `https://www.fairfieldbasketballclub.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://www.fairfieldbasketballclub.com/shoot` (set in Vercel) |
| `NEXT_PUBLIC_GAME_MANUAL_URL` | Optional — game manual embed URL |
| `SITE_ACCESS_TOKEN` | Optional preview gate (middleware + `/api/airtable`) |
| `AIRTABLE_API_TOKEN` / `AIRTABLE_BASE_ID` | Server-only; **production base on Vercel** |
| Local / tools DEV base | `web/.env.local` or `tools/airtable/.env` |

Deploy details: [deployment-notes.md](./deployment-notes.md), [web/docs/deployment-notes.md](../web/docs/deployment-notes.md)

### Current web routes (`/shoot` prefix)

| Route | Status |
|-------|--------|
| `/`, `/leaderboard`, `/homework`, `/homework/[id]` | Live (Airtable) |
| `/tutorials`, `/shoutouts`, `/articles` (+ detail) | Live — **Tutorials & Assets** (`tblDOTgsWfqPm18bw`); publish gate `OK to Publish on Softr` = `checked` |
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
| Homework upload (070a) | **Live v4.7** during Perfect Week controlled window (historically intentional OFF) |
| Weekly summary email | **Current:** Hub → Resend. **Historical:** 2026-07-24 Make Bulk Email May 18 / Gmail path. Make is not the current email sender. [email send plane](./integrations/email-send-plane.md) |
| Daily / homework / video parent emails | **Current:** Hub → Resend. Make webhooks are not the email sender. |
| **Welcome email** | **Communications Hub → Resend** via Automation **079** (Make welcome scenario not used for email) — participant activation still pending |
| **C-028 Tremendous awards** | Sandbox send **validated** (Mike 2026-08-19). Production API **pending**. Make scenario **OFF**. v2 is an implementation snapshot, not production-live. Make HTTP is not a parent-email path. [current state](./integrations/tremendous-award-fulfillment.md) |

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
| High | Optional 066 OMNI sandbox confirm still open (version string is **v3.8**); automation version inventory still largely UNKNOWN beyond reconciled rows; athlete E2E matrix mostly untested |
| Medium | 070a post-test ON/OFF policy still Mike decision; Perfect Week calendar-blocked (Days Logged 5); web auth/dashboard incomplete; Softr Obsolete / Not Used |
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
