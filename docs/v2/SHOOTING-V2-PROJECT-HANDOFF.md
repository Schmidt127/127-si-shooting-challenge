# Shooting Challenge V2 Project Handoff

**Last Verified:** 2026-07-14  
**Prepared from branch:** `overnight/lead-integration`  
**Prepared from commit:** `43a1e3013437d3846bb82afabdd8b873e03ba249` (`43a1e30`)  
**Default remote branch:** `master` @ `b875292833364a4cc4c15bf9ace91a427aba8e7b` (`b875292`) — Lead is ~196 commits ahead of `master`  
**CONTROL.json tip (repo file at verify time):** `3e55cfa` — **stale vs HEAD** (CONTROL lags the Control-sync commit `43a1e30`; treat git `HEAD` as authoritative for tip SHA)

**Status vocabulary used below:**

| Label | Meaning |
|-------|---------|
| **APPROVED** | Owner decision recorded; do not reopen without Mike |
| **IMPLEMENTED** | Code/docs/schema work exists in repo and/or target environment as stated |
| **TESTED** | Explicit pass/fail evidence in repo |
| **BLOCKED** | Documented hard stop |
| **PROPOSED** | Design/proposal only — not shipped |
| **UNKNOWN** | Repo evidence incomplete; verify live |

**How to use this document:** This is the **canonical recovery brief** after the prior ChatGPT project was deleted. ChatGPT must read **§0 (roles / agents / rules)** and **§1** before planning anything. Cursor must still verify git tip + `CONTROL.json` before overnight work. Prefer current repo evidence over memory or old chat history.

---

## 0. How AIs and Agents Must Work on This Project (mandatory for ChatGPT)

**Authority:** `docs/v2/04-ai-development-standards.md` · `AGENTS.md` · `docs/development/DEV-EXECUTION-AND-PROMOTION-MODEL.md` · `docs/overnight-runs/CONTROL.json` · `.cursor/rules/*` · `docs/ENGINEERING_CONSTITUTION.md`

This section is **not optional context**. A new ChatGPT session that only knows product goals will make wrong phase/tool/repo recommendations.

### 0.1 Four actors (not three-plus-forget-OMNI)

| Actor | Job | Must / must not |
|-------|-----|-----------------|
| **Mike** | Product owner; final decisions; pastes Airtable PROD; enables real sends; approves feature briefs and PROD promotion | Approves once per feature outcome under DEV model; does **not** mirror DEV→PROD from memory |
| **ChatGPT** | Architect, planner, reviewer, copy, business analyst, Phase 2 plans, Phase 4 review | **No repo edits.** Does **not** invent “done” from proposals. Does **not** deep-simulate OMNI when Mike can open the base |
| **Cursor** (Lead + optional Agents) | Engineer: GitHub automations, Lambda, tools, web, audits, commits, DEV implementation for **approved** features | Phase **3** and **5** only unless Mike explicitly asks otherwise. Needs backlog ID + approved plan for production-impacting work |
| **OMNI** | Airtable in-base AI (Mike’s credit preference for **ad-hoc** in-base work) | Views, formulas, data Q&A, interfaces, one-offs **first** when Mike is exploring. **Not** a substitute for GitHub on production automations / XP engine scripts |

**Permanent pipeline:** ChatGPT designs → Cursor writes → GitHub stores → **DEV** validates → Mike approves → **PROD** receives. Undocumented DEV experiments are **not** official for production.

### 0.2 Five phases (never skip)

| Phase | Owner | What happens |
|-------|--------|--------------|
| **1 Idea** | ChatGPT + Mike | Sharpen idea; backlog ID in `docs/v2-change-backlog.md` (not Master Plan Brief) |
| **2 Planning** | **ChatGPT** | Requirements, architecture, acceptance criteria, DoD; Mike approves **before** implement |
| **3 Implementation** | **Cursor** | Code/schema/scripts/tests in DEV; promotion doc or mark throwaway |
| **4 Review** | **ChatGPT** + Mike | Compare to Phase 2 plan; check promotion steps |
| **5 Close** | Cursor + Mike | CHANGELOG, backlog status, promoted or parked |

If Mike asks ChatGPT for code/commits/automation pastes: **Workspace Check** → send to Cursor (or OMNI if ad-hoc in-base). If Mike asks Cursor for planning/copy without ID: stop and request backlog + Phase 2 approval.

### 0.3 Correct tool decision (ChatGPT must classify every task)

ChatGPT / Cursor open every new task with **Task Classification** (Type, Priority, Difficulty, Owner, Dependencies, Backlog ID, Scope, Phase, Correct tool, Repo, Mike’s role).

| If the request is… | Correct tool | What Mike should do |
|--------------------|--------------|---------------------|
| Planning, requirements, parent copy, Phase 4 review | **ChatGPT** | Stay in ChatGPT |
| Ad-hoc views/formulas/data/interfaces in Airtable | **OMNI first** | Open DEV/PROD base → OMNI |
| Approved feature Phase 3 (automations, Lambda, tools, web, DEV schema for that feature) | **Cursor** | Approve brief once; let Lead finish DEV |
| Implementation with no backlog ID / no approved plan | **Stop** | Assign ID + approve Phase 2 |
| Backlog edit | Cursor edits `docs/v2-change-backlog.md` only | Do not edit Master Plan Brief as SoT |
| Hoop landing / JR Ref | **Wrong repo** | `hoopchallenges-landing` or `127-si-jr-ref` |

**Repo for this program:** `127-si-shooting-challenge` only.

### 0.4 DEV execution model (feature-once approval) — ACTIVE 2026-07-14

After Mike approves a **feature brief** (outcome, behavior, scope, acceptance criteria, external restrictions, DoD):

- Cursor Lead + Agents may finish the **entire feature in DEV** without asking Mike to approve each field/formula/test-fixture repair.
- Agents must **not** bounce routine engineering questions to Mike or ChatGPT.
- Report only genuine blockers, product decisions, or external-impact risk.
- At completion: **one consolidated report** + **PROD promotion package**, then **stop for Mike**.

**Still never autonomous:** PROD promotion; archive writes; real parent/athlete communications; paid/external activation; secrets; destructive ops outside DEV feature scope; business-rule changes that alter the approved brief.

**DEV DoD** (abbreviated): E2E approved workflow works; normal + important failure cases; no duplicate XP/sends where applicable; GitHub has final sources; local = remote; promotion manifest ready; limitations stated. Design-only ≠ done.

Environments under this model:

| Env | Meaning |
|-----|---------|
| **ARCHIVE** | Historical evidence — read-only except approved historical repair |
| **DEV** `appTetnuCZlCZdTCT` | Lab — disposable for approved features |
| **PROD** `appn84sqPw03zEbTT` | Live system of record today; also future 2026–27 host after V2-013 — **no auto promote** |

**Conflict to teach ChatGPT:** Live PROD still holds current-season ops data; the “ARCHIVE / clean PROD” split is **policy + future V2-013**, not fully completed cutover.

### 0.5 Overnight / multi-agent Cursor operating system

When unattended Desktop overnight (or Lead+Agents) is used:

| Rule | Detail |
|------|--------|
| Source of truth | `docs/overnight-runs/CONTROL.json` + git SHA — **not** chat memory |
| Lead branch | `overnight/lead-integration` (Lead worktree = main clone) |
| Worker branches | `overnight/v2-run/worker-{a-d}-…` in separate worktrees |
| Before commit | `python tools/overnight/assert_git_lane.py --role lead` (or worker) |
| Default write model | **One active write lane**; Lead-direct implementation preferred |
| Subagents | Bounded research/inventory only — **not** persistent implementers with merge authority |
| Cloud Agents | **No integration authority** until Desktop trial policy says otherwise |
| Stages | Small 30–90 min units; after PASS pick next READY package — don’t stop early for idle |
| Status log | `UNATTENDED-RUN-STATUS.md` at **milestones only** |
| Queue | Lives in **CONTROL.json** — there is **no** `QUEUE.md` |
| Approval profile | **Balanced**; Cursor Run Mode **Auto-review** required |
| Hard blocks (need Mike) | PROD deploy; credentials/env; unapproved schema outside feature model; force-push/reset/clean/delete; package installs/AWS account; **Tutorials (C-026)**; **Learning Activities Airtable (C-009)** until schema approved |

