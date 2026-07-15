# Core Workflow Regression Matrix

**Status:** Authoritative human matrix (docs-only)  
**Stage:** S26 · Workstream 4  
**As-of:** 2026-07-14  
**Bases:** DEV `appTetnuCZlCZdTCT` · PROD `appn84sqPw03zEbTT`  
**Companion JSON:** [core-workflow-regression-matrix.json](./core-workflow-regression-matrix.json)

**Authority sources:** [automation-index](../automation-index.md) · [AIRTABLE-AUTOMATION-INVENTORY](../architecture/AIRTABLE-AUTOMATION-INVENTORY.md) · [DEPENDENCY-MAP](../architecture/AIRTABLE-AUTOMATION-DEPENDENCY-MAP.md) · [PROJECT_STATE](../PROJECT_STATE.md) · Phase A/B/C smoke results · [C-024 dedupe inventory](../deploy-checklists/C-024-dedupe-field-inventory-stage2.md)

---

## How to use this matrix

1. Pick a **workflow** before any consolidation paste, season rollover rehearsal, or pre-season dry-run.
2. Confirm **prerequisites** and **live fixture** (Schmidt only for live writes).
3. Run the listed path; record evidence against **expected result**.
4. On failure, use **rollback/restore** before continuing adjacent workflows.
5. Update **Evidence status** in this doc + JSON when fresh smoke lands.

### Evidence status vocabulary

| Status | Meaning |
|--------|---------|
| **PASS** | Documented live DEV (or PROD where noted) smoke with artifact path |
| **UNKNOWN** | Scripts/docs exist; no current authoritative live smoke for this matrix row |
| **PLANNED** | Design / harness ready; intentionally not run yet (or blocked: 117 OFF, email gates, etc.) |

### Global constraints (this matrix)

- **No PROD writes** unless Mike explicitly opens a PROD window.
- **No real-family email / SMS.**
- **Do not enable 117** until Mike activation package is authorized.
- Prefer **Schmidt Testing** enrollment `recgP9qZYjAhE7NXm` for fixtures.
- After Phase consolidations, prefer **combined** scripts (021, 030, 020, 013) over deleted library siblings (006, 032/033, 063, 111 pending delete).

---

## Summary board

