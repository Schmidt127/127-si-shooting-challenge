# ChatGPT Master Plan Brief — 127 Sports Intensity Shooting Challenge

**Purpose:** Single consolidated index of every planned change, improvement, and roadmap item in this repository. Paste this document (plus `docs/chatgpt-sources/` Project Sources) into ChatGPT to produce an overall **2026–27 implementation plan** through **May 1, 2027 launch**.

**Canonical backlog:** [v2-change-backlog.md](./v2-change-backlog.md) — this brief aggregates it; do not treat this file as the live backlog editor. Add new requests to the backlog first.

**Operating procedure:** [v2/04-ai-development-standards.md](./v2/04-ai-development-standards.md) — three roles (Mike / ChatGPT / Cursor), five phases, task classification, **workspace guardrails**.

**Last updated:** 2026-07-05 (Wave 0 closed; H-001/H-002; **V2-014** active; V2-013 queued)

---

## Session progress (2026-07-05)

| Item | Status |
|------|--------|
| **Wave 0 close-out** | **Closed** — C-001, C-002, C-003, C-008, newspaper + radio |
| **H-001** | **Done** — 090F audit v1.1; fix audit not data; 0 deletes |
| **H-002** | **GitHub done** — 066 v3.1 V2 standard; Airtable paste pending |
| **Automation standards** | Doc **06 Active**; 066 v3.1 canonical template |
| **Multi-year architecture** | **V2-013 queued** — Program Instance; one base; do not implement now |
| **V2-014** | **Active** — [Automation Modernization Roadmap](./v2-014-automation-modernization-roadmap.md); Phase 2 current |
| **V2-001** | **Deferred** — archive+clone superseded by V2-013 |

---

## 1a. Operating procedure (Mike + ChatGPT + Cursor)

Permanent workflow: **[v2/04-ai-development-standards.md](./v2/04-ai-development-standards.md)**

| Role | Responsibility |
|------|----------------|
| **Mike** | Product Owner — final decisions |
| **ChatGPT** | Architect, planner, reviewer, documentation, business analyst, copy |
| **Cursor** | Software engineer — repo, code, audits, testing, commits |

**Five phases:** Idea → Planning → Implementation → Review → Close