**ChatGPT role in overnight:** Plan packages, prioritize backlog, review Lead reports / promotion packages. ChatGPT does **not** merge to Lead or enable PROD.

**Cursor Lead / Agent A / Agent B (within one feature):** Lead owns integration and final report; A implements; B tests/audits. Do not start the next feature just because one agent finished early — harden the current feature.

### 0.6 Engineering laws ChatGPT must not violate in plans

- **GitHub** is source of truth for shippable automations/scripts/Lambda/Make blueprints.
- **DEV-first** always; PROD only via numbered promotion docs in `docs/deploy-checklists/`.
- **XP:** one source → one XP Event (Source Key); never “fix” by inventing duplicate awards.
- **Audits/backfills:** dry-run first; explicit `CONFIRM_WRITE` / `CONFIRM_DELETE`.
- **Web:** Airtable reads server-side only; never expose `AIRTABLE_API_TOKEN` to browser.
- **Secrets:** never commit or paste tokens/webhook secrets into ChatGPT drafts as live values.
- **Config vs engine:** season XP numbers / gate counts belong in Airtable Config tables — not hardcoded into “rewrite all scripts” plans when Config would do.
- Prefer **evidence labels** (APPROVED / IMPLEMENTED / TESTED / BLOCKED / PROPOSED / UNKNOWN). Do not upgrade PROPOSED → IMPLEMENTED without repo proof.

### 0.7 Documents ChatGPT should open by purpose

| Need | Open |
|------|------|
| This recovery brief | `docs/v2/SHOOTING-V2-PROJECT-HANDOFF.md` (this file) |
| Roles / phases / OMNI | `docs/v2/04-ai-development-standards.md` |
| Live backlog / owner decisions | `docs/v2-change-backlog.md` |
| Engineering law | `docs/ENGINEERING_CONSTITUTION.md` |
| Product / engine contract | `docs/v2/01-constitution.md`, `02-master-direction.md`, `03-business-rules.md` |
| DEV feature autonomy | `docs/development/DEV-EXECUTION-AND-PROMOTION-MODEL.md` |
| Overnight resume | `docs/overnight-runs/CONTROL.json`, `UNATTENDED-RUN-STATUS.md` |
| Automations | `docs/automation-index.md` |
| Cursor startup | `AGENTS.md` |
| Aggregated planning view (may lag) | `docs/CHATGPT-MASTER-PLAN-BRIEF.md` — **prefer backlog + this handoff when they conflict** |

### 0.8 What ChatGPT should produce vs hand to Cursor

| ChatGPT delivers | Cursor delivers |
|------------------|-----------------|
| Phase 2 plans, decision matrices, parent/coach copy, acceptance criteria | Scripts in `airtable/automations/`, Lambda, tools tests, commits |
| Review of promotion packages / Lead results | Promotion checklists, CHANGELOG, schema snapshots |
| “What Mike should paste / approve” instructions | Exact GitHub file paths and paste-ready sources |
| Workspace redirects when Mike is in wrong tool | Task Classification + implementation |

---

## 1. Executive Summary

### What the Shooting Challenge V2 rebuild is

**APPROVED / IMPLEMENTED (platform framing):** Rebuild of the **127 SI Shooting Challenge** as a **configurable game engine**: season gameplay (XP values, levels, gates, achievements) lives in Airtable **Configuration**, while stable engine behavior lives in GitHub-versioned automations, Lambda, Make, and the Next.js `/shoot` app. Primary season target in planning docs: **May 1 – June 30, 2027** (`2026-2027`). Evidence: `docs/v2/01-constitution.md`, `docs/v2/02-master-direction.md`, `docs/v2/03-business-rules.md`.

This repo (`127-si-shooting-challenge`) is **Shooting Challenge only** (not Hoop landing, not JR Ref).

**How the rebuild is actually being executed:** Mike owns product decisions. ChatGPT owns planning/review. Cursor Lead (+ Agents when overnight) owns implementation on branch **`overnight/lead-integration`**, which is currently the most complete line of V2 work (~196 commits ahead of default **`master`**). Production Airtable remains live at `appn84sqPw03zEbTT`; intentional lab work happens in DEV `appTetnuCZlCZdTCT`. A new **feature-once DEV autonomy** model (2026-07-14) lets Cursor finish approved features in DEV without micromanagement, then stop for Mike before PROD.

### Primary goals

- Keep **shooting** as the centerpiece while rewarding **habits, consistency, and full-program participation** (homework, video, Zoom, character/educational work) — **Educational Athletics**.
- One **XP + gate** level ladder per enrollment; transparent, auditable progression.
- **DEV-first** delivery; **PROD** only via Mike-approved promotion packages.
- Modernize upload path to **S3 + Canonical File URL** (C-013), harden dedupe (C-023/C-024), and finish Zoom recording credit (C-025) and related V2 backlog waves.
- Keep **GitHub** as the only shippable source of truth for automations/Lambda; keep ChatGPT out of the repo; keep OMNI in its ad-hoc lane unless a Cursor feature brief owns DEV.

### Current overall status

| Area | Status (evidence-weighted) |
|------|----------------------------|
| Wave 0 / 2025–26 close-out | **Closed** (`docs/v2-change-backlog.md`) |
| Operating model docs | **Active** — doc 04 + DEV execution model + overnight CONTROL |
| DEV base V2-015 | **Ready** — `appTetnuCZlCZdTCT` |
| PROD live base | `appn84sqPw03zEbTT` — still production system of record for current ops |
| C-013 video upload PROD | **TESTED / COMPLETE** (2026-07-11) — 070b + 070c + Lambda + Make |
| C-013 / 070a homework upload | **TESTED DEV PASS** (2026-07-12); **PROD 070a OFF** |
| C-023 automation 116 | **TESTED** DEV + PROD fixture PASS; broader C-023 still open |
| C-025 Zoom recording credit | **APPROVED** ops; DEV formulas/Effectives + GitHub **117a–f** + harness **IMPLEMENTED/TESTED**; **Airtable paste of 117a–f pending** |
| C-009 Learning Activities | **APPROVED** architecture; Airtable schema **BLOCKED** / not created |
| V2-013 Program Instance | **APPROVED** direction; implementation **queued / not started** |
| Overnight Lead queue | Many pipeline packages **COMPLETE**; run state **idle** (`docs/overnight-runs/CONTROL.json`) |

### Current active workstream

**C-025 Zoom recording credit — DEV definition of done (S18):** GitHub automations **117a–f**, Zoom Attendance support fields, DEV E2E harness (no public Fillout), and promotion package are on Lead (`3e55cfa` feature + `43a1e30` CONTROL sync). **Remaining gate:** paste/activate **117a–f** in DEV Airtable, then Mike decides PROD promotion. Evidence: `docs/overnight-runs/results/UNATTENDED-RUN-STATUS.md`, `docs/automation-index.md`, `docs/v2-change-backlog.md` (C-025).

**ChatGPT’s job on this workstream right now:** Do **not** redesign C-025 rules (owner-approved). Help Mike with paste/activation checklist clarity, Phase 4 review of the promotion package, and prioritization of the *next* feature brief after DEV paste. Implementation pastes and AWS/Make toggles are Mike + Cursor, not ChatGPT inventing scripts.

### Most important next step

