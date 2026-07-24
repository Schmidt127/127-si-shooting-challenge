# Mike Actions — Next (Agent 13 consolidated)

**Date:** 2026-07-24  
**Environment:** PROD `appn84sqPw03zEbTT`  
**Schmidt Enrollment:** `recgP9qZYjAhE7NXm` · Athlete `recgqVstObQRzgXJF`  
**Supersedes morning order in:** `docs/overnight/MIKE-ACTIONS-TOMORROW.md` (Config collapse advice revoked)

Ordered by dependency and risk. Do not skip attestation before enabling schedules or Zoom dual paths.

**Decisions recorded 2026-07-24:** SC-035 = `send_short`; SC-014 = Option B (attachment-less).  
**PROD installs recorded 2026-07-24:** Automation **054 v5.6** + **066 v3.3** (Installed in PROD; not Live Tested yet).

---

## P0 — Blocking (do today)

### 1. Automation UI attestation (closes SC-058 gap)

**Packet:** `docs/next-wave/automation-ownership/AUTOMATION-ATTESTATION-PACKET.md`

| # | Confirm in Airtable UI | Pass criteria |
|---|------------------------|---------------|
| 1 | **112** | OFF or Deleted — must not create Video Feedback |
| 2 | **013** | ON · ≈ v2.0 · VF key `VIDEO_FEEDBACK\|{asset}` |
| 3 | **020** | ON · **v3.0.0** · Grade Band at create |
| 4 | **063** | Deleted/OFF — do not reinstall full 063 |
| 5 | **111** | Deleted/OFF — unnecessary if 013 v2.0 live |
| 6 | **031** | ON — primary WAS creator |
| 7 | **101** | ON for live attendance — never write Attendees from recording |
| 8 | **117 / 117c XP path** | See attestation packet — PROD 117 is approval-email v1.1 (not XP); 117c absent; do not apply stale XOR to email-only 117 |
| 9 | **118** | OFF until authorized |
| 10 | **119** | OFF until authorized |
| 11 | Weekly Threshold XP writer | YES (name/version/key) or NO (missing) |
| 12 | **115** | ON · installed (already live-tested) |

**Expected outcome:** Signed exclusivity list; SC-058 ready to advance after paste into notes.

### 2. Zoom credit XP writer (if/when reinstalled)

**Note:** PROD Automation **117** is attested as approval-email → Make only (**v1.1**), not a `ZOOM_CREDIT` XP writer; **117c** absent.  
If a Zoom recording **XP** orchestrator or **117c** is installed later, keep exactly one XP mint path ON.

### 3. Keep four Config year rows (do not collapse)

**Do not** delete Config records. Years 2025–2026…2028–2029 with Max Videos 4/6/5/4 are intentional.  
**Adopt:** `docs/next-wave/config-selection/CONFIG-SELECTION-CONTRACT.md` + `lib/config-selection/index.js`.  
**OMNI check:** Zoom Meetings Global/Program Config links match meeting season year.  
**Expected outcome:** No destructive Config cleanup; year-aware selection plan accepted.

### 4. Empty-week email policy (SC-035) — DECIDED

**Decision:** **`send_short`** — short no-activity reminder email.  
**Do not** suppress; **do not** send the full normal weekly summary for empty weeks.  
**Doc:** `docs/next-wave/was-email/EMPTY-WEEK-EMAIL-DECISION.md`  
**Still needed before Live:** enforce `send_short` in 118/119 + short template; keep schedules OFF / dryRun until Schmidt PASS.

### 5. Paste 072 v4.0 + optional 118/119 v1.4 (empty-week enforcement)

**Runbook:** `docs/next-wave/was-email/EMPTY-WEEK-072-PROD-PASTE-RUNBOOK.md`  
**Required:** Paste **072 v4.0** with input `emptyWeekPolicy=send_short`.  
**Optional:** 118/119 **v1.4** (defaults aligned; schedules remain **OFF**).  
**Schmidt proof:** empty week → subject **Weekly Check-In**, not full zero report; Ready?=true; Send to Make?=false.  
**Do not** enable Live Sunday schedules from this step.

### 6. Quiz path (SC-014) — DECIDED

**Decision:** **Option B** — attachment-less completion.  
**Doc:** `docs/next-wave/homework-pipeline/QUIZ-PATH-DECISION.md`  
**Rules:** Do **not** create `Quiz Result PDF`; do **not** create a fake attachment; use existing **067** attachment-less path.  
**Still needed:** Confirm/install 067 in PROD if drifted; coach score-centric review UX; Schmidt live test (SC-013).

---