| ID | Workflow | Primary autos | Evidence |
|----|----------|---------------|----------|
| W1 | Enrollment | 001, 002, 003 | **UNKNOWN** |
| W2 | Submission intake | 023, 005, 007, 021, 009, 010 | **PASS** (021 Phase A) · full intake chain **UNKNOWN** / **PLANNED** via 115 |
| W3 | Weekly summaries | 031, 030, 034 | **PASS** (030 Phase B) |
| W4 | Homework | 020, 064, 065, 070a, 022, 071 | **PASS** (020 Phase C1; 070a DEV E2E historical) · XP/email **UNKNOWN**/**PLANNED** |
| W5 | Video | 013, 070b, 070c, 022, 113, 114, 116 | **PASS** (013 Phase C2; 070b/070c PROD; 116 DEV+PROD) · full XP chain **UNKNOWN** |
| W6 | Levels | 041, 042, 043 | **UNKNOWN** |
| W7 | Achievements | 053–059, 066 | **UNKNOWN** (066 deploy done; sandbox pipeline confirm still pending historically) |
| W8 | Zoom | 101, 117 (OFF) | **UNKNOWN** (101) · **PLANNED** (117 recording credit) |

---

## W1 — Enrollment

| Field | Value |
|-------|-------|
| **Workflow ID** | `enrollment` |
| **Trigger** | Enrollment enters intake view / enrollment create-update (confirm live 001–003 views in Airtable UI — docs conditions may be swapped vs GitHub) |
| **Prerequisites** | Fillout (or equivalent) enrollment payload; Athletes table writable; Grade Bands populated for season; Program Instance not required today (pre–V2-013) |
| **Primary automations** | **001** find/create Athlete + link · **002** assign Grade Band initial · **003** Grade Band if Grade changes / refresh needed |
| **Outputs** | Athlete linked on Enrollment; Grade Band set; optional welcome path via **075** |
| **Dedupe key** | Athlete identity match (001 find-or-create); Enrollment is canonical season participant row |
| **Retry** | Re-run 001/002/003 on same Enrollment after fixing missing athlete/band; scripts should skip when already linked/correct |
| **Adjacent autos** | Downstream consumers of Grade Band: **030** (WAS), **020** (HC after C1), **013** (VF after C2), **113**, **023** enrollment-on-submission, **075** welcome |
| **Live fixture** | Schmidt Testing Enrollment `recgP9qZYjAhE7NXm` — do **not** create new production enrollments for regression |
| **Expected result** | Athlete linked; Grade Band matches grade; no duplicate Athlete for same identity |
| **Rollback / restore** | Unlink mistaken Athlete only on test enrollments; restore Grade Band from Enrollment.Grade; do not delete Athletes shared with history |
| **Evidence status** | **UNKNOWN** — Folder 01 investigation open (S26); no Phase A–C smoke covers 001–003 |
| **Evidence paths** | [DEPENDENCY-MAP § Folder 01](../architecture/AIRTABLE-AUTOMATION-DEPENDENCY-MAP.md) · inventory notes on 001/002 condition swap |

---

## W2 — Submission intake

| Field | Value |
|-------|-------|
| **Workflow ID** | `submission_intake` |
| **Trigger** | Submissions created/updated (Fillout-shaped). Watched fields vary by automation — confirm in UI. |
| **Prerequisites** | Active-capable Enrollment (023 may not auto-link inactive — C-020 pre-links Related Enrollment for Schmidt); Weeks calendar for activity date (**005**); attachments present for asset path |
| **Primary automations** | **023** Enrollment · **005** Week (homework-first) · **007** duplicate checker · **021** attachment status + video count (**Phase A**; absorbs former **006**) · **009** create Submission Assets · **010** submission XP |
| **Outputs** | Enrollment + Week on Submission; Duplicate Key flagged when applicable; Upload Status / Video Count; Submission Asset row(s); XP Event when `Count This Submission?` awards |
| **Dedupe key** | Submission Duplicate Key (**007**); XP `SUBMISSION\|{submissionId}` (**010**); **009** skips same attachment id on same submission |
| **Retry** | Safe to re-touch Submission when statuses empty / assets missing; **021** idempotent (Phase A smoke); do not clear terminal Sent statuses casually |
| **Adjacent autos** | **031** WAS · **013**/**020** asset fan-out · **041** level recalc from XP · streaks **055**/**053** |
| **Live fixture** | Phase A examples: `recS6KgsiWrpXpau0` (video), `recgPS8m1y2ISmxQK` (HW), `recW4CvqDTVZvrBQH` (both); Schmidt enrollment filter |
| **Expected result** | Fillout-shaped row flows 023→005→021→009→010 without duplicate assets; video count correct; Sent preserved on retest |
| **Rollback / restore** | `_rollback/phase-a-006-021-2026-07-14/` for 021 script; delete only Schmidt-owned test Submissions/Assets; restore Upload Status if smoke left rows dirty |
| **Evidence status** | **PASS** — Phase A combined **021** live smoke (2026-07-14). Full end-to-end Fillout intake including **010** milestone path: **PLANNED** via **115** / C-020 |
| **Evidence paths** | [S22-phase-a-live-smoke-result.md](../overnight-runs/results/S22-phase-a-live-smoke-result.md) · `docs/audits/phase-a-021-live-smoke-2026-07-14.json` · [C-020 checklist](../deploy-checklists/C-020-testing-scenarios-script-checklist.md) |

---

## W3 — Weekly summaries (WAS)

| Field | Value |
|-------|-------|
| **Workflow ID** | `weekly_summaries` |
| **Trigger** | Submissions with `Count This Submission?` and WAS empty → **031**; WAS create/update → **030**; WAS previous-week helpers → **034** |
| **Prerequisites** | Enrollment + Week on Submission; Challenge Goals / Homework catalog linkable; Grade Band on Enrollment |
| **Primary automations** | **031** find/create WAS · **030** bootstrap Grade Band + Goal + Homework (**Phase B**; absorbs **032**/**033**) · **034** previous-week helpers |
| **Outputs** | One WAS per Enrollment+Week; Grade Band / Challenge Goal / Homework links; previous-week helper fields for chain emails |
| **Dedupe key** | Enrollment + Week (WAS unique identity); **031** find-or-create; Phase B smoke proved duplicate-prevention / stable ids |
| **Retry** | Re-run **030** when GB/Goal/HW blank; skip when already correct (idempotent) |
| **Adjacent autos** | **057**/**058** Perfect Week · **072**/**074** weekly email (do not fire real sends in regression) · **034** chain ordering |
| **Live fixture** | Phase B suite fixtures (see JSON audit); Schmidt-scoped WAS only |
| **Expected result** | Missing GB/Goal/HW filled; multi-step bootstrap ok; **031** links or finds WAS; formulas for goal shots readable |
| **Rollback / restore** | `_rollback/phase-b-030-032-033-2026-07-14/`; restore fixture GB/Goal/HW links; leave 032/033 deleted in DEV |
| **Evidence status** | **PASS** — Phase B combined **030** live smoke (2026-07-14). Weekly email package (**072→074**): **PLANNED** / blocked (no real sends; Phase D prep) |
| **Evidence paths** | [S23-phase-b-live-smoke-result.md](../overnight-runs/results/S23-phase-b-live-smoke-result.md) · `docs/audits/phase-b-030-live-smoke-2026-07-14.json` · [C-011 design audit](../deploy-checklists/C-011-weekly-email-design-audit-stage5.md) |

