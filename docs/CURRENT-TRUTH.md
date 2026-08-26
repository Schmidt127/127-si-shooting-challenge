# CURRENT TRUTH — 127 SI Shooting Challenge

**Status:** Active — primary current-state document for this repository  
**Last verification (repo):** 2026-08-26 (master `4a26aa4` — FUT-014 homework docs, XP Event Log presentation, FUT-003 paid-route validation docs; re-verify with `git rev-parse HEAD` after each push)  
**Companion release status:** [`SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](./SHOOTING_CHALLENGE_COMPLETION_MASTER.md)  
**Authority map:** [`AUTHORITY-MAP.md`](./AUTHORITY-MAP.md)  
**Integrity audit:** [`REPOSITORY-INTEGRITY-AUDIT.md`](./REPOSITORY-INTEGRITY-AUDIT.md)

> **Evidence boundary:** This file records the best repository-backed truth plus Mike-dated overlays already committed in-repo. It does **not** invent live Airtable / Make / Vercel / Tremendous UI state. Claims that need a live re-read are labeled `UNVERIFIED`, `PENDING`, or `REQUIRES LIVE CONFIRMATION`.

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
| HEAD SHA | `4a26aa4` (2026-08-26 — docs sync for FUT-014, XP Event Log, FUT-003; re-verify with `git rev-parse HEAD` after each push) |
| `origin/master` | **Matches** `4a26aa4` (verified 2026-08-26) |
| Ahead / behind | **0 / 0** |
| Working tree at audit start | **Uncommitted unrelated work present** — Airtable automations, `tools/testing/`, `docs/chatgpt-sources/`; not part of web production closeout |
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

Schema snapshots under `airtable/schema/snapshots/prod-20260706/` and `dev-20260706/` are dated exports in-repo (DEV snapshot is historical). `airtable/schema/current/` remains **stale** until refreshed — do not treat as live schema.

---

## 4. Website / deployment

| Item | State |
|------|--------|
| Public URL | https://www.fairfieldbasketballclub.com/shoot |
| Local | http://localhost:3001/shoot |
| Health | `GET /shoot/api/airtable` → token validity check |
| Softr | **Obsolete / Not Used** — historical reference only |
| SEO | **Public program pages indexable** — `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true` on Vercel Production (SC-115 cutover 2026-08-25). Athlete profiles + private routes remain `noindex`. Checklist: [`deploy-checklists/2026-08-25-web-search-indexing-cutover.md`](./deploy-checklists/2026-08-25-web-search-indexing-cutover.md). |
| Production deploy | **Live** — website verified via live routes + smoke tests (2026-08-26); latest web commits `cdd2b97` (FUT-014), `3306379`/`68c3a45`/`f225f04`/`6625559` (XP Event Log). Formal Vercel API deployment status not read for this doc sync. |
| Vitest / smoke | **406** Vitest pass · `npm run test:smoke:prod` **50/50** · `homework-due-date.spec.ts` **3/3** on prod (2026-08-26) |
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
| Daily submission path | **076** (Hub queue create) → **079** → Hub → Resend |
| Automation **077** | **Retired / deleted from Production** (Mike-dated docs: 2026-08-13). Do not restore Make daily email. GitHub source retained as archive only. **Do not** trust obsolete `Automations` table rows that once showed 077 as Live. |
| Queue producers (repo) | Include Hub handoff scripts; **079** dispatches Ready queue → Hub → Resend |
| Automation **117** | **v2.1** Hub queue create for Zoom recording approval. Automations **Name** = Hub handoff title; **Status = Live** (2026-08-21 evening re-read). Not XP; not Make 117f. |

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

### Confirmed Production versions (Mike final verification 2026-08-21)

Authority precedence for this reconciliation:

1. **Live Automation script body / run-history `version` output** (Mike-attested)
2. Production `Automations` columns **Name / Status / Automation Code** (post-2026-08-20 refresh only)
3. Repository SCRIPT headers

Do **not** treat older Automations-table Code-column snapshots as stronger than live script/run history when they disagree.

| # | Production (final verified) | GitHub | Status | Notes |
|---|-----------------------------|--------|--------|-------|
| **010** | **v10.10** (Automations Code 2026-08-23) | v10.12 | Live / **paste needed** | GitHub v10.12 settlement grace; prod Code column still v10.10 |
| **020** | **v3.7** | v3.7 | Live | |
| **033** | **v4.4** | v4.4 | Live | |
| **041** | **v5.1** | v5.1 | Live | Optional inputs only |
| **057** | **v2.0** (prod) | **v2.0** | **Live / live-tested** | 48-hour submission grace period; disposable E2E showed 4/7 PW qualifying days |
| **058** | **v1.3** | 1.3 | Live | Unlock only after Eligible + Ready |
| **059** | **v3.6** | v3.6 | Live | |
| **064** | **Production-verified current live** | v12.2 in repo | Live | Do not invent a new version string |
| **065** | **v10.3** (prod) | **v10.3** | **Live / live-tested** | Dynamic `recordId` from Homework Completion trigger; Production paste verified 2026-08-24 |
| **066** | **v3.9** (prod) | **v3.9** | **Live / live-tested** | Dynamic `recordId` from Enrollment trigger; replay verified idempotent 2026-08-24 |
| **072** | **v4.7** (prod) | **v4.7** | **Live / live-tested** | v4.7 shooting days 7/7, goal 150%+, video list, XP 1280; E2E disposable send 2026-08-24 |
| **074** | **v3.3** (prod) | **v3.3** | **Live / live-tested** | Weekly summary Hub handoff; E2E with 072 v4.7 2026-08-24 |
| **070a** | **v4.7** | v4.7 | **Off** by design | Homework upload Make path |
| **070b** | **v4.7** | v4.7 | Live | |
| **070c** | **current live (repo v1.1)** | v1.1 | Live/enabled | Do not invent a new version |
| **101** | **v6.7** | v6.7 | Live | Live script body `Version: v6.7` / `version: "v6.7"`; meeting `recxtpMu4ONbdDD45` safely skipped (reconciliation not needed) |
| **117** | **v2.1** | v2.1 | **Live** | Dynamic inputs: `recordId`, `enrollmentRid`, `zoomMeetingRid` |

**Record-ID classification (Mike final):** Dynamic for all record-based automations; optional on **041** only; intentionally blank on **056 / 078 / 118 / 119**. **065 v10.3** and **066 v3.9** use triggering-record `recordId` in Production (verified 2026-08-24). Pre-paste hardcoded reference inputs and disposable-fixture manual settlement were **historical workarounds only**. Closeout: [`deploy-checklists/2026-08-24-065-066-dynamic-trigger-closeout.md`](./deploy-checklists/2026-08-24-065-066-dynamic-trigger-closeout.md).

**Historical snapshot (midday 2026-08-21):** An earlier Automations Code-column read briefly showed **010 v10.10** and **101 v6.6**. That snapshot is **superseded** by Mike’s live script / run-history verification above. See [`deploy-checklists/2026-08-21-perfect-week-test-prep-report.md`](./deploy-checklists/2026-08-21-perfect-week-test-prep-report.md).

### Repository source (GitHub) — other notable scripts

Live ON/OFF for rows without Mike UI confirmation = `UNVERIFIED`. Full table: [`AUTOMATION_VERSION_INVENTORY.md`](./AUTOMATION_VERSION_INVENTORY.md).

| # | GitHub version (header) | Notes |
|---|-------------------------|--------|
| 070a | v4.7 | **Live** during Perfect Week controlled window (historically intentional OFF) |
| 070c | v1.1 | **Enabled in PROD** — async video writeback verify after **070b**; do not invent a new version |
| 076 | v8.7 (GitHub) | Daily Hub queue create (not Make send) |
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
| Homework XP | **064** prepares (`HOMEWORK_COMPLETION` rule); **065** creates/reconciles `HOMEWORK_XP\|{hcId}` (**020** HC create; **078** marks Parent Feedback Ready?) | **065 Production v10.3** live-tested 2026-08-24; **064** Production-verified current live |
| Video XP | **113 / 114** (+ **013** VF create) | **Live v6.4 / v6.1**; **PKG-007 lifecycle proof PASS 2026-08-23** (`AUTONOMOUS_VIDEO_QA_20260823_164549`, Testing3). Native trigger + 073 OFF UI attestation open |
| Shot milestones | **066** | Production **v3.9** live-tested 2026-08-24 |
| Levels | **041 / 042** | **041 Production v5.1**; broader progression proof still open |
| Perfect Week | **057 → 058 → 059** | **48-hour grace period `live-tested`** (057 v2.0 + formulas; 4/7 PW days in disposable E2E). XP ledger **live-tested 2026-08-23** (39 active events on `rec93mAfo5jKqP3g5`). Full calendar award still **PENDING** until Days Logged=7 and Eligible?=true. |
| Zoom live attendance XP | **101** | Production **v6.7** (live script body). Meeting `recxtpMu4ONbdDD45` safe skip when reconciliation not needed. |
| Zoom recording XP under slot 117 | Not live | Slot **117** is email Hub handoff (**v2.1 Live**) |

---

## 10. Homework / video / Zoom

| Path | State |
|------|--------|
| Homework assets → HC → XP → parent | **009** → **020 v3.7** → **070a v4.7 Live** (controlled window) → **064** prepare / **065 v10.3** → **078** Ready → **071** Hub |
| Homework completion (**020**) | Production **v3.7**. **012** / **063** deleted — do not restore |
| Homework upload Make (**070a**) | Production **v4.7 Live** during Perfect Week controlled window (historically intentional OFF). Formula Ready alone does not send; **Send to Make Trigger** required |
| Video upload (**070b** + Lambda + **070c**) | Production **070b v4.7** → Make → Lambda → **070c current live (repo v1.1)** verify. Optional retry proof + secret rotation **PENDING** |
| Child upload writeback (**022**) | GitHub **v2.2** (paste pending) — Lambda viewer URL only; no Canonical S3 fallback |
| Homework parent email | **078** Ready → **071** → **079** → Hub → Resend |
| Video parent email | Video `Parent Feedback Ready?` **manual** → **073 v4.4** (GitHub) / **v4.3** (prod until paste) → Hub → Resend — parent URL must be Lambda viewer only |
| Zoom live attendance | **101 v6.7** |
| Zoom recording approval email | **117 v2.1 Live** → Hub → Resend |
| Fillout daily submission | **OFF** (contest intake closed) |

---

## 11. Perfect Week

| Item | State |
|------|--------|
| Controlled path through WAS / homework | Path evidence 2026-08-16 |
| Perfect Week 48-hour grace period | **Live-tested** — **057 v2.0** + Airtable formulas; disposable weekly email showed **4/7** PW qualifying days vs **7/7** general shooting days |
| Full Perfect Week award proof | **PENDING / calendar-blocked** — not ready, not awarded. Grace period and ledger repair complete. See deploy checklists under `docs/deploy-checklists/057-v2.0-perfect-week-grace-period.md` |
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
- Confirmed Production pastes: 010/020/022/066/070b/117 as above
- Tremendous sandbox validation
- Lambda season CodeOnly deploy (optional follow-ups open)
- Repository integrity + PII redaction pass (this audit)
- **2026-08-23 post-XP-deletion autonomous QA:** Four temporary repair XP Events deleted by Mike; disposable live-create **PASS** (010 → SUBMISSION_XP, idempotent); Perfect Week **PASS** (39 active); Xavier/Testing3/Curtis **FINDING** (4 missing repair rows not recreated); stale-field check **PASS** (no phantom links); **010/057/072 paste BLOCKED** pending Mike
- **Secure video URL pipeline (2026-08-24):** GitHub **022 v2.2**, **072 v4.8**, **073 v4.4** —
  parent-facing video links must be Lambda viewer URLs only; direct S3 AccessDenied is expected;
  missing `Reviewer File URL` requires token repair (not public S3). Deploy checklist:
  [`deploy-checklists/022-v2.2-secure-video-url-pipeline.md`](./deploy-checklists/022-v2.2-secure-video-url-pipeline.md).
  **Production Airtable not updated until Mike pastes 022.**
- **2026-08-24 master closeout:** **065 v10.3** / **066 v3.9** Production dynamic `recordId` verified; historical audit artifacts documented ([`deploy-checklists/2026-08-24-historical-audit-artifacts.md`](./deploy-checklists/2026-08-24-historical-audit-artifacts.md))

### Pending / needs live proof

- **010 v10.12** — Mike paste from GitHub if Automations Code column still lags (v10.10 as of 2026-08-23 API read)
- Optional disposable fixture cleanup: `recdj8MD0szplMW5r`, `recxIzdVil9ewhBxN`, `recPg14iNRkxblMLs`
- Optional weekly email template / copy refinements
- Broader progression / standings certification packages
- Automation version inventory rows still UNKNOWN in Airtable UI
- Optional 066 OMNI sandbox confirm (K-H1)
- Lambda Storage Key retry proof + secret rotation
- RCC Airtable Interface install
- Open PRs #218, #217 and drafts #214, #213, #186, #162

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