1. **Mike (Airtable UI):** Paste and activate automations **117a–f** in **DEV** from GitHub sources (skip GitHub header), per `docs/deploy-checklists/C-025-prod-promotion-package.md` / S18 auth docs.  
2. Re-run live trigger paths (not only harness) on Schmidt/test enrollment.  
3. Only then use the promotion package for PROD — **Mike explicit approval required**.  
4. Meanwhile ChatGPT should treat this handoff + backlog as recovered project memory — not reopen closed owner decisions (§3, C-025, C-009 architecture) without Mike.

---

## 2. Product and Program Goals

Sources: `docs/v2/01-constitution.md`, `docs/v2/03-business-rules.md`, `docs/shooting-challenge-v2-master-direction.md` (via doc 02), owner decisions in `docs/v2-change-backlog.md` (2026-07-13).

### Athlete experience

- **APPROVED:** Meaningful early success; habits over talent; consistency over intensity; complete participation over specialization.
- Progress via **Lifetime XP** + **Level Gate Rules** (can be **Gate Blocked** when XP is enough but gates are not).
- Activities: daily shooting submissions, homework, video feedback, Zoom (live and, when approved, recording makeup).

### Parent experience

- **APPROVED:** Transparent rules before the season; coach feedback emails (homework/video); weekly summaries; welcome/daily packages where enabled.
- **C-027 APPROVED:** Major-event notifications to parents (level up / major shot / Perfect Week / major streak) — **email first**, Config-driven; **no daily submission spam**. Implementation largely **PROPOSED / incomplete** in Airtable (see C-027 backlog).

### Coach/admin experience

- Review queues for homework and video; Zoom recording quiz coach Satisfactory path (C-025).
- Config-over-scripts: tune season in tables, not by rewriting automations for every XP number.
- Engineering Test Framework (**115**) + Testing Scenarios (DEV) for pipeline rehearsal.

### Educational Athletics philosophy

**APPROVED:** Basketball is the vehicle; shooting is the foundation; homework, video, Zoom, reading, and character work develop better players and responsible young people (`docs/v2/03-business-rules.md` §3).

### XP and progression philosophy

**APPROVED:**

- Single progression ladder (one enrollment → one level track).
- XP buckets: daily shooting, homework, video, Zoom, streaks, shot milestones, Perfect Week, manual/bonus.
- **One source record → one XP Event** (Source Key idempotency).
- Season numbers live in **XP Reward Rules / Achievements / Levels / Level Gate Rules**, not hardcoded engine prose.

### Long-term program direction

| Decision | Status | Notes |
|----------|--------|-------|
| Configurable game engine (4 layers) | **APPROVED** | Constitution |
| One base + **Program Instance** multi-year (V2-013) | **APPROVED**; **not implemented** | Supersedes archive+clone V2-001 |
| DEV permanent testing base (V2-015) | **IMPLEMENTED** | `appTetnuCZlCZdTCT` |
| 2026–27 season target window | **APPROVED** (planning) | May–June 2027 |
| ARCHIVE / DEV / PROD execution model | **APPROVED** (docs 2026-07-14) | See conflict §13 on what “PROD” means today |

---

## 3. Approved Architecture Decisions

| Decision | Reason | Status | Evidence |
|----------|--------|--------|----------|
| Keep existing homework **catalog** (docs say “Homework table”) | Official assignment catalog; do not replace with LA-only model | **APPROVED**; physical table name conflict — see note | Owner decision #11 `docs/v2-change-backlog.md`; C-009 Stage 9 `docs/deploy-checklists/C-009-learning-activities-owner-review-stage9.md` |
| Add future **Learning Activities** table | Routing layer for quizzes/files/videos/assessments without deleting catalog | **APPROVED**; **not in schema snapshots** | Same |
| Add future **Learning Activity Responses** | Athlete completion/intake rows | **APPROVED**; **not created** | Same |
| When LA creates/updates Homework Completions | Optional route when Linked Homework / `homework_completion` target set | **PROPOSED** routing contract only | C-009 Stage 9 §5 |
| Stand-alone quiz / assessment | May route as assessment-only (not always HC); **067** today = quiz → Final Reflection Quiz Submissions → HC **without** Submission Asset | **APPROVED** direction; **067 IMPLEMENTED**; generalized LA **BLOCKED** | C-009; `067-*.js`; automation-index |
| **DEV-first** | All implementation tested in DEV before PROD | **APPROVED / standing** | doc 04, ENGINEERING_CONSTITUTION, automation-index deploy workflow |
| **PROD protection** | No automatic promote; Mike approval; promotion package + CHANGELOG | **APPROVED** | DEV-EXECUTION model; overnight hard blocks |
| **Feature-once approval** (DEV autonomy for low-risk repairs) | Speed without weakening XP/secrets/PROD rules | **APPROVED** (2026-07-14) | `docs/development/DEV-EXECUTION-AND-PROMOTION-MODEL.md` |
| System responsibilities | See table below | **APPROVED** (layered) | doc 05 + operational docs |

**Critical naming note (do not invent):** Schema snapshots **2026-07-06** list **no** table literally named `Homework`. Homework catalog rows live in **`FBC Curriculum - SYNC`** (`docs/airtable-base-map.md` maps “FBC Curriculum - SYNC → Homework”). Completions live in **`Homework Completions`**. Owner language “Homework table” = **catalog concept**; verify live UI display name before schema work.

### Platform responsibilities (as used in this program)

| System | Responsibility | Status |
|--------|----------------|--------|
| **Airtable** | System of record: enrollments, submissions, assets, HC/VF, XP, levels, config, coach review | **IMPLEMENTED** |
| **Fillout** | External intake for submissions / quizzes (production-shaped paths) | **IMPLEMENTED** historically; exact live form matrix **UNKNOWN** in this verify pass |
| **Make.com** | Webhooks → email Gmail; upload engine HTTP to Lambda; weekly/final packs | **IMPLEMENTED** (DEV + PROD scenarios exist per C-013 docs) |
| **Lambda** (`lambda/upload-asset/`) | Auth → claim → hash → S3 → Airtable writeback; routes `video_feedback`, `homework_completion` | **IMPLEMENTED**; DEV+PROD for video; homework DEV tested |
| **Softr** | Legacy UI (being replaced by web) | **Legacy** (`docs/airtable-base-map.md`) |
| **GitHub** | Source of truth for automations, Lambda, Make blueprints, docs | **APPROVED / IMPLEMENTED** |
| **Next.js `web/`** | Public `/shoot` on hoopchallenges.com | **IMPLEMENTED** |
| **OMNI (Airtable AI)** | Ad-hoc in-base work preference historically; Phase 3 Cursor owns approved feature DEV under new model | **APPROVED** workflow evolution — see doc 04 + DEV model |
| **Vercel** | Hosts `web/` (Root Directory `web`) | **IMPLEMENTED** |

---

## 4. Current System Architecture

### Text diagram (end-to-end)

```
[Fillout / C-020 Testing Scenarios]
        |
        v
   Enrollments <---- 001/002/003 (athlete + grade band)
        |
        v
   Submissions ----005 Week----> Weeks
        |----010 XP Event (daily shooting)
        |----031 WAS <----033 homework assignment link
        |----009 Submission Assets (per file)
        |         |----070a--> Make --> Lambda --> S3 --> writeback --> 022 --> Homework Completions
        |         |----020 link/create Homework Completions
        |         |----013 Video Feedback
        |         |----070b--> Make --> Lambda --> S3 --> writeback --> 022 (+ 070c if Accepted async)
        |         |----116 Asset Reuse Decision consequences (C-023)
        |
   Homework Completions ----064/065--> XP Events ----059 (achievements)
        |----071 parent email (Make)
   Video Feedback ----113/114--> XP Events ----073 parent email
   Zoom Meetings / Attendance ----101 XP; C-025 path 117a–f (DEV paste pending)
   Athlete Achievement Unlocks ----059--> XP Events
   Enrollments ----041/042(/043)--> Levels + Level Gate Rules
   Weekly Athlete Summary ----072/074--> Make --> parent weekly email
   Config / XP Reward Rules / Achievements / Shot Milestones / Levels
        = season gameplay parameters (not hardcoded season numbers in engine docs)
```