---

## W4 — Homework

| Field | Value |
|-------|-------|
| **Workflow ID** | `homework` |
| **Trigger** | Submission Assets ready for homework → **020**; coach review → **064**/**065**; Send to Make Trigger → **070a**; writeback → **022**; parent feedback ready → **071** |
| **Prerequisites** | Enrollment + Week + homework attachment asset; Grade Band on Enrollment; DEV Make/Lambda for upload path; **071** gated off for regression |
| **Primary automations** | **020** link/create Homework Completion + Grade Band repair (**Phase C1**; absorbs **063**) · **064** prepare XP · **065** create Homework XP · **070a** Make payload · **022** child writeback · **071** feedback email (do not enable for matrix) · optional **067** reflection quiz intake |
| **Outputs** | Homework Completion linked; Grade Band on HC; Canonical URL after upload; XP Event `HOMEWORK_XP\|{hcId}`; parent email package (out of scope for live regression) |
| **Dedupe key** | One official HC per Enrollment + Assignment + Week (owner C-024 #2); XP Source Key `HOMEWORK_XP\|{homeworkCompletionId}`; **020** link-existing prevents duplicate HC |
| **Retry** | Safe re-trigger **020** for blank GB / missing HC link; **070a**: leave OFF when idle; clear Send to Make only after verified writeback (sync JSON path) |
| **Adjacent autos** | **030** WAS homework link · **009** asset create · achievements Perfect Week paths · do not enable Folder 07 email senders during consolidation |
| **Live fixture** | Phase C1 post-paste smoke (GB restore); historical 070a DEV E2E + 022 Canonical URL sync (2026-07-12) |
| **Expected result** | New or linked HC; GB populated from Enrollment; no extra HC on repeat; upload writeback when 070a exercised under Mike control |
| **Rollback / restore** | `_rollback/phase-c1-020-063-2026-07-14/`; restore HC Grade Band on fixtures; delete only Schmidt HC/test assets |
| **Evidence status** | **PASS** — Phase C1 **020** post-paste smoke. **PASS** (historical) — 070a DEV homework upload E2E. Homework XP + **071** email: **UNKNOWN** / **PLANNED** (no live matrix run this stage) |
| **Evidence paths** | [S24-phase-c1-post-paste-smoke-result.md](../overnight-runs/results/S24-phase-c1-post-paste-smoke-result.md) · `docs/audits/phase-c1-020-post-paste-smoke-2026-07-14.json` · [automation-index 070a note](../automation-index.md) · [C-070a prep](../deploy-checklists/C-070a-dev-airtable-v4.4-prep.md) |

---

## W5 — Video

| Field | Value |
|-------|-------|
| **Workflow ID** | `video` |
| **Trigger** | Submission Assets ready for Video Feedback → **013**; Send to Make + Pending Link → **070b**; Uploaded+writeback → **070c** (async Accepted path); coach review → **113**/**114**; Asset Reuse Decision → **116** |
| **Prerequisites** | Video attachment asset; Enrollment GB; PROD/DEV Make+Lambda for upload; **112** is legacy duplicate of **013** (OFF / not in UI) — do not re-enable |
| **Primary automations** | **013** create/link VF + GB repair (**Phase C2**; absorbs **111** pending UI delete) · **070b** Make video · **070c** async verify · **022** writeback · **113** base video XP · **114** VIDEO XP Event · **116** reuse consequences |
| **Outputs** | Video Feedback row; Canonical URL; XP `VIDEO_SUBMISSION\|{videoFeedbackId}`; Active? soft-delete on Confirmed Duplicate |
| **Dedupe key** | One VF per submission asset path (**013** link-existing); XP Source Key `VIDEO_SUBMISSION\|{vfId}`; File Content Hash review queue (C-023) — upload continues, no double award |
| **Retry** | **013** idempotent GB repair; **070c** idempotent verify; **116** Confirmed Duplicate → Approved Reuse reversal restores same XP row |
| **Adjacent autos** | **009**, **021**, levels **041**, achievements that read video activity |
| **Live fixture** | Phase C2 VF create/link; PROD Schmidt asset `recWZ4cHNYgbV60mL` (116); PROD upload asset `recGQ8EjAMz3bEBiW` (070b/070c) |
| **Expected result** | VF created or linked once; GB repaired when blank; no duplicate VF; upload verify clears path; reuse toggles XP Active? without second Source Key |
| **Rollback / restore** | `_rollback/phase-c2-013-111-2026-07-14/`; restore fixture GB; for 116 — reverse decision to Approved Reuse; do not hard-delete XP Events |
| **Evidence status** | **PASS** — Phase C2 **013** post-paste CRITICAL. **PASS** — **070b**/**070c** PROD (C-013, 2026-07-11). **PASS** — **116** DEV+PROD. Full coach→**114** XP path this matrix cycle: **UNKNOWN**. Do **not** delete **111** until Mike reports Phase C2 UI complete |
| **Evidence paths** | [S25-phase-c2-post-paste-smoke-result.md](../overnight-runs/results/S25-phase-c2-post-paste-smoke-result.md) · `docs/audits/phase-c2-013-post-paste-smoke-2026-07-14.json` · [C-013 PROD lambda](../deploy-checklists/C-013-prod-lambda-deployment-2026-07-11.md) · [C-023 PROD 116](../deploy-checklists/C-023-prod-automation-116-validation-2026-07-11.md) |

---

## W6 — Levels

| Field | Value |
|-------|-------|
| **Workflow ID** | `levels` |
| **Trigger** | XP Events → **041** mark Enrollment for recalc; Enrollment flagged → **042** assign Current/Next Level + gate blocking; **043** set Level Gate Rule from Next Level (consolidation candidate into **042** — do not retire without replacement evidence) |
| **Prerequisites** | Levels + Level Gate Rules config rows; Enrollment linked; XP Events with Progress Processing path (C-010 two-field design queued) |
| **Primary automations** | **041**, **042**, **043** |
| **Outputs** | Current Level, Next Level, Level Gate Rule link; gate-blocked progression when requirements unmet |
| **Dedupe key** | N/A (assignment overwrite of same Enrollment fields); idempotent when already correct |
| **Retry** | Re-check Enrollment recalc flag; safe to re-run **042**/**043** after config or XP repairs |
| **Adjacent autos** | **010**/**065**/**114**/**059**/**101** create XP that feeds **041**; web/Softr presentation of level |
| **Live fixture** | Schmidt Enrollment `recgP9qZYjAhE7NXm` — inspect Current/Next Level after controlled XP (no prod family) |
| **Expected result** | Level assignments match XP thresholds; gate rule matches Next Level; blocked when gates incomplete |
| **Rollback / restore** | Restore prior Current/Next Level links on test Enrollment; do not mutate shared Levels catalog mid-test |
| **Evidence status** | **UNKNOWN** — no Phase A–C smoke; 043→042 investigation package in flight (S26) — do not retire **043** |
| **Evidence paths** | [automation-index Levels](../automation-index.md) · inventory rank for 043 · [season-configuration-design](../v2/season-configuration-design.md) |

