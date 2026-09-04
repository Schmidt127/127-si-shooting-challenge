# CURRENT TRUTH — 127 SI Shooting Challenge

**Status:** Active — primary current-state document for this repository  
**Last verification (repo):** 2026-09-04 — **origin/master** includes SC-112 select-404 fix merge **`78208ffc`** (PR **#388**; fix `e3bb7e45`) · Production deploy **`dpl_8TLH6uQAvLXUoQGDrGQ4NrFnWcVG`**. **SC-112** (magic-link + multi-child parent auth) is **COMPLETE — PRODUCTION VERIFIED BY MIKE** — three-athlete select/switch/dashboards/sign-out; no `/shoot/shoot/`; no `rec…` in URLs; **no further SC-112 action**. Evidence: [`audits/SC-112-multi-child-select-404-fix-20260904.md`](./audits/SC-112-multi-child-select-404-fix-20260904.md). Prior 2026-09-03 closeout board remains historical context: [`audits/SC-112-finalization-closeout-20260903.md`](./audits/SC-112-finalization-closeout-20260903.md). Public awards **Public On Web** MERGED (**#378**). Season Sim **NOT authorized**; formulas normal **`NOW()` / `TODAY()`**. No real-family enrollments. **SC-147** remains **101 v6.7** GitHub (PR **#338**); **Production paste pending Mike**. No DEV base (retired 2026-08-19). Prefer this file + [`127-SI-MASTER-FUTURE-WORK-LIST.md`](./127-SI-MASTER-FUTURE-WORK-LIST.md) + `git rev-parse HEAD` on `master`.  
**Companion release status:** [`SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](./SHOOTING_CHALLENGE_COMPLETION_MASTER.md)  
**Authority map:** [`AUTHORITY-MAP.md`](./AUTHORITY-MAP.md)  
**Integrity audit:** [`REPOSITORY-INTEGRITY-AUDIT.md`](./REPOSITORY-INTEGRITY-AUDIT.md)

> **Evidence boundary:** This file records the best repository-backed truth plus Mike-dated overlays already committed in-repo. It does **not** invent live Airtable / Make / Vercel / Tremendous UI state. Claims that need a live re-read are labeled `UNVERIFIED`, `PENDING`, or `REQUIRES LIVE CONFIRMATION`.

### Evening handoff for remote Cursor agents (2026-08-31)

| Start here | Why |
|---|---|
| This file | Live bases, automation versions, pending queue |
| [`127-SI-MASTER-FUTURE-WORK-LIST.md`](./127-SI-MASTER-FUTURE-WORK-LIST.md) | Canonical future work — **FUT-033–047** new intake; **FUT-032** / **065 v10.5** COMPLETE |
| `master` after merge | Source of truth for Cloud Agents — confirm `git fetch` + `git rev-parse HEAD` |
| Landing hub items FUT-033–037 | Implement in **`hoopchallenges-landing`**, not this repo’s `web/` |

---

## Authority rule — Production `Automations` table (updated 2026-08-20)

> **As of 2026-08-20, Mike intentionally refreshed the Production `Automations` data table.** For Version 2 automation **code / Live / identity** audits, treat these **three columns only** as Airtable authority:
>
> 1. `Name`  
> 2. `Status` (Live / Off)  
> 3. `Automation Code`  
>
> Do **not** use other columns on that table (trigger type, trigger table, conditions, sections, action summary, script location, external systems, etc.) as audit authority — they may still be stale.

**Prior rule (pre-refresh):** The old, unmaintained `Automations` table was non-authority. Any audit conclusion that depended on the **pre-refresh** table alone is still retracted for that era (including false Live claims for retired **077**).

### Allowed current-truth sources (only)

1. Production `Automations` table columns **`Name` / `Status` / `Automation Code`** (post-2026-08-20 refresh)  
2. Actual Airtable **Automations UI** configuration when Mike attests a UI vs table difference  
3. Dated live-test evidence supplied by Mike  
4. Current Version 2 repository source files  
5. Current Make.com scenario configuration and blueprint (non-email planes)  
6. Current Communications Hub configuration  
7. Current website and deployment evidence  
8. Mike’s direct confirmation of what is working in Production  

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
| HEAD SHA | **`78208ffc71e27047bf7cf8cc357d711f0201b590`** — merge PR **#388** SC-112 multi-child select 404 fix (includes **#385** Public On Web UI). Re-verify: `git rev-parse HEAD` |
| `origin/master` | Should match HEAD after fetch — re-verify: `git rev-parse origin/master` |
| Ahead / behind | **0 / 0** (re-verify after fetch) |
| Recent merges (2026-09-04) | **#388** SC-112 multi-child select 404 fix (`78208ffc` / `e3bb7e45`) — **PRODUCTION VERIFIED BY MIKE** |
| Recent merges (2026-09-03) | **#383**/**#382**/**#381** SC-112 docs closeout · **#380** multi-child evidence · **#379** multi-child auth docs · **#378** Public On Web · **#377** Live email cutover checklist · **#375** master-list · **#373** multi-child auth · **#372** homework late-credit · **#368** Season Sim hygiene · **#362** Automation 003 |
| Open PRs (unrelated / do not duplicate SC-112 closeout) | Older open items only (e.g. **#364**, **#363**, **#341**) — SC-112 closeout PRs **#377–#383** and fix **#388** are **MERGED** |
| Recent merges (2026-08-31) | **#312** multi-asset HW / 065 XP closeout |
| Recent merges (2026-08-30) | **#311** gift-card/coach · **#308** public-app readiness · **#298** public copy · **#276** ATHWF · **#297** paste audit |
| Prior integrity ship | `0b1d634…` (2026-08-20); XP activity ledger merge follows |
| True merge markers (`<<<<<<<`) | None found |
| Nested clone (ignored) | Local folder `127-si-shooting-challenge/` — gitignored; **do not treat as source of truth** |

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
| ~~Development~~ | ~~`127SI - SHOOTING CHALLENGE - DEV`~~ | ~~`appTetnuCZlCZdTCT`~~ | **Retired 2026-08-19** — historical snapshots only |

Schema snapshots under `airtable/schema/snapshots/prod-20260706/` and `dev-20260706/` are dated exports in-repo (DEV snapshot is historical). **Post–FUT-002 batch-1 live export:** `airtable/schema/snapshots/prod-20260831-fut002-batch1/` (33 tables / **1350** fields, 2026-08-31; **historical relative to later SA stub deletes**). **After SA XP text stubs delete (same day):** live Meta **1363** fields / **35** tables — [`testing/evidence/fut-002/sa-xp-text-stubs-deleted-2026-08-31.json`](./testing/evidence/fut-002/sa-xp-text-stubs-deleted-2026-08-31.json). `airtable/schema/current/` remains **stale** — prefer dated snapshot + latest FUT-002 evidence for live field truth.

---

## 4. Website / deployment

| Item | State |
|------|--------|
| Public URL | https://www.fairfieldbasketballclub.com/shoot |
| Local | http://localhost:3001/shoot |
| Health | `GET /shoot/api/airtable` → token validity check |
| Softr | **Obsolete / Not Used** — historical reference only |
| SEO | **Public program pages indexable** — `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true` on Vercel Production (SC-115 cutover 2026-08-25). Athlete profiles + private routes remain `noindex`. Checklist: [`deploy-checklists/2026-08-25-web-search-indexing-cutover.md`](./deploy-checklists/2026-08-25-web-search-indexing-cutover.md). |
| Production deploy | **Live** — Vercel Production follows `master` (tip **`9a68281e`**; web awards gate from **#378** `a0e84533`) (2026-09-03; matches `origin/master` tip). Prior “stuck on `082edc7d`” claim is **stale**. `GET /shoot` / `/shoot/api/airtable` last live-pass **200** (`tokenValid: true`) — re-confirm if needed |
| Vitest / smoke | **483/483** Vitest pass (2026-08-30 release QA) · typecheck/lint/build PASS · prior smoke **50/50** (MRW-E04) |
| FUT-016 Tutorials | **Complete** — portfolio catalog at `/shoot/tutorials` (PR **#284**, 2026-08-30) |
| FUT-017 Zoom Meetings | **Complete** — portfolio catalog at `/shoot/zoom-meetings` (PR **#285**, 2026-08-30) |
| FUT-025 athlete profiles | **Repo complete** — env-gated `NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING`; Mike cutover pending ([`deploy-checklists/2026-08-30-athlete-profile-indexing-cutover.md`](./deploy-checklists/2026-08-30-athlete-profile-indexing-cutover.md)) |
| SC-149 branding URLs | **Repo attestation complete (2026-08-30)** — prod render + smoke PASS; Mike Vercel env dashboard checkboxes pending ([`deploy-checklists/SC-149-fairfield-branding-url-verification.md`](./deploy-checklists/SC-149-fairfield-branding-url-verification.md)) |
| SC-149 Family Dashboard navigation | **Merged** PR **#358** (`29904b45`) — header/mobile/footer/parent/FAQ CTAs → `/shoot/dashboard/sign-in`; private `/shoot/dashboard` remains auth-gated |
| SC-112 Athlete auth + private dashboard | **COMPLETE — PRODUCTION VERIFIED BY MIKE** (2026-09-04) — magic-link + multi-child three-athlete select/switch/sign-out verified on Production deploy `dpl_8TLH6uQAvLXUoQGDrGQ4NrFnWcVG` (merge `78208ffc` / PR **#388**). **No further SC-112 action.** Checklist: [`deploy-checklists/SC-112-athlete-auth-preview-and-production.md`](./deploy-checklists/SC-112-athlete-auth-preview-and-production.md). Ledger: [`audits/SC-112-multi-child-select-404-fix-20260904.md`](./audits/SC-112-multi-child-select-404-fix-20260904.md) |
| Public awards (`Public On Web`) | **MERGED** PR **#378** (`a0e84533`) — `AWARD_RECIPIENT_PUBLICATION_FIELD = "Public On Web"`. PR **#376** closed superseded. |
| Transactional enrollments (2026-09-03 MCP) | **No real-family enrollments** — 2 Athletes / 3 Enrollments, all Schmidt / VERIFY disposable; parent email Mike school address only |
| Season Simulation | **NOT currently authorized.** Live formulas are normal **`NOW()` / `TODAY()`** — **DO NOT change**. Next execute needs separate Mike authorization + temporary gated formula re-paste. Hygiene classification: [`audits/SC-112-untracked-hygiene-classification-20260903.md`](./audits/SC-112-untracked-hygiene-classification-20260903.md) |
| SC-109 Game Manual PDF | **Built in Repository** — approved Adobe Publish Online URL baked into `web/lib/game-manual/config.ts` (env override optional); `/shoot/game-manual` live-config sections + PDF link render after deploy — checklist: [`deploy-checklists/SC-109-game-manual-url-verification.md`](./deploy-checklists/SC-109-game-manual-url-verification.md) |
| FUT-002 field inventory | **Batch 1 COMPLETE (2026-08-31)** + **SA XP text stubs deleted** — Mike UI-deleted 5 quarantined fields, then unused SA text `XP Events` / `XP Events copy`; live Meta **1363** fields / **35** tables; batch-1 schema `airtable/schema/snapshots/prod-20260831-fut002-batch1/`; evidence [`testing/evidence/fut-002/batch1-live-verify.json`](./testing/evidence/fut-002/batch1-live-verify.json) · [`testing/evidence/fut-002/sa-xp-text-stubs-deleted-2026-08-31.json`](./testing/evidence/fut-002/sa-xp-text-stubs-deleted-2026-08-31.json). Later inventory batches remain FUTURE |
| FUT-010 intake attachment cleanup | **Dry-run complete (R3 2026-08-30)** — **0 eligible**; no deletion request — [`testing/evidence/FUT-010-DRY-RUN-2026-08-30-R3.md`](./testing/evidence/FUT-010-DRY-RUN-2026-08-30-R3.md) |
| Weeks 2026–27 | **Finalized** — Early Bird **Apr 25–May 1, 2027** countable; May 1 ∈ Early Bird; Week 1 starts May 2 — [`testing/evidence/WEEKS-2026-27-AUDIT-2026-08-30.md`](./testing/evidence/WEEKS-2026-27-AUDIT-2026-08-30.md) |
| Homework PHA 2026–27 | **18 active restored** after FUT-030 (2026-08-31) — new RIDs; Due Date **2027-06-29**; Homework Library **76** unchanged. Evidence: [`testing/evidence/transactional-reset-2026-08-31/11-pha-restore-created-20260831_133022.json`](./testing/evidence/transactional-reset-2026-08-31/11-pha-restore-created-20260831_133022.json). Prior audit (old RIDs historical): [`testing/evidence/HOMEWORK-PHA-18-AUDIT-2026-08-30.md`](./testing/evidence/HOMEWORK-PHA-18-AUDIT-2026-08-30.md) |
| Transactional data | **Empty** after FUT-030 (except restored PHA) — Athletes/Enrollments/Submissions/Assets/HC/XP/WAS/VF/Unlocks/Streaks/Zoom Attendance/Award Recipients/Payments/Email Handoff Queue = **0**. Base ready for clean workflow rebuild. |
| Phase 4 public copy | **Shipped** PR **#298** — CR-13/CR-17/CR-18 parent copy implemented 2026-09-01; optional Dashboard relabel complete (CR-12) |
| SC-147 Recorded Zoom half-XP | **Built in Repository / Paste Pending** — **101 v6.7** merged PR **#338** (`49098217`); recording half-XP in same 101 pass; Source Key `ZOOM_RECORDING_CREDIT\|{Enrollment}\|{Meeting}`; **121 retired** (design artifact only); **117 email-only**; OMNI reconciliation trigger review **unresolved** — [`deploy-checklists/101-v6.7-sc-147-operator-packet.md`](./deploy-checklists/101-v6.7-sc-147-operator-packet.md) · [`SC-147-omni-reconciliation-trigger-review.md`](./deploy-checklists/SC-147-omni-reconciliation-trigger-review.md) |
| MRW-F07 weekly email harness | **Complete (PR #289)** — disposable E2E tooling for `118→072→119→074→079`; live `--apply` on Mike disposable WAS still operator-only |
| Production smoke athlete slug | `perfect-week-testing` (`testing-schmidt` is DEV-only) |
| PHA Due Date | Public homework catalog + athlete homework assignments display PHA Due Date (fallback Week End Date); verified prod 2026-08-25 |
| Homework catalog (FUT-014) | **Complete** — `/shoot/homework` PHA + Homework Library live catalog; Brief Description = **`Homework Library.Brief Description - Display`** (`fldAnHr3uTuDN5bs9`); 4 published cards verified prod 2026-08-26 |
| XP Event Log (website) | **Complete** — two-row layout, ISO dates, linked headline details, same-date % sort; display-only (no XP calculation changes). Commits `6625559`, `f225f04`, `68c3a45`, `3306379` |
| FUT-003 paid Make route | **Validated — ready for activation** (scenario **inactive** at Maia report 2026-08-26); free-payment architecture **deferred Nov/Dec 2026** |
| Live Vercel settings | Production env names verified via CLI 2026-08-25 (`NEXT_PUBLIC_ALLOW_SEARCH_INDEXING`, `NEXT_PUBLIC_SITE_URL`); do not log values |

Evidence pointer: [`PROJECT_STATE.md`](./PROJECT_STATE.md) § Vercel / web app.

---

## 5. Email path (current)

| Item | State |
|------|--------|
| Sender | **Resend** via Communications Hub |
| Make.com email | **None** — Make does not send SC parent/athlete notification email |
| Gmail Make scenarios | **Historical only** |
| Daily submission path | **076 v8.12** (Hub queue create) → **079** → Hub → Resend — FUT-041 XP Earned \| Extra Credit columns |
| Homework feedback path | **071 v4.3** → **079** → Hub → Resend — FUT-046 subject + FUT-047 contact copy |
| Automation **077** | **Retired / deleted from Production** (Mike-dated docs: 2026-08-13). Do not restore Make daily email. GitHub source retained as archive only. **Do not** trust obsolete `Automations` table rows that once showed 077 as Live. |
| Queue producers (repo) | Include Hub handoff scripts; **079** dispatches Ready queue → Hub → Resend |
| Automation **117** | **v2.1** Hub queue create for Zoom recording approval. Automations **Name** = Hub handoff title; **Status = Live** (2026-08-21 evening re-read). Not XP; not Make 117f. |
| Parent-email + auth Live cutover (2026-09-03) | Operator checklist **MERGED** PR **#377** — [`deploy-checklists/parent-email-and-auth-live-cutover-2026-09-03.md`](./deploy-checklists/parent-email-and-auth-live-cutover-2026-09-03.md). Target Live: producer `testMode=false` (071/073/074/076/078A/117); 118 `dryRun=false` + `sendMode=Live`; 119 `dryRun=false`; Vercel `ATHLETE_AUTH_TEST_MODE=false`. Magic-link **works**. Mike UI attestation remains authority if settings drift. |

Authority: [`integrations/email-send-plane.md`](./integrations/email-send-plane.md) · Completion Master · [`automation-index.md`](./automation-index.md). Live Automations UI attestation still preferred if Mike re-confirms.

---

## 6. Make.com (current inventory)

| Scenario / blueprint | Status |
|----------------------|--------|
| Upload Engine → Lambda (070b/070c path) | **Active** upload path (non-email) |
| Homework upload (070a) | **PROD OFF** by design |
| Weekly / parent notification email | **Retired for email** — Hub → Resend |
| Make **117f** Zoom Gmail | **Historical** |
| Tremendous awards v2 | **Implementation snapshot**; sandbox validated; scenario **OFF**; production API **PENDING** |
| Tremendous awards v1 | **Historical** |

Authority: [`integrations/tremendous-award-fulfillment.md`](./integrations/tremendous-award-fulfillment.md) · [`make/blueprints/README.md`](../make/blueprints/README.md).

---

## 7. Communications Hub

| Item | State |
|------|--------|
| Role | Queue + Resend delivery for SC notification email |
| Zoom recording approval | Automation **117 v2.1** → Email Handoff Queue → **079** → Hub → Resend |
| Welcome / participant activation | Hub path documented; full participant activation still **PENDING** live proof |
| Template registry | See `docs/communications-hub/` — treat audit dated 2026-08-17 as evidence, not invent live template IDs |

---

## 8. Airtable automation versions (repo source + Mike overlays)

### Confirmed Production versions (Automations Code MCP 2026-08-29 + reconfirm 2026-08-30)

Authority precedence for this reconciliation:

1. **Live Automation script body / run-history `version` output** (Mike-attested)
2. Production `Automations` columns **Name / Status / Automation Code** (post-2026-08-20 refresh only)
3. Repository SCRIPT headers

Do **not** treat other Automations-table columns (trigger/conditions) as authority — they are often stale.

| # | Production (Automations Code) | GitHub | Status | Notes |
|---|-------------------------------|--------|--------|-------|
| **003** | **v2.0** | v2.0 | **Live / COMPLETE / PRODUCTION-VERIFIED / DO-NOT-TOUCH** | Grade-change Grade Band refresh; keep active; disposable VERIFY Enrollment 2026-09-03 — [`prod-completion/2026-09-03/AUTOMATION-003-GRADE-CHANGE-VERIFIED.md`](./prod-completion/2026-09-03/AUTOMATION-003-GRADE-CHANGE-VERIFIED.md). Initial assign remains **002**. |
| **010** | **v10.12** | v10.12 | Live / **aligned** | Do not re-paste — [`010-v10.12-operator-packet.md`](./deploy-checklists/010-v10.12-operator-packet.md). Afternoon live-pass may show **v10.13** Season Sim dual-gate — treat UI script body as authority if it differs; **REQUIRES LIVE CONFIRMATION** before inventing inventory drift |
| **020** | **v3.9** | v3.9 | Live / **PASTE-ALIGNED** (Automations Code 2026-09-03) | Late-credit policy (PR **#372**). Prior FUT-001 row **v3.8** superseded for Code column. Disposable late-HW behavior proof **REQUIRES LIVE CONFIRMATION**. Checklist: [`homework-late-credit-policy-020-057-065.md`](./deploy-checklists/homework-late-credit-policy-020-057-065.md) |
| **022** | **v2.2** | v2.2 | Live / **aligned** | Lambda-only parent URL — [`022-v2.2-operator-packet.md`](./deploy-checklists/022-v2.2-operator-packet.md) |
| **033** | **v4.4** | v4.4 | Live | |
| **041** | **v5.1** | v5.1 | Live | Optional inputs only |
| **057** | **2.3** | **2.3** | Live / **PASTE-ALIGNED** (Automations Code 2026-09-03) | Late homework excluded from Perfect Week counts (PR **#372**). Prior **v2.2** Perfect Week Video Minimum row historical for Code column. Disposable PW exclusion proof **REQUIRES LIVE CONFIRMATION** |
| **058** | **1.5** | 1.5 | Live | Unlock only after Eligible + Ready |
| **059** | **v3.7** | v3.7 | Live | |
| **064** | **Production-verified current live** | v12.2 in repo | Live | Do not invent a new version string |
| **065** | **v10.6** | v10.6 | Live / **PASTE-ALIGNED** (Automations Code 2026-09-03) | Late-credit full XP (PR **#372**). Prior **v10.5** points-reconcile paste historical for Code column — [`065-v10.5-points-reconcile-operator-packet.md`](./deploy-checklists/065-v10.5-points-reconcile-operator-packet.md) |
| **067** | **v3.5** | v3.5 | **Live / COMPLETE / DO-NOT-TOUCH** | Reflection quiz → Homework Completion. Automations Code 2026-09-03 SCRIPT **v3.5**. Do not edit this closeout wave |
| **066** | **v3.9** | v3.9 | Live / live-tested | Dynamic `recordId`; replay verified 2026-08-24 |
| **072** | **v4.8** | v4.8 | Live / **aligned** | [`072-v4.8-operator-packet.md`](./deploy-checklists/072-v4.8-operator-packet.md) |
| **073** | **v4.4** | v4.4 | Live / **aligned** | [`073-v4.4-operator-packet.md`](./deploy-checklists/073-v4.4-operator-packet.md) |
| **071** | **v4.3** | v4.3 | Live / **aligned** | Homework Feedback Hub handoff — FUT-046 payload (`assignmentTitle`, athlete first/last); **do not re-paste** — [`071-v4.3-homework-feedback-paste-packet.md`](./deploy-checklists/071-v4.3-homework-feedback-paste-packet.md) |
| **076** | **v8.12** | v8.12 | Live / **aligned** | Daily Submission Hub handoff — FUT-041 `xpEarned` / `xpExtraCredit`; **do not re-paste** — [`076-v8.12-daily-submission-paste-packet.md`](./deploy-checklists/076-v8.12-daily-submission-paste-packet.md) |
| **074** | **v3.3** | v3.3 | Live / live-tested | Weekly summary Hub handoff |
| **070a** | **v4.7** | v4.7 | **Off** by design | Homework upload Make path |
| **070b** | **v4.7** | v4.7 | Live | |
| **070c** | **current live (repo v1.1)** | v1.1 | Live/enabled | Do not invent a new version |
| **101** | **v6.7** | v6.7 | Live | meeting `recxtpMu4ONbdDD45` safely skipped when reconciliation not needed |
| **117** | **v2.1** | v2.1 | **Live** | Dynamic inputs: `recordId`, `enrollmentRid`, `zoomMeetingRid` |

**Record-ID classification (Mike final):** Dynamic for all record-based automations; optional on **041** only; intentionally blank on **056 / 078 / 118 / 119**. **065** and **066** use triggering-record `recordId` in Production. Closeout: [`deploy-checklists/2026-08-24-065-066-dynamic-trigger-closeout.md`](./deploy-checklists/2026-08-24-065-066-dynamic-trigger-closeout.md).

**Config-over-code audit (SC-034 / V2-002):** Repo + **live** automation **057 v2.2** use Config field **`Perfect Week Video Minimum`**. Schema field renamed. Automations Code **tracker** may lag with typo — not a paste blocker. WAS lookup + formula live. **No** `legacyRequiredVideoCount: 3`. Audit: [`audits/2026-08-27-SC-034-config-hardcode-audit.md`](./audits/2026-08-27-SC-034-config-hardcode-audit.md).

**Historical:** Midday 2026-08-21 Code snapshots (010 v10.10 / 101 v6.6) and “010/022/072 paste pending” rows are **superseded**.

### Repository source (GitHub) — other notable scripts

Live ON/OFF for rows without Mike UI confirmation = `UNVERIFIED`. Full table: [`AUTOMATION_VERSION_INVENTORY.md`](./AUTOMATION_VERSION_INVENTORY.md).

| # | GitHub version (header) | Notes |
|---|-------------------------|--------|
| 070a | v4.7 | **Live** during Perfect Week controlled window (historically intentional OFF) |
| 070c | v1.1 | **Enabled in PROD** — async video writeback verify after **070b**; do not invent a new version |
| 076 | **v8.12** (Production) | Daily Hub queue create — FUT-041 `xpEarned`/`xpExtraCredit` payload |
| 077 | v5.0 archive | **Deleted from Production** (2026-08-13 docs) — not live Make send |
| 079 | v2.5 (GitHub + prod) | Ready queue → Hub → Resend; E2E weekly send 2026-08-24 |
| 112 | legacy | Expected **OFF** |
| 115 | v2.1 ETF | **Production-only ETF** — never paste as normal season automation |
| 005 | v5.5 (GitHub) | PHA slot normalize (see CHANGELOG) |
| 117a / 117b | design / historical S16 | **Not** current PROD 117 |

**Contradiction resolved:** Older Completion Master paste-queue rows that still say “010 v10.8 pending,” “020 v3.5,” or “070b v4.6 paste pending” are **historical**. Prefer this file’s final 2026-08-21 verification table.

---

## 9. XP / levels / achievements

| Domain | Owner (repo contract) | Live proof |
|--------|----------------------|------------|
| Submission XP | **010** — Source Key `SUBMISSION_XP\|{submissionId}` | GitHub **v10.12**; prior Production run history v10.11 |
| Homework XP | **064** prepares (`HOMEWORK_COMPLETION` rule); **065** creates/reconciles `HOMEWORK_XP\|{hcId}` (**020** HC create; **078** marks Parent Feedback Ready?) | **065 Production Automations Code v10.6** (late-credit PR **#372**); prior multi-asset closeout **COMPLETE** 2026-08-31 (`HOMEWORK_XP\|rec8E94Jg7mpmuMW9` = `recwpzl8pkXecUqRK`, no duplicate) |
| Video XP | **113 / 114** (+ **013** VF create) | **Live v6.4 / v6.1**; **PKG-007 lifecycle proof PASS 2026-08-23** (`AUTONOMOUS_VIDEO_QA_20260823_164549`, Testing3). Native trigger + 073 OFF UI attestation open |
| Shot milestones | **066** | Production **v3.9** live-tested 2026-08-24 |
| Levels | **041 / 042** | **041 Production v5.1**; broader progression proof still open |
| Perfect Week | **057 → 058 → 059** | **COMPLETE** for WAS `recl3DmBh22ADPWWe`: unlock `recJ5umer4J4FHTOz`, key `PERFECT_WEEK\|rec93mAfo5jKqP3g5\|recNzl4dNOtDmJqnV`, XP `reczehlzkA8fjiQh0`, Awarded, 100 XP, no duplicate unlock. Evidence: `docs/testing/evidence/sc-pw-e2e/award-was-recl3DmBh22ADPWWe-2026-08-29-mcp.json`. Do **not** re-`--apply` for this fixture. |
| Zoom live attendance XP | **101** | Production **v6.7** (live script body). Meeting `recxtpMu4ONbdDD45` safe skip when reconciliation not needed. |
| Zoom recording XP under slot 117 | Not live | Slot **117** is email Hub handoff (**v2.1 Live**) |

---

## 10. Homework / video / Zoom

| Path | State |
|------|--------|
| Homework assets → HC → XP → parent | **009** → **020 v3.9** → **070a v4.7 Live** (controlled window) → **064** prepare / **065 v10.6** → **078** Ready → **071** Hub |
| Homework completion (**020**) | Production Automations Code **v3.9** (late-credit; PR **#372**). **012** / **063** deleted — do not restore |
| Homework upload Make (**070a**) | Production **v4.7 Live** during Perfect Week controlled window (historically intentional OFF). Formula Ready alone does not send; **Send to Make Trigger** required |
| Video upload (**070b** + Lambda + **070c**) | Production **070b v4.7** → Make → Lambda → **070c current live (repo v1.1)** verify. Optional retry proof + secret rotation **PENDING** |
| Child upload writeback (**022**) | Production **v2.2** Live — Lambda viewer URL only; no Canonical S3 fallback |
| Homework parent email | **078** Ready → **071** → **079** → Hub → Resend |
| Video parent email | Video `Parent Feedback Ready?` **manual** → **073 v4.4** Live → Hub → Resend — parent URL must be Lambda viewer only |
| Zoom live attendance | **101 v6.7** |
| Zoom recording approval email | **117 v2.1 Live** → Hub → Resend |
| Fillout daily submission | **OFF** (contest intake closed) |

---

## 11. Perfect Week

| Item | State |
|------|--------|
| Controlled path through WAS / homework | Path evidence 2026-08-16 |
| Perfect Week 48-hour grace period | **Live-tested** — **057 v2.0** + Airtable formulas; disposable weekly email showed **4/7** PW qualifying days vs **7/7** general shooting days |
| Full Perfect Week award proof | **COMPLETE** — WAS `recl3DmBh22ADPWWe`; unlock Awarded + 100 XP; see MCP evidence JSON. Do not create another test week for this requirement. |
| Required order | **057 → 058 → 059** only after Eligible?=1 and Days Logged=7 |
| Weekly XP disagreement (`reczxTIpVI8ZJLex0`) | **Historical artifact:** old weekly email sent **before v4.7 corrections** — preserved evidence only. Resolved by **072 v4.7** + disposable E2E **2026-08-24** on `recdj8MD0szplMW5r`. Queue proof `recoikFrli3m0xDRa` **must remain unchanged** — not reused |
| Authority | Completion Master + Perfect Week prep report + Perfect Week testing docs under `docs/testing/perfect-week/` |

---

## 12. Tremendous (C-028)

| Item | State |
|------|--------|
| Sandbox send | **Validated** (Mike 2026-08-19) |
| Production API | **PENDING** Tremendous approval |
| Make scenario | **OFF** |
| Keys | Make credentials only — **never commit** |
| v2 blueprint | Implementation snapshot, not production-live |
| v1 blueprint | Historical |

---

## 13. Work ledger (summary)

### Completed (selected, evidence-backed)

- Wave 0 2025–26 close-out; H-001; many PKG merges on `master`
- Email plane migrated to Hub → Resend (Mike 2026-08-19)
- Confirmed Production pastes aligned: **010 v10.12**, **020 v3.8**, **022 v2.2**, **065 v10.5**, **071 v4.3**, **076 v8.12**, **072 v4.8**, **073 v4.4**, **066**, **070b**, **117**
- Tremendous sandbox validation
- Lambda season CodeOnly deploy (optional follow-ups open)
- Repository integrity + PII redaction pass
- Secure video URL pipeline **Live** (022/072/073) — Lambda viewer only; direct S3 AccessDenied expected
- **2026-08-24:** **066 v3.9** dynamic `recordId` verified; historical audit artifacts documented

### Pending / needs live proof

- Optional Automations Code **tracker** text refresh for 057 (live script already correct — do not repaste)
- Optional disposable fixture cleanup: `recdj8MD0szplMW5r`, `recxIzdVil9ewhBxN`, `recPg14iNRkxblMLs`
- Optional weekly email template / copy refinements
- Broader progression / standings certification packages
- Automation version inventory rows still UNKNOWN in Airtable UI
- Optional 066 OMNI sandbox confirm (K-H1)
- Lambda Storage Key retry proof + secret rotation
- RCC Airtable Interface install
- Open PRs: release-QA **#299**, field inventory **#300**, drafts **#262**/#244/#238/#237/#234 — review before merge; superseded work may close without merge
- SC-109 Game Manual — **deploy to Production** to attestation-checklist close (URL in repo; EXT-QA-001 env override optional)
- SC-149 / MRW-E02 Vercel Fairfield env dashboard attestation (repo attestation PASS; Mike checkbox confirmation pending)
- FUT-025 athlete profile indexing cutover (Mike approval)
- FUT-010 supervised attachment apply only if eligible rows appear (R3 dry-run **0 eligible**)
- SC-147 Recorded Zoom half-XP — **101 v6.7 GitHub merged**; OMNI reconciliation trigger review; Mike Production paste + disposable proof — **not Production-complete until proof passes**
- Landing FUT-033–036 + Hub FUT-041/042/046/047 — repo merged locally; **GitHub push + Vercel deploy** pending auth (2026-09-01)

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

- Repository text ≠ live Airtable paste proof.
- Offline / fixture tests ≠ controlled Production proof.
- The Production **`Automations` data table** is authority for **`Name` / `Status` / `Automation Code` only** after the 2026-08-20 refresh (see Authority rule above). Other columns on that table may still be stale.
- Pre-refresh historical inventories built from that table (2026-07-23 foundation-reset export, SC-058 refresh notes, reliability-audit P3 “re-export Automations table”) remain **non-authority** for that era.
- Automation **115** creates a new Submission per checked Run Test by design — not idempotency.
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