### Flows (summary)

| Flow | Path (evidence) | Status |
|------|-----------------|--------|
| Athlete enrollment | Intake → **001** find/create Athlete + link Enrollment → **002/003** Grade Band | **IMPLEMENTED**; live ON/OFF matrix **UNKNOWN** here |
| Daily submission intake | Submission → **023** enrollment, **005** week, **007** dup check, **006** video count, **021** attachment status | **IMPLEMENTED** |
| Submission Assets | **009** per file; upload status / naming for Make | **IMPLEMENTED** |
| Homework submissions | Assets → **020** one HC per Enrollment\|Week\|Homework → coach → **064/065** XP → **071** email; upload **070a** | Upload **TESTED DEV**; full season HC ops **IMPLEMENTED** historically |
| Video submissions | Assets → **013** VF (prefer over **112 OFF**) → **070b/070c** upload → coach → **113/114** → **073** | Upload **TESTED PROD** (C-013) |
| Learning Activities | Future LA + LAR → optional HC/VF/asset routes | **PROPOSED / BLOCKED** (no tables) |
| XP Events | **010**, **065**, **114**, **054**, **059**, **101**, (+ **117c** planned) | **IMPLEMENTED** for classic paths |
| Weekly summaries | **031–034**, build **072**, send **074** | **IMPLEMENTED**; C-011 design audits exist |
| Achievements | Streaks **053–056**, Perfect Week **057/058**, shot milestones **066**, XP **059** | **IMPLEMENTED**; **066 v3.2** PROD pasted per backlog |
| Level progression | **041** mark → **042** assign (+ **043** gate rule link; retirement plan exists) | **IMPLEMENTED** |
| Parent/coach communications | **071/073/074/075/076/077**, Make Gmail; C-027 major events pending | Partial |

---

## 5. Airtable Data Model

**Snapshot evidence:** `airtable/schema/snapshots/dev-20260706/` (30 tables) and `prod-20260706/` (29 tables).  
**DEV-only vs PROD:** **Testing Scenarios**.  
**Not in either snapshot:** `Learning Activities`, `Learning Activity Responses`, table literally named `Homework`.

Post–2026-07-06 DEV work (C-025 Config/Zoom fields, ZA support fields, archive-renamed temps) is **newer than this snapshot** — treat field-level C-025 docs as current for Zoom; re-export schema before relying on July 6 field lists for Effectives.

### Important tables (from `base_summary` lists)

| Table | Purpose | Important fields (documented exact names only) | Linked (from schema_doc relationships / docs) | Automations (index) | Schema concerns | DEV / PROD |
|-------|---------|-----------------------------------------------|-----------------------------------------------|---------------------|-----------------|------------|
| **Enrollments** | Athlete season membership; levels; gates | Owner-approved future: `Active?`, `Progress Processing Enabled?` (**C-010** — schema paste **not done** per backlog). Gate examples in schema_doc: `Meets Gate: Homework`, etc. | Athletes, Weeks, HC, WAS, XP, Zoom… | 041–043, 066, email builders | C-010 two-field not live | Both |
| **Athletes** | Person hub | — (snapshot exists; field dump not re-listed here) | Enrollments | 001 | — | Both |
| **Submissions** | Daily / homework / video intake | `Count This Submission?`; `Homework Completion Ready?`; `Ready for Homework Completion Automation?`; `Homework Name 1` / `2` → FBC | Enrollment, Week, Assets, HC, FBC | 005–010, 023, 031 | Manual DEV Fillout-shaped rows historically unreliable | Both |
| **Submission Assets** | Per-file upload/review unit | Upload Status, Send to Make Trigger, Canonical File URL, Asset Reuse Decision, Ready for Homework Completion Script? | Submission, HC, VF | 009, 013, 020, 022, 070a/b/c, 116 | C-013/C-023 field set evolved after July 6 | Both |
| **Homework Completions** | One completion per athlete/assignment/week | Dedupe key concept `Enrollment \| Week \| Homework` (upload-workflow) | Enrollment, Week, Homework→FBC, Assets, XP | 020, 063–065, 067, 071 | Many computed fields (health warning) | Both |
| **FBC Curriculum - SYNC** | Homework **catalog** | Linked as **Homework** from HC | HC, Submissions, WAS | 020, 033, 067 (via HC) | Display name vs “Homework table” wording | Both |
| **Video Feedback** | Coach video review | Posted / XP readiness fields used by 114 | Assets, Enrollment | 013, 111–114, 073 | **112** legacy OFF | Both |
| **XP Events** | Append-only ledger | Source Key patterns; XP Date related fields noted in gap inventory (`XP Date Resolved`) | Enrollment + sources | 010, 054, 059, 065, 101, 114 | Idempotency critical | Both |
| **Weekly Athlete Summary** | Week rollup + email package | `Build Weekly Email Now?` | Enrollment, Week, HC | 030–034, 072, 074 | — | Both |
| **Weeks** | Season week boundaries (America/Denver) | Start/End dateTime patterns (005/034) | Submissions, WAS, HC | 005, 034 | C-018 two calendars queued | Both |
| **Levels** / **Level Gate Rules** | Ladder + gates | Config Layer 2 | Enrollments | 042, 043 | V2-005 tune queued | Both |
| **XP Reward Rules** | XP amounts by activity | Config | XP creators | 010, 065, 114, 101… | — | Both |
| **Achievements** / **Athlete Achievement Unlocks** | Milestones / unlocks | Notify flags for C-027 (approved) | Unlocks → XP via 059 | 057–059 | — | Both |
| **Shot Milestones** | Shot count milestones | Used by **066** | Enrollments | 066 | — | Both |
| **Streak Occurrences** | Streak windows | Ready for XP | Submissions | 053–055 | — | Both |
| **Zoom Meetings** | Meeting schedule + recording credit Config Effectives | Effective Recording* formulas (C-025 DEV converted) | Attendance, Weeks | 101; C-025 support | Effectives post-Jul-6 | Both (DEV ahead on C-025) |
| **Final Reflection Quiz Submissions** | HW17-style quiz intake path | Processing Status Pending | → HC via **067** | 067 | No Submission Asset path | Both |
| **Config** | Global/program flags for C-025/C-027 | Recording % / deadlines / email flags (catalog Stage 16) | Zoom Effectives | 117* planned | DEV evolved | Both |
| **Tutorials** / **Tutorials & Assets** | Content | — | — | C-026 merge **BLOCKED** | Frozen for merge | Both |
| **Grade Bands** | Matching bands | Copied to HC/WAS/VF | Enrollments | 002/003, 063, 030, 111 | C-021 queued | Both |
| **Program Instance - Synced** / **School - Synced** | Org sync | Multi-year scaffolding | — | V2-013 queued | — | Both |
| **Automations** | Meta registry of automation docs | Folder choices include `17 - Zoom Recording Credit` design | — | Ops | Doc drift (116 row) noted | Both |
| **Testing Scenarios** | C-020 harness | `Run Test?` | Pipeline tables | **115** | DEV only | **DEV only** |
| **Awards** / **Award Recipients** | End-of-season awards | Close-out 2025–26 done | — | — | Historical | Both |
| **Target Goal Shots** | Goals | — | WAS | 032 | — | Both |

**Learning Activities / Learning Activity Responses:** **APPROVED** future tables — **UNKNOWN/absent** in July 6 snapshots and backlog still **BLOCKED** for creation.