## P0 — Pastes after attestation

### 7. Paste approved 054 / 066 versions — DONE (Installed in PROD)

| Script | Version | PROD status | Path |
|--------|---------|-------------|------|
| 054 | v5.6 | **Installed in PROD** (2026-07-24) | `054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js` |
| 066 | v3.3 | **Installed in PROD** (2026-07-24) | `066-achievements-and-milestones-create-shot-milestone-unlocks.js` |

**Outcome:** Duplicate-rule guard (054) + Grade Band link-ID match (066) installed.  
**Not Live Tested yet** — supervised Schmidt streak/milestone proofs still required (see P1 #14).  
**Evidence:** `docs/next-wave/config-xp/MIKE-ACTIONS.md`

### 8. Resolve Video XP discrepancy

**Evidence:** XP Event `recYQ10pOoFlApmjZ` = 1 XP vs rule 25 + blank date (Agent 2).  
**Action:** Identify writer (113/114 family); decide repair vs leave; no mass XP edit.  
**Expected outcome:** Documented intentional exception or single-row repair plan.

---

## P1 — Controlled live tests (Schmidt only)

| # | Path | Expected |
|---|------|----------|
| 9 | Homework file → HC → review → 065 XP → 071 email | One HC; one `HOMEWORK_XP\|{hcId}` |
| 10 | Video upload → 013 VF → 114 XP | One `VIDEO_SUBMISSION\|{vfId}`; 112 stays OFF |
| 11 | Zoom live attendance → 101 | Attendees path only; WAS link/create race OK |
| 12 | Zoom recording credit XP (if XP automation present) | One `ZOOM_CREDIT`; conflict soft-void — do not confuse with PROD 117 email slot |
| 13 | After 118 paste: dryRun Sunday build | WAS ensure for empty/homework-only week; empty week uses **short** email path |
| 14 | Supervised 3-day streak / milestone / Perfect Week | **054 v5.6 + 066 v3.3 installed** — live proof still required; not unattended |
| 15 | Level gate block + clear | 042 with Zoom credit flags from correct year Config |
| 16 | Testing views (SC-003) | Create remaining Testing views with Schmidt Enrollment filter |
| 17 | Final Reflection quiz → 067 Option B | HC created, **0** assets; coach Score review → one XP |

---

## P1 — Product / ops decisions (record in Completion Master)

| ID | Ask | Status |
|----|-----|--------|
| SC-035 | Empty-week email | **DECIDED** `send_short` (short reminder; not suppress; not full normal) |
| SC-014 | Quiz PDF vs attachment-less | **DECIDED** **Option B** (no Quiz Result PDF; no fake attachment; 067 path) |
| OW-D2 | 117 vs 117c XP | PROD 117 = email-only; 117c absent — see attestation packet |
| SC-044 | Major-event channel | Email first; EMC later |
| SC-081 | Streak repeat-after-break | Amounts=config; behavior change only if wanted |
| SC-095 | 070a PROD ON | Keep OFF until scheduled window |
| SC-112 | Athlete auth | Parent magic-link |
| SC-114/115 | Softr / noindex | Soft cutover first; keep noindex |
| Count It | 115 vs 007a dual writer | Product call (FW-D1) |
| XP-D1 | Threshold writer missing | UI hunt then rebuild or defer |

---

## P2 — Later

1. Authorize `web/` full dependency install + Playwright chromium → typecheck/build/E2E.  
2. Learning Activities Airtable schema only after homework+quiz live-proven (`LEARNING-ACTIVITIES-SCHEMA.md`).  
3. Tutorials orphan migration (`docs/online-agents/tutorials-content/`) after Softr proof.  
4. Drop stash `agent5-118-wip-preserve` after confirming v1.3 Summary Key note.  
5. After two proven Sunday ensures, consider 101 WAS create → link-only.  
6. Apply remaining stale-doc patches from `STALE-063-111-PATCH-MANIFEST.md` (audit recommendedAction strings).  
7. Optional orphan XP/Assets cleanup (dry-run first).  
8. Enforce `send_short` empty-week path in 118/119 (repo) before PROD paste/Live.

---

## Do not

- Collapse/delete Config year rows  
- Re-enable **112**  
- Turn on both **117** and **117c** XP writers (if either XP path is installed)  
- Reinstall full **063** / **111**  
- Enable 118/119 Live schedules before `send_short` enforcement + Schmidt PASS  
- Create **Quiz Result PDF** or fake quiz attachments (SC-014 Option B)  
- Turn **070a** ON without a scheduled window  
- Modify PROD automations for these decisions until the next approved paste window  
