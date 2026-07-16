# Shooting Challenge V2 — Authoritative Execution Board

**Status:** Authoritative Lead coordination board  
**Updated:** 2026-07-16T15:24:00Z  
**Lead agent:** [V2 execution board control](https://cursor.com/agents/bc-ece28342-1552-4ad1-876e-3487a8c3a37a) (continues PR #36)  
**Prior Lead package:** [bc-8d73f6a0…](https://cursor.com/agents/bc-8d73f6a0-42c3-49b5-b057-31040dd4e0f4)  
**Canonical tip (master):** `3ec489a326d184df9d66a30ad4dbf46805d8233f` (PR **#38** merged)  
**DEV base:** `appTetnuCZlCZdTCT`  
**Hard stops:** No PROD changes · No merge without Mike · No live Airtable without Mike-named DEV auth + credentials · Do not reassign completed worker scopes

---

## Task Classification (this Lead package)

| Field | Value |
|-------|-------|
| Type | Lead coordination / execution tracking |
| Priority | P0 — post-integration control |
| Difficulty | Control-doc update only |
| Owner | Lead / Integrator |
| Dependencies | PR #38 merge evidence; open #31/#32/#33/#36 |
| Backlog ID | Cross-cutting (C-025, H-002/066, C-009–C-011, C-019, 059/043/112/070a) |
| Estimated Scope | Docs only — board + CONTROL tip-sync |
| Phase | Phase 3 coordination (no PROD; no worker re-implementation) |
| Correct tool | Cursor Lead |
| Repo | `127-si-shooting-challenge` |
| Mike's role | Unblock live DEV Airtable; make launch decisions; approve remaining merges |

---

## 1. Verdict

**PR #38 is already merged to master** (`3ec489a`) and contains the complete reconciled repository work from **#34** (DEV runbook + guarded CLI), **#35** (Airtable DEV packages + scripts), and **#37** (engine contracts + validator gates). File-level audit: zero missing paths from those three PRs. Offline validation recorded on #38 (engine contracts, C-009/010/011 Python, fixtures, CLI safety, release-readiness validator).

**No further repository integration PR is needed.** Remaining launch work is almost entirely live DEV Airtable / Make / Mike decisions. Frontend readiness (**PR #33**) remains a separate active workstream. **PR #31** and **PR #32** stay open and blocked on authenticated DEV Airtable access — do not treat them as DEV-verified.

---

## 2. Integration gate — PR #38

| Check | Result |
|-------|--------|
| Contains #34 runbook + CLI + fixtures | **Yes** — on master |
| Contains #35 DEV packages + 067/072/118/119 | **Yes** — on master (authoritative contracts) |
| Contains #37 contracts + validator gates | **Yes** — on master; drift fixed in reconcile |
| Reconciliation doc | [PR34_PR35_PR37_RECONCILIATION.md](./PR34_PR35_PR37_RECONCILIATION.md) |
| Ready for final merge review? | **Already merged** — no second integration PR; Mike may treat master tip as the integration baseline |
| Re-open Worker A/B/repo scopes? | **No** — unless a post-#38 defect is found |

**Supersession**

| PR | Title | Disposition |
|----|-------|-------------|
| **#34** | Worker B DEV runbook + smoke CLI | **MERGED via #38** — superseded as standalone gate; agent **paused** |
| **#35** | Worker A Airtable DEV packages | **MERGED via #38** — superseded as standalone gate; agent **paused** |
| **#37** | Repo blocker contracts/validator | **MERGED via #38** — superseded as standalone gate; agent **paused** |
| **#38** | Reconcile #34/#35/#37 | **MERGED** — was the sole integration gate; now master baseline |

---

## 3. Agent roster

### Active

| Agent | URL | Role | Writable paths | Notes |
|-------|-----|------|----------------|-------|
| **Lead — execution board (this)** | [bc-ece28342…](https://cursor.com/agents/bc-ece28342-1552-4ad1-876e-3487a8c3a37a) | CONTROL only | `docs/v2/V2_EXECUTION_BOARD.md`, `docs/agent-runs/CONTROL.json` | Continues PR **#36** |
| **Frontend functional readiness** | [bc-0173c9ba…](https://cursor.com/agents/bc-0173c9ba-a80d-4da7-ad72-57d784e515c2) | Separate FE workstream | `web/` presentation only | PR **#33** OPEN — do not steal paths |

### Paused (do not reassign former scopes)

| Agent | Former PR | Pause reason |
|-------|-----------|--------------|
| Worker A — Airtable DEV packages (`bc-9ed6132b`) | #35 → #38 | Delivered; superseded by #38 |
| Worker B — DEV runbook (`bc-b59766da`) | #34 → #38 | Delivered; superseded by #38 |
| Repo blocker closure (`bc-e43e4bfc`) | #37 → #38 | Delivered; superseded by #38 |
| C-025 DEV install (`bc-6403ddd5`) | #32 OPEN | Blocked on DEV Airtable credentials |
| 066 OMNI live (`bc-5218fb4d`) | #31 OPEN | Blocked on DEV Airtable credentials |
| Prior Lead board (`bc-8d73f6a0`) | #36 | Superseded by this control turn |

### Idle (no new assignment)

Architecture/LA (`bc-deabd4a2`), release readiness (`bc-34e780b0`), light-theme origin (`bc-3be33795`), four-agent kit lanes — available only via Lead assignment files; **do not** start Brackets or unrelated apps.

---

## 4. Remaining work — exact five categories

Every open launch item maps to **exactly one** category below. Completed repository work is **not** reassigned.

### A. Ready to merge

| Item | PR / tip | Notes |
|------|----------|-------|
| **PR #38** repository integration | MERGED `3ec489a` | Baseline — no further merge action |
| **PR #36** execution board + CONTROL | OPEN | Docs-only control; Mike may merge when ready |
| **PR #33** frontend readiness | OPEN | Separate FE workstream; Mike merge after FE review (not Lead-owned) |

Do **not** merge **#31** / **#32** until Mike reviews — they are blocked-attempt evidence, not DEV-verified installs.

### B. Requires live DEV Airtable

| ID | Task | Evidence / package on master | Blocked until |
|----|------|------------------------------|---------------|
| **EB-CREDS** | Provide DEV-scoped PAT or authenticated OMNI/UI on `appTetnuCZlCZdTCT` | #31, #32 | Mike |
| **EB-066** | Automation **066** live OMNI verification (H-002 / F1–F3) | #31 packet; harness offline PASS | EB-CREDS |
| **EB-C025** | C-025 DEV install + 117a smoke (117b only after DEV Make URL) | #32 packet; #26/#28 repo READY | EB-CREDS |
| **EB-C019** | Testing-view UI verification (filters not API-readable) | [C019_DEV_TESTING_VIEWS.md](./C019_DEV_TESTING_VIEWS.md) | EB-CREDS + Mike UI |
| **EB-059** | Live trigger verification (recommended: create + Shot Milestone + Pending — **no** Ready-for-059 formula) | [AUTOMATION_059_TRIGGER_RESOLUTION.md](./AUTOMATION_059_TRIGGER_RESOLUTION.md) | EB-CREDS / Mike UI |
| **EB-112-UI** | Confirm 112 still **OFF** in DEV (and PROD read-only) | [AUTOMATION_112_OFF_STATE_VERIFICATION.md](./AUTOMATION_112_OFF_STATE_VERIFICATION.md) | Mike UI |
| **EB-SMOKE-CLI** | Live DEV execution of smoke-test CLI (`tools/airtable/v2_dev_runbook/`) | [V2_DEV_EXECUTION_RUNBOOK.md](./V2_DEV_EXECUTION_RUNBOOK.md), [V2_LAUNCH_SMOKE_TESTS.md](./V2_LAUNCH_SMOKE_TESTS.md) | EB-CREDS |
| **EB-PKG-PASTE** | Paste DEV packages from #38: Quiz Result PDF + PPE → backfill → 067/072/PPE guards/118/119 (118/119 OFF, dryRun=true) | [REMAINING_AIRTABLE_DEV_PACKAGES_INDEX.md](./REMAINING_AIRTABLE_DEV_PACKAGES_INDEX.md) | EB-CREDS |
| **EB-INV** | Fill live DEV (then PROD read-only) version/trigger inventory columns | [AUTOMATION_VERSION_INVENTORY.md](../AUTOMATION_VERSION_INVENTORY.md) | EB-CREDS or Mike UI |

### C. Requires Make / email access

| ID | Task | Notes |
|----|------|-------|
| **EB-C025b** | 117b DEV webhook dry-run | Only after DEV Make Test webhook proven; keep PROD OFF |
| **EB-C011-SEND** | Automatic weekly email send path | Packages on master via #38; keep send automations **OFF** until Mike enables |
| **EB-MAKE-TEST** | Verify DEV Make Test webhook for weekly / homework paths | Required before any live parent email |

### D. Requires Mike decision

| ID | Decision | Default / recommendation |
|----|----------|--------------------------|
| **EB-043** | Automation 043: A keep both ON / B disable / C delete after soak | **A** near-term (S26); retire only after DEV soak |
| **EB-070a** | 070a PROD enable vs keep-OFF for V2 launch | **Keep PROD OFF** (affirmed 2026-07-16) |
| **EB-112** | Confirm OFF + schedule delete window | Never re-enable; delete at maintenance |
| **EB-C009-PATH** | HW17 Fillout path A (PDF) vs B (dual-path) | Package ready on master; path still Mike’s |
| **EB-C025-GAP** | Perfect Week / Total Zoom union / post-award conflict | Answer reconciliation §6 before PROD recording credit |
| **EB-FE-GO** | Frontend launch go/no-go after #33 review | Separate from automation gate |

### E. Post-launch

| ID | Item |
|----|------|
| **EB-LA** | LA-002+ Learning Activities schema (not authorized now) |
| **EB-C023** | Hash E2E |
| **EB-C027** | Major-event notifications |
| **EB-EMC** | V2-014b EMC |
| **EB-STALE-PR** | Close/supersede stale overnight/setup PRs (#5/#12/#13/#19/#20/#21) |

---

## 5. Preserved blockers (must stay visible)

| # | Blocker | Category | Status |
|---|---------|----------|--------|
| 1 | Automation **066** live OMNI verification | live DEV Airtable | OPEN — #31 blocked |
| 2 | **C-025** DEV install and smoke test | live DEV Airtable | OPEN — #32 blocked |
| 3 | **C-019** Testing-view verification | live DEV Airtable (Mike UI) | OPEN |
| 4 | Automation **059** live trigger verification | live DEV Airtable | OPEN |
| 5 | Automation **043** decision | Mike decision | OPEN |
| 6 | Automation **112** OFF-state confirmation | Mike decision + UI | OPEN |
| 7 | Automation **070a** PROD-off decision | Mike decision | Affirmed OFF — reaffirm for launch |
| 8 | Live DEV execution of the **smoke-test CLI** | live DEV Airtable | OPEN — offline PASS only |

---

## 6. Open PRs — disposition

| PR | State | Disposition |
|----|-------|-------------|
| #25–#30 | MERGED | Evidence absorbed |
| **#31** | OPEN | Keep open; blocked on DEV Airtable; **do not merge** as “verified” |
| **#32** | OPEN | Keep open; blocked on DEV Airtable; **do not merge** as “verified” |
| **#33** | OPEN | Active FE workstream — Mike reviews separately |
| **#34** | MERGED (via #38) | **Superseded** — agent paused |
| **#35** | MERGED (via #38) | **Superseded** — agent paused |
| **#36** | OPEN | This board — Lead CONTROL; Mike may merge when ready |
| **#37** | MERGED (via #38) | **Superseded** — agent paused |
| **#38** | MERGED | Integration baseline on master |
| #19/#20/#21 + overnight stale | OPEN / mixed | Post-launch hygiene — do not merge blindly |

---

## 7. Completion order (post-#38)

```text
WAVE 0 — Credentials (Mike)                         [BLOCKS ALL LIVE]
  └─ DEV PAT and/or authenticated Airtable/OMNI on appTetnuCZlCZdTCT
  └─ Re-export live DEV schema (20260706 snapshot stale for installs)

WAVE 1 — First live DEV actions (after #38 baseline — see §9)
  └─ Schema fields → PPE backfill → paste #38 packages (OFF/dryRun)
  └─ 066 OMNI → C-025 117a smoke → C-019 UI → 059 trigger attest
  └─ Smoke-test CLI live run (guarded)

WAVE 2 — Make / email (only after DEV webhook proven)
  └─ 117b dry-run · weekly send remains OFF · no PROD Make

WAVE 3 — Mike launch decisions
  └─ 070a OFF · 112 OFF · 043 A/B/C · C-009 path · FE go/no-go

WAVE 4 — PROD promotion (explicit Mike approval each track)
  └─ Never promote 117a/117b/070a until scheduled

WAVE 5 — Post-launch
  └─ LA-002+ · C-023 · C-027 · stale PR hygiene
```

---

## 8. Exact actions Mike must perform

1. **Unblock DEV access** — DEV-scoped PAT for agents **or** OMNI/UI yourself on `appTetnuCZlCZdTCT`.  
2. **Confirm base ID** from Airtable URL/API before any paste.  
3. **After creds — first five live DEV actions** (see §9).  
4. **043** — choose A/B/C (default A keep both ON).  
5. **112** — UI confirm OFF in DEV+PROD; schedule delete; never re-enable.  
6. **070a** — affirm PROD stays OFF for launch.  
7. **C-009 path** — A PDF vs B dual-path when ready to paste HW17.  
8. **PR hygiene** — merge #36 when board looks right; review #33 FE separately; keep #31/#32 as evidence until you approve; do not re-open #34/#35/#37 work.  
9. **No PROD** automation paste/enable this wave unless you explicitly schedule a maintenance window.

---

## 9. First five live DEV actions after PR #38 (already on master)

Execute **only** on DEV `appTetnuCZlCZdTCT` after EB-CREDS:

1. **Create missing fields** — Quiz Result PDF + `Progress Processing Enabled?` (PPE); re-export schema.  
2. **Backfill PPE = true** on intended active enrollments (missing PPE = enabled for progress; false skips).  
3. **Paste #38 DEV scripts (OFF / dryRun)** — 067 v2.0, 072 v3.8, PPE guards on 010/031/053/065, 118/119 with schedules **OFF** and `dryRun=true`.  
4. **Run 066 OMNI verification** (packet F1–F3 on Schmidt test enrollment) **and** C-025 117a DEV smoke (117b only after DEV Make webhook).  
5. **UI attest + smoke CLI** — C-019 Testing views, 059 recommended trigger, 112 OFF; then run guarded `tools/airtable/v2_dev_runbook` live smoke subset and file evidence under `docs/v2/evidence/dev-runs/`.

---

## 10. Next-action report (control summary)

| Question | Answer |
|----------|--------|
| Is PR #38 ready for final merge review? | **Already merged** to master — integration complete; no second reconcile PR |
| Agents that should remain **active** | Lead CONTROL (PR #36); Frontend readiness (PR #33) |
| Agents that should **pause** | Worker A (#35), Worker B (#34), Repo blocker (#37), C-025 (#32), 066 (#31) — resume only after creds / new defect |
| Tasks blocked by Airtable access | EB-066, EB-C025, EB-C019, EB-059, EB-112-UI, EB-SMOKE-CLI, EB-PKG-PASTE, EB-INV (+ EB-CREDS itself) |
| Decisions Mike must make | 043 A/B/C · 070a PROD-OFF affirm · 112 OFF+delete window · C-009 path A/B · C-025 companion gaps · FE go/no-go · when to merge #36/#33 |
| First five live DEV actions | See §9 |

---

## 11. Change log (board)

| When | Change |
|------|--------|
| 2026-07-16T14:20:18Z | Initial authoritative board from PRs #25–#32 + Worker A/B + active agent roster |
| 2026-07-16T15:24:00Z | Post-#38 control: mark #34/#35/#37 superseded; pause their agents; #38 = merged integration baseline; reclassify remaining work into five categories; preserve eight live blockers; FE stays active; tip-sync CONTROL to `3ec489a` |