---

## 6. Automation Inventory

**Canonical index:** `docs/automation-index.md` (lists through **117f**; disk has **56** scripts).  
**GitHub versions** extracted from script headers/`SCRIPT` where present (2026-07-14).  
**DEV tested? / PROD status:** only filled when a deploy checklist, backlog row, or index note states it; otherwise **UNKNOWN**.

### Explicitly requested + high-signal automations

| # | Name (index) | Table | Trigger (documented) | Conditions / notes | Purpose | Script ver | Status | DEV tested? | PROD status | Known issues | Source |
|---|--------------|-------|----------------------|--------------------|---------|------------|--------|-------------|-------------|--------------|--------|
| **010** | Create XP Event from Submission | Submissions | Count This Submission? + XP award path | Idempotent Source Key | Daily shooting XP | **10.4** | IMPLEMENTED | UNKNOWN | UNKNOWN | — | `010-submission-intake-create-xp-event.js` |
| **012** | *(legacy)* | — | — | — | — | — | **Deleted** (Mike; not in GitHub) | n/a | n/a | Slot recovered | automation-index retired |
| **041** | Mark Enrollment for Level Recalc | Enrollments | *confirm in Airtable* | — | Flag level recalc | **3.0** | IMPLEMENTED | UNKNOWN | UNKNOWN | Trigger confirm | `041-...js` |
| **042** | Assign Current/Next Level + Gate Blocking | Enrollments | *confirm in Airtable* | Gate Blocked state | Level assignment | **3.0** | IMPLEMENTED | UNKNOWN | UNKNOWN | — | `042-...js` |
| **043** | Set Level Gate Rule from Next Level | Enrollments | *confirm in Airtable* | Legacy vs 042 | Gate rule link | **v2.0** | IMPLEMENTED; retire planned after 066 wave | UNKNOWN | UNKNOWN | Planned retirement with 112 | `043-...js` |
| **051** | — | — | — | — | — | — | **No GitHub file** | — | — | Not in repo | — |
| **052** | — | — | — | — | — | — | **No GitHub file** | — | — | Not in repo | — |
| **059** | Create XP Event from Achievement Unlock | Athlete Achievement Unlocks | XP Award Status Pending + Ready for 059 | Source Key | Achievement XP | **v3.5** | IMPLEMENTED | UNKNOWN | UNKNOWN | — | `059-...js` |
| **063** | Copy Enrollment Grade Band to HC | Homework Completions | *confirm* | — | Grade band copy | **v2.0** | IMPLEMENTED | UNKNOWN | UNKNOWN | — | `063-...js` |
| **064** | Prepare Homework XP Award | Homework Completions | *confirm* | Pre-065 | Prepare XP fields | **v12.1** (2026-06-17) | IMPLEMENTED | UNKNOWN | UNKNOWN | — | `064-...js` |
| **070** (plain) | — | — | — | — | — | — | **No GitHub file** — split into **070a/b/c** | — | — | Do not reintroduce | — |
| **070a** | Send Homework Asset Payload to Make | Submission Assets | Send to Make Trigger + homework ready | `routeKey=homework_completion` | Homework S3 upload handoff | **v4.4** | IMPLEMENTED | **TESTED PASS 2026-07-12** (sync Lambda JSON; 070c not required for that path) | **OFF** | Leave OFF when idle | `070a-...js`; C-070a prep |
| **070b** | Send Video Asset Payload to Make | Submission Assets | Send to Make + Pending Link + VF destination | `routeKey=video_feedback` | Video S3 upload | **v4.4** | IMPLEMENTED | DEV proven earlier; PROD E2E | **PROD COMPLETE** C-013 2026-07-11 | Async `Accepted` needs **070c** | `070b-...js` |
| **070c** | Verify Async Video Asset Upload | Submission Assets | Uploaded + writeback complete… | Idempotent | Clear trigger after Accepted path | **v1.1** | IMPLEMENTED | Used on PROD video path | PROD with 070b | Not required for DEV 070a sync JSON path | `070c-...js` |
| **072** | Build Weekly Summary Email Package | Weekly Athlete Summary | Build Weekly Email Now? | — | Email package | **v3.7** | IMPLEMENTED | UNKNOWN | UNKNOWN | C-011 audits | `072-...js` |
| **073** | Send Video Feedback Parent Email Webhook | Video Feedback | *confirm* | — | Parent VF email | **v3.2** | IMPLEMENTED | UNKNOWN | UNKNOWN | — | `073-...js` |
| **075** | Build Challenge Welcome Email | Enrollments (typical) | *confirm* | — | Welcome package | **v3.0** | IMPLEMENTED | UNKNOWN | UNKNOWN | — | `075-...js` |
| **111** | Copy Enrollment Grade Band to VF | Video Feedback | *confirm* | — | Grade band copy | **v1.1** | IMPLEMENTED | UNKNOWN | UNKNOWN | — | `111-...js` |
| **066** | Create Shot Milestone Unlocks | Enrollments | Run Shot Milestone Check? | V2 rewrite | Shot milestones | **v3.2** | IMPLEMENTED | DEV verified (backlog) | **PROD pasted 2026-07-06** (backlog) | PROJECT_STATE/SESSION still say “pending” — **conflict; prefer backlog** | `066-...js`; H-002 |
| **116** | Apply Asset Reuse Decision Consequences | Submission Assets | Asset Reuse Decision updated | C-023 | Duplicate/reuse XP consequences | **v1.0.1** | IMPLEMENTED | **12/12 + live PASS** | **PROD fixture PASS** 2026-07-11 | Automations-table doc row missing | `116-...js` |
| **117a–f** | Zoom Recording Credit suite | Zoom Attendance / related | Design triggers per package | C-025 | Normalize quiz → coach → XP → gate → PW → email | **v1.0.0** each | IMPLEMENTED in GitHub | Harness **6/6**; **paste pending** | Not promoted | Must paste in Airtable | `117a`–`117f-*.js` |

### Other scripts present on disk (abbreviated)

Enrollment **001–003**; submission **005–007, 009, 021–023**; homework **020, 065, 067, 071**; weekly **030–034**; streaks/PW **053–058**; video **112 OFF, 113, 114**; email **074, 076, 077**; Zoom live **101 v5.4**; test **115 v1.3 DEV functional complete**. Full names/files: `docs/automation-index.md`.

---

## 7. Upload Engine and Lambda Status

### Routing

| Route key | Upload destination | Target table | Automation | Evidence |
|-----------|-------------------|--------------|------------|----------|
| `video_feedback` | Video Feedback | Video Feedback | **070b** | `lambda/upload-asset/upload_core/routes.py` |
| `homework_completion` | Homework Completions | Homework Completions | **070a** | Same |

`ALLOW_ROUTE_KEYS` (documented DEV): `video_feedback,homework_completion` (`lambda/upload-asset/README.md`).

### Airtable → Make → Lambda flow

```
Submission Asset (Send to Make Trigger)
  → 070a or 070b builds minimal payload (automationNumber + routeKey + record ids)
  → Make Upload Engine scenario (Router by automation + route)
  → HTTP POST Lambda Function URL + X-Upload-Secret
  → Lambda: auth → claim Processing → download attachment → SHA-256 → S3 PutObject
  → Airtable writeback (Canonical File URL, Storage Key, hash, MIME, Uploaded At, C-023 flags)
  → Sync JSON: 070a/070b verify allPass + clear trigger
  → OR plain-text Accepted: 070c verifies writeback then clears trigger
  → 022 syncs child URL to HC/VF as designed
```

**APPROVED:** Automations do **not** call Lambda directly; Make is required (`docs/audits/C-013-prod-infrastructure-readiness-2026-07-11.md`).

### Function naming — CONFLICT