---

## W7 — Achievements

| Field | Value |
|-------|-------|
| **Workflow ID** | `achievements` |
| **Trigger** | Submissions → streak rebuild **053** / recalc **055**; scheduled **056**; WAS → Perfect Week **057**/**058**; Athlete Achievement Unlocks ready → **059**; Enrollment `Run Shot Milestone Check?` → **066** |
| **Prerequisites** | Counted submissions + Weeks; Achievements / Shot Milestones catalog; XP writers ready; suppress parent notifications (C-027) for test |
| **Primary automations** | **053**, **054**, **055**, **056**, **057**, **058**, **059**, **066** |
| **Outputs** | Streak Occurrences; Perfect Week unlocks; Shot Milestone unlocks; XP Events from unlocks |
| **Dedupe key** | Streak XP via **054** Source Key; Perfect Week `PERFECT_WEEK\|{enrollment}\|{week}` (**058**); Shot `SHOT_MILESTONE\|{enrollmentId}\|{shotMilestoneId}` (**066** Milestone Source Key); unlock XP via **059** Source Key (earliest valid unlock wins — owner #5) |
| **Retry** | Idempotent recreate/repair on missing XP; do not create second unlock for same Milestone Source Key |
| **Adjacent autos** | Submission intake **010**, WAS **031**/**030**, Zoom Perfect Week credit (**117e** design — OFF) |
| **Live fixture** | Schmidt Enrollment; historical Easton Hill / clean-create notes for **066** DEV verify |
| **Expected result** | One unlock per milestone key; one XP Event per unlock Source Key; streak rows upserted without duplicates |
| **Rollback / restore** | Deactivate mistaken XP (`Active?`); leave unlocks flagged rather than bulk-delete (H-001 principle); restore only Schmidt |
| **Evidence status** | **UNKNOWN** for full streak/PW matrix. **066** GitHub+PROD pasted historically — pipeline sandbox confirm was repeatedly “pending OMNI”; treat full achievements E2E as **PLANNED** for next dry-run season (V2-012) |
| **Evidence paths** | [PIPELINE-zoom-achievements-audit-stage7](../deploy-checklists/PIPELINE-zoom-achievements-audit-stage7.md) · [066 deploy](../deploy-checklists/066-v3.1-dev-deploy.md) · C-024 § achievements |