**Every new task** starts with **Task Classification** (Type, Priority, Difficulty, Owner, Dependencies, Backlog ID, Estimated Scope, **Phase, Correct tool, Repo, Mike's role**) before work begins.

**Wrong area?** Both ChatGPT and Cursor output **Workspace Check** and redirect — planning/copy/review → ChatGPT; in-Airtable ops → **OMNI first**; production scripts/audits/commits → Cursor; backlog → `v2-change-backlog.md` only; wrong repos → `hoopchallenges-landing`, `127-si-jr-ref`. Full tables in doc 04 § Workspace guardrails.

**OMNI priority:** Mike uses Airtable **OMNI** credits first for in-base work (views, formulas, data, interfaces) before Cursor repo edits. Production automations `001`–`114` still flow GitHub → paste → CHANGELOG.

| Phase | Owner | Output |
|-------|-------|--------|
| 1 Idea | ChatGPT + Mike | Decision, backlog item, high-level plan |
| 2 Planning | ChatGPT | Requirements, acceptance criteria, DoD |
| 3 Implementation | Cursor | Code, schema, automations, audits |
| 4 Review | ChatGPT + Mike | Accept / rework / follow-up item |
| 5 Close | Cursor | Commit, sync ChatGPT Sources, update backlog |

**Live backlog:** edit [v2-change-backlog.md](./v2-change-backlog.md). **This brief:** planning aggregate only — refresh when backlog changes materially.

---

### What this application is

The **127 Sports Intensity – Shooting Challenge** is an offseason basketball development program for young athletes in Montana (and select neighboring communities). It is **not** a simple shooting contest — it measures complete player development:

- Daily counted shooting submissions
- Educational homework
- Coach-reviewed videos
- Live instructional Zoom sessions
- Shooting streaks and Experience Points (XP)
- Twelve achievement levels from **Beginner** to **G.O.A.T.**

The system of record is **Airtable** (91 enrollments, 65 qualifying athletes in the inaugural 2025–26 season). **Make.com** handles file upload and email delivery. A **Next.js** app at `hoopchallenges.com/shoot` is replacing Softr for public-facing pages.

### Target launch

- **Season window:** May 1 – Jun 30, 2027 (`2026-2027`)
- **Launch gate:** Full pre-season audit pack + dry-run season before enrollment wave opens
- **Config tuning window:** Q1 2027 (Level Gate Rules, XP Reward Rules, Levels table)

### Four architectural layers (constitution)

| Layer | Changes | Where |
|-------|---------|--------|
| **Engine** | Never | `docs/v2/03-business-rules.md` — platform behavior contract |
| **Configuration** | Every season | Airtable tables + `docs/v2/season-configuration-design.md` |
| **Content** | Constantly | Homework, videos, emails in base |
| **Presentation** | Generated | Game manual, website, media kits, parent comms |

### Repository layout

| Path | Purpose |
|------|---------|
| `airtable/automations/shooting-challenge/` | Production automation scripts (001–114) |
| `airtable/extension-scripts/audits/` | Dry-run pipeline audits (Stages A–J) |
| `airtable/extension-scripts/safe-backfills/` | Controlled repair/backfill extensions |
| `web/` | Next.js app deployed at `/shoot` on hoopchallenges.com |
| `make/` | Make.com blueprints and upload/email docs |
| `tools/airtable/` | Schema export CLI + media kit builders |
| `media/` | Season publicity assets (newspapers, radio, facebook) |
| `docs/` | Ops docs — start at `PROJECT_STATE.md` |

---

## 2. Locked decisions (do not re-litigate)

These were locked on **2026-07-03** per [shooting-challenge-v2-master-direction.md](./shooting-challenge-v2-master-direction.md):

| Decision | Detail | Backlog |
|----------|--------|---------|
| **One ladder** | No dual-track for 2026–27 | C-014 resolved |
| **Spread gates early** | Via Level Gate Rules config; numbers TBD Q1 2027 | V2-005 |
| **Config over scripts** | Tune XP, levels, gates in Airtable tables — not hardcoded JS | V2-002 |
| **Communication before Day 1** | Game manual, website rules hub, pre-season parent comms | V2-008–V2-010 |
| **Archive + clone base** | **Superseded 2026-07-05** — one base + **Program Instance** per year (**V2-013**). Prior plan: [base-cutover](./shooting-challenge-v2-base-cutover.md) |
| **Coach role** | Coaching only; automation is default for XP, emails, gates | Master direction |
| **Educational Athletics philosophy** | Sports develop life skills, not just basketball skill | Constitution |

---

## 3. Engine principles (must preserve in any plan)

From C-023 and C-024 in [v2-change-backlog.md](./v2-change-backlog.md):

- **One source record → one XP Event** — Source Key idempotency on every create path
- **Duplicates caught at intake** — not repaired weeks later in backfills
- **Backfills safe to rerun** — dry-run default; skip unchanged; never double-create
- **File dedup by SHA-256 content hash** — never filename or title alone
- **Config tables for numbers** — scripts orchestrate; they do not embed season tuning
- **Skip vs error distinction** — automations set `statusOut` correctly; skips are not failures
- **Never write computed fields** — formulas, rollups, lookups, counts
- **Fix the audit, not the data** — when investigation shows rows are correct, update audit logic (H-001 example)

---

## 4. Complete backlog table

**Status key:** `open` · `queued` · `in-progress` · `done` · `deferred` · `resolved` · `monitoring`

### Wave 0 — 2025–26 close-out (**closed**)

| ID | Request | Detail | Depends on | Status | Primary doc |
|----|---------|--------|------------|--------|-------------|
| **C-001** | Restore Lyle Kimm excluded shots | ~300 shots; Count It restored | — | **done** | [close-out-considerations.md](./close-out-considerations.md) |
| **C-002** | Final summary emails | All families sent via **074** / Make | — | **done** | [close-out-considerations.md](./close-out-considerations.md) |
| **C-003** | Koen HW17 coach review + email | Graded + parent email sent | — | **done** | [close-out-considerations.md](./close-out-considerations.md) |
| **C-008** | Turn off Fillout daily form | Form OFF **2026-07-05** | — | **done** | [close-out-considerations.md](./close-out-considerations.md) |
| **C-006** | 090F duplicate unlock prevention | Audit fixed in H-001; 066 v3.1 forward | H-002 | **done** | [post-close-hygiene-2025-26.md](./post-close-hygiene-2025-26.md) |

### Wave 1 — Post-close hygiene

| ID | Request | Detail | Depends on | Status | Primary doc |
|----|---------|--------|------------|--------|-------------|
| **V2-001** | Archive + clone base | **Deferred** — superseded by **V2-013** | Wave 0 | deferred | [shooting-challenge-v2-base-cutover.md](./shooting-challenge-v2-base-cutover.md) |
| **H-001** | Fix 090F unlock audit | v1.1; Source Key dedupe; 0 deletes | Wave 0 | **done** | [post-close-hygiene-2025-26.md](./post-close-hygiene-2025-26.md) |
| **H-002** | **066** v3.1 V2 rewrite + Week write | GitHub `45b17d7`; Airtable paste pending | Wave 0 | **review** | [v2/06-automation-standards.md](./v2/06-automation-standards.md) |
| **H-003** | Award Recipients scope metadata | Accepted for 2025–26 | — | deferred | [post-close-hygiene-2025-26.md](./post-close-hygiene-2025-26.md) |
| **H-004** | Awards catalog duplicate bucket | `thanks_for_playing` class | — | deferred | [post-close-hygiene-2025-26.md](./post-close-hygiene-2025-26.md) |
| **H-005** | Weekly email workflow → automate | Feeds C-011 | — | queued | [post-close-hygiene-2025-26.md](./post-close-hygiene-2025-26.md) |
| **H-006** | Enrollment Conquered Goal Date lookup | Low priority | — | queued | [post-close-hygiene-2025-26.md](./post-close-hygiene-2025-26.md) |

### Wave 1b — Multi-year architecture (**do not start until approved wave**)

| ID | Request | Detail | Depends on | Status | Primary doc |
|----|---------|--------|------------|--------|-------------|
| **V2-013** | Program Instance multi-year platform | One base; Program Instance scopes config + ops; historical reporting protection; automations/views/interfaces | Wave 1, C-012 | **queued** | [v2-change-backlog.md](./v2-change-backlog.md) |

### Wave 2 — Platform Modernization (automation inventory & capacity) — **current**

| ID | Request | Detail | Depends on | Status | Primary doc |
|----|---------|--------|------------|--------|-------------|
| **V2-014** | Automation Modernization Roadmap | Category A–F inventory; four-axis evaluation; Complexity Score; complexity-first (capacity secondary); **066 v3.1** reference; **112 OFF** | Wave 0, H-002 | **done** (doc) | [v2-014-automation-modernization-roadmap.md](./v2-014-automation-modernization-roadmap.md) |
| **V2-014a** | Wave 2a — classify everything | Category + Complexity Score for all 46; OMNI triggers; no unapproved production changes | V2-014 | queued | [v2-014-automation-modernization-roadmap.md](./v2-014-automation-modernization-roadmap.md) |
| **V2-014b** | Email Message Center | Replace 7 email automations with builder + sender | V2-014, C-011 | queued | [v2-014-automation-modernization-roadmap.md](./v2-014-automation-modernization-roadmap.md) |
| **V2-015** | Permanent Development Airtable base | **Ready** — `appTetnuCZlCZdTCT`; 6 test enrollments; prod unchanged; 066 dev test pending | V2-014 | **in-progress** | [v2-015-development-base-architecture.md](./v2-015-development-base-architecture.md) |

### Wave 2 — Schema, field ownership & dedupe engine

| ID | Request | Detail | Depends on | Status | Primary doc |
|----|---------|--------|------------|--------|-------------|
| **C-012** | Stage K — every field has one writer | Field ownership matrix; hide/delete legacy; update field-map | V2-013 | queued | [airtable/stage-j-legacy-cleanup.md](./airtable/stage-j-legacy-cleanup.md) |
| **C-026** | Merge **Tutorials** vs **Tutorials & Assets** | Keep **Tutorials** (web uses it); retire duplicate table | C-012 | queued | [v2-change-backlog.md](./v2-change-backlog.md) |
| **C-024** | Rock-solid dedupe keys + safe backfill reruns | Idempotent creates at every layer; `audit-dedupe-key-coverage.js` | C-012 | queued | [v2-change-backlog.md](./v2-change-backlog.md) |
| **C-014** | One ladder, spread gates early | **DECIDED** — tune in config Q1 2027 | C-021, Wave 9 | resolved | [xp-motivation-analysis-2025-26.md](./xp-motivation-analysis-2025-26.md) |

### Wave 3 — Configuration engine (grade bands)

| ID | Request | Detail | Depends on | Status | Primary doc |
|----|---------|--------|------------|--------|-------------|
| **C-021** | Grade bands propagate automatically | Match XP rules by **linked Grade Band**; no hardcoded band strings | C-012 | queued | [platform-config-improvements.md](./platform-config-improvements.md) |
| **V2-002** | Config-over-scripts audit | Grep automations for hardcoded XP, levels, bands | C-021 | queued | [shooting-challenge-v2-config-vs-code.md](./shooting-challenge-v2-config-vs-code.md) |

### Wave 4 — Presentation layer (public display)

| ID | Request | Detail | Depends on | Status | Primary doc |
|----|---------|--------|------------|--------|-------------|
| **C-022** | Public display fields — not primary/formula | Parents/emails/web use Presentation labels only | C-012 | queued | [platform-config-improvements.md](./platform-config-improvements.md) |
| **V2-003** | Homework email column fix (**071**) | Remove `homeworkRecord.name` fallback | C-022 | queued | [platform-config-improvements.md](./platform-config-improvements.md) |
| **V2-004** | Weekly email homework table (**072**) | Same Presentation rule for homework name column | C-022 | queued | [platform-config-improvements.md](./platform-config-improvements.md) |

### Wave 5 — Reliability & automation

| ID | Request | Detail | Depends on | Status | Primary doc |
|----|---------|--------|------------|--------|-------------|
| **C-010** | Harden `Active?` on Enrollments | Inactive = fully out of XP, emails, summaries, streaks | V2-013 | queued | [close-out-considerations.md](./close-out-considerations.md) |
| **C-011** | Fully automatic weekly parent emails | No manual Build/Send triggers; scheduled 072→074 | C-010, C-022 | queued | [close-out-considerations.md](./close-out-considerations.md) |

### Wave 6 — Testing & sandbox

| ID | Request | Detail | Depends on | Status | Primary doc |
|----|---------|--------|------------|--------|-------------|
| **C-019** | Schmidt test enrollment | `Active?` = false for standings only; no test flags on pipeline rows | C-010 partial | queued | [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) |
| **C-020** | Test Intake harness | Table + extension; multi-file video parity without Fillout | C-019, V2-013 | queued | [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) |

### Wave 7 — Asset storage

| ID | Request | Detail | Depends on | Status | Primary doc |
|----|---------|--------|------------|--------|-------------|
| **C-013** | AWS S3 canonical URLs | Retire Google Drive + Airtable attachments; one HTTPS URL per asset | C-012, C-020 | queued | [asset-storage-migration.md](./asset-storage-migration.md) |
| **C-023** | File dedup by content hash (SHA-256) | Wire `File Content Hash` fields end-to-end at upload | C-013, C-024 | queued | [asset-storage-migration.md](./asset-storage-migration.md) |

### Wave 8 — Intake & calendar

| ID | Request | Detail | Depends on | Status | Primary doc |
|----|---------|--------|------------|--------|-------------|
| **C-017** | Fillout → Athletes validation | Stronger Fillout rules; identity hygiene before pipeline | C-012 | queued | [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) |
| **C-018** | Intake open vs challenge run | Two calendars in **Weeks** table; **005** maps by date range | V2-013 | queued | [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) |
| **C-009** | Redo HW17 Fillout quiz intake | **067** creates rows without attachments; pursue Fillout PDF export or redesign | C-013, C-024 | queued | [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) |

### Wave 9 — Season config (numbers, Q1 2027)

| ID | Request | Detail | Depends on | Status | Primary doc |
|----|---------|--------|------------|--------|-------------|
| **V2-005** | Tune Level Gate Rules | Spread gates early; numbers in Airtable only | C-021, V2-013 | queued | [v2/season-configuration-design.md](./v2/season-configuration-design.md) |
| **V2-006** | Tune XP Reward Rules | Per-band rules via links; streak economics review (**053**) | C-021 | queued | [v2/season-configuration-design.md](./v2/season-configuration-design.md) |
| **V2-007** | Tune Levels table | Thresholds for 2026–27 | V2-005 | queued | [v2/season-configuration-design.md](./v2/season-configuration-design.md) |
| **C-025** | Zoom recording attendance — partial credit | Recording watch path with reduced XP/gate credit; distinct Source Key | C-024, V2-006, V2-005 | queued | [v2-change-backlog.md](./v2-change-backlog.md) |

### Wave 10 — Communication, website & publicity

| ID | Request | Detail | Depends on | Status | Primary doc |
|----|---------|--------|------------|--------|-------------|
| **V2-008** | Game manual | Published from config tables before Day 1 | Wave 9 | queued | [shooting-challenge-v2-master-direction.md](./shooting-challenge-v2-master-direction.md) |
| **V2-009** | `/shoot` rules + progress hub | Website mirrors config; not rankings-only | Wave 9, C-022 | queued | [web/docs/project-roadmap.md](../web/docs/project-roadmap.md) |
| **V2-010** | Pre-season parent comms | Rules explained before first submission | V2-008 | queued | [shooting-challenge-v2-master-direction.md](./shooting-challenge-v2-master-direction.md) |
| **C-027** | Major-event SMS notifications | Level up, milestones — not daily XP; Twilio/Make TBD | C-010, C-024, V2-008 | queued | [v2-change-backlog.md](./v2-change-backlog.md) |
| **V2-028** | **Generate Media Kits** platform | 2025–26 manual send **done**; platform automation queued | C-013, C-022 | done (2025–26) | [media-kits.md](./media-kits.md) |

**Note:** **V2-013** = Program Instance multi-year architecture. **V2-014** = Automation Modernization Roadmap (Phase 2, **active**). **V2-015** = Development base **ready** (`appTetnuCZlCZdTCT`; **in-progress** until 066 dev test). **V2-016–V2-027** unused. **V2-028** = media kits.

### Wave 11 — Launch gate (before May 2027)

| ID | Request | Detail | Depends on | Status | Primary doc |
|----|---------|--------|------------|--------|-------------|
| **V2-011** | Full pre-season audit pack | Stages A–J + new audits (grade bands, Presentation, S3) | All above | queued | [airtable/extension-scripts/audits/README.md](../airtable/extension-scripts/audits/README.md) |
| **V2-012** | Dry-run season on Schmidt test | Full pipeline before enrollment wave | C-020, Wave 7–9 | queued | [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) |

---

## 5. Dependency wave order

Nothing ships to production until the owner approves the wave.

```
Wave 0 (close-out) → Wave 1 (hygiene) → Wave 1b (V2-013 Program Instance) → Wave 2 (schema)
  → Wave 3 (grade bands) → Wave 4 (presentation)
  → Wave 5 (reliability) → Wave 6 (test sandbox)
  → Wave 7 (S3) → Wave 8 (intake) → Wave 9 (season tuning)
  → Wave 10 (comms/website/media) → Wave 11 (launch gate)
```

| Wave | Focus | Why this order |
|------|--------|----------------|
| **0** | Finish 2025–26 | **Closed 2026-07-05** |
| **1** | H-001, H-002 hygiene | Audit fix + 066 V2 standard |
| **1b** | **V2-013** Program Instance | One base, multi-year; **do not start until approved** |
| **2** | C-012 Stage K; C-024 dedupe; C-026 Tutorials merge | Schema cleanup before new fields or storage |
| **3** | C-021 grade bands — link-based matching | Must work before tuning XP Reward Rules |
| **4** | C-022 public display fields | Affects 071, 072, web |
| **5** | C-010, C-011, 066 Airtable deploy | Production safety before heavy testing |
| **6** | C-019, C-020 test sandbox | Validate pipeline without Fillout |
| **7** | C-013 S3; C-023 file hash dedup | One URL per asset; hash at upload |
| **8** | C-017, C-018, C-009 intake | Fillout + Weeks + HW17 quiz |
| **9** | Levels, gates, XP rules; C-025 Zoom recording | Config tuning Q1 2027 |
| **10** | Game manual, `/shoot` hub; C-027 SMS; V2-028 media | Comms + publicity |
| **11** | Full audit pack + dry-run season | Gate before May 2027 |

---

## 6. Sub-system roadmaps

### 6.1 Airtable automations

- **46 production scripts** indexed in [automation-index.md](./automation-index.md)
- **Standard:** [airtable/automations/AUTOMATION_SCRIPT_STANDARD.md](../airtable/automations/AUTOMATION_SCRIPT_STANDARD.md) · **V2 reference:** [v2/06-automation-standards.md](./v2/06-automation-standards.md) — **066 v3.1**
- **Key scripts touched by backlog:**
  - **005** — Week date mapping (C-018)
  - **007** — Submission dedupe (C-024)
  - **009** — Asset dedupe (C-023)
  - **010, 031, 053, 065, 072, 076** — Active? gaps (C-010)
  - **066, 058** — Achievement unlock Week write (H-002, C-006)
  - **067** — HW17 quiz without attachment (C-009)
  - **071, 072, 074** — Email Presentation fields (V2-003, V2-004, C-011)
  - **101** — Zoom attendance (C-025)
  - **114** — XP Event idempotency pattern reference

### 6.2 Make.com

- **Upload asset engine** — [make/documentation/upload-asset-engine-v2-hash-duplicate-check.md](../make/documentation/upload-asset-engine-v2-hash-duplicate-check.md) (C-023)
- **Email flows** — 071 homework, 072 weekly build, 074 send (C-011 automation target)
- **C-013** — Rewrite upload engine for S3 canonical URLs
- **C-027** — Possible SMS module (TBD vs Twilio)

### 6.3 Web app (`web/` — hoopchallenges.com/shoot)

From [web/docs/project-roadmap.md](../web/docs/project-roadmap.md):

| Phase | Planned work | Backlog tie-in |
|-------|--------------|----------------|
| **0** | Vercel deploy; `/api/airtable` configured in prod | — |
| **1** | Leaderboard, levels, public display, publish-flag filtering | C-022 |
| **2** | `/shoot/athletes/[slug]` profiles; homework/video widgets | C-022, V2-009 |
| **3** | Participant dashboard; auth (magic link / Clerk TBD) | — |
| **4** | Achievements wired to Airtable; charts; mobile polish | V2-009 |
| **5** | Admin routes — publish toggles, featured athlete | V2-028 Phase D |
| **6** | Softr cutover, DNS redirects, decommission | — |

**Out of scope for web:** writing submissions/homework; replacing automations or Make.

**Known gaps** ([known-issues.md](./known-issues.md)):
- Root URL 404 until landing hub or `/` → `/shoot` redirect
- Achievements page shell not wired
- Athlete profiles incomplete (`Web - Public Profiles` view unused)
- Pre-launch `noindex` on sensitive routes
- `OK to Publish on Softr` still used as publish gate

**Route plan:** [web/docs/page-plan.md](../web/docs/page-plan.md), [web/docs/site-hierarchy.md](../web/docs/site-hierarchy.md)

### 6.4 Media kits & publicity (V2-028)

From [media/2025-2026/future-enhancements/ROADMAP.md](../media/2025-2026/future-enhancements/ROADMAP.md):

| Phase | Status | Work |
|-------|--------|------|
| **A** | **Done (2025–26)** | `media/` folder; Python builders; 10 newspaper + 12 radio kits **sent 2026-07-05** |
| **B** | Queued | Config tables: Media Markets, Media Outlets, Season Publicity Settings |
| **C** | Queued | `generate_media_kits()` service — idempotent, validation gate, manifest JSON |
| **D** | Queued | UI button + optional Make/Gmail distribution |

**Success metrics:** <1 day to send-ready; zero 10+ shot athletes missing; new region = config rows not script fork.

**2025–26 close-out status** ([media-kits.md](./media-kits.md)):
- 10 newspaper packets built and **sent**
- 12 radio kits + station outreach emails **sent 2026-07-05**
- Facebook kits **not started** (optional / future)

### 6.5 Audits & backfills

From [airtable/extension-scripts/audits/README.md](../airtable/extension-scripts/audits/README.md):

- **Stages A–J** — historical repair pipeline (dry-run first)
- **Stage K** — field ownership matrix (C-012)
- **Future audits:** `audit-dedupe-key-coverage.js` (C-024); `audit-grade-band-rule-coverage.js` (C-021)
- **Safe backfills** — [airtable/extension-scripts/safe-backfills/README.md](../airtable/extension-scripts/safe-backfills/README.md) — require `CONFIRM_WRITE` / `CONFIRM_DELETE`

---

## 7. 2025–26 remaining manual work

| Item | Status |
|------|--------|
| C-001 Lyle Kimm shot restoration | **done** |
| C-002 Final summary emails | **done** |
| C-003 Koen HW17 coach review + email | **done** |
| C-008 Turn off Fillout daily form | **done** |
| Newspaper + radio outreach | **done** |
| Amazon gift card fulfillment | per close-out audits (70 rows, $595) |
| Facebook publicity kits | not started (optional) |
| **066 v3.1 Airtable paste** | pending Mike deploy checklist |

---

## 8. Long-term platform vision (beyond 2026–27)

From [shooting-challenge-v2-master-direction.md](./shooting-challenge-v2-master-direction.md):

- **Educational Athletics platform** — future challenges: Dribble, Free Throw, Reading, Workout
- **Multi-year in one base** — **Program Instance** scopes seasons (**V2-013**); prior archive+clone plan superseded **2026-07-05**
- **Dribble Challenge** — recommended separate repo + Airtable base
- **Replace Softr** entirely with Next.js at hoopchallenges.com
- **Coach focuses on coaching** — system handles XP, emails, gates, publicity generation

---

## 9. Open questions for owner (decisions needed before planning details)

| Topic | Questions | Backlog |
|-------|-----------|---------|
| **C-027 SMS** | Twilio vs Make vs other? Athlete cell, parent cell, or both? Opt-in on enrollment? Quiet hours? | C-027 |
| **C-009 HW17 quiz** | Will Fillout export PDF attachment? If not, full attachment-less schema redesign? | C-009 |
| **C-025 Zoom recording** | How does athlete attest watching recording? Coach confirm vs form? Partial XP amount in config? | C-025 |
| **Multi-challenge architecture** | One shared org base with Program Instance per program/year vs separate base per challenge? | V2-013, Master direction |
| **Web auth** | Magic link vs Clerk vs other for participant dashboard? | Web Phase 3 |
| **C-026 Tutorials merge** | Row-count audit before delete — any Softr views on Tutorials & Assets? | C-026 |

---

## 10. Document index (all planning sources)

### Tier 1 — Master backlog and direction (required)

| File | Role |
|------|------|
| [docs/v2-change-backlog.md](./v2-change-backlog.md) | Single source of truth for all change IDs, waves 0–11 |
| [docs/shooting-challenge-v2-master-direction.md](./shooting-challenge-v2-master-direction.md) | Constitution: locked decisions, long-term vision |
| [docs/close-out-considerations.md](./close-out-considerations.md) | Ops watchlist with Airtable record IDs |
| [docs/post-close-hygiene-2025-26.md](./post-close-hygiene-2025-26.md) | H-001–H-006 cleanup |
| [docs/PROJECT_STATE.md](./PROJECT_STATE.md) | Live snapshot: bases, audits, Vercel, Softr |

### Tier 2 — Architecture deep-dives

| File | Backlog IDs |
|------|-------------|
| [docs/shooting-challenge-v2-base-cutover.md](./shooting-challenge-v2-base-cutover.md) | V2-001 (superseded by V2-013) |
| [docs/v2-change-backlog.md](./v2-change-backlog.md) | V2-013 Program Instance; **V2-014** automation roadmap |
| [docs/v2-014-automation-modernization-roadmap.md](./v2-014-automation-modernization-roadmap.md) | **V2-014** — automation inventory, disposition, capacity |
| [docs/shooting-challenge-v2-config-vs-code.md](./shooting-challenge-v2-config-vs-code.md) | V2-002 |
| [docs/platform-config-improvements.md](./platform-config-improvements.md) | C-021, C-022, V2-003, V2-004 |
| [docs/asset-storage-migration.md](./asset-storage-migration.md) | C-013, C-023 |
| [docs/testing-and-intake-architecture.md](./testing-and-intake-architecture.md) | C-017–C-020, C-009 |
| [docs/airtable/stage-j-legacy-cleanup.md](./airtable/stage-j-legacy-cleanup.md) | C-012 |
| [docs/v2/season-configuration-design.md](./v2/season-configuration-design.md) | V2-005–V2-007 |
| [docs/xp-motivation-analysis-2025-26.md](./xp-motivation-analysis-2025-26.md) | C-014 (resolved) |
| [docs/media-kits.md](./media-kits.md) | V2-028 |

### Tier 3 — Sub-system roadmaps

| File | Scope |
|------|--------|
| [web/docs/project-roadmap.md](../web/docs/project-roadmap.md) | Next.js phases 0–6 |
| [web/docs/page-plan.md](../web/docs/page-plan.md) | Route-level status |
| [web/docs/site-hierarchy.md](../web/docs/site-hierarchy.md) | Planned routes |
| [web/docs/airtable-data-map.md](../web/docs/airtable-data-map.md) | Views not yet wired |
| [media/2025-2026/future-enhancements/ROADMAP.md](../media/2025-2026/future-enhancements/ROADMAP.md) | V2-028 phases A–D |
| [make/documentation/upload-asset-engine-v2-hash-duplicate-check.md](../make/documentation/upload-asset-engine-v2-hash-duplicate-check.md) | C-023 Make-side |
| [airtable/extension-scripts/audits/README.md](../airtable/extension-scripts/audits/README.md) | Audit pipeline |

### Tier 4 — V2 doc pack

| File | Status |
|------|--------|
| [docs/v2/01-constitution.md](./v2/01-constitution.md) | Active |
| [docs/v2/03-business-rules.md](./v2/03-business-rules.md) | Active — engine contract |
| [docs/v2/04-ai-development-standards.md](./v2/04-ai-development-standards.md) | Active — three-role workflow, five phases |
| [docs/v2/06-automation-standards.md](./v2/06-automation-standards.md) | Active — 066 v3.1 V2 reference |
| [docs/v2/08-testing-standards.md](./v2/08-testing-standards.md) | Active — fix the audit, not the data |
| [docs/chatgpt-sources/](./chatgpt-sources/) | Synced files for ChatGPT Project Sources |

### Tier 5 — Operational context

| File | Notes |
|------|-------|
| [docs/known-issues.md](./known-issues.md) | Active web/schema gaps |
| [docs/deployment-notes.md](./deployment-notes.md) | Vercel, landing hub |
| [docs/automation-index.md](./automation-index.md) | 46 automations reference |
| [CHANGELOG.md](../CHANGELOG.md) | Shipped history |
| [SYSTEM_OVERVIEW.md](../SYSTEM_OVERVIEW.md) | Architecture goals |
| [AGENTS.md](../AGENTS.md) | AI assistant entry point |

---

## 11. ChatGPT import instructions

1. Import **all files** in [docs/chatgpt-sources/](./chatgpt-sources/) into ChatGPT Project Sources.
2. Include this file (`CHATGPT-MASTER-PLAN-BRIEF.md`) — it is file **23** in that folder.
3. After doc commits, refresh from repo root:

```powershell
.\tools\docs\sync-chatgpt-sources.ps1
```

4. Re-import changed files into ChatGPT.

**Recommended read order in ChatGPT:** See [docs/chatgpt-sources/00-START-HERE.md](./chatgpt-sources/00-START-HERE.md).

---

## 12. Suggested prompt for ChatGPT

Copy everything below into a new ChatGPT conversation after importing sources:

```
You are planning the 2026–27 build of the 127 Sports Intensity Shooting Challenge
(Airtable + Make + Next.js at hoopchallenges.com/shoot).

Using CHATGPT-MASTER-PLAN-BRIEF.md and 22-v2-change-backlog.md as authority:

1. Produce a phased master plan from now through May 1, 2027 launch.
2. Respect dependency waves 0–11 — do not reorder without explaining tradeoffs.
3. Separate: (a) 2025–26 close-out, (b) platform/engine work, (c) season tuning Q1 2027,
   (d) comms/website, (e) launch gate audits.
4. For each phase: goals, backlog IDs, key files to touch, risks, owner decisions needed,
   and definition of done.
5. Include parallel tracks for Web (phases 0–6) and Media Kits (V2-028 A–D).
6. Call out what must NOT change (locked decisions, engine contract, idempotency rules).
7. Estimate relative effort (S/M/L) — not calendar dates unless inferred from May 2027 deadline.
8. End with a prioritized "next 30 days" action list assuming Wave 0 still open.
```

---

## 13. Suggested ChatGPT output structure

Ask ChatGPT to organize its master plan as:

1. **Executive summary** — timeline, parallel tracks, critical path
2. **Wave 0 close-out plan** — C-001, C-002, C-003, C-008 with sequencing
3. **Platform build waves 1–8** — schema through intake (grouped logically)
4. **Season tuning wave 9** — Q1 2027 config work with tuning checklist
5. **Comms & publicity wave 10** — V2-008–010, C-027, V2-028
6. **Launch gate wave 11** — V2-011 audit pack, V2-012 dry-run
7. **Web roadmap overlay** — phases 0–6 mapped to waves
8. **Media kit roadmap overlay** — phases A–D mapped to waves
9. **Risk register** — dependencies, owner decisions, external vendors (AWS, Twilio, Fillout)
10. **Next 30 days** — concrete actions assuming Wave 0 still open

---

## Revision log

| Date | Notes |
|------|-------|
| 2026-07-05 | Initial consolidated brief for ChatGPT master planning |