| Source | DEV name | PROD name |
|--------|----------|-----------|
| `lambda/upload-asset/README.md` | `127si-dev-shooting-challenge-asset-upload` | — |
| C-013 readiness / closeout | `127si-upload-asset-dev` | `127si-upload-asset` |

**Do not guess which string AWS currently uses** without console verify — both names appear in repo docs of different ages. Closeout (2026-07-11) claims PROD `127si-upload-asset` deployed + smoke PASS.

### Environment variables (documented for DEV Lambda)

`AIRTABLE_BASE_ID`, `AIRTABLE_TOKEN`, `AIRTABLE_API_TOKEN`, `S3_BUCKET`, `ENVIRONMENT`, `ALLOW_ROUTE_KEYS`, `SEASON_SLUG`, `CHALLENGE_SLUG`, `UPLOAD_WEBHOOK_SECRET` — values must never be committed (`README.md`, C-013 audit).

### Deployment

- DEV: `lambda/upload-asset/deploy.ps1` + `DEPLOY.md`
- PROD: `deploy-prod.ps1` + C-013 checklists
- Unit tests: `python -m unittest discover -s tests` (46+ cited; homework regression tests exist)

### Smoke / test scripts (examples)

- `tools/airtable/c013_dev_h1_homework_smoke.py`
- `tools/airtable/c013_prod_lambda_smoke_run.py`
- `tools/airtable/c013_prod_make_smoke_run.py`
- `lambda/upload-asset/tests/test_070a_homework_regression.py`, `test_homework_route.py`

### Known successful tests (repo-confirmed)

| Test | Result | Date / ref |
|------|--------|------------|
| DEV homework live upload via **070a** → Make → Lambda → writeback; **022** URL on HC | **PASS** (sync JSON; 070c not required) | **2026-07-12** — automation-index + `C-070a-dev-airtable-v4.4-prep.md` |
| PROD video path Schmidt asset `recGQ8EjAMz3bEBiW` | **PASS / COMPLETE** | 2026-07-11 — C-013 closeout / backlog |
| 116 DEV + PROD fixture reuse/duplicate | **PASS** | 2026-07-10/11 |
| Lambda unit tests (claim/duplicate/core) | **PASS** (counts cited in README/closeouts) | 2026-07-10+ |

### Known failed / incomplete

| Item | Status |
|------|--------|
| PROD **070a** homework route | **OFF / not promoted** |
| Live Make enable when idle | Must stay OFF except approved tests |
| Optional hygiene: rotate exposed PROD upload secret | Noted in C-013 backlog notes |

### Current PROD status

- **Video upload workflow:** **COMPLETE** (070b v4.4 + 070c v1.1 + Lambda + Make).  
- **Homework upload workflow:** **DEV only** for live 070a E2E; PROD 070a **OFF**.

---

## 8. Learning Activities Workstream

| Layer | Status |
|-------|--------|
| Approved architecture | **APPROVED** 2026-07-13 — keep Homework catalog; add LA + LAR; optional multi-route; replaces HW17-specific design |
| Schema in Airtable | **BLOCKED** — do not create until owner approves minimum schema post-audit |
| GitHub / Stage 9 proposal | **IMPLEMENTED** as docs only — `C-009-learning-activities-owner-review-stage9.md` |
| Intake (Fillout) redesign | **PROPOSED / not started** |
| Automations for LA | **Not started** |
| XP behavior | **PROPOSED:** reuse 065/114 Source Key patterns when routed |
| Homework compatibility | Must not delete/rename catalog; HC remains completion object |
| Quiz/assessment today | **067** reflection quiz → HC **without** asset pipeline — still live design |
| Recommended sequence | (1) Homework dependency audit (repo done in Stage 9) (2) Mike approve min schema (3) DEV create tables (4) Fillout contracts (5) routing automations (6) XP (7) retire HW17-only assumptions |

**Do not treat Stage 9 proposal fields as live schema.**

---

## 9. XP, Achievements, and Levels

| Topic | Engine rule | Implementation / test |
|-------|-------------|------------------------|
| XP buckets | Daily, homework, video, Zoom, streaks, shot milestones, Perfect Week, manual | Config via **XP Reward Rules** / Achievements — **APPROVED**; specific numeric season table values = **UNKNOWN** in this doc (read live Config) |
| Deduplication | One source → one XP Event via **Source Key** | **IMPLEMENTED** across 010/065/114/059/101; C-024 keys documented in audits |
| Perfect Week | **057** eligibility → **058** unlock → **059** XP; C-025 recording can grant PW credit via Config | Classic path **IMPLEMENTED**; recording **117e** GitHub only until pasted |
| Streak thresholds & XP | Config / Achievements (e.g. seed streaks 10–60 mentioned for C-027 flags) | Threshold **numbers** are Layer 2 — do not hardcode here |
| Shot milestones | **066** creates unlocks; H-001 fixed audit dedupe | **066 v3.2** PROD per backlog |
| Level gates | Lifetime XP + **Level Gate Rules**; **042** Gate Blocked | **IMPLEMENTED** |
| XP date normalization | America/Denver week boundaries; `toDateKey*` patterns (005/034); XP Date Resolved noted in gap inventory | Pattern **APPROVED**; full field matrix **UNKNOWN** without fresh schema export |
| C-025 Zoom recording XP | Config % of live (default 50), full gate credit Config, exclusivity Enrollment+Meeting | **APPROVED**; formula Effectives **TESTED** DEV; XP automation paste pending |

---

## 10. Repository Structure

| Path / file | Purpose |
|-------------|---------|
| `AGENTS.md` | Agent entry: constitution, handoffs, backlog, overnight CONTROL, Cursor intake |
| `docs/v2/` | Numbered V2 pack (01–09) + this handoff |
| `docs/v2-change-backlog.md` | **Live backlog** (add items here; not Master Plan Brief) |
| `docs/overnight-runs/` | Overnight OS: CONTROL, stages, results, approval profile |
| `docs/overnight-runs/CONTROL.json` | Resume source of truth for queue/lanes/SHA (verify vs `git rev-parse HEAD`) |
| `docs/overnight-runs/QUEUE.md` | **Does not exist** — queue lives in CONTROL.json |
| `docs/overnight-runs/results/UNATTENDED-RUN-STATUS.md` | Milestone-only status log |
| `docs/overnight-runs/stages/` | Stage auth docs (`S18-AUTHORIZED.md`, etc.) |
| `docs/overnight-runs/results/` + `worker-results/` | Lead/worker integration reports |
| `lambda/upload-asset/` | Upload Lambda + unit tests + deploy scripts |
| `tools/airtable/` | Schema export CLI, C-013/C-025/C-070a smokes, probes |
| `airtable/automations/shooting-challenge/` | Production automation sources (`001`–`117f`) |
| `airtable/extension-scripts/audits/` | Dry-run pipeline audits A–J |
| `airtable/extension-scripts/safe-backfills/` | Gated repairs |
| `airtable/schema/snapshots/` | Dated schema exports |
| `make/blueprints/` + `make/documentation/` | Make scenarios + runbooks |
| `web/` | Next.js `/shoot` app |
| `docs/deploy-checklists/` | Feature promotion / verify packages |
| `docs/development/DEV-EXECUTION-AND-PROMOTION-MODEL.md` | Feature-once DEV autonomy model |
| `docs/PROJECT_STATE.md` | Live snapshot — **partially stale** vs July 13–14 work |
| `docs/SESSION_HANDOFF-2026-07-06.md` | Older session handoff — **stale on 066** |

---

## 11. Branch and Commit Status

