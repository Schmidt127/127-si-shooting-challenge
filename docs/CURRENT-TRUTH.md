# CURRENT TRUTH — 127 SI Shooting Challenge

**Status:** Active — primary current-state document for this repository  
**Last verification (repo):** 2026-08-20  
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
| HEAD SHA | `010a8b3a48917771c77ee47e53822ec736558b5b` |
| `origin/master` | Identical (`010a8b3…`) |
| Ahead / behind | **0 / 0** |
| Working tree at audit start | Clean (no uncommitted tracked files) |
| Working tree after this audit | **Dirty until committed** — integrity docs, PII redaction, validator/header fixes (see integrity audit §8) |
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

| Environment | Base UI name | Base ID | Role |
|-------------|--------------|---------|------|
| **Production** | `127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026` | `appn84sqPw03zEbTT` | Live season system of record |
| **Development** | `127SI - SHOOTING CHALLENGE - DEV` | `appTetnuCZlCZdTCT` | DEV-first testing |

Schema snapshots under `airtable/schema/snapshots/prod-20260706/` and `dev-20260706/` are the latest dated exports in-repo. `airtable/schema/current/` remains **stale** until refreshed — do not treat as live schema.

---

## 4. Website / deployment

| Item | State |
|------|--------|
| Public URL | https://www.fairfieldbasketballclub.com/shoot |
| Local | http://localhost:3001/shoot |
| Health | `GET /shoot/api/airtable` → token validity check |
| Softr | **Obsolete / Not Used** — historical reference only |
| SEO | Sitewide `noindex` until cutover approval |
| Live Vercel settings | `REQUIRES LIVE CONFIRMATION` in Vercel dashboard / CLI |

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
| Automation **117** | **v2.1** Hub queue create for Zoom recording approval (code). Automations table **Name** still says “Orchestrator”; **Status = Off** (2026-08-20 audit). Not XP; not Make 117f. |

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

### Confirmed Production paste (Mike 2026-08-19 overlays in-repo)

| # | GitHub `SCRIPT.version` | Production paste claim |
|---|-------------------------|------------------------|
| **010** | `v10.10` | **v10.10** |
| **020** | `v3.6` | **v3.6** |
| **022** | `v2.1` | **v2.1** |
| **066** | `v3.8` | **v3.8** |
| **070b** | `v4.6` | **v4.6** |
| **117** | `v2.1` | **v2.1** Hub handoff |

### Repository source (GitHub) — other notable scripts

Live ON/OFF for rows without Mike UI confirmation = `UNVERIFIED`. Full table: [`AUTOMATION_VERSION_INVENTORY.md`](./AUTOMATION_VERSION_INVENTORY.md).

| # | GitHub version (header) | Notes |
|---|-------------------------|--------|
| 070a | v4.6 (GitHub) | Keep **PROD OFF** |
| 070c | v1.1 | Historical C-013 verify path |
| 076 | v8.7 (GitHub) | Daily Hub queue create (not Make send) |
| 077 | v5.0 archive | **Deleted from Production** (2026-08-13 docs) — not live Make send |
| 079 | v2.5 (GitHub) | Ready queue → Hub → Resend |
| 101 | v6.6 (GitHub) | Live Zoom attendance XP writer |
| 112 | legacy | Expected **OFF** |
| 115 | v2.1 ETF | **DEV only** — never paste to PROD |
| 117a / 117b | design / historical S16 | **Not** current PROD 117 |

**Contradiction resolved:** Older Completion Master paste-queue rows that still say “010 v10.8 pending” or “020 v3.5” are **historical** relative to the 2026-08-19 Mike overlays. Prefer this file + inventory banner + PROJECT_STATE overlays for those six numbers.

---

## 9. XP / levels / achievements

| Domain | Owner (repo contract) | Live proof |
|--------|----------------------|------------|
| Submission XP | **010** — Source Key `SUBMISSION_XP\|{submissionId}` | Controlled path evidence 2026-08-16; version v10.10 overlay |
| Homework XP | **064 / 065** (+ **020** HC create) | PKG-007 evidence exists; treat exact live versions as mostly `UNVERIFIED` beyond documented packets |
| Video XP | **113 / 114** (+ **013** VF create) | Partial evidence; broader proof open |
| Shot milestones | **066** | Production paste **v3.8** |
| Levels | **041 / 042** | Initial assignment proof exists; broader progression `PENDING` |
| Perfect Week | **057 / 058 / 059** chain | **Open** — remaining daily dates + award verification incomplete |
| Zoom live attendance XP | **101** | PKG-034 base lifecycle complete; bonus/downstream deferred |
| Zoom recording XP under slot 117 | Not live | Slot **117** is email Hub handoff |

---

## 10. Homework / video / Zoom

| Path | State |
|------|--------|
| Homework completion (**020**) | Production **v3.6** |
| Homework upload Make (**070a**) | **OFF** in PROD |
| Video upload (**070b** + Lambda) | **070b v4.6**; Lambda Program Instance season CodeOnly deploy evidenced 2026-08-19 (`CodeSha256` in PROJECT_STATE). Optional retry proof + secret rotation **PENDING** |
| Child upload writeback (**022**) | Production **v2.1** |
| Zoom live attendance | **101** |
| Zoom recording approval email | **117 v2.1** → Hub → Resend |
| Fillout daily submission | **OFF** (contest intake closed) |

---

## 11. Perfect Week

| Item | State |
|------|--------|
| Controlled path through WAS / homework | Path evidence 2026-08-16 |
| Full Perfect Week award proof | **Open / PENDING** — remaining six daily dates, video review/XP, final award |
| Authority | Completion Master + Perfect Week testing docs under `docs/testing/perfect-week/` |

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

### Pending / needs live proof

- Perfect Week end-to-end award
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
- Live Vercel env var values
- Live Make scenario schedules beyond documented OFF/ON claims
- Live Tremendous production access (explicitly pending)
- That every Hub template ID in docs matches Hub UI today

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
