# Mike Actions — Next (Agent 13 consolidated)

**Date:** 2026-07-24  
**Environment:** PROD `appn84sqPw03zEbTT`  
**Schmidt Enrollment:** `recgP9qZYjAhE7NXm` · Athlete `recgqVstObQRzgXJF`  
**Supersedes morning order in:** `docs/overnight/MIKE-ACTIONS-TOMORROW.md` (Config collapse advice revoked)

Ordered by dependency and risk. Do not skip attestation before enabling schedules or Zoom dual paths.

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
| 8 | **117 XOR 117c** | Exactly one ON for `ZOOM_CREDIT\|` XP |
| 9 | **118** | OFF until authorized |
| 10 | **119** | OFF until authorized |
| 11 | Weekly Threshold XP writer | YES (name/version/key) or NO (missing) |
| 12 | **115** | ON · installed (already live-tested) |

**Expected outcome:** Signed exclusivity list; SC-058 ready to advance after paste into notes.

### 2. Choose one Zoom credit writer

**Decision:** Keep **117** orchestrator ON and **117c** OFF (recommended), or reverse — never both.  
**Evidence:** Agent 9 OW-D2 · `xp-source-key-registry.json` status `duplicate_risk`.  
**Expected outcome:** Single `ZOOM_CREDIT` mint path.

### 3. Keep four Config year rows (do not collapse)

**Do not** delete Config records. Years 2025–2026…2028–2029 with Max Videos 4/6/5/4 are intentional.  
**Adopt:** `docs/next-wave/config-selection/CONFIG-SELECTION-CONTRACT.md` + `lib/config-selection/index.js`.  
**OMNI check:** Zoom Meetings Global/Program Config links match meeting season year.  
**Expected outcome:** No destructive Config cleanup; year-aware selection plan accepted.

### 4. Decide empty-week email policy (SC-035)

**Options:** `send_normal` / `send_short` / `suppress`  
**Doc:** `docs/next-wave/was-email/EMPTY-WEEK-EMAIL-DECISION.md`  
**Recommendation:** seasonal `send_short`; interim `send_normal` OK for Schmidt.  
**Expected outcome:** Decision recorded on SC-035 before Live schedules.

### 5. Paste 118/119 v1.3 OFF in PROD

**Runbook:** `docs/next-wave/was-email/WEEKLY-EMAIL-PROD-INSTALL-RUNBOOK.md`  
**Scripts:**  
- `airtable/automations/shooting-challenge/118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js` **v1.3**  
- `airtable/automations/shooting-challenge/119-email-notifications-and-external-handoffs-schedule-weekly-summary-email-send.js` **v1.3**  
**Inputs:** dryRun default **true**; `includeSchmidt=true` for Test; schedules **OFF**.  
**Expected outcome:** Automations installed, OFF, dryRun-safe; no Sunday Live fire.

### 6. Decide quiz path (SC-014)

**Doc:** `docs/next-wave/homework-pipeline/QUIZ-PATH-DECISION.md`  
**Recommendation:** **Option B** (attachment-less) given current PROD schema.  
**If Option A:** authorize OMNI `Quiz Result PDF` field + Fillout mapping.  
**Expected outcome:** SC-014 Decision Needed → resolved; unblocks 067 PROD confidence.

---

## P0 — Pastes after attestation

### 7. Paste approved 054 / 066 versions

| Script | Repo version | Path |
|--------|--------------|------|
| 054 | v5.6 | `054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js` |
| 066 | v3.3 | `066-achievements-and-milestones-create-shot-milestone-unlocks.js` |

**Expected outcome:** Duplicate-rule guard (054) + Grade Band link-ID match (066) live in PROD.

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
| 12 | Zoom recording → sole 117/117c | One `ZOOM_CREDIT`; conflict soft-void |
| 13 | After 118 paste: dryRun Sunday build | WAS ensure for empty/homework-only week |
| 14 | Supervised 3-day streak / milestone / Perfect Week | After 054/066 paste; not unattended |
| 15 | Level gate block + clear | 042 with Zoom credit flags from correct year Config |
| 16 | Testing views (SC-003) | Create remaining Testing views with Schmidt Enrollment filter |

---

## P1 — Product / ops decisions (record in Completion Master)

| ID | Ask | Recommendation |
|----|-----|----------------|
| SC-035 | Empty-week email | `send_short` seasonal; `send_normal` interim |
| SC-014 | Quiz PDF vs attachment-less | **Option B** |
| OW-D2 | 117 vs 117c | **117 ON / 117c OFF** |
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

---

## Do not

- Collapse/delete Config year rows  
- Re-enable **112**  
- Turn on both **117** and **117c**  
- Reinstall full **063** / **111**  
- Enable 118/119 Live schedules before SC-035 decision + Schmidt PASS  
- Mark decision packets as resolved without recording Mike’s choice  
- Turn **070a** ON without a scheduled window  