| Item | Value |
|------|--------|
| Default branch | `master` (`origin/HEAD` → `origin/master`) @ `b875292` — C-013 closeout era |
| Most complete integration branch | **`overnight/lead-integration`** @ **`43a1e30`** (matches `origin/overnight/lead-integration` at verify) |
| Active / recent feature branches (local+remote samples) | `overnight/v2-run/worker-a-s16-c025-c027-config-decisions`, `worker-d-s15-orphan-c024-double-send`, `worker-c-s14-c022-presentation-fields`, `worker-b-s13-c027-major-event-notifications`, `worker-a-s12-c025-zoom-recording-design`, `worker-d-s9-learning-activities`, older S4–S11 worker branches |
| Important merged work on Lead | C-025 S18 (`3e55cfa`), Effective→formula (`7d4952d`), DEV execution model (`221af88`), S17 packages, overnight pipeline audits |
| Unmerged work | Many worker branches may contain residual commits not fully reflected — **UNKNOWN** per-branch delta vs Lead without merge-base audit |
| Stale branches | Older overnight worker branches still listed; treat as historical unless CONTROL claims them |
| Recent relevant commits (Lead tip) | `43a1e30` CONTROL sync; `3e55cfa` S18 C-025 DoD; `221af88` DEV model; `7d4952d` C-025 Effectives; earlier C-025 deadline/formula commits; `master` tip `b875292` C-013 closeout |

**Lead ahead of master:** ~196 commits (verify: `git log master..HEAD --oneline`).

---

## 12. Testing Status

### Unit / local tests

| Area | Status |
|------|--------|
| Lambda `unittest` suite | **DEV passed** (citations 46+/47 in C-013 materials) |
| `tools/airtable/tests` C-010 / C-025 contracts | **Implemented**; C-025 **15/15** offline after S18 merge (UNATTENDED) |
| Automation contract tests for 117 | **DEV passed** offline |

### Airtable DEV tests

| Feature | Status |
|---------|--------|
| 070a homework upload E2E | **DEV passed** (2026-07-12) |
| 116 duplicate consequences | **DEV passed** |
| 115 Testing Scenarios A–D + E/F/G | **DEV functional complete** (backlog); full Make/S3/XP combo **not tested** |
| C-025 Effectives formulas / precedence | **DEV passed** (13/13 postconversion) |
| C-025 117a–f trigger automations | **Implemented but untested** in Airtable (paste pending); harness **6/6** without Fillout |
| C-010 two-field enrollment | **Not started** in Airtable (repo audit only) |
| C-009 LA schema | **Blocked** |

### Make DEV tests

| Feature | Status |
|---------|--------|
| DEV Upload Engine Lambda scenario | **Partially tested / DEV passed** for homework sync JSON and video paths (per C-013/070a packages) |
| Scenarios left OFF when idle | Standing rule |

### Lambda DEV tests

| Feature | Status |
|---------|--------|
| Direct / Make-invoked upload | **DEV passed** (video + homework routes documented) |

### End-to-end tests

| Feature | Status |
|---------|--------|
| Full season athlete path (all XP + email + gates) | **Partially tested** / not fully signed off as single E2E package |
| C-025 recording credit with pasted 117a–f | **Blocked** on Airtable paste |
| Learning Activities | **Not started** |

### PROD tests

| Feature | Status |
|---------|--------|
| C-013 video upload (Schmidt fixture) | **PROD passed** |
| 116 reuse/duplicate fixture | **PROD passed** |
| 066 v3.2 paste | **PROD** deployed per backlog (**monitor** natural runs) |
| 070a homework | **Not started** / OFF |
| 117a–f | **Not started** |
| Real family email in new features | **Blocked** without Mike |

---

## 13. Current Blockers and Risks

### Technical blockers

- **117a–f** not pasted/activated in DEV Airtable → recording credit automations cannot fire on triggers.
- **C-009** Airtable schema blocked pending owner schema approval.
- **C-010** `Progress Processing Enabled?` not in schema yet — approved behavior unimplemented.
- **V2-013** Program Instance not started — multi-year + ARCHIVE model incomplete vs live single PROD base.

### Credentials / environment

- Secrets must stay out of git; C-013 notes optional PROD upload secret rotation hygiene.
- Exact live Function URL / current AWS function name: **verify in console** (naming conflict in docs).

### Missing Airtable schema

- Learning Activities + Responses.
- C-010 second enrollment field (and any automation filters).
- Full fresh schema export after C-025 DEV edits (July 6 snapshot stale for Zoom).

### Timing / automation concerns

- Leave **070a/070b** OFF when idle.
- **112** OFF; prefer **013**; delete **112**/retire **043** only in approved window.
- Async vs sync Make response changes whether **070c** is required.

### Documentation inconsistencies (do not silently “fix”)

1. **066 / H-002:** `PROJECT_STATE.md` / `SESSION_HANDOFF-2026-07-06.md` still imply DEV sandbox / paste pending; **`docs/v2-change-backlog.md` says PROD pasted v3.2 2026-07-06 done.** Prefer **backlog** as newer closing statement; still **monitor** first natural PROD milestone runs.
2. **Season cutover:** Old master-direction / base-cutover docs = archive+clone; **V2-013** = one base + Program Instance (**wins**).
3. **“Homework table” vs `FBC Curriculum - SYNC`:** owner language vs schema names.
4. **Lambda function display names** differ between README and C-013 ops docs.
5. **DEV execution model “PROD = future 2026–27”** vs **PROJECT_STATE “PROD = live season”** — both true in different senses: live ops base exists; clean multi-year ARCHIVE/PROD split is **not finished**.
6. **Backlog header “Last updated 2026-07-06”** vs revision log through **2026-07-13** — prefer revision log + CONTROL milestones.
7. **V2-015:** architecture prose vs backlog **done** — backlog/project state treat base as ready.
8. **CONTROL.json `canonical.sha`** behind `HEAD` by the sync commit — always re-verify git.
9. **`airtable/schema/current/table-map.md`** is generic/outdated vs snapshots — prefer snapshots + `docs/airtable-base-map.md`.
10. **Fillout:** base-map says “not primary”; upload-workflow assumes Fillout-shaped intake — prefer operational upload/automation docs.

### Branch divergence

Lead **far ahead** of `master`; shipping to production git default requires intentional merge/PR strategy (**UNKNOWN** if Mike wants Lead→master merge soon).

### PROD safety

- No PROD schema/automation without Mike + promotion package.
- Do not enable real family sends for C-025/C-027 without approval.
- Do not reset protected fixtures (e.g. `recGQ8EjAMz3bEBiW`) without approval.

### Unresolved agent / Cursor work

- Overnight run **idle**; S18 remaining = **human Airtable paste**.
- Optional UI-delete of `ZZZ C025 Archive — *` temp fields.
- C-023 remaining Stage 6 / homework path / OMNI UX (per index notes).
- C-027 implementation not DoD-complete.

---

## 14. Immediate Next Actions

1. **Paste DEV automations 117a–f**  
   - **Goal:** Activate C-025 recording credit engine in DEV.  
   - **Files:** `airtable/automations/shooting-challenge/117a`–`117f-*.js`; `docs/deploy-checklists/C-025-prod-promotion-package.md`.  
   - **Expected change:** Airtable automations exist and match GitHub.  
   - **Test:** Trigger paths on test Zoom Attendance / harness follow-up.  
   - **Mike approval?** Yes (Airtable paste/enable).  
   - **PROD impact:** None if DEV-only.  
   - **Done when:** Automations ON in DEV; at least one controlled trigger PASS logged.

2. **Refresh PROJECT_STATE + SESSION handoff**  
   - **Goal:** Remove stale 066/H-002/C-025 contradictions for future sessions.  
   - **Files:** `docs/PROJECT_STATE.md`, `docs/SESSION_HANDOFF-*.md` (or new dated handoff).  
   - **Expected change:** Align with backlog + this document.  
   - **Test:** Doc review.  
   - **Mike approval?** Optional.  
   - **PROD impact:** None.  
   - **Done when:** Snapshot sections match 2026-07-13/14 evidence.