---

## W8 — Zoom

| Field | Value |
|-------|-------|
| **Workflow ID** | `zoom` |
| **Trigger** | Zoom Meetings `Create XP Events` → **101** (live meeting XP). Recording quiz / Zoom Attendance updates → **117** orchestrator (**OFF**, not enabled this stage) |
| **Prerequisites** | Zoom Meetings + Attendance rows; Config Effective formulas (C-025 DEV partial); Enrollment exclusivity Meeting vs Recording (owner decision); webhook blank until Mike activation |
| **Primary automations** | **101** live Zoom XP · **117** recording credit orchestrator (library modules 117a–f remain library-only — do not paste ×6) |
| **Outputs** | XP Event `ZOOM_LIVE|…` (**101**); recording path design: `ZOOM_CREDIT|{Enrollment}|{Zoom Meeting}` + gate/PW credits + optional email (**117f**) — all **PLANNED**/gated |
| **Dedupe key** | Live vs recording mutually exclusive Source Key families (stage7 audit); find-by-key before create |
| **Retry** | Re-check Create XP Events only when missing XP; **117** must stay OFF — no retry enabling |
| **Adjacent autos** | Levels **041**; Perfect Week **057**/**058**; achievements; **do not** enable email **117f** in regression |
| **Live fixture** | Schmidt recording ZA `recHkB9aER3vCvBsL` (design sheet); Schmidt attendance only |
| **Expected result** | Live meeting awards once; recording path (when authorized) awards without stealing live XP; gate/PW exclusivity holds |
| **Rollback / restore** | Deactivate mistaken Zoom XP; reset Review Status on recording fixtures; never enable 117 webhook without Mike package |
| **Evidence status** | **UNKNOWN** — **101** live path. **PLANNED** — **117** (pasted OFF; activation package in progress; **HARD: do not enable**) |
| **Evidence paths** | [automation-index Zoom/117](../automation-index.md) · [C-025 117 deployment sheet](../deploy-checklists/C-025-dev-airtable-117-deployment-sheet.md) · [PIPELINE-zoom-achievements-audit-stage7](../deploy-checklists/PIPELINE-zoom-achievements-audit-stage7.md) · formula/deadline results (C-025 DEV) |

---

## Cross-cutting fixture & safety

| Item | Value |
|------|-------|
| **Canonical test Enrollment** | `recgP9qZYjAhE7NXm` — `Schmidt, Testing - 2025-2026` |
| **Testing views** | Filter by Enrollment link (C-019) — not pipeline test flags |
| **Config tables** | Do not add test rows to Levels, Gates, XP Rules, Weeks, Milestones |
| **External systems** | Make / Lambda / S3 only on Schmidt paths; leave send automations OFF when idle |
| **Capacity note** | After Phase C1: DEV ~47 estimated / 3 free until **111** delete; **117** OFF occupies a slot |

---

## Suggested regression order (safe)

1. **W2** submission prep (**021**/**009**) — already PASS recently  
2. **W3** WAS bootstrap (**031**/**030**) — PASS  
3. **W4** homework link (**020**) — PASS; upload only under Mike  
4. **W5** video link (**013**) — PASS; upload/email gated  
5. **W1** enrollment — UNKNOWN (docs investigation first)  
6. **W6** levels — UNKNOWN (after controlled XP)  
7. **W7** achievements — PLANNED after Fillout-shaped submission via **115**  
8. **W8** Zoom **101** only — UNKNOWN; **117** remains OFF  

---

## Revision log

| Date | Change |
|------|--------|
| 2026-07-14 | Initial S26 matrix from automation-index, inventory, Phase A/B/C evidence, C-024, PROJECT_STATE |
