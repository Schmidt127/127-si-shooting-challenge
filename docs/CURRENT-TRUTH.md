# CURRENT TRUTH â 127 SI Shooting Challenge

**Status:** Active â primary current-state document for this repository  
**Last verification (repo):** 2026-09-05 — **SC-163 COMPLETE / Live Tested** — live **066 v4.1** aligned with GitHub; Goal Met Date date-only; Athlete1 **8/30/2026** stamp + retry preserved. PR **#444**. Prior wave tip **`bd0198a4`**: **SC-161 / SC-162 / SC-164 / SC-165 / SC-149 residual COMPLETE / Live Tested**. **SC-166 PARTIALLY COMPLETE — Mike UI required**. **SC-160 COMPLETE / Live Tested**. **FUT-002 Batch 2 COMPLETE**. **FUT-029 Deferred — DO NOT IMPLEMENT**. Season Sim **NOT run**. Game Manual **unchanged**. Evidence: [audits/SC-163-LIVE-VERIFICATION-CLOSEOUT-20260905.md](./audits/SC-163-LIVE-VERIFICATION-CLOSEOUT-20260905.md) · [audits/SC-WAVE-20260905-CLOSEOUT.md](./audits/SC-WAVE-20260905-CLOSEOUT.md) · [audits/FUT-002-BATCH2-POST-DELETE-CLOSEOUT-20260905.md](./audits/FUT-002-BATCH2-POST-DELETE-CLOSEOUT-20260905.md) · [audits/SC-160-STAGE6-FINAL-CLOSEOUT-20260905.md](./audits/SC-160-STAGE6-FINAL-CLOSEOUT-20260905.md).
**Companion release status:** [`SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](./SHOOTING_CHALLENGE_COMPLETION_MASTER.md)  
**Authority map:** [`AUTHORITY-MAP.md`](./AUTHORITY-MAP.md)  
**Integrity audit:** [`REPOSITORY-INTEGRITY-AUDIT.md`](./REPOSITORY-INTEGRITY-AUDIT.md)

> **Evidence boundary:** This file records the best repository-backed truth plus Mike-dated overlays already committed in-repo. It does **not** invent live Airtable / Make / Vercel / Tremendous UI state. Claims that need a live re-read are labeled `UNVERIFIED`, `PENDING`, or `REQUIRES LIVE CONFIRMATION`.

### Evening handoff for remote Cursor agents (2026-08-31)

| Start here | Why |
|---|---|
| This file | Live bases, automation versions, pending queue |
| [`127-SI-MASTER-FUTURE-WORK-LIST.md`](./127-SI-MASTER-FUTURE-WORK-LIST.md) | Canonical future work â **FUT-033â047** new intake; **FUT-032** / **065 v10.5** COMPLETE |
| `master` after merge | Source of truth for Cloud Agents â confirm `git fetch` + `git rev-parse HEAD` |
| Landing hub items FUT-033â037 | Implement in **`hoopchallenges-landing`**, not this repoâs `web/` |

---

## Authority rule â Production `Automations` table (updated 2026-08-20)

> **As of 2026-08-20, Mike intentionally refreshed the Production `Automations` data table.** For Version 2 automation **code / Live / identity** audits, treat these **three columns only** as Airtable authority:
>
> 1. `Name`  
> 2. `Status` (Live / Off)  
> 3. `Automation Code`  
>
> Do **not** use other columns on that table (trigger type, trigger table, conditions, sections, action summary, script location, external systems, etc.) as audit authority â they may still be stale.

**Prior rule (pre-refresh):** The old, unmaintained `Automations` table was non-authority. Any audit conclusion that depended on the **pre-refresh** table alone is still retracted for that era (including false Live claims for retired **077**).

### Allowed current-truth sources (only)

1. Production `Automations` table columns **`Name` / `Status` / `Automation Code`** (post-2026-08-20 refresh)  
2. Actual Airtable **Automations UI** configuration when Mike attests a UI vs table difference  
3. Dated live-test evidence supplied by Mike  
4. Current Version 2 repository source files  
5. Current Make.com scenario configuration and blueprint (non-email planes)  
6. Current Communications Hub configuration  
7. Current website and deployment evidence  
8. Mikeâs direct confirmation of what is working in Production  

Repository docs (`automation-index.md`, inventories, Completion Master) are **documentation references**. They must not override current live evidence when Mike or the three authority columns contradict them.

**Audit artifact:** [`audits/2026-08-20-automation-49-code-audit.md`](./audits/2026-08-20-automation-49-code-audit.md)

---

## 1. Repository identity

| Item | Value |
|------|--------|
| GitHub | `Schmidt127/127-si-shooting-challenge` |
| Product | 127 Sports Intensity Shooting Challenge |
| Public app | https://www.fairfieldbasketballclub.com/shoot |
| Vercel root | `web/` |
| Production Git branch | `master` |
| Not this repo | Landing hub, JR Ref (`127-si-jr-ref`), Team Shot Tracker |

---

## 2. Git identity (verified this audit)

| Check | Result |
|-------|--------|
| Branch | `master` (not detached) |
| HEAD SHA | Re-verify after SC-163 closeout merge (#444): `git rev-parse HEAD` (prior wave tip `bd0198a4`) |
| `origin/master` | Should match HEAD after fetch — re-verify: `git rev-parse origin/master` |
| Ahead / behind | **0 / 0** (re-verify after fetch) |
| Recent merges (2026-09-05 completion wave) | **#435** A1 truth (`7c63dd00`) · **#440** SC-161 (`0eb1ed28`) · **#438** SC-163 repo (`43d353a4`) · **#437** SC-162 (`f8a1c9ee`) · **#439** SC-164/165 (`9869a2eb`) · **#436** SC-166 (`bd0198a4`) · **#444** SC-163 066 v4.1 live closeout. Evidence: [`audits/SC-163-LIVE-VERIFICATION-CLOSEOUT-20260905.md`](./audits/SC-163-LIVE-VERIFICATION-CLOSEOUT-20260905.md) · [`audits/SC-WAVE-20260905-CLOSEOUT.md`](./audits/SC-WAVE-20260905-CLOSEOUT.md) |
| Recent merges (2026-09-04 SF + reliability) | **#411** SC-156 · **#410/#409/#408** SC-153 · **#407** SF closeout · **#406** SC-152/153 · **#404** SC-154/155/156 · **#401** SC-157 closes **#340** · **#398** SC-147 · **#399** SEO · **#397** FUT-025 · **#396** SC-148 · **#395** SC-057/058 |
| Open PRs | Drafts **#353** (parent-email harness), **#335** (S3 key investigation), **#244** (WAS XP tooling â review carefully). **#340** CLOSED superseded. Superseded drafts **#234/#237/#238/#262/#307/#316** closed in functional-closeout wave |
| Recent merges (2026-08-31) | **#312** multi-asset HW / 065 XP closeout |
| Recent merges (2026-08-30) | **#311** gift-card/coach Â· **#308** public-app readiness Â· **#298** public copy Â· **#276** ATHWF Â· **#297** paste audit |
| Prior integrity ship | `0b1d634â¦` (2026-08-20); XP activity ledger merge follows |
| True merge markers (`<<<<<<<`) | None found |
| Nested clone (ignored) | Local folder `127-si-shooting-challenge/` â gitignored; **do not treat as source of truth** |

Re-verify before relying on SHA:

```powershell
git fetch origin
git rev-parse HEAD origin/master
git status -sb
```

---

## 3. Airtable bases

> **Production-only (2026-08-19):** The separate DEV base (`appTetnuCZlCZdTCT`) is **retired**. Do not recreate, re-enable, or paste automations to it. Historical DEV install docs remain read-only with banners. Controlled testing uses Production with Schmidt enrollments per Mike authorization.

| Environment | Base UI name | Base ID | Role |
|-------------|--------------|---------|------|
| **Production** | `127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026` | `appn84sqPw03zEbTT` | **Only active** system of record |
| ~~Development~~ | ~~`127SI - SHOOTING CHALLENGE - DEV`~~ | ~~`appTetnuCZlCZdTCT`~~ | **Retired 2026-08-19** â historical snapshots only |

Schema snapshots under `airtable/schema/snapshots/prod-20260706/` and `dev-20260706/` are dated exports in-repo (DEV snapshot is historical). **Post–FUT-002 batch-1 live export:** `airtable/schema/snapshots/prod-20260831-fut002-batch1/` (33 tables / **1350** fields, 2026-08-31; **historical**). **After SA XP text stubs delete (2026-08-31):** Meta **1363** fields / **35** tables. **Post–FUT-002 Batch 2 delete (2026-09-05):** Meta **1375** fields / **35** tables — `airtable/schema/snapshots/prod-20260905-fut002-batch2/` · [`testing/evidence/fut-002/batch2-live-verify-20260905.json`](./testing/evidence/fut-002/batch2-live-verify-20260905.json). `airtable/schema/current/` remains **stale** — prefer dated snapshot + latest FUT-002 evidence for live field truth.

---

## 4. Website / deployment

| Item | State |
|------|--------|
| Public URL | https://www.fairfieldbasketballclub.com/shoot |
| Local | http://localhost:3001/shoot |
| Health | `GET /shoot/api/airtable` â token validity check |
| Softr | **Obsolete / Not Used** â historical reference only |
| SEO | **COMPLETE** â program pages indexable (`NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true`); structured data + mobile meta from PR **#399** (supersedes draft **#310**). Status: [`audits/SEO-STATUS-20260904.md`](./audits/SEO-STATUS-20260904.md). Private/auth routes remain `noindex`. |
| Production deploy | **Live** — Vercel Production follows `master` (repo tip **`bd0198a4`** after SC wave 2026-09-05). `GET /shoot` / `/shoot/api/airtable` live-pass **200**. Leaderboard **3 athletes** live; homework compact list live; Levels **Your Level Progress** live; SC-149 branding + FD More residual live; FUT-025 athlete indexing env on |
| Vitest / smoke | **483/483** Vitest pass (2026-08-30 release QA) Â· typecheck/lint/build PASS Â· prior smoke **50/50** (MRW-E04) |
| FUT-016 Tutorials | **Complete** â portfolio catalog at `/shoot/tutorials` (PR **#284**, 2026-08-30) |
| FUT-017 Zoom Meetings | **Complete** â portfolio catalog at `/shoot/zoom-meetings` (PR **#285**, 2026-08-30) |
| FUT-025 athlete profiles | **COMPLETE / Live Tested** â Production `NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING=true`; cutover redeploy `dpl_4tbg25UzYPFruga1PzQthewWswNP`; public slug `athlete1-schmidt` â `index, follow`; `robots.txt` no longer Disallows `/shoot/athletes/`; sitemap still omits athlete URLs. Evidence [`audits/FUT-025-indexing-cutover-20260904.md`](./audits/FUT-025-indexing-cutover-20260904.md) |
| SC-149 branding URLs | **COMPLETE / Live Tested in PROD** (2026-09-04) â Vercel Production env MATCH for `NEXT_PUBLIC_LANDING_URL` / `SITE_URL` / `BASE_PATH`; live HTML Fairfield; zero hoop hosts; no redeploy required. Evidence [`testing/evidence/SC-149-FAIRFIELD-ATTESTATION-2026-09-04.json`](./testing/evidence/SC-149-FAIRFIELD-ATTESTATION-2026-09-04.json) Â· checklist [`deploy-checklists/SC-149-fairfield-branding-url-verification.md`](./deploy-checklists/SC-149-fairfield-branding-url-verification.md) |
| SC-149 Family Dashboard navigation | **COMPLETE / Live Tested in PROD** (2026-09-04) — PR **#358** (`29904b45`); header/mobile/footer/parent/FAQ CTAs → `/shoot/dashboard/sign-in`; private `/shoot/dashboard` remains auth-gated. Evidence [`audits/SC-149-family-dashboard-nav-prod-verification-20260904.md`](./audits/SC-149-family-dashboard-nav-prod-verification-20260904.md) · independent verify [`audits/SC-149-INDEPENDENT-VERIFY-20260904.md`](./audits/SC-149-INDEPENDENT-VERIFY-20260904.md) |
| SC-149 residual (FD under More) | **COMPLETE** (2026-09-05 with SC-164/165) — PR **#439** (`9869a2eb`); `MORE_NAV_HREFS` includes Family Dashboard → `/shoot/dashboard/sign-in`. Evidence [`audits/SC-149-MORE-FAMILY-DASHBOARD-20260905.md`](./audits/SC-149-MORE-FAMILY-DASHBOARD-20260905.md) |
| SC-161 Leaderboard | **COMPLETE / Live Tested** (2026-09-05) — PR **#440** (`0eb1ed28`); Production `/shoot/leaderboard` loads **3 athletes** after duplicate Active? heal + skip/dedupe. Evidence [`audits/SC-161-LEADERBOARD-REPAIR-20260905.md`](./audits/SC-161-LEADERBOARD-REPAIR-20260905.md) |
| SC-162 Homework UX | **COMPLETE / Live Tested** (2026-09-05) — PR **#437** (`f8a1c9ee`); compact catalog + durable attachment/link delivery; **not FUT-029**. Evidence [`audits/SC-162-HOMEWORK-COMPACT-DURABLE-LINKS.md`](./audits/SC-162-HOMEWORK-COMPACT-DURABLE-LINKS.md) |
| SC-163 Goal Met Date | **COMPLETE / Live Tested** (2026-09-05) — PR **#444**; live **066 v4.1** = GitHub; Goal Met Date **date-only**; Athlete1 stamped **8/30/2026**, retry preserved, no duplicate milestones; 066 may remain ON. Evidence [`audits/SC-163-LIVE-VERIFICATION-CLOSEOUT-20260905.md`](./audits/SC-163-LIVE-VERIFICATION-CLOSEOUT-20260905.md) · checklist [`deploy-checklists/SC-163-goal-met-date.md`](./deploy-checklists/SC-163-goal-met-date.md). |
| SC-164 Levels UX | **COMPLETE / Live Tested** (2026-09-05) — PR **#439**; single **Your Level Progress** section; on-card gates. Evidence [`audits/SC-164-LEVELS-PROGRESS-UX-20260905.md`](./audits/SC-164-LEVELS-PROGRESS-UX-20260905.md) |
| SC-165 Awards / coaching messaging | **COMPLETE / Live Tested** (2026-09-05) — PR **#439**; Overview + What’s Included. Evidence [`audits/SC-165-AWARDS-COACHING-MESSAGING-20260905.md`](./audits/SC-165-AWARDS-COACHING-MESSAGING-20260905.md) |
| SC-166 Coach work queues | **PARTIALLY COMPLETE — MIKE UI ACTION REQUIRED** (2026-09-05) — PR **#436** (`bd0198a4`); Interface filter checklist only. Checklist [`deploy-checklists/SC-166-coach-work-queue-filters.md`](./deploy-checklists/SC-166-coach-work-queue-filters.md). **Do not claim live-complete.** |
| FUT-029 Grade-band homework | **Deferred — DO NOT IMPLEMENT** — not part of current app completion; out of scope for wave 2026-09-05 / SC-162 |
| SC-112 Athlete auth + private dashboard | **COMPLETE â PRODUCTION VERIFIED BY MIKE** (2026-09-04) â magic-link + multi-child three-athlete select/switch/sign-out verified on Production deploy `dpl_8TLH6uQAvLXUoQGDrGQ4NrFnWcVG` (merge `78208ffc` / PR **#388**). **No further SC-112 action.** Checklist: [`deploy-checklists/SC-112-athlete-auth-preview-and-production.md`](./deploy-checklists/SC-112-athlete-auth-preview-and-production.md). Ledger: [`audits/SC-112-multi-child-select-404-fix-20260904.md`](./audits/SC-112-multi-child-select-404-fix-20260904.md) |
| SC-151 Family Dashboard Gmail access | **MERGED/DEPLOYED** â PR **#389** merge `a00ef7a5`; Production `dpl_2mch4scL3c6bgHZgizDbsqPTywbW`; docs closeout PR **#391** (`0479db22`). Sign-in shows registration-email instruction; Gmail prohibition gone. **SC-112 remains closed.** Audit: [`audits/SC-151-family-dashboard-gmail-access-20260904.md`](./audits/SC-151-family-dashboard-gmail-access-20260904.md) |
| Public awards (`Public On Web`) | **MERGED** PR **#378** (`a0e84533`) â `AWARD_RECIPIENT_PUBLICATION_FIELD = "Public On Web"`. PR **#376** closed superseded. |
| Transactional enrollments (2026-09-03 MCP) | **No real-family enrollments** â 2 Athletes / 3 Enrollments, all Schmidt / VERIFY disposable; parent email Mike school address only |
| Season Simulation | **NOT currently authorized.** Live formulas are normal **`NOW()` / `TODAY()`** â **DO NOT change**. Next execute needs separate Mike authorization + temporary gated formula re-paste. Hygiene classification: [`audits/SC-112-untracked-hygiene-classification-20260903.md`](./audits/SC-112-untracked-hygiene-classification-20260903.md) |
| SC-109 Game Manual PDF | **COMPLETE / Live Tested in PROD (2026-09-04)** â `/shoot/game-manual` shows **Open game manual** â Adobe Publish Online (`GAME_MANUAL_PUBLISH_URL` repo default; env override optional); How you earn XP + Level ladder render; no env-name leak â evidence [`testing/evidence/SC-109-PROD-ATTESTATION-2026-09-04.json`](./testing/evidence/SC-109-PROD-ATTESTATION-2026-09-04.json) Â· checklist [`deploy-checklists/SC-109-game-manual-url-verification.md`](./deploy-checklists/SC-109-game-manual-url-verification.md) |
| FUT-002 field inventory | **Batch 1 COMPLETE** + **SA XP stubs deleted** + **Batch 2 COMPLETE (2026-09-05)** — five Batch 2 text-stub IDs absent; live Meta **1375** fields / **35** tables; schema `airtable/schema/snapshots/prod-20260905-fut002-batch2/`; evidence [`testing/evidence/fut-002/batch2-live-verify-20260905.json`](./testing/evidence/fut-002/batch2-live-verify-20260905.json) · closeout [`audits/FUT-002-BATCH2-POST-DELETE-CLOSEOUT-20260905.md`](./audits/FUT-002-BATCH2-POST-DELETE-CLOSEOUT-20260905.md). Later: Config Drive roots + `unknown` interface review remain FUTURE |
| FUT-010 intake attachment cleanup | **Dry-run complete (R3 2026-08-30)** â **0 eligible**; no deletion request â [`testing/evidence/FUT-010-DRY-RUN-2026-08-30-R3.md`](./testing/evidence/FUT-010-DRY-RUN-2026-08-30-R3.md) |
| Weeks 2026â27 | **Finalized** â Early Bird **Apr 25âMay 1, 2027** countable; May 1 â Early Bird; Week 1 starts May 2 â [`testing/evidence/WEEKS-2026-27-AUDIT-2026-08-30.md`](./testing/evidence/WEEKS-2026-27-AUDIT-2026-08-30.md) |
| Homework PHA 2026â27 | **18 active restored** after FUT-030 (2026-08-31) â new RIDs; Due Date **2027-06-29**; Homework Library **76** unchanged. Evidence: [`testing/evidence/transactional-reset-2026-08-31/11-pha-restore-created-20260831_133022.json`](./testing/evidence/transactional-reset-2026-08-31/11-pha-restore-created-20260831_133022.json). Prior audit (old RIDs historical): [`testing/evidence/HOMEWORK-PHA-18-AUDIT-2026-08-30.md`](./testing/evidence/HOMEWORK-PHA-18-AUDIT-2026-08-30.md) |
| Transactional data | **Empty** after FUT-030 (except restored PHA) â Athletes/Enrollments/Submissions/Assets/HC/XP/WAS/VF/Unlocks/Streaks/Zoom Attendance/Award Recipients/Payments/Email Handoff Queue = **0**. Base ready for clean workflow rebuild. |
| Phase 4 public copy | **Shipped** PR **#298** â CR-13/CR-17/CR-18 parent copy implemented 2026-09-01; optional Dashboard relabel complete (CR-12) |
| SC-147 Recorded Zoom half-XP | **COMPLETE / Live Tested in PROD** â Automation **101 v6.8** Live; GitHub synced (PR **#398**); recording `ZOOM_RECORDING_CREDIT|*` @ 30 + live @ 60 on disposable VERIFY; **no 121**; **117** email-only. Optional residual: GitHub year-aware Config percent hardening may still need Airtable UI paste for byte-match. Evidence [`audits/SC-147-101-V68-PRODUCTION-CLOSEOUT-20260904.md`](./audits/SC-147-101-V68-PRODUCTION-CLOSEOUT-20260904.md) |
| SC-148 mobile a11y | **COMPLETE / Live Tested in PROD** â interactive + Playwright attestation 2026-09-04. Evidence [`audits/SC-148-mobile-a11y-prod-attestation-20260904.md`](./audits/SC-148-mobile-a11y-prod-attestation-20260904.md) |
| SC-057 / SC-058 | **Complete / Live Tested** â 50 Production automations MCP-attested; inventory [`audits/WORKFLOW-RELIABILITY-INVENTORY-20260904.md`](./audits/WORKFLOW-RELIABILITY-INVENTORY-20260904.md); silent-failure remediation [`audits/WORKFLOW-SILENT-FAILURE-REMEDIATION-20260904.md`](./audits/WORKFLOW-SILENT-FAILURE-REMEDIATION-20260904.md) |
| MRW-F07 weekly email harness | **Complete (PR #289)** â disposable E2E tooling for `118â072â119â074â079`; live `--apply` on Mike disposable WAS still operator-only |
| Production smoke athlete slug | `perfect-week-testing` (`testing-schmidt` is DEV-only) |
| PHA Due Date | Public homework catalog + athlete homework assignments display PHA Due Date (fallback Week End Date); verified prod 2026-08-25 |
| Homework catalog (FUT-014) | **Complete** â `/shoot/homework` PHA + Homework Library live catalog; Brief Description = **`Homework Library.Brief Description - Display`** (`fldAnHr3uTuDN5bs9`); 4 published cards verified prod 2026-08-26 |
| XP Event Log (website) | **Complete** â two-row layout, ISO dates, linked headline details, same-date % sort; display-only (no XP calculation changes). Commits `6625559`, `f225f04`, `68c3a45`, `3306379` |
| FUT-003 paid Make route | **Validated â ready for Mike Make activation** (scenario **inactive** by design; A5 audit 2026-09-04); free-payment **deferred Nov/Dec 2026**; not a non-registration launch blocker â [`audits/FUT-003-STRIPE-STATUS-20260904.md`](./audits/FUT-003-STRIPE-STATUS-20260904.md) |
| FUT-009 S3 video rename | **COMPLETE / Live Tested** â Lambda `/fut009/rename` + Automation **120** Live; disposable Schmidt rename + idempotent re-run 2026-09-04 â [`audits/FUT-009-LAMBDA-STATUS-20260904.md`](./audits/FUT-009-LAMBDA-STATUS-20260904.md) |
| Live Vercel settings | Production env names verified via CLI 2026-08-25 (`NEXT_PUBLIC_ALLOW_SEARCH_INDEXING`, `NEXT_PUBLIC_SITE_URL`); do not log values |

Evidence pointer: [`PROJECT_STATE.md`](./PROJECT_STATE.md) Â§ Vercel / web app.

---

## 5. Email path (current)

| Item | State |
|------|--------|
| Sender | **Resend** via Communications Hub |
| Make.com email | **None** â Make does not send SC parent/athlete notification email |
| Gmail Make scenarios | **Historical only** |
| Daily submission path | **076 v8.12** (Hub queue create) â **079** â Hub â Resend â FUT-041 XP Earned \| Extra Credit columns |
| Homework feedback path | **071 v4.3** â **079** â Hub â Resend â FUT-046 subject + FUT-047 contact copy |
| Automation **077** | **Retired / deleted from Production** (Mike-dated docs: 2026-08-13). Do not restore Make daily email. GitHub source retained as archive only. **Do not** trust obsolete `Automations` table rows that once showed 077 as Live. |
| Queue producers (repo) | Include Hub handoff scripts; **079** dispatches Ready queue â Hub â Resend |
| Automation **117** | **v2.1** Hub queue create for Zoom recording approval. Automations **Name** = Hub handoff title; **Status = Live** (2026-08-21 evening re-read). Not XP; not Make 117f. |
| Parent-email + auth Live cutover (2026-09-03) | Operator checklist **MERGED** PR **#377** â [`deploy-checklists/parent-email-and-auth-live-cutover-2026-09-03.md`](./deploy-checklists/parent-email-and-auth-live-cutover-2026-09-03.md). Target Live: producer `testMode=false` (071/073/074/076/078A/117); 118 `dryRun=false` + `sendMode=Live`; 119 `dryRun=false`; Vercel `ATHLETE_AUTH_TEST_MODE=false`. Magic-link **works**. Mike UI attestation remains authority if settings drift. |

Authority: [`integrations/email-send-plane.md`](./integrations/email-send-plane.md) Â· Completion Master Â· [`automation-index.md`](./automation-index.md). Live Automations UI attestation still preferred if Mike re-confirms.

---

## 6. Make.com (current inventory)

| Scenario / blueprint | Status |
|----------------------|--------|
| Upload Engine â Lambda (070b/070c path) | **Active** upload path (non-email) |
| Homework upload (070a) | **PROD Live v4.7** (SC-156 Complete â script-only graph) |
| Weekly / parent notification email | **Retired for email** â Hub â Resend |
| Make **117f** Zoom Gmail | **Historical** |
| Tremendous awards v2 | **Implementation snapshot**; sandbox validated; scenario **OFF**; production API **PENDING** |
| Tremendous awards v1 | **Historical** |

Authority: [`integrations/tremendous-award-fulfillment.md`](./integrations/tremendous-award-fulfillment.md) Â· [`make/blueprints/README.md`](../make/blueprints/README.md).

---

## 7. Communications Hub

| Item | State |
|------|--------|
| Role | Queue + Resend delivery for SC notification email |
| Zoom recording approval | Automation **117 v2.1** â Email Handoff Queue â **079** â Hub â Resend |
| Welcome / participant activation | Hub path documented; full participant activation still **PENDING** live proof |
| Template registry | See `docs/communications-hub/` â treat audit dated 2026-08-17 as evidence, not invent live template IDs |

---

## 8. Airtable automation versions (repo source + Mike overlays)

### Confirmed Production versions (Automations Code MCP 2026-08-29 + reconfirm 2026-08-30)

Authority precedence for this reconciliation:

1. **Live Automation script body / run-history `version` output** (Mike-attested)
2. Production `Automations` columns **Name / Status / Automation Code** (post-2026-08-20 refresh only)
3. Repository SCRIPT headers

Do **not** treat other Automations-table columns (trigger/conditions) as authority â they are often stale.

| # | Production (Automations Code) | GitHub | Status | Notes |
|---|-------------------------------|--------|--------|-------|
| **003** | **v2.0** | v2.0 | **Live / COMPLETE / PRODUCTION-VERIFIED / DO-NOT-TOUCH** | Grade-change Grade Band refresh; keep active; disposable VERIFY Enrollment 2026-09-03 â [`prod-completion/2026-09-03/AUTOMATION-003-GRADE-CHANGE-VERIFIED.md`](./prod-completion/2026-09-03/AUTOMATION-003-GRADE-CHANGE-VERIFIED.md). Initial assign remains **002**. |
| **010** | **v10.12** | v10.12 | Live / **aligned** | Do not re-paste â [`010-v10.12-operator-packet.md`](./deploy-checklists/010-v10.12-operator-packet.md). Afternoon live-pass may show **v10.13** Season Sim dual-gate â treat UI script body as authority if it differs; **REQUIRES LIVE CONFIRMATION** before inventing inventory drift |
| **020** | **v4.1** | v4.1 | Live / **PASTE-ALIGNED** (SC-160 COMPLETE 2026-09-05) | HC Week = PHA.Week; Submission.Week optional; Early/On Time/Late Notes; WAS find-or-create for Enrollment+PHA.Week. Evidence [`audits/SC-160-STAGE6-FINAL-CLOSEOUT-20260905.md`](./audits/SC-160-STAGE6-FINAL-CLOSEOUT-20260905.md) |
| **022** | **v2.2** | v2.2 | Live / **aligned** | Lambda-only parent URL â [`022-v2.2-operator-packet.md`](./deploy-checklists/022-v2.2-operator-packet.md) |
| **033** | **v4.4** | v4.4 | Live | |
| **041** | **v5.1** | v5.1 | Live | Optional inputs only |
| **057** | **2.5** | **2.5 Live** | Queue?=1; formula Pending OR Recalc | SC-160 early HW counts for assigned-week Perfect Week; late excluded. Evidence [`audits/SC-160-STAGE6-LIVE-VERIFICATION-20260904.md`](./audits/SC-160-STAGE6-LIVE-VERIFICATION-20260904.md) |
| **058** | **1.7** | **1.7 Live** | Lifecycle `recordUpdated` + nine fields | SC-153 **COMPLETE / Live Tested** â withdraw/restore/idempotency PASS ([`SC-153-058-V17-LIVE-VERIFICATION-20260904.md`](./audits/SC-153-058-V17-LIVE-VERIFICATION-20260904.md)) |
| **059** | **v3.8** | v3.8 | Live / **SC-159 COMPLETE / Live Tested** | Formula `059 Lifecycle Trigger?` = 1 only; withdraw/restore/idempotency/PW PASS â [`audits/SC-159-LIVE-VERIFICATION-CLOSEOUT-20260904.md`](./audits/SC-159-LIVE-VERIFICATION-CLOSEOUT-20260904.md) Â· checklist [`deploy-checklists/059-sc159-lifecycle-formula-trigger.md`](./deploy-checklists/059-sc159-lifecycle-formula-trigger.md) (nested OR checklist superseded) |
| **064** | **Production-verified current live** | v12.2 in repo | Live | Do not invent a new version string |
| **065** | **v10.7** | v10.7 | Live / **PASTE-ALIGNED** (SC-160 Stage 6 2026-09-04) | Early/late full homework XP when satisfactory. Evidence [`audits/SC-160-STAGE6-LIVE-VERIFICATION-20260904.md`](./audits/SC-160-STAGE6-LIVE-VERIFICATION-20260904.md) |
| **067** | **v3.4** (live body) | v3.5 | Live / paste declined | Reflection quiz → Homework Completion. Live **v3.4**; GitHub **v3.5** structure-only. Mike declined paste 2026-09-05. Safe inventory AI Agent: **v3.4** — [`audits/VERSION-AUDIT-CORRECTION-021-013-067-20260905.md`](./audits/VERSION-AUDIT-CORRECTION-021-013-067-20260905.md) |
| **066** | **v3.9** | v3.9 | Live / live-tested | Dynamic `recordId`; replay verified 2026-08-24 |
| **013** | **v3.1.0** (live body) | v3.2.0 | Live / paste declined | MCP 2026-09-05 live **v3.1.0**; GitHub v3.2.0 structure-only. Mike declined paste 2026-09-05. Safe inventory AI Agent: **v3.1.0** — [`audits/VERSION-AUDIT-CORRECTION-021-013-067-20260905.md`](./audits/VERSION-AUDIT-CORRECTION-021-013-067-20260905.md) |
| **021** | **v2.0** | v2.0 | **Live / ALIGNED** | Attachment Upload Status only; exact byte match GitHub; Phase A combined paste never installed — same correction audit |
| **072** | **v4.8** | v4.8 | Live / **aligned** | [`072-v4.8-operator-packet.md`](./deploy-checklists/072-v4.8-operator-packet.md) |
| **073** | **v4.4** | v4.4 | Live / **aligned** | [`073-v4.4-operator-packet.md`](./deploy-checklists/073-v4.4-operator-packet.md) |
| **071** | **v4.3** | v4.3 | Live / **aligned** | Homework Feedback Hub handoff â FUT-046 payload (`assignmentTitle`, athlete first/last); **do not re-paste** â [`071-v4.3-homework-feedback-paste-packet.md`](./deploy-checklists/071-v4.3-homework-feedback-paste-packet.md) |
| **076** | **v8.12** | v8.12 | Live / **aligned** | Daily Submission Hub handoff â FUT-041 `xpEarned` / `xpExtraCredit`; **do not re-paste** â [`076-v8.12-daily-submission-paste-packet.md`](./deploy-checklists/076-v8.12-daily-submission-paste-packet.md) |
| **074** | **v3.3** | v3.3 | Live / live-tested | Weekly summary Hub handoff |
| **070a** | **v4.7** | **v4.7 Live** | Script-only graph (SC-156); trigger clears via script | Homework upload Make path |
| **070b** | **v4.7** | v4.7 | Live | |
| **070c** | **current live (repo v1.1)** | v1.1 | Live/enabled | Do not invent a new version |
| **101** | **v6.8** | v6.8 | Live / **SC-147 COMPLETE** | Recording half-XP Live Tested; GitHub synced PR **#398**. Optional: re-paste GitHub year-aware Config percent hardening for byte-match |
| **117** | **v2.1** | v2.1 | **Live** | Dynamic inputs: `recordId`, `enrollmentRid`, `zoomMeetingRid` |

**Record-ID classification (Mike final):** Dynamic for all record-based automations; optional on **041** only; intentionally blank on **056 / 078 / 118 / 119**. **065** and **066** use triggering-record `recordId` in Production. Closeout: [`deploy-checklists/2026-08-24-065-066-dynamic-trigger-closeout.md`](./deploy-checklists/2026-08-24-065-066-dynamic-trigger-closeout.md).

**Config-over-code audit (SC-034 / V2-002):** Repo + **live** automation **057 v2.2** use Config field **`Perfect Week Video Minimum`**. Schema field renamed. Automations Code **tracker** may lag with typo â not a paste blocker. WAS lookup + formula live. **No** `legacyRequiredVideoCount: 3`. Audit: [`audits/2026-08-27-SC-034-config-hardcode-audit.md`](./audits/2026-08-27-SC-034-config-hardcode-audit.md).

**Historical:** Midday 2026-08-21 Code snapshots (010 v10.10 / 101 v6.6) and â010/022/072 paste pendingâ rows are **superseded**.

### Repository source (GitHub) â other notable scripts

Live ON/OFF for rows without Mike UI confirmation = `UNVERIFIED`. Full table: [`AUTOMATION_VERSION_INVENTORY.md`](./AUTOMATION_VERSION_INVENTORY.md).

| # | GitHub version (header) | Notes |
|---|-------------------------|--------|
| 070a | v4.7 | **Live** during Perfect Week controlled window (historically intentional OFF) |
| 070c | v1.1 | **Enabled in PROD** â async video writeback verify after **070b**; do not invent a new version |
| 076 | **v8.12** (Production) | Daily Hub queue create â FUT-041 `xpEarned`/`xpExtraCredit` payload |
| 077 | v5.0 archive | **Deleted from Production** (2026-08-13 docs) â not live Make send |
| 079 | v2.5 (GitHub + prod) | Ready queue â Hub â Resend; E2E weekly send 2026-08-24 |
| 112 | legacy | Expected **OFF** |
| 115 | v2.1 ETF | **Production-only ETF** â never paste as normal season automation |
| 005 | v5.5 (GitHub) | PHA slot normalize (see CHANGELOG) |
| 117a / 117b | design / historical S16 | **Not** current PROD 117 |

**Contradiction resolved:** Older Completion Master paste-queue rows that still say â010 v10.8 pending,â â020 v3.5,â or â070b v4.6 paste pendingâ are **historical**. Prefer this fileâs final 2026-08-21 verification table.

---

## 9. XP / levels / achievements

| Domain | Owner (repo contract) | Live proof |
|--------|----------------------|------------|
| Submission XP | **010** â Source Key `SUBMISSION_XP\|{submissionId}` | GitHub **v10.12**; prior Production run history v10.11 |
| Homework XP | **064** prepares (`HOMEWORK_COMPLETION` rule); **065** creates/reconciles `HOMEWORK_XP\|{hcId}` (**020** HC create; **078** marks Parent Feedback Ready?) | **065 Production Automations Code v10.6** (late-credit PR **#372**); disposable late-credit proof **COMPLETE** 2026-09-04; prior multi-asset closeout **COMPLETE** 2026-08-31 |
| Video XP | **113 / 114** (+ **013** VF create) | **Live v6.4 / v6.1**; **PKG-007 lifecycle proof PASS 2026-08-23** (`AUTONOMOUS_VIDEO_QA_20260823_164549`, Testing3). Native trigger + 073 OFF UI attestation open |
| Shot milestones | **066** | Production **v3.9** live-tested 2026-08-24 |
| Levels | **041 / 042** | **041 Production v5.1**; broader progression proof still open |
| Perfect Week | **057 â 058 â 059** | **COMPLETE** for WAS `recl3DmBh22ADPWWe`: unlock `recJ5umer4J4FHTOz`, key `PERFECT_WEEK\|rec93mAfo5jKqP3g5\|recNzl4dNOtDmJqnV`, XP `reczehlzkA8fjiQh0`, Awarded, 100 XP, no duplicate unlock. Evidence: `docs/testing/evidence/sc-pw-e2e/award-was-recl3DmBh22ADPWWe-2026-08-29-mcp.json`. Do **not** re-`--apply` for this fixture. |
| Zoom live attendance XP | **101** | Production **v6.8** Live (SC-147 recording half-XP). GitHub synced PR **#398**. |
| Zoom recording XP under slot 117 | Not live | Slot **117** is email Hub handoff (**v2.1 Live**) |

---

## 10. Homework / video / Zoom

| Path | State |
|------|--------|
| Homework assets â HC â XP â parent | **009** â **020 v3.9** â **070a v4.7 Live** (controlled window) â **064** prepare / **065 v10.6** â **078** Ready â **071** Hub |
| Homework completion (**020**) | Production Automations Code **v3.9** (late-credit; PR **#372**). **012** / **063** deleted â do not restore |
| Homework upload Make (**070a**) | Production **v4.7 Live** during Perfect Week controlled window (historically intentional OFF). Formula Ready alone does not send; **Send to Make Trigger** required |
| Video upload (**070b** + Lambda + **070c**) | Production **070b v4.7** â Make â Lambda â **070c current live (repo v1.1)** verify. Optional retry proof + secret rotation **PENDING** |
| Child upload writeback (**022**) | Production **v2.2** Live â Lambda viewer URL only; no Canonical S3 fallback |
| Homework parent email | **078** Ready â **071** â **079** â Hub â Resend |
| Video parent email | Video `Parent Feedback Ready?` **manual** â **073 v4.4** Live â Hub â Resend â parent URL must be Lambda viewer only |
| Zoom live attendance | **101 v6.8** (SC-147 recording half-XP Live Tested) |
| Zoom recording approval email | **117 v2.1 Live** â Hub â Resend |
| Fillout daily submission | **OFF** (contest intake closed) |

---

## 11. Perfect Week

| Item | State |
|------|--------|
| Controlled path through WAS / homework | Path evidence 2026-08-16 |
| Perfect Week 48-hour grace period | **Live-tested** â **057 v2.0** + Airtable formulas; disposable weekly email showed **4/7** PW qualifying days vs **7/7** general shooting days |
| Full Perfect Week award proof | **COMPLETE** â WAS `recl3DmBh22ADPWWe`; unlock Awarded + 100 XP; see MCP evidence JSON. Do not create another test week for this requirement. |
| Required order | **057 â 058 â 059** only after Eligible?=1 and Days Logged=7 |
| Weekly XP disagreement (`reczxTIpVI8ZJLex0`) | **Historical artifact:** old weekly email sent **before v4.7 corrections** â preserved evidence only. Resolved by **072 v4.7** + disposable E2E **2026-08-24** on `recdj8MD0szplMW5r`. Queue proof `recoikFrli3m0xDRa` **must remain unchanged** â not reused |
| Authority | Completion Master + Perfect Week prep report + Perfect Week testing docs under `docs/testing/perfect-week/` |

---

## 12. Tremendous (C-028)

| Item | State |
|------|--------|
| Sandbox send | **Validated** (Mike 2026-08-19) |
| Production API | **PENDING** Tremendous approval |
| Make scenario | **OFF** |
| Keys | Make credentials only â **never commit** |
| v2 blueprint | Implementation snapshot, not production-live |
| v1 blueprint | Historical |

---

## 13. Work ledger (summary)

### Completed (selected, evidence-backed)

- Wave 0 2025â26 close-out; H-001; many PKG merges on `master`
- Email plane migrated to Hub â Resend (Mike 2026-08-19)
- Confirmed Production pastes aligned: **010 v10.12**, **020 v3.8**, **022 v2.2**, **065 v10.5**, **071 v4.3**, **076 v8.12**, **072 v4.8**, **073 v4.4**, **066**, **070b**, **117**
- Tremendous sandbox validation
- Lambda season CodeOnly deploy (optional follow-ups open)
- Repository integrity + PII redaction pass
- Secure video URL pipeline **Live** (022/072/073) â Lambda viewer only; direct S3 AccessDenied expected
- **2026-08-24:** **066 v3.9** dynamic `recordId` verified; historical audit artifacts documented

### Open Mike UI actions (wave 2026-09-05)

- **SC-166:** Apply Active + Completed/History Interface filters — [`deploy-checklists/SC-166-coach-work-queue-filters.md`](./deploy-checklists/SC-166-coach-work-queue-filters.md). **Not live-complete.**

### Pending / needs live proof

- Optional Automations Code **tracker** text refresh for 057 (live script already correct — do not repaste)
- Optional disposable fixture cleanup: `recdj8MD0szplMW5r`, `recxIzdVil9ewhBxN`, `recPg14iNRkxblMLs`
- Optional weekly email template / copy refinements
- Broader progression / standings certification packages
- Automation version inventory rows still UNKNOWN in Airtable UI
- Optional 066 OMNI sandbox confirm (K-H1)
- Lambda Storage Key retry proof + secret rotation
- RCC Airtable Interface install
- Open PRs: drafts **#353** / **#335** / **#244** â review before merge. Superseded **#234/#237/#238/#262/#307/#316/#340** CLOSED without merge
- Functional-closeout wave (2026-09-04): no remaining P0 silent-failure defect; **FUT-009 activated / Live Tested** 2026-09-04 â [`audits/FUT-009-LAMBDA-STATUS-20260904.md`](./audits/FUT-009-LAMBDA-STATUS-20260904.md) Â· prior wave [`audits/COORD-WAVE-FUNCTIONAL-CLOSEOUT-20260904.md`](./audits/COORD-WAVE-FUNCTIONAL-CLOSEOUT-20260904.md)
- FUT-003 Make paid scenario still **inactive** until Mike activation â [`audits/FUT-003-STRIPE-STATUS-20260904.md`](./audits/FUT-003-STRIPE-STATUS-20260904.md)
- FUT-025 athlete profile indexing cutover (Mike approval)
- FUT-010 supervised attachment apply only if eligible rows appear (R3 dry-run **0 eligible**)
- SC-147 Recorded Zoom half-XP â **COMPLETE / Live Tested** (101 **v6.8**; PR **#398**)
- FUT-025 athlete profile indexing â **COMPLETE / Live Tested** (PR **#397** + env cutover)
- SEO discoverability â **COMPLETE** (PR **#399**; draft **#310** closed)
- SC-148 mobile a11y â **COMPLETE / Live Tested** (PR **#396**)
- SC-057 / SC-058 â **Complete / Live Tested** (PR **#395**; inventory + SF remediation)
- Season Simulation â **NOT authorized** (explicit Mike instruction required later)
- **SC-160** — **COMPLETE / Live Tested** — asset intake without Week + early/on-time/late HW + weekless WAS-for-PHA-Week — live **009 v1.3 / 020 v4.1 / 065 v10.7 / 057 2.5** — [audits/SC-160-STAGE6-FINAL-CLOSEOUT-20260905.md](./audits/SC-160-STAGE6-FINAL-CLOSEOUT-20260905.md)
- **SC wave 2026-09-05** — SC-161/162/163/164/165/149 residual **COMPLETE / Live Tested**; SC-166 **partial** (Mike UI); FUT-029 still Deferred — [audits/SC-WAVE-20260905-CLOSEOUT.md](./audits/SC-WAVE-20260905-CLOSEOUT.md) · [audits/SC-163-LIVE-VERIFICATION-CLOSEOUT-20260905.md](./audits/SC-163-LIVE-VERIFICATION-CLOSEOUT-20260905.md)
- Airtable field deletion — **deferred** until functional verification complete
- Full administrative portal / optional card redesign â **deferred**
- Landing FUT-033â036 + Hub FUT-041/042/046/047 â repo merged locally; **GitHub push + Vercel deploy** pending auth (2026-09-01)

### Blocked

- PKG-037 core certification (depends on prior live proofs)
- PKG-004 schema ownership gate before schema feature work
- Full pre-season audit pack until dependency packages + 2027 Weeks proof

### Deferred

- V2-013 Program Instance multi-year architecture wave
- Drive/attachment retirement (C-023) and related low-priority cleanup
- Softr field rename / Tutorials table retirement (breaking schema)

### Unverified / requires live confirmation

- Exact ON/OFF and pasted versions for automations without 2026-08-19 Mike overlay
- Live Make scenario schedules beyond documented OFF/ON claims
- Live Tremendous production access (explicitly pending)
- That every Hub template ID in docs matches Hub UI today

**Partially verified (2026-08-25):** Vercel Production has `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING` and `NEXT_PUBLIC_SITE_URL` configured (names confirmed via CLI; values not logged). Public indexing behavior verified via `npm run test:smoke:prod` and live URL checks.

---

## 14. Known limitations

- Repository text â  live Airtable paste proof.
- Offline / fixture tests â  controlled Production proof.
- The Production **`Automations` data table** is authority for **`Name` / `Status` / `Automation Code` only** after the 2026-08-20 refresh (see Authority rule above). Other columns on that table may still be stale.
- Pre-refresh historical inventories built from that table (2026-07-23 foundation-reset export, SC-058 refresh notes, reliability-audit P3 âre-export Automations tableâ) remain **non-authority** for that era.
- Automation **115** creates a new Submission per checked Run Test by design â not idempotency.
- Large historical overnight JSON snapshots retain athlete **names** after email redaction; treat as sensitive.
- Many local git worktrees and feature branches exist outside this working tree; they are not deleted by this audit (preserve history). They must not be confused with `master`.

---

## 15. Evidence links

| Concern | Link |
|---------|------|
| Release status | [`SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](./SHOOTING_CHALLENGE_COMPLETION_MASTER.md) |
| Ops snapshot | [`PROJECT_STATE.md`](./PROJECT_STATE.md) |
| 2026-08-16 path reconciliation | [`prod-completion/2026-08-16/SC-2026-08-16-CURRENT-STATE-RECONCILIATION.md`](./prod-completion/2026-08-16/SC-2026-08-16-CURRENT-STATE-RECONCILIATION.md) |
| Email send plane | [`integrations/email-send-plane.md`](./integrations/email-send-plane.md) |
| Tremendous | [`integrations/tremendous-award-fulfillment.md`](./integrations/tremendous-award-fulfillment.md) |
| Automation inventory | [`AUTOMATION_VERSION_INVENTORY.md`](./AUTOMATION_VERSION_INVENTORY.md) |
| Integrity audit | [`REPOSITORY-INTEGRITY-AUDIT.md`](./REPOSITORY-INTEGRITY-AUDIT.md) |
| Archived / superseded | [`ARCHIVED-AND-SUPERSEDED-FILES.md`](./ARCHIVED-AND-SUPERSEDED-FILES.md) |
| Security / sensitive | [`SECURITY-AND-SENSITIVE-FILES.md`](./SECURITY-AND-SENSITIVE-FILES.md) |