3. **Sync CONTROL.json tip SHA to HEAD**  
   - **Goal:** Overnight resume accuracy.  
   - **Files:** `docs/overnight-runs/CONTROL.json`.  
   - **Expected change:** `canonical.sha` = `43a1e30` (or newer).  
   - **Test:** `assert` vs `git rev-parse HEAD`.  
   - **Mike approval?** No for SHA sync.  
   - **PROD impact:** None.

4. **Decide next feature after C-025 DEV paste** (e.g. C-027, C-010 schema, C-023 Stage 6, or Lead→master)  
   - **Goal:** One approved feature brief under DEV execution model.  
   - **Files:** backlog + feature brief template.  
   - **Mike approval?** **Yes**.  
   - **PROD impact:** Only if promotion chosen.  
   - **Done when:** Written brief APPROVED.

5. **Re-export DEV schema snapshot**  
   - **Goal:** Capture C-025 field reality post-Effectives/117 support fields.  
   - **Files:** `airtable/schema/snapshots/…`, tools export CLI.  
   - **Test:** Export health report.  
   - **Mike approval?** Token/permissions if needed.  
   - **PROD impact:** None.  
   - **Done when:** New dated snapshot committed (when Mike asks to commit).

6. **C-009 owner schema decision meeting**  
   - **Goal:** Approve or revise Stage 9 minimum fields; still no unapproved create.  
   - **Files:** `C-009-learning-activities-owner-review-stage9.md`.  
   - **Mike approval?** **Yes**.  
   - **PROD impact:** None until implementation wave.  
   - **Done when:** Explicit approve/revise recorded in backlog.

---

## 15. Do-Not-Change Rules

- Do **not** modify **PROD** (schema, automations, Make prod, Lambda prod, Vercel prod, real sends) without **explicit Mike approval** and a promotion package.
- Do **not** delete or replace the homework **catalog** (whether labeled Homework or `FBC Curriculum - SYNC`).
- Do **not** create **Learning Activities** / **Learning Activity Responses** until owner schema approval (C-009 still blocked for Airtable).
- Do **not** perform Airtable schema changes outside authorized DEV feature scope / approval rules.
- Do **not** expose or commit credentials, PATs, webhook URLs with secrets, Function URLs with embedded secrets.
- Do **not** `git reset --hard`, `git clean`, force-push, or delete branches/files without approval.
- Do **not** enable automations/schedules/Make scenarios that can email real families without approval; leave upload automations **OFF** when idle.
- Do **not** treat **PROPOSED** or Stage proposal docs as **IMPLEMENTED**.
- Do **not** award duplicate XP; preserve Source Key identity on migrations (C-025/C-024).
- Do **not** auto-delete/block uploads on hash match (C-023: Needs Review / flag-only).
- Do **not** merge Tutorials tables (C-026 blocked).
- Do **not** start V2-013 Program Instance until its dedicated wave is approved.
- Do **not** weaken XP idempotency, audit dry-run gates, or ARCHIVE protections under the DEV autonomy model.
- Do **not** call Lambda directly from 070a/070b (Make is required).

---

## 16. Open Questions for Mike

Only items **not** answerable from repo evidence:

1. Confirm live AWS **function names** and Function URLs for DEV/PROD (resolve README vs C-013 naming).
2. After 066 PROD paste, have **natural** shot-milestone runs been monitored as clean, or is more watching needed?
3. Should **`overnight/lead-integration`** be merged to **`master`** now, or stay overnight-only until C-025 PROD?
4. Approve UI deletion of **`ZZZ C025 Archive — *`** fields in DEV, or keep as recovery?
5. Next feature priority after 117a–f DEV paste: **C-027**, **C-010**, **C-023 Stage 6**, **C-009 schema**, or other?
6. Confirm display name of homework catalog in Airtable UI (still `FBC Curriculum - SYNC`?).
7. Exact current ON/OFF matrix for core intake automations in DEV vs PROD (repo leaves many as *confirm in Airtable*).
8. Is there a separate **ARCHIVE** Airtable base yet, or is ARCHIVE still a policy label until V2-013?

---

## 17. Evidence Index

| Source | What it supplied |
|--------|------------------|
| `docs/v2/04-ai-development-standards.md` | Roles, phases, OMNI vs Cursor, Task Classification, DEV→PROD pipeline |
| `docs/development/DEV-EXECUTION-AND-PROMOTION-MODEL.md` | Feature-once approval; Lead/Agent A/B; DEV DoD; stop rules |
| `AGENTS.md` | Cursor startup, hard constraints, wrong-repo redirects |
| `docs/overnight-runs/APPROVAL-PROFILE.md` | Balanced profile; Auto-review required |
| `.cursor/rules/overnight-operating-system.mdc` | Lead/worker lanes; CONTROL verify; hard blocks |
| `docs/ENGINEERING_CONSTITUTION.md` | Highest engineering law |
| `git rev-parse` / `git log` / `git branch` | Tip SHA `43a1e30`, master `b875292`, branch inventory, ahead count |
| `docs/overnight-runs/CONTROL.json` | Queue COMPLETE packages; idle run; **stale** tip SHA `3e55cfa` |
| `docs/overnight-runs/results/UNATTENDED-RUN-STATUS.md` | S18 C-025 DoD milestones; Effective convert; DEV model |
| `docs/v2-change-backlog.md` | Owner decisions #1–11; C-009/C-013/C-023/C-025/H-002/V2-013 status |
| `docs/close-out-considerations.md` | Parallel summary of approved business rules |
| `docs/PROJECT_STATE.md` | Base IDs; C-013 complete note; **stale** V2 snapshot rows |
| `docs/SESSION_HANDOFF-2026-07-06.md` | Older handoff (stale risk on 066) |
| `docs/automation-index.md` | Full automation catalog; 070a/070b/070c/116/117 status |
| `docs/upload-workflow-homework-video.md` | Locked HW/video upload architecture |
| `docs/deploy-checklists/C-070a-dev-airtable-v4.4-prep.md` | **070a DEV E2E PASS 2026-07-12** |
| `docs/deploy-checklists/C-009-learning-activities-owner-review-stage9.md` | LA proposal vs approved architecture |
| `docs/deploy-checklists/C-025-*` + S18 results | Zoom recording DEV workstream |
| `docs/audits/C-013-prod-infrastructure-readiness-2026-07-11.md` | Lambda/Make/PROD readiness narrative |
| `docs/deploy-checklists/C-013-prod-closeout-2026-07-11.md` | PROD video COMPLETE checklist |
| `docs/v2/01-constitution.md` | Configurable engine |
| `docs/v2/02-master-direction.md` | Points to full master direction |
| `docs/v2/03-business-rules.md` | XP buckets, gates, engine contract |
| `docs/v2/05-system-architecture.md` | Layer diagram (shell) |
| `docs/airtable-base-map.md` | FBC Curriculum = Homework catalog |
| `airtable/schema/snapshots/dev-20260706/base_summary_*.json` | 30 DEV table names |
| `airtable/schema/snapshots/prod-20260706/base_summary_*.json` | 29 PROD table names |
| `airtable/schema/snapshots/dev-20260706/schema_doc_*.md` | Link relationships / field name samples |
| `airtable/automations/shooting-challenge/*.js` | 56 scripts; versions for inventory |
| `lambda/upload-asset/README.md` + `upload_core/routes.py` | Routes, env vars, local test commands |
| `docs/overnight-runs/results/S9-worker-d-result.md` | LA proposal = docs only |
| Absence of `docs/overnight-runs/QUEUE.md` | Confirmed missing |

---

*This handoff is documentation-only. It does not modify application, automation, or Lambda runtime code.*
