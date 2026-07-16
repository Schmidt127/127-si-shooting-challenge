# Shooting Challenge V2 — Authoritative Execution Board

**Status:** Authoritative Lead coordination board  
**Updated:** 2026-07-16T14:20:18Z  
**Lead agent:** [Shooting Challenge V2 execution board](https://cursor.com/agents/bc-8d73f6a0-42c3-49b5-b057-31040dd4e0f4)  
**Canonical tip (master):** `1d403df38a335237e69715de98efb0cb75182ab5`  
**DEV base:** `appTetnuCZlCZdTCT`  
**Hard stops:** No PROD changes · No merge of open Cloud Agent PRs without Mike · No live Airtable without Mike-named DEV auth + credentials

---

## Task Classification (this Lead package)

| Field | Value |
|-------|-------|
| Type | Lead coordination / documentation |
| Priority | P0 — launch sequencing |
| Difficulty | Coordination across open PRs + concurrent agents |
| Owner | Lead / Integrator |
| Dependencies | Evidence from PRs #25–#32 + Worker A/B audits |
| Backlog ID | Cross-cutting (C-025, H-002/066, C-009–C-011, C-019, V2-014a) |
| Estimated Scope | Docs only — board + CONTROL tip-sync + index links |
| Phase | Phase 3 coordination (no PROD; no worker implementation takeover) |
| Correct tool | Cursor Lead |
| Repo | `127-si-shooting-challenge` |
| Mike's role | Unblock live DEV Airtable access; decide 043/070a/112 timing; approve merges later |

---

## 1. Verdict (one paragraph)

Repository V2 readiness for the C-025 / 066 / light-theme slice is **merged** (#25–#28, tip-sync #29–#30). Live DEV verification for **C-025** and **066** was **attempted and blocked** (#31, #32) by missing Airtable credentials / login — **not** by script defects (offline suites PASS). Remaining launch work is gated first by **Mike providing DEV Airtable access**, then by ordered DEV installs, then by Mike decisions on **070a / 043 / 112**, then PROD promotion. Concurrent agents already own non-overlapping follow-ons; this board is the single sequencing authority.

---

## 2. Evidence reconciled (do not re-audit)

| Source | State | What it proved | What it did **not** prove |
|--------|-------|----------------|---------------------------|
| **PR #25** light theme | MERGED | Web primarily light; lint/typecheck/46 tests/build PASS | Live Airtable-backed page data QA |
| **PR #26** release readiness + C-025 repo | MERGED | 009 SCRIPT header; 117a/117b + tests; 066 OMNI packet; 070a keep-OFF decision; validator PASS | Live DEV install of 117a/b; live 066 OMNI |
| **PR #27** LA-000 | MERGED | Learning Activities routing contract + tests | DEV schema for LA tables |
| **PR #28** OA2 verify | MERGED | Offline suites re-PASS; executable DEV sequences documented | Live Airtable writes |
| **PR #29–#30** CONTROL tip-sync | MERGED | CONTROL advanced through post-#28/#29 | Lagged one commit behind #30 tip until this board |
| **PR #31** 066 live OMNI | OPEN — **do not merge yet** | Attempt blocked pre-write; harness re-PASS; F1–F3 = B; H-002 open; 0 records touched | Live 066 sandbox PASS |
| **PR #32** C-025 DEV install | OPEN — **do not merge yet** | Pre-install from snapshot `20260706`; install blocked; XP Bucket `Zoom` vs `Zoom Attendance` reconcile needed | 117a/b installed/enabled/smoked |
| **Worker A readiness audit** | Evidence on overnight + C025 reconciliation on master | Stage 17 six-pack incomplete; S16 path needs 117a/b + companions | Live schema truth without re-export |
| **Worker B E2E validation** | Matrix + OA2 package on master; runbook agent active | Matrix rows exist; offline contracts PASS | Live matrix Pass marks |
| **Light-theme frontend** | #25 merged; follow-on agent RUNNING | Theme correction shipped | Functional readiness inventory (in progress) |

**Superseded / do not re-open as open architecture fights**

| Conflict | Authoritative resolution | Remaining gap |
|----------|--------------------------|---------------|
| Worker A “need 117c–f” vs PR #26 “117a/b only” | [C025_ARCHITECTURE_RECONCILIATION.md](./C025_ARCHITECTURE_RECONCILIATION.md) — **S16 117a/b product authority** | Perfect Week (057), Total Zoom union, post-award conflict soft-void |
| “Merge #25–#27 first” (OA2 start) | **Closed** — merged 2026-07-16 | None |
| Overnight “071 needs Active?” vs “do not change 071” | **Do not change 071** for Active? until Mike/C-027 review (email audit rule wins) | Document in C-010 package only |
| C-009 Stage9 proposal vs LA-000 | **LA-000 owns Learning Activities routing**; C-009 remains HW17/067 attachment intake until Mike picks path A/B | Dual authority until C-009 package lands on master |
| V2-014a “043 approved retire” vs S26 “not tonight” | **Near-term keep both ON** (decision A); retire only after DEV soak + Mike maintenance window | Timing decision still Mike’s |

---

## 3. Agent roster (live as of board update)

### Active (RUNNING) — do not steal their writable paths

| Agent | URL | Owned deliverable | Writable paths (claimed) | Idle after? |
|-------|-----|-------------------|-------------------------|-------------|
| **Lead — this board** | [bc-8d73f6a0…](https://cursor.com/agents/bc-8d73f6a0-42c3-49b5-b057-31040dd4e0f4) | `V2_EXECUTION_BOARD.md` + CONTROL tip-sync | `docs/v2/V2_EXECUTION_BOARD.md`, `docs/agent-runs/CONTROL.json`, index links | Continues as integrator |
| **Worker A — Remaining Airtable DEV packages** | [bc-9ed6132b…](https://cursor.com/agents/bc-9ed6132b-8505-4da0-8df9-9b6dca8b2565) | DEV install packages for **C-009, C-010, C-011, C-019, 059, 043, 112** | `docs/v2/*` install packets for those IDs; targeted script guard docs/patches per their brief | When packages PR opens |
| **Worker B — Executable DEV test runbook** | [bc-b59766da…](https://cursor.com/agents/bc-b59766da-67cb-456b-b103-15ed3f663ea4) | Matrix → executable runbook + launch smoke | `docs/v2/V2_DEV_EXECUTION_RUNBOOK.md`, `docs/v2/V2_LAUNCH_SMOKE_TESTS.md`, `tools/airtable/v2_dev_runbook/`, `docs/v2/evidence/` | When runbook PR opens |
| **Repo blocker closure** | [bc-e43e4bfc…](https://cursor.com/agents/bc-e43e4bfc-95fd-43d2-905d-5028f1a3a5cd) | Repo-only blocker closure (contracts/validator/stale docs) | Engine contracts / validator / stale readiness docs (no new PROD logic) | When closure PR opens |
| **Frontend functional readiness** | [bc-0173c9ba…](https://cursor.com/agents/bc-0173c9ba-a80d-4da7-ad72-57d784e515c2) | Frontend readiness audit/fixes | `web/` presentation only | When readiness report/PR opens |

### Idle (available for next assignment after current wave)

| Agent / role | Last useful PR / note | Next assignment (non-overlapping) |
|--------------|----------------------|-----------------------------------|
| C-025 DEV install (`bc-6403ddd5`) | PR **#32** OPEN | **Paused** — wait for Mike DEV creds; then resume install packet only |
| 066 OMNI live (`bc-5218fb4d`) | PR **#31** OPEN | **Paused** — wait for Mike DEV creds; then resume OMNI packet F1–F3 only |
| Architecture / LA (`bc-deabd4a2`) | #27–#30 | Idle — do **not** start LA-002 schema without Mike |
| Release readiness (`bc-34e780b0`) | #26 merged | Idle — superseded by master tip |
| Light theme (`bc-3be33795`) | #25 merged | Idle — frontend follow-on owned by `bc-0173c9ba` |
| Four-agent kit roles (implementation / testing / research) | CONTROL `available` | Use only via Lead assignment files; currently deferred to the five RUNNING agents above |

---

## 4. Completion order (exact)

```text
WAVE 0 — Credentials & identity (Mike)                    [BLOCKING EVERYTHING LIVE]
  └─ 0.1 Provide DEV-scoped PAT and/or authenticated Airtable session
  └─ 0.2 Confirm base ID appTetnuCZlCZdTCT before any paste
  └─ 0.3 Re-export live DEV schema (snapshot 20260706 is stale for install)

WAVE 1 — Live DEV critical path (Mike + OMNI / authorized agent)
  └─ 1.1 EB-066  Automation 066 OMNI verification (H-002 / L3)     ← first live block
  └─ 1.2 EB-C025 C-025 schema + 117a DEV smoke (J4–J5)
  └─ 1.3 EB-C025b 117b DEV webhook dry-run (only after DEV Make URL proven)
  └─ 1.4 EB-C025c Close companion gaps: Total Zoom union + 057 PW + conflict policy

WAVE 2 — Repository packages already in flight (do not duplicate)
  └─ 2.1 EB-PKG   Worker A: C-009 / C-010 / C-011 / C-019 / 059 / 043 / 112 packages
  └─ 2.2 EB-RUN   Worker B: executable DEV runbook + launch smoke subset
  └─ 2.3 EB-REPO  Repo blocker closure (contracts/validator/stale docs)
  └─ 2.4 EB-WEB   Frontend functional readiness inventory/fixes

WAVE 3 — DEV apply remaining packages (after Wave 2 PRs land + Mike auth)
  └─ 3.1 EB-C019  Testing views UI verify (Mike UI — API cannot read filters)
  └─ 3.2 EB-C010  Active? / Progress Processing Enabled? guards (DEV paste)
  └─ 3.3 EB-059   Confirm 059 trigger = recommended (no Ready-for-059 formula)
  └─ 3.4 EB-C009  HW17 attachment intake (path A/B decision then DEV)
  └─ 3.5 EB-C011  Automatic weekly email (design → DEV; keep send OFF until ready)

WAVE 4 — Live trigger/version inventory (DEV then PROD read-only)
  └─ 4.1 EB-INV   Fill AUTOMATION_VERSION_INVENTORY DEV/PROD UI columns
  └─ 4.2 EB-E2E   Execute launch smoke + priority matrix rows on DEV

WAVE 5 — Mike launch decisions (no PROD write until approved)
  └─ 5.1 EB-070a  Affirm 070a PROD remains OFF for V2 launch (default)
  └─ 5.2 EB-112   Confirm 112 still OFF; schedule delete window
  └─ 5.3 EB-043   Choose A keep / B disable / C delete after soak
  └─ 5.4 EB-FE    Frontend launch go/no-go after EB-WEB

WAVE 6 — PROD promotion (explicit Mike approval each track)
  └─ 6.1 Promote only DEV-verified tracks with deploy-checklist docs
  └─ 6.2 Never promote 117a/117b/070a until scheduled
  └─ 6.3 Maintenance window: 112 delete + 043 retire if Option C

WAVE 7 — Post-launch
  └─ 7.1 LA-002+ Learning Activities schema (if approved)
  └─ 7.2 C-023 hash E2E, C-027 major-event notify, EMC (V2-014b)
  └─ 7.3 Close stale open overnight PRs (#5/#12/#13/#19/#20/#21) or supersede
```

---

## 5. Remaining items (authoritative rows)

Legend — **Class:** `repo` · `live-DEV` · `PROD-promote` · `Mike-decision` · `post-launch`

### Priority track (user-ordered)

#### EB-C025 — C-025 Zoom recording credit

| Field | Value |
|-------|-------|
| ID | EB-C025 |
| System | Airtable DEV · scripts 117a/117b · Make DEV webhook |
| Description | Install S16 recording credit: Config/fields/views + 117a XP + 117b email; do not touch 101 live Attendees |
| Class | live-DEV (schema/paste) after repo-ready |
| Owner | Mike / OMNI (install) · paused agent `bc-6403ddd5` (docs #32) |
| Current status | **Repo READY** (merged #26/#28). **Live BLOCKED** — no PAT/UI session (#32). Not DEV-verified. |
| Dependency | Wave 0 credentials; prefer after or parallel-safe with EB-066 once base confirmed; reconcile XP Bucket `Zoom` option |
| Evidence | PR #26 · [ZOOM_RECORDING_CREDIT_DEV_INSTALL.md](./ZOOM_RECORDING_CREDIT_DEV_INSTALL.md) · [C-025-dev-install-attempt-2026-07-16.md](../deploy-checklists/C-025-dev-install-attempt-2026-07-16.md) · PR #32 |
| Exact next action | Mike: supply DEV PAT or OMNI paste session → re-export schema → execute install §1–9 on DEV only → 117a smoke before enabling 117b |
| Launch blocking? | **Yes** (L5) if recording credit is in launch scope |
| DEV verified? | **No** |
| PROD verified? | **No** — must stay uninstalled |
| Mike approval needed? | **Yes** (named DEV install + later PROD) |

#### EB-066 — Automation 066 live DEV OMNI verification

| Field | Value |
|-------|-------|
| ID | EB-066 |
| System | Airtable DEV · Automation 066 (H-002) |
| Description | Confirm Schmidt intake + milestone crossings F1–F3; close H-002/L3 only with live evidence |
| Class | live-DEV |
| Owner | Mike / OMNI · paused agent `bc-5218fb4d` (#31) |
| Current status | Offline harness **PASS**. Live attempt **BLOCKED** pre-write (#31). Matrix F1–F3 = **B**. |
| Dependency | Wave 0; intake automations ON (historical Mike 2026-07-05) |
| Evidence | [066-omni-live-attempt-2026-07-16.md](../deploy-checklists/066-omni-live-attempt-2026-07-16.md) · PR #31 · [066-dev-omni-confirmation-packet.md](../deploy-checklists/066-dev-omni-confirmation-packet.md) |
| Exact next action | After creds: packet steps 1–4 identity → only then check `Run Shot Milestone Check?` on Schmidt test enrollment |
| Launch blocking? | **Yes** (L3) |
| DEV verified? | **No** |
| PROD verified? | **No** — do not paste/promote 066 until DEV PASS |
| Mike approval needed? | **Yes** |

#### EB-C009 — HW17 attachment intake

| Field | Value |
|-------|-------|
| ID | EB-C009 |
| System | Fillout · Final Reflection Quiz · Automation 067 · Homework Completions |
| Description | Redo HW17 quiz intake so Completions join file pipeline (preferred: PDF attachment) or explicit dual-path redesign |
| Class | Mike-decision → repo → live-DEV |
| Owner | **Worker A active** (`bc-9ed6132b`) for package; Mike for Fillout path A/B |
| Current status | Queued backlog; overnight Stage9 proposal; LA-000 supersedes LA routing only — **067 no-attachment gap remains** |
| Dependency | Mike path decision (A PDF vs B dual-path); C-013 storage clarity |
| Evidence | [v2-change-backlog.md](../v2-change-backlog.md) C-009 · overnight `C-009-learning-activities-owner-review-stage9.md` · [LA-000-current-state-handoff.md](../learning-activities/LA-000-current-state-handoff.md) |
| Exact next action | Worker A: publish DEV package without rewriting full 067 until Mike picks A/B; Mike: Fillout attachment export decision |
| Launch blocking? | **Conditional** — blocks HW17 coach/XP consistency if HW17 in launch scope |
| DEV verified? | **No** |
| PROD verified? | **No** |
| Mike approval needed? | **Yes** (path + any schema) |

#### EB-C010 — Active? guards

| Field | Value |
|-------|-------|
| ID | EB-C010 |
| System | Enrollments `Active?` + `Progress Processing Enabled?` · XP/email automations |
| Description | Inactive athletes out of XP/emails/summaries/streaks — not leaderboard-only |
| Class | repo (guards) → live-DEV paste |
| Owner | **Worker A active** (`bc-9ed6132b`) |
| Current status | Overnight S4/S5 inventories exist on `overnight/lead-integration`; **not fully on master** as install package |
| Dependency | Schema field `Progress Processing Enabled?` Mike/OMNI; do **not** change 071 Active? gating without C-027 review |
| Evidence | Overnight `C-010-*-stage4/5.md` · backlog C-010 |
| Exact next action | Worker A delivers master-line DEV install package + script guard list; Mike/OMNI paste DEV only |
| Launch blocking? | **Yes** for safe public/test isolation |
| DEV verified? | **No** (post-OMNI checklist exists overnight) |
| PROD verified? | **No** |
| Mike approval needed? | **Yes** (schema + paste) |

#### EB-C011 — Automatic weekly email

| Field | Value |
|-------|-------|
| ID | EB-C011 |
| System | 072 → 074 · Make |
| Description | Remove manual `Build Weekly Email Now?` / `Send to Make?` gates; scheduled weekly send in 072 format |
| Class | repo design → live-DEV (send OFF) → Mike-decision PROD |
| Owner | **Worker A active** (design/package only) |
| Current status | Design audit overnight; **no auto send live** |
| Dependency | EB-C010 (suppress inactive/test); C-022 |
| Evidence | Overnight `C-011-weekly-email-design-audit-stage5.md` · backlog C-011 |
| Exact next action | Worker A: design + DEV package with send automations **OFF**; no live parent email |
| Launch blocking? | **No** if manual weekly send acceptable for launch; **Yes** if auto-email required |
| DEV verified? | **No** |
| PROD verified? | **No** |
| Mike approval needed? | **Yes** before any send enable |

#### EB-C019 — DEV testing views

| Field | Value |
|-------|-------|
| ID | EB-C019 |
| System | Airtable UI views on 8 pipeline tables |
| Description | `Testing` views filtered by Related Enrollment / Schmidt test enrollment only — no test flags on pipeline rows |
| Class | live-DEV (Mike UI) |
| Owner | Mike (UI) · Worker A package support |
| Current status | Checklist on master; filters **not API-readable** — UI verification required |
| Dependency | Schmidt enrollment ID (overnight cites `recgP9qZYjAhE7NXm` — **reconfirm live**) |
| Evidence | [C-019-testing-views-verification-checklist.md](../deploy-checklists/C-019-testing-views-verification-checklist.md) · overnight Stage5 repo verification |
| Exact next action | Mike: run UI checklist on DEV; Worker A: do not claim API-verified filters |
| Launch blocking? | **Yes** for safe DEV testing hygiene |
| DEV verified? | **No** |
| PROD verified? | N/A / not required for launch |
| Mike approval needed? | **Yes** (UI work) |

#### EB-070a — Automation 070a launch decision

| Field | Value |
|-------|-------|
| ID | EB-070a |
| System | 070a · Make · Lambda homework route |
| Description | Homework S3 upload PROD enable/keep-OFF |
| Class | Mike-decision |
| Owner | Mike |
| Current status | **Decision record: keep PROD OFF** for V2 launch (affirmed 2026-07-16). DEV E2E historical PASS — re-verify before any PROD consider. |
| Dependency | None for launch if OFF |
| Evidence | [AUTOMATION_070A_LAUNCH_DECISION.md](./AUTOMATION_070A_LAUNCH_DECISION.md) · PR #19/#18 historical |
| Exact next action | Mike: affirm keep-OFF for launch (default). Re-verify DEV only if later enabling. |
| Launch blocking? | **No** if OFF (L6 accepted) |
| DEV verified? | Historical yes — **re-verify before PROD** |
| PROD verified? | **OFF** (must remain) |
| Mike approval needed? | **Yes** to change from OFF |

#### EB-059 — Automation 059 trigger conflict

| Field | Value |
|-------|-------|
| ID | EB-059 |
| System | Athlete Achievement Unlocks · Automation 059 |
| Description | Live/GitHub trigger text still cites “Ready for 059 XP”; **recommended trigger** is create + Shot Milestone + Pending — **do not** filter on Ready-for-059 formula (flips mid-run) |
| Class | live-DEV verify · repo header cleanup |
| Owner | Worker A (package) · Mike (UI confirm) |
| Current status | Stage I claimed trigger fixed (2026-06-24); inventory/header still ambiguous — **live UI reconfirm required** |
| Dependency | EB-C010 progress gate when pasting Active? guards |
| Evidence | 059 script RECOMMENDED TRIGGER block · [stage-j-legacy-cleanup.md](../airtable/stage-j-legacy-cleanup.md) · inventory row 059 |
| Exact next action | Mike/OMNI: screenshot DEV+PROD 059 trigger conditions; Worker A: align inventory/header to recommended trigger; repair stuck rows via extension if needed |
| Launch blocking? | **Yes** if trigger still uses Ready-for-059 formula (stuck Pending risk) |
| DEV verified? | **UNKNOWN** — confirm UI |
| PROD verified? | **UNKNOWN** — confirm UI |
| Mike approval needed? | **Yes** to change live trigger |

#### EB-043 — Automation 043 retirement

| Field | Value |
|-------|-------|
| ID | EB-043 |
| System | Levels · 043 vs 042 |
| Description | 043 Set Level Gate Rule — superseded by 042 v3.0 behavior |
| Class | Mike-decision → PROD-promote (maintenance) |
| Owner | Mike |
| Current status | V2-014a approved retire **pending window**. S26: **keep both ON near-term** (Option A). |
| Dependency | DEV soak proving 042 always fills Level Gate Rule |
| Evidence | Overnight `S26-043-042-recommendation.md` · V2-014a · inventory 043 |
| Exact next action | Mike choose A/B/C; **do not delete in this wave**. Worker A documents decision packet only. |
| Launch blocking? | **No** if both ON safely; complexity only |
| DEV verified? | **UNKNOWN** live ON/OFF |
| PROD verified? | **UNKNOWN** |
| Mike approval needed? | **Yes** |

#### EB-112 — Automation 112 remaining OFF

| Field | Value |
|-------|-------|
| ID | EB-112 |
| System | Video Feedback · 112 vs 013 |
| Description | Legacy duplicate of 013 — must stay OFF; delete at maintenance window |
| Class | Mike-decision → PROD-promote (delete) |
| Owner | Mike |
| Current status | Documented **OFF — monitor before delete**; not deleted |
| Dependency | Confirm 013 sole production path; monitor period |
| Evidence | PROJECT_STATE · automation-index · V2-014 |
| Exact next action | Mike: UI confirm still OFF in DEV+PROD; schedule delete; never re-enable |
| Launch blocking? | **No** if OFF; **Yes** if accidentally ON |
| DEV verified? | **UNKNOWN** UI |
| PROD verified? | **UNKNOWN** UI |
| Mike approval needed? | **Yes** to delete |

#### EB-INV — Live trigger/version verification

| Field | Value |
|-------|-------|
| ID | EB-INV |
| System | All production automations |
| Description | Fill DEV/PROD version + trigger columns in inventory (L1/L9) |
| Class | live-DEV + PROD read-only UI |
| Owner | Mike / OMNI · Worker B runbook may list order |
| Current status | Most rows **UNKNOWN** |
| Dependency | Wave 0 for agent assist; Mike can do UI without agents |
| Evidence | [AUTOMATION_VERSION_INVENTORY.md](../AUTOMATION_VERSION_INVENTORY.md) · L1/L9 |
| Exact next action | After creds or in Mike UI session: record version/trigger/ON-OFF for priority automations (066, 059, 013, 112, 042, 043, 070a, 101, 117a/b) |
| Launch blocking? | **Yes** (L1) for promote confidence |
| DEV verified? | **Partial / UNKNOWN** |
| PROD verified? | **UNKNOWN** |
| Mike approval needed? | Read-only no; writes yes |

#### EB-WEB — Frontend launch readiness

| Field | Value |
|-------|-------|
| ID | EB-WEB |
| System | Next.js `/shoot` |
| Description | Light theme shipped; complete functional readiness (empty states, achievements shell, athlete profile gaps, nav) |
| Class | repo → Mike-decision launch UX |
| Owner | **Frontend agent active** (`bc-0173c9ba`) |
| Current status | #25 merged; functional readiness agent RUNNING; L7 achievements/profile incomplete |
| Dependency | Optional Airtable token for data pages QA |
| Evidence | PR #25 · known-issues L7/L8 · APP_CONTEXT |
| Exact next action | Let frontend agent finish inventory/safe UI fixes; Mike review screenshots; no Vercel prod deploy from agents |
| Launch blocking? | **Partial** (UX) — not automation-blocking |
| DEV verified? | Build/tests yes; visual/data QA incomplete |
| PROD verified? | **No** deploy this wave |
| Mike approval needed? | **Yes** to merge further FE PRs / deploy |

### Supporting / board-owned items

#### EB-BOARD — This execution board

| Field | Value |
|-------|-------|
| ID | EB-BOARD |
| System | Docs / Lead CONTROL |
| Description | Single sequencing authority + agent assignments |
| Class | repo |
| Owner | Lead (`bc-8d73f6a0`) |
| Current status | Created this revision |
| Dependency | None |
| Evidence | This file · CONTROL tip-sync |
| Exact next action | Keep updated when Worker A/B/FE/repo PRs open; do not merge #31/#32 until Mike reviews |
| Launch blocking? | No |
| DEV verified? | N/A |
| PROD verified? | N/A |
| Mike approval needed? | Yes to merge board PR |

#### EB-CREDS — DEV Airtable access unblock

| Field | Value |
|-------|-------|
| ID | EB-CREDS |
| System | Cloud Agent env / Mike workstation |
| Description | Shared blocker for #31/#32 and all live DEV agent work |
| Class | Mike-decision |
| Owner | Mike |
| Current status | **BLOCKING** — no `AIRTABLE_*` in cloud env; browser hits login wall |
| Dependency | None |
| Evidence | PR #31 · PR #32 |
| Exact next action | Provide DEV-scoped PAT in agent env (`AIRTABLE_TOKEN` + `DEV_BASE_ID=appTetnuCZlCZdTCT`) **or** authenticated Airtable session / OMNI paste by Mike |
| Launch blocking? | **Yes** for all live verification |
| DEV verified? | N/A |
| PROD verified? | N/A — never put PROD token in agent env |
| Mike approval needed? | **Yes** |

#### EB-C025-GAP — C-025 companion gaps (PW / Total Zoom / conflict)

| Field | Value |
|-------|-------|
| ID | EB-C025-GAP |
| System | 057 · Enrollments Total Zoom · 101 dual-detect |
| Description | Behaviors still required under S16 even with 117a/b |
| Class | Mike-decision + live-DEV (formula) + repo companion if needed |
| Owner | Mike / OMNI (formula) · repo agent only after Lead assign |
| Current status | Documented open in reconciliation §6 |
| Dependency | EB-C025 install path chosen (S16) |
| Evidence | [C025_ARCHITECTURE_RECONCILIATION.md](./C025_ARCHITECTURE_RECONCILIATION.md) |
| Exact next action | OMNI answers reconciliation §6 questions before enabling PROD recording credit |
| Launch blocking? | **Yes** for full recording makeup (gate/PW) |
| DEV verified? | **No** |
| PROD verified? | **No** |
| Mike approval needed? | **Yes** |

#### EB-LA — Learning Activities (post-critical-path)

| Field | Value |
|-------|-------|
| ID | EB-LA |
| System | web helpers + future Airtable LA tables |
| Description | LA-001 routing helpers merged; LA-002+ schema not authorized |
| Class | post-launch (unless Mike pulls forward) |
| Owner | Idle until Mike |
| Current status | LA-000/001 prep on master (#27) |
| Dependency | Mike schema authorization |
| Evidence | PR #27 |
| Exact next action | No agent schema work; ChatGPT/Mike plan if scheduling |
| Launch blocking? | **No** |
| DEV verified? | Unit tests only |
| PROD verified? | **No** |
| Mike approval needed? | **Yes** before LA-002 |

---

## 6. Assigned next tasks (non-overlapping)

| Assignee | Task ID | Do now | Do not touch |
|----------|---------|--------|--------------|
| **Mike** | EB-CREDS, EB-066, EB-C025, EB-C019, EB-070a, EB-043, EB-112, EB-059 UI | Creds + base confirm; OMNI 066; C-025 paste when ready; UI views; decision affirmations | PROD writes; merging agent PRs blindly |
| **Worker A** `bc-9ed6132b` | EB-C009, EB-C010, EB-C011, EB-C019 pkg, EB-059, EB-043 pkt, EB-112 pkt | Finish DEV install packages on a feature branch; open one PR | `CONTROL.json`; `V2_EXECUTION_BOARD.md`; live Airtable; Worker B runbook paths; `web/` |
| **Worker B** `bc-b59766da` | EB-RUN → supports EB-INV/E2E | Executable runbook + launch smoke docs/tools | CONTROL; board; Worker A packages; live writes without creds |
| **Repo closure** `bc-e43e4bfc` | EB-REPO | Contracts/validator/stale doc closure only | Active? production script logic beyond contracts; Airtable; FE theme redo |
| **Frontend** `bc-0173c9ba` | EB-WEB | Functional readiness in `web/` | Automations; Airtable schema; weekly-email backend |
| **Paused C-025 agent** | EB-C025 | Idle until EB-CREDS | Do not invent install success |
| **Paused 066 agent** | EB-066 | Idle until EB-CREDS | Do not mark H-002 closed |
| **Lead** | EB-BOARD | Maintain board; tip-sync CONTROL; integrate worker PRs later (no master merge without Mike) | Steal Worker A/B/FE/repo paths; merge #31/#32 yet |

---

## 7. Open PRs — disposition

| PR | Disposition |
|----|-------------|
| #25–#30 | Merged — evidence absorbed |
| **#31** | Keep OPEN until Mike reviews; **do not merge yet**; useful blocked-attempt packet |
| **#32** | Keep OPEN until Mike reviews; **do not merge yet**; useful pre-install checklist |
| #20/#21 (and older setup dupes) | Stale env setup — close/supersede post-launch hygiene |
| Overnight #5/#12/#13/#19 | Superseded-in-part by master decisions; do not merge blindly onto master |

---

## 8. Unresolved conflicts (only real ones left)

1. **EB-CREDS** — all live DEV agent work blocked until Mike supplies access.  
2. **EB-043 timing** — approved retire (V2-014a) vs keep-ON near-term (S26) → Mike Option A/B/C.  
3. **EB-C009 authority** — overnight Stage9 vs LA-000 → LA owns LA routing; C-009 still owns 067/HW17 attachment until path chosen.  
4. **EB-059 trigger text** — inventory/header vs recommended trigger → live UI is truth.  
5. **EB-C025-GAP** — 117a/b alone incomplete for gate/PW/post-award conflict.  
6. **Overnight → master gap** — C-010/C-011/C-019 full packages still primarily on `overnight/lead-integration`; Worker A must re-home to current master line.

---

## 9. Exact actions Mike must perform

1. **Unblock DEV access:** DEV-scoped PAT for cloud agents **or** run OMNI/UI yourself on `appTetnuCZlCZdTCT`.  
2. **Confirm base ID** from Airtable URL/API before any paste.  
3. **066 first:** follow confirmation packet; capture enrollment IDs + automation outputs; only then close H-002.  
4. **C-025 second:** re-export schema; reconcile XP Bucket/Source options (`Zoom` / `Zoom Recording`); paste 117a OFF → smoke → 117b with DEV webhook only.  
5. **C-019:** verify Testing views in UI (not OMNI-only).  
6. **059:** screenshot trigger; align to recommended create+Pending+Shot Milestone (no Ready-for-059 formula filter).  
7. **112:** confirm OFF in DEV+PROD.  
8. **043:** choose A keep / B disable / C delete (default A).  
9. **070a:** affirm PROD stays OFF for launch.  
10. **PR hygiene:** review #31/#32 when ready; **do not ask Lead to merge them until you approve**; approve board PR when ready.  
11. **No PROD** automation paste/enable this wave unless you explicitly schedule a maintenance window.

---

## 10. Blockers & evidence index

| Blocker | Blocks | Evidence |
|---------|--------|----------|
| No Airtable credentials in cloud | EB-066, EB-C025, live EB-INV assist | PR #31, #32 |
| Stale schema snapshot `20260706` | Safe C-025 field create list | PR #32 packet |
| XP Bucket option mismatch (`Zoom` vs `Zoom Attendance`) | Enabling 117a | PR #32 |
| Perfect Week / Total Zoom / post-award gaps | Full C-025 product | C025 reconciliation |
| Testing view filters not in API | Claiming C-019 done from repo | C-019 checklist |
| 070a PROD OFF (accepted) | Homework S3 parity | 070a decision record |

---

## 11. Change log (board)

| When | Change |
|------|--------|
| 2026-07-16T14:20:18Z | Initial authoritative board from PRs #25–#32 + Worker A/B + active agent roster |
