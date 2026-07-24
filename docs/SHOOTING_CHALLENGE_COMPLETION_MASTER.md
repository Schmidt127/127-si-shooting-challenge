# Shooting Challenge Completion Master

**Controlling source of truth** for finishing Shooting Challenge V2.

Older files (`docs/v2-change-backlog.md`, `docs/CHATGPT-MASTER-PLAN-BRIEF.md`, close-out notes, overnight packets, deploy checklists) remain as **evidence and history**. Do not delete them. When those files disagree with this document, **this document wins** — then update the older file later so it does not keep spreading stale status.

| Field | Value |
|-------|--------|
| Created | 2026-07-23 |
| Last updated | 2026-07-24 (WAS weekly email chain Live Tested in PROD Test mode; dashboard recalculated) |
| Environment | **PROD Airtable base is the active construction and testing base** (`appn84sqPw03zEbTT`) |
| Scope | Controlling completion plan (updated by Foundation Reset Pack 2026-07-23) |

---

## 1. Operating Rules

These rules replace the old “DEV-first forever / never touch PROD data” posture for the current rebuild.

1. **PROD is the active construction and testing base.** Work directly in the production Airtable base.
2. **Historical data preservation is not required.** Old athlete, enrollment, submission, homework, XP, email, and achievement records have been removed (or may be removed freely).
3. **Old participant data is gone.** Do not delay work to protect 2025–26 season rows.
4. **Direct PROD development is approved.** DEV (`appTetnuCZlCZdTCT`) is optional and not required unless Mike specifically asks for it later.
5. **Live records may be created and deleted freely** for controlled testing (especially the Schmidt testing enrollment).
6. **Live emails and automations may stay enabled** because only controlled testing data should exist. Still avoid accidental mass emails to real parents outside the Schmidt test family.
7. **System dependency safety remains mandatory.** Protect structure and connected workflows:
   - table links, formulas, lookups, rollups, counts
   - automation scripts and triggers
   - Make scenarios
   - Fillout field mappings
   - Lambda / storage workflows
   - website Airtable queries
   - field names and single-select options used by scripts
   - duplicate-prevention keys (Source Keys / XP Dedupe Keys)
   - one writer per field (do not create competing automations)
8. **Schmidt testing enrollment** is the primary live test athlete when records are recreated.
9. **Code in GitHub is not the same as “working in PROD.”** A feature is only Complete when repository work, PROD installation, and live PROD testing are all satisfied where they apply.

---

## 2. Status Definitions

| Status | Plain-language meaning |
|--------|------------------------|
| **Brainstormed** | Idea exists; no firm plan yet. |
| **Decision Needed** | Mike must choose before more build work. |
| **Planned** | Direction is clear enough to implement; not built yet. |
| **Built in Repository** | Code/docs/scripts exist in GitHub; not confirmed installed in PROD. |
| **Installed in PROD** | Present in the live PROD base / Make / Lambda / web deploy, but not fully live-tested after the empty-base reset (or never live-tested). |
| **Live Tested in PROD** | Installed and proven with controlled live PROD records (Schmidt or equivalent). Still missing final close-out if any. |
| **Complete** | Repository work + PROD install + live PROD test all done (where applicable), or the item is fully finished documentation/decision work that needs no further live proof. |
| **Deferred** | Intentionally postponed. |
| **Superseded** | Replaced by a newer SC item or design. |
| **Not Needed** | No longer required under current operating rules or product decisions. |

**Honesty rule:** Prior 2025–26 “live pass” evidence used athlete data that no longer exists. After the empty-base reset, athlete-path features that were once proven are treated as **Installed in PROD** (or lower) until re-proven on Schmidt test data — unless the item was pure documentation, a one-off historical repair, or a permanent external system (for example Lambda code) that does not depend on wiped rows.

---

## 3. Completion Dashboard

Counts below match Section 4 as of **2026-07-24**. Recalculate when statuses change.

| Bucket | Count |
|--------|------:|
| **Total items** | **146** |
| Complete | 10 |
| Live Tested in PROD | 9 |
| Installed but not tested *(Installed in PROD)* | 54 |
| Built but not installed *(Built in Repository)* | 29 |
| Planned | 23 |
| Decision Needed | 6 |
| Deferred | 10 |
| Superseded | 3 |
| Not Needed | 2 |
| Brainstormed | 0 |

**Reading tip:** “Installed but not tested” remains large — many pipelines still need Schmidt re-proof after the empty-base reset. **Weekly email (2026-07-24):** `118→072 v4.0→119→074→Make Bulk Email May 18` Test-mode E2E PASS with empty-week **`send_short`**; 118/119 schedules remain OFF. Architecture: `docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md`. Config rows are year-specific (do not collapse). 115 installed + live-tested. 020 PROD = v3.0.0. **054 v5.6** + **066 v3.3** Installed.

---

## 4. Master Completion Table

Columns:

- **Mike’s Goal** — what success looks like in plain language  
- **What Already Exists** — evidence in repo / prior PROD work  
- **What Is Still Needed** — remaining work  
- **Evidence** — old IDs and key doc/script paths for traceability  

| ID | Area | Mike’s Goal | Current Status | What Already Exists | What Is Still Needed | Dependencies | PROD Safety/Dependency Notes | Evidence | Mike Decision | Priority | Last Updated |
|----|------|-------------|----------------|---------------------|----------------------|--------------|------------------------------|----------|---------------|----------|--------------|
| SC-001 | Testing | Universal Testing Scenarios framework so Mike can run Fillout-shaped tests without Fillout | Live Tested in PROD | **115 installed in PROD** (v1.8/v1.9 msg); dry+live PASS 2026-07-23; **rerun PASS 2026-07-24** (Submission `recjt6QpUcprSIxAk`, XP `recovVbiZynRUtDwF`); offline harness 17 tests; scenario catalog 20 fixtures | Expand HW/Video live branches; UI-attest inventory; optional paste v1.9 | SC-004, SC-059 | No second XP path; reruns create additional Submissions by design | `docs/overnight/testing-integrity/`; `live-115-rerun-latest.json`; `docs/testing/scenarios/` | **Resolved:** allowed in PROD | P0 | 2026-07-24 |
| SC-002 | Testing | Test scenario library / templates for repeatable suites | Built in Repository | Machine-readable catalog: 20 fixtures + `docs/testing/scenarios/README.md` + `catalog.json` (SCN-001–020) | Optional Airtable Scenario Library table later; expand HW/Video/Zoom fixture rows | SC-001 | Library is config, not a second XP path | `docs/testing/scenarios/` | Confirm Airtable library table still wanted | P1 | 2026-07-24 |
| SC-003 | Testing | Testing views on key pipeline tables | Planned | PROD checklist + overnight exact view specs (`TESTING-VIEWS-MIKE-ACTIONS.md`); only Athlete Achievement Unlocks currently has a `Testing` view | Mike/OMNI create remaining Testing views with Schmidt Enrollment RID filters; verify row visibility | SC-004 | API cannot create views; **do not hide Schmidt** | `docs/overnight/testing-integrity/TESTING-VIEWS-MIKE-ACTIONS.md`; foundation checklist | — | P0 | 2026-07-24 |
| SC-004 | Testing | Permanent Schmidt testing enrollment for live PROD tests | Live Tested in PROD | Athlete `recgqVstObQRzgXJF` + Enrollment `recgP9qZYjAhE7NXm` verified; **Active?=true**; Week `recVDKiYATgzsfpmE`; live Submission→Week→XP→WAS proven (incl. 115 live Submission `recuuTBgstSTGg2E3`) | Keep emails Schmidt-only; **overnight direction 2026-07-23: Schmidt remains visible on public standings** (do not add leaderboard exclusion filter yet); website is name-blind | — | No separate exclusion field; web must not invent name filters | `docs/foundation-reset/FOUNDATION-RESET-PACK-TEST-EVIDENCE-2026-07-23.md`; `docs/overnight/testing-integrity/CURRENT-PROD-BASELINE.md`; `docs/overnight/web-integration/PUBLIC-STANDINGS-AUDIT.md` | **Resolved:** Active?=true; standings visibility = keep Schmidt for now | P0 | 2026-07-23 |
| SC-005 | Testing | Full end-to-end live PROD matrix (all major paths) | Planned | Matrix updated 2026-07-24 with evidence categories; A3/A4/B1/B2 partial PROD passes; B3 policy blocked; B5 backdate blocked | Execute remaining matrix on Schmidt; refresh Zoom rows | SC-001–SC-004, core pipelines | Controlled data only | `V2_END_TO_END_TEST_MATRIX.md`; testing-integrity REPORT | — | P0 | 2026-07-24 |
| SC-006 | Testing | Automatic Expected-versus-Actual results on scenarios | Built in Repository | Read-only verifier `tools/testing/lib/expected_actual.js` + CLI; offline tests PASS; live probe bundle PASS | Wire auto-write of Pass/Fail onto Testing Scenarios (optional); expand check coverage | SC-001, SC-002 | Read-only scoring preferred — no competing production writer | `tools/testing/`; `prod-probe-latest.json` | Want Airtable writeback auto-score now? | P2 | 2026-07-24 |
| SC-007 | Testing | Duplicate and rerun testing (idempotency proof) | Live Tested in PROD | Live 115 rerun + WAS uniqueness + one XP per Submission proven 2026-07-24; XP Source Key inventory PASS for Schmidt | Live packs still needed: HW, video, Zoom, streak/milestone, emails; 010 UI re-trigger attest | SC-066, SC-096+ | Never create double XP | `live-115-rerun-latest.json`; `XP-IDEMPOTENCY-AUDIT.md`; `CORE-UNIQUENESS-AUDIT.md` | Decide 115 Count It vs 007a policy | P0 | 2026-07-24 |
| SC-008 | Testing | Email, Make, upload, and failure-path testing | Planned | C-013 video E2E historically PASS; Make blueprints; upload runbooks | Failure inject: webhook down, Lambda reject, blank webhook, retry; homework route; weekly email Test mode | SC-131+, SC-051+ | Route test traffic to Schmidt only | C-013 checklists; C-011 activation checklist | — | P1 | 2026-07-23 |
| SC-009 | Homework | Photo / image homework submissions work end-to-end | Installed in PROD | Homework Completions + Submission Assets pipeline; web catalog | Re-test photo upload→asset→review→XP→email on Schmidt; enable 070a if needed | SC-019, SC-131 | One HC per assignment | LA-000; homework-flow.md | — | P0 | 2026-07-23 |
| SC-010 | Homework | PDF / document homework submissions work end-to-end | Installed in PROD | Same file pipeline as photos | Re-test PDF path; quiz uses Option B (no PDF asset — SC-014) | SC-019 | Fillout mapping fragile | C-009 preferred path | — | P0 | 2026-07-24 |
| SC-011 | Homework | Video submissions as homework/learning assets | Installed in PROD | Video path via 013/070b/070c/114 historically live | Re-test video as homework vs daily video rules; confirm purpose routing | SC-133 | Do not double-credit video XP | LA routing `video`; C-013 | — | P0 | 2026-07-23 |
| SC-012 | Homework | Written / reflection responses work | Installed in PROD | Fillout questions + HC path historically used | Re-test written-only HC; coach review + 071 | SC-019 | No attachment required for written | LA `reflection` / `fillout_questions` | — | P1 | 2026-07-23 |
| SC-013 | Homework | Online quizzes create a reviewable completion | Built in Repository | **067** v2.0 attachment-less path; SC-014 Option B approved | Confirm/install 067 in PROD if drifted; coach Score/Target Score Met? review UX; Schmidt live test (HC, 0 assets → one XP) | SC-014 | 067 must not award XP itself; no fake attachments | C-009; `docs/next-wave/homework-pipeline/QUIZ-PATH-DECISION.md` | — | P0 | 2026-07-24 |
| SC-014 | Homework | Final Reflection quiz completion path (PDF vs attachment-less) | Built in Repository | **Option B approved** — attachment-less; **067** `no_attachment_field` path + quiz-path contracts; no Quiz Result PDF field; no fake attachment | PROD 067 paste confirmation + Schmidt Option B live test (tracked under SC-013); do not create Quiz Result PDF | SC-013 | Do not invent a second quiz XP path; do not mint placeholder assets | `docs/next-wave/homework-pipeline/QUIZ-PATH-DECISION.md`; `067-…reflection-quiz.js` | **DECIDED Option B** | P0 | 2026-07-24 |
| SC-015 | Homework | Multiple files per homework response | Installed in PROD | Submission Assets fan-out pattern; C-020 multi-file DEV tests | Re-test N files → N assets → one HC | SC-019 | One HC, many assets | LA-001; C-020b | — | P1 | 2026-07-23 |
| SC-016 | Homework | Exactly one Homework Completion per assignment per enrollment | Installed in PROD | PROD **020 v3.0.0** canonical (`444046e`); identity contracts + fixtures (Agent 11); 020 vs 067 dual-key risk documented; SC-014 Option B (quiz attachment-less) | Live duplicate attempt test; resolve remaining 020 vs 067 identity product rule if still open | SC-066, SC-014 | Competing writers create extras | `docs/next-wave/homework-pipeline/`; C-004 | — | P0 | 2026-07-24 |
| SC-017 | Homework | Unified coach review → satisfactory → XP → parent email | Installed in PROD | 020 / 064–065 / 071 chain historically used | Re-test full chain after wipe; align with Learning Activities later | SC-009–SC-016 | Do not invent second credit path | homework-flow.md; automation-index | — | P0 | 2026-07-23 |
| SC-018 | Homework | Learning Activities table (catalog of activities) | Built in Repository | Agent 11: LA schema MD + JSON schema + fixtures/tests; LA-000 types remain | Mike-authorized Airtable schema; seed catalog; keep FBC Curriculum SYNC unless decided otherwise | SC-020 | No parallel XP model | `docs/next-wave/homework-pipeline/LEARNING-ACTIVITIES-SCHEMA.md` | Approve schema creation in PROD | P1 | 2026-07-24 |
| SC-019 | Homework | Learning Activity Responses table + Response→asset routing | Built in Repository | Agent 11 routing contract + helpers/tests (`countsAsHomework` gate; XP via 064/065 only) | Schema; automations; Fillout/web intake; route to Submission Assets / optional HC | SC-018 | `countsAsHomework` gate | `docs/next-wave/homework-pipeline/LEARNING-ACTIVITY-ROUTING-CONTRACT.md` | — | P1 | 2026-07-24 |
| SC-020 | Homework | Activities that count as homework vs stand-alone | Planned | Contract: HC only if Homework link **and** `countsAsHomework` | Implement flag + automation filters + coach views | SC-018, SC-019 | Stand-alone must not steal HW XP | LA-001 | Confirm product language for methods | P1 | 2026-07-23 |
| SC-021 | Config | Config-over-code audit (no hardcoded season numbers in scripts) | Built in Repository | Hardcode audit + helpers; **year-aware Config resolver** (Agent 10) — four year rows intentional; do **not** collapse; **054 v5.6** + **066 v3.3** now in PROD | Migrate remaining consumers to resolver; finish remaining literals | SC-022 | Changing options breaks scripts | `docs/next-wave/config-selection/`; `docs/overnight/config-xp/CONFIG-HARDCODE-AUDIT.md` | — | P0 | 2026-07-24 |
| SC-022 | Config | XP Reward Rules audit and cleanup | Installed in PROD | 31 active rules, 0 duplicate keys; source-by-source audit; **054 v5.6 Installed in PROD** (duplicate active streak-rule guard) | Resolve Video XP 1-vs-25; decide Zoom Recording / Manual Bonus rule records; supervised streak proof still open | SC-021, SC-023 | Source Key uniqueness | `docs/overnight/config-xp/XP-RULES-AUDIT.md`; `docs/next-wave/config-xp/MIKE-ACTIONS.md` | — | P0 | 2026-07-24 |
| SC-023 | Config | Grade Bands as linked source of truth | Installed in PROD | Active bands K-2…9-12 healthy; **066 v3.3 Installed in PROD** (link-ID band match); normalize helpers + tests | Archive inactive mojibake bands; supervised milestone/OMNI check still open | SC-021 | Renaming bands must not break XP | `docs/overnight/config-xp/GRADE-BAND-AUDIT.md`; `docs/next-wave/config-xp/MIKE-ACTIONS.md` | — | P0 | 2026-07-24 |
| SC-024 | Config | Levels table reliable for progression | Installed in PROD | Levels table + 041/042 historically | Re-seed after wipe if needed; tune thresholds (SC-027) | SC-022 | Thresholds are config, not code | V2-007 | — | P1 | 2026-07-23 |
| SC-025 | Config | Level Gate Rules work and are tunable | Installed in PROD | Gate rules + **042** v3.1 Stage 17 paste | Re-test gate block/clear with Schmidt; early-gate tuning | SC-024, SC-116 | Recording credit must not write Attendees | V2-005; C-014 decision | — | P1 | 2026-07-23 |
| SC-026 | Config | Achievements catalog + unlock rules | Installed in PROD | Achievements + 059/066 paths | Re-seed; re-test unlocks; dedupe keys | SC-066 | Fix audit not data | H-001; H-002 | — | P1 | 2026-07-23 |
| SC-027 | Config | Shot Milestones config + awards | Installed in PROD | Shot Milestones + **066 v3.3 Installed in PROD** (2026-07-24) | Re-test natural run on Schmidt; OMNI confirmation packet (not Live Tested for v3.3 yet) | SC-096 | Week timezone America/Denver | H-002; K-H1; `docs/next-wave/config-xp/MIKE-ACTIONS.md` | — | P0 | 2026-07-24 |
| SC-028 | Config | Perfect Week rules configurable | Installed in PROD | **057** v1.3 Stage 17 | Re-test with Zoom recording + live exclusivity | SC-116 | Combined Zoom credit path | C-025 Stage 17 | — | P1 | 2026-07-23 |
| SC-029 | Config | Streak values in config (not buried in code) | Installed in PROD | Streak XP via **053** + **054 v5.6 Installed in PROD**; amounts from XP Reward Rules (3–60 day ladder); offline streak suite PASS | Mike decide repeat-after-break (SC-081); supervised live 3-day test (not Live Tested for v5.6 yet) | SC-022 | Behavior may remain code | `docs/overnight/config-xp/STREAK-SYSTEM-AUDIT.md`; `docs/next-wave/config-xp/MIKE-ACTIONS.md` | Want behavior change or amounts only? | P2 | 2026-07-24 |
| SC-030 | Config | Zoom percentage / credit settings in config | Installed in PROD | Stage 17 config linkage work; effective fields | Re-verify config rows after wipe; document operator knobs | SC-116 | Never hardcode % in 117 | C-025 config linkage docs | — | P1 | 2026-07-23 |
| SC-031 | Config | Weekly schedule settings (build/send timing) | Built in Repository | C-011 118/119 design; activation checklist | Install schedules carefully; keep OFF until authorized | SC-051 | Accidental mass email risk | C-011 checklists | Authorize schedule enable | P1 | 2026-07-23 |
| SC-032 | Config | Season settings (dates, windows) | Planned | Weeks table historically; C-018 design | Rebuild Weeks for next season; intake vs run calendars | SC-084 | 005 date mapping | C-018; V2-013 | — | P1 | 2026-07-23 |
| SC-033 | Config | Enable/disable switches for major features | Planned | Various checkboxes / Active? patterns | Inventory switches; document operator map | SC-066 | Duplicate toggles confuse ops | V2-014 roadmap | — | P2 | 2026-07-23 |
| SC-034 | Config | Remove remaining hardcoded values from automations | Built in Repository | Partial modernization; **054 v5.6** + **066 v3.3** hardenings now in PROD; hardcode inventory | Finish V2-002 pass across 001–119; paste any remaining pending scripts | SC-021 | Prefer CONFIG block + tables | `docs/overnight/config-xp/CONFIG-HARDCODE-AUDIT.md`; V2-002 | — | P1 | 2026-07-24 |
| SC-035 | Weekly Summary | Guaranteed Weekly Athlete Summary for every enrollment × ended week | Live Tested in PROD | **118 v1.4** created/armed Schmidt WAS; **072 v4.0** `send_short` Check-In delivered; hybrid creators **031**+**118**+**101**; 2026–2027 Weeks exist | Authorize Sunday 118 schedule for season-wide ensure; keep dryRun/includeSchmidt safe defaults | SC-004, SC-082 | Schedules OFF; season-wide Live not yet authorized | `docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md` | **DECIDED `send_short`** | P0 | 2026-07-24 |
| SC-036 | Weekly Summary | Weekly summary calculations correct | Installed in PROD | **072** v3.8 manual path historically proven (final emails) | Re-test calc fields on Schmidt; Presentation columns (SC-054) | SC-054 | Don’t write rollup/formula totals from scripts incorrectly | 072; weekly-summary-flow.md | — | P0 | 2026-07-23 |
| SC-037 | Weekly Summary | Previous-week helpers reliable | Installed in PROD | Week linking patterns in 034 chain / 072 | Re-verify after Weeks rebuild | SC-084 | Denver date keys | 005/034 patterns | — | P1 | 2026-07-23 |
| SC-038 | Weekly Summary | Automatic package build (no Build checkbox) | Live Tested in PROD | **118** arms Build; **072 v4.0** built short empty-week package (`built_short_empty_week`, `packageKind=short_no_activity`) | Keep `allowSchmidtInput=false` post-test; authorize season schedule when ready | SC-035 | 072 does not call Make | `docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md` | — | P0 | 2026-07-24 |
| SC-039 | Weekly Summary | Automatic send (no Send checkbox) | Live Tested in PROD | **119 v1.4** `send_armed` → **074** webhook → Make Bulk Email May 18 → Test Gmail PASS | Authorize Sunday 119 schedule; Live sendMode still gated; optional Make Test writeback parity | SC-038 | **119 does not post webhook**; 074 does; Make owns Live Sent? writeback | `docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md`; C-011 | Authorize Live schedules | P0 | 2026-07-24 |
| SC-040 | Weekly Summary | Duplicate-send protection | Built in Repository | 074 blocks when Sent?; Live Make writeback sets Sent?; eventId `WEEKLY_EMAIL\|{enr}\|{week}` | Live double-send test after schedule auth; note Test branch does not write Sent? today | SC-039 | Make owns final Sent? on Live | WAS architecture; 074 v2.1 | — | P0 | 2026-07-24 |
| SC-041 | Weekly Summary | Retry behavior when Make/email fails | Planned | Partial failure notes in 074 (don’t clear trigger on webhook fail) | Define retry SOP; test failure then recovery | SC-039 | Don’t mark Sent on failure | 074 standard | — | P1 | 2026-07-23 |
| SC-042 | Weekly Summary | Email Message Center (replace many 071–077 scripts) | Deferred | V2-014b queued design | Design session after C-011 stable | SC-039 | Large rewrite — capacity risk | V2-014b | When to start EMC? | P3 | 2026-07-23 |
| SC-043 | Weekly Summary | Parent-facing Presentation fields in weekly email | Planned | C-022 / V2-004 design | Schema Presentation fields; 072 consumes only those | SC-054 | Never `record.name` fallback | C-022; V2-004 | — | P1 | 2026-07-23 |
| SC-044 | Weekly Summary | Major-event notifications (level-up / milestones), not daily XP | Decision Needed | C-027 brainstorm; cell number fields exist | Channel (SMS vs email vs later web push); recipient; opt-in | SC-066 | Idempotent send keys required | C-027 | **Twilio vs Make; parent vs athlete; opt-in** | P2 | 2026-07-23 |
| SC-045 | Weekly Summary | Welcome, homework, video, Zoom, and weekly emails all work | Installed in PROD | Weekly WAS path Test-mode E2E PASS 2026-07-24 (`send_short`); 071–077 + 117f still need individual re-proof | Re-test homework/video/welcome templates; 117f go-live; authorize Live weekly schedules | SC-039, SC-124 | Webhooks not in git | automation-index; WAS architecture | — | P0 | 2026-07-24 |
| SC-046 | Data Integrity | Field ownership matrix (one correct writer per field) | Built in Repository | Agent 9 ownership contract + harness (26 pass / 2 warn); dual writers flagged: 112 vs 013, 117 vs 117c, 031/101/118 WAS, 020 vs 067, Threshold missing, 065 legacy keys | Mike UI attestation; fix conflicts after decisions | SC-055 | Do not remove writers without proof; Schmidt remains visible | `docs/next-wave/automation-ownership/`; `FIELD-WRITER-AUDIT.md` | Decide Count It + HC dual-writer; 117 XOR 117c | P0 | 2026-07-24 |
| SC-047 | Data Integrity | One writer per field enforced | Planned | Principle in standards; gaps known (Active? partial) | Fix multi-writer conflicts found by SC-046 | SC-046 | Competing automations | C-010 gaps list | — | P0 | 2026-07-23 |
| SC-048 | Data Integrity | Formula / lookup / rollup / count review | Planned | Schema snapshots exist but `schema/current` stale | Fresh export; review computed fields; fix broken refs after wipe | SC-052 | Don’t write computed fields from scripts | K-M8; schema snapshots | — | P0 | 2026-07-23 |
| SC-049 | Data Integrity | Duplicate-prevention keys documented and audited | Built in Repository | Full XP source catalog + JSON (`XP-IDEMPOTENCY-AUDIT.md`); Schmidt live Source Keys unique; **Weekly Threshold writer missing in repo (XP-D1)** | Locate/rebuild Threshold XP writer; live HW/video/Zoom key proofs | SC-046 | Reruns must be safe | `docs/overnight/testing-integrity/XP-IDEMPOTENCY-AUDIT.md`; `xp-idempotency-audit.json` | Attest Threshold XP automation in UI | P0 | 2026-07-24 |
| SC-050 | Data Integrity | Safe backfills / repairs (dry-run first) | Built in Repository | `safe-backfills/` + audit extensions 090A–G | Keep dry-run default; only run when needed on empty base | SC-049 | CONFIRM_WRITE discipline | audits README; H-001 principle | — | P1 | 2026-07-23 |
| SC-051 | Data Integrity | Obsolete field cleanup | Planned | Stage J started historically | Hide/delete after ownership matrix; update maps | SC-046 | Breaking Fillout/web risk | C-012 | — | P2 | 2026-07-23 |
| SC-052 | Data Integrity | Duplicate table cleanup | Built in Repository | Online Agent 8 package: dependency inventory, migration map, duplicate/quality tools, runbook; keep **`Tutorials`**, orphan candidate **`Tutorials & Assets`** | Live row audit + Softr proof + migrate/delete orphan in target base | SC-046 | Web uses `Tutorials` only | `docs/online-agents/tutorials-content/`; C-026 | Confirm delete orphan after Softr proof | P2 | 2026-07-23 |
| SC-053 | Data Integrity | Tutorials table merge complete | Planned | Recommendation: keep `Tutorials` (re-validated) | Blocked on SC-052 execution; then Softr/view/publish verification | SC-052 | Publish flag still Softr-named (SC-144) | `docs/online-agents/tutorials-content/MASTER-UPDATE-PROPOSAL.md` | — | P2 | 2026-07-23 |
| SC-054 | Data Integrity | Public Presentation fields (parent-safe labels) | Planned | C-022 design | Add fields; wire emails + web | SC-046 | Emails/web must stop using primary names | C-022; V2-003; V2-004 | — | P1 | 2026-07-23 |
| SC-055 | Data Integrity | Fresh schema export after rebuild waves | Complete | PROD exports `prod-foundation-reset-20260723/` + post-Testing-Scenarios `prod-foundation-reset-20260723-post-ts/` | Optional: refresh hand-maintained `schema/current/` later | — | Historical snapshots preserved | `docs/foundation-reset/PROD-SCHEMA-EXPORT-2026-07-23.md`; snapshot folders | — | P0 | 2026-07-23 |
| SC-056 | Data Integrity | Script input/output variables standardized | Built in Repository | Automation script standard; many scripts updated | Inventory Airtable automation I/O vs GitHub; fix drift | SC-057 | Missing outputs hide failures | AUTOMATION_SCRIPT_STANDARD; K-H2 | — | P1 | 2026-07-23 |
| SC-057 | Data Integrity | Automation trigger review (no duplicate triggers) | Planned | V2-014a classification; retirements approved for 112/043 | UI attest triggers; delete duplicates | SC-058 | Slot limits / double runs | V2-014a; REMAINING packages | — | P1 | 2026-07-23 |
| SC-058 | Data Integrity | Automation version inventory filled from live UI | Built in Repository | Agent 1 baseline + Agent 9 attestation packet: **115 installed+live-tested**; deleted claim **043, 032, 033, 063, 111**; upgraded **013/020/030** (020=**v3.0.0**). Classifications: 111 fully superseded by 013; 063 only partially by 020. | Mike paste complete PROD UI list; complete Agent 9 attestation packet | SC-059 | UI attestation mandatory before Complete | `docs/next-wave/automation-ownership/AUTOMATION-ATTESTATION-PACKET.md`; `CURRENT-PROD-BASELINE.md` | Paste UI list; confirm 112 OFF; 117 XOR 117c | P0 | 2026-07-24 |
| SC-059 | Data Integrity | Retire legacy automations 112 and 043 | Installed in PROD | **043 deleted**. Broader deletes claim **032, 033, 063, 111**. **112 must stay OFF** (OW-D1). **115 installed**. | UI-attest; confirm **112** OFF; do not reinstall 111; orphan blank-GB HCs may need one-time repair (not full 063 restore) | SC-001, SC-058 | Attestation required — not Complete | `docs/next-wave/homework-pipeline/STALE-063-111-PATCH-MANIFEST.md`; baseline | Confirm 112 + attest delete set | P0 | 2026-07-24 |
| SC-060 | Enrollment | Fillout enrollment validation is trustworthy | Built in Repository | Online Agent 7: Fillout contract + offline enrollment validator + fixtures (18 tests OK) | Live Fillout tighten; 001 paste drift check; Athletes hygiene in PROD | SC-081 | Bad identity breaks whole season | `docs/online-agents/enrollment-season/`; C-017 | — | P1 | 2026-07-23 |
| SC-061 | Enrollment | New vs returning athletes handled correctly | Built in Repository | New/returning spec + fixtures/tests mirroring 001 | Live PROD proof on Schmidt + sibling/returning case | SC-060 | Don’t create duplicate Athletes | `docs/online-agents/enrollment-season/` | — | P1 | 2026-07-23 |
| SC-062 | Enrollment | Sibling handling works | Built in Repository | Sibling handling spec + fixtures/tests; no Family table | Live sibling parent-email routing test | SC-045 | Shared parent email edge cases | `docs/online-agents/enrollment-season/` | — | P2 | 2026-07-23 |
| SC-063 | Enrollment | Email validation (parent/athlete) | Built in Repository | Email validation rules in contract + validator FAIL paths | Fillout email rules ON; bounce SOP still open | SC-060 | Bad emails break Make | `docs/online-agents/enrollment-season/` | — | P1 | 2026-07-23 |
| SC-064 | Enrollment | Intake-open dates separate from challenge run dates | Built in Repository | Season date contract + Denver boundary tests | Wire intake-open into Fillout/web gate; Weeks flags if authorized | SC-032 | 005 must stay date-range based | `docs/online-agents/enrollment-season/`; C-018 | — | P1 | 2026-07-23 |
| SC-065 | Enrollment | Challenge dates / Weeks configuration rebuilt | Built in Repository | Weeks seed spec + template + read-only validator | Manually seed real Weeks in PROD with approved dates | SC-032 | Denver timezone; Weeks remain manual | `docs/online-agents/enrollment-season/`; C-018; 005 | — | P0 | 2026-07-23 |
| SC-066 | Enrollment | Early-bird periods supported if desired | Decision Needed | Mentioned in season planning materials | Decide if 2026–27 uses early-bird; config if yes | SC-065 | — | season-configuration-design | Keep early-bird? | P3 | 2026-07-23 |
| SC-067 | Enrollment | Program Instance multi-year design | Deferred | V2-013 decided direction; investigation 2026-07-05 | Dedicated architecture wave later | SC-046 | Config changes must not rewrite history | V2-013 | When to schedule wave? | P3 | 2026-07-23 |
| SC-068 | Enrollment | Inactive / processing controls (`Active?` hardened) | Built in Repository | Partial guards; C-010 packets; Online Agent 7 Active? consumer audit + offline guard contract (**no script edits**) | PPE create/backfill; paste guards; resolve 072/118/119 Schmidt hard-exclude conflict vs “Schmidt visible” web direction | SC-004 | Gaps historically in 010/031/065/053/072/076 | `docs/online-agents/enrollment-season/`; C-010; KNOWN_ISSUES | Confirm PPE field + Schmidt exception | P0 | 2026-07-23 |
| SC-069 | Enrollment | Testing enrollment behavior documented and proven | Live Tested in PROD | Schmidt `recgP9qZYjAhE7NXm` Active?=true; included in Submissions/XP/WAS/levels path; public visibility direction confirmed; 115 allowlist | Email-path live proof still needed; standings web spot-check | SC-004, SC-068 | Do not exclude from public views | `prod-probe-latest.json`; `CURRENT-PROD-BASELINE.md` | — | P0 | 2026-07-24 |
| SC-070 | XP | Daily submission XP awards correctly | Live Tested in PROD | 010 path; live Submission `recuuTBgstSTGg2E3` → XP `recOodD23MQrP1O9F` = 20 (SHOOTING_BASE), exact one event | Rerun pack on additional submissions; keep Schmidt-only | SC-049 | One submission → one XP Event | `docs/overnight/config-xp/XP-RULES-AUDIT.md`; `prod-config-snapshot-2026-07-24.json` | — | P0 | 2026-07-24 |
| SC-071 | XP | Homework XP after satisfactory review | Installed in PROD | HW XP writers historically; C-020 gap = after-review | Live prove after coach satisfactory | SC-017 | — | K-M4 | — | P0 | 2026-07-23 |
| SC-072 | XP | Video XP awards correctly | Installed in PROD | **114** Source Key `VIDEO_SUBMISSION\|` | Re-test after upload writeback | SC-133 | — | 114; C-013 | — | P0 | 2026-07-23 |
| SC-073 | XP | Live Zoom XP awards correctly | Installed in PROD | **101** v5.5 Attendees-only path | Re-test live meeting attendance | SC-116 | Recording path must never write Attendees | 101; C-025 hard rule | — | P0 | 2026-07-23 |
| SC-074 | XP | Zoom recording XP / credit path | Installed in PROD | Stage 17 **117** / **057** / **042** ON historically; conflict PASS 2026-07-20 | Re-seed Zoom fixtures; re-test conflict + exclusivity after wipe | SC-116 | Soft-void recording only | C-025 Stage 17 live docs | — | P0 | 2026-07-23 |
| SC-075 | XP | Streak XP | Installed in PROD | **053** + **054 v5.6 Installed in PROD** (2026-07-24) | Supervised live streak create/break/repeat (v5.6 not Live Tested yet) | SC-029, SC-068 | Active? gaps | 053; 054 v5.6; `docs/next-wave/config-xp/MIKE-ACTIONS.md` | — | P1 | 2026-07-24 |
| SC-076 | XP | Milestone XP (shot milestones) | Installed in PROD | **066 v3.3 Installed in PROD** (2026-07-24) | Live OMNI/natural run on Schmidt (v3.3 not Live Tested yet) | SC-027 | Idempotent Source Keys | H-002; K-H1; `docs/next-wave/config-xp/MIKE-ACTIONS.md` | — | P0 | 2026-07-24 |
| SC-077 | XP | Perfect Week XP | Installed in PROD | **057** v1.3 | Live prove with Zoom rules | SC-028, SC-074 | — | C-025 | — | P1 | 2026-07-23 |
| SC-078 | XP | Level progression updates correctly | Live Tested in PROD | 041/042 chain; Schmidt baseline: Beginner→Rookie, Gate=Level 2, Status=Assigned, XP=61 (matches offline engine) | Live level-up past Rookie still needs controlled XP; paste Config cleanup for 042 flags | SC-024 | — | `docs/overnight/config-xp/LEVEL-AUTOMATION-AUDIT.md`; overnight-level-gate-boundaries.test.js | — | P0 | 2026-07-24 |
| SC-079 | XP | Gate blocking when requirements unmet | Installed in PROD | 042 gate logic | Live prove blocked state messaging | SC-025 | — | V2-005 | — | P0 | 2026-07-23 |
| SC-080 | XP | Gate clearing when requirements met | Installed in PROD | 042 + Zoom credit integration | Live prove clear after HW/Zoom credit | SC-074 | — | C-025 | — | P0 | 2026-07-23 |
| SC-081 | XP | Streak economics review | Decision Needed | Notes that amounts=config, repeat behavior=code | Decide whether to change repeat-after-break rules | SC-029 | — | C-014 notes | Change streak behavior? | P2 | 2026-07-23 |
| SC-082 | XP | Early level-gate tuning for next season | Planned | C-014 decision: one ladder; tune Q1 2027 | Load numbers when season config ready | SC-025 | Numbers in Airtable only | V2-005–007; season-configuration-design | Approve gate spreadsheet | P2 | 2026-07-23 |
| SC-083 | XP | Achievement unlock deduplication | Installed in PROD | H-001 audit fix; 066 prevention | Live re-test unlocks; keep “fix audit not data” | SC-026 | — | H-001; C-006 | — | P1 | 2026-07-23 |
| SC-084 | Zoom | Live attendance capture works | Installed in PROD | Zoom Meetings + Attendees → 101 | Recreate meetings; Schmidt attend test | SC-073 | — | 101 | — | P0 | 2026-07-23 |
| SC-085 | Zoom | Live bonuses (if configured) work | Installed in PROD | XP Reward Rules / meeting bonuses historically | Confirm which bonuses still desired; test | SC-022 | — | XP rules | Confirm bonus set | P2 | 2026-07-23 |
| SC-086 | Zoom | Recording credit path works | Installed in PROD | Stage 17 orchestrator | Re-test after wipe | SC-074 | Never Attendees write | C-025 | — | P0 | 2026-07-23 |
| SC-087 | Zoom | Live-versus-recording exclusivity | Installed in PROD | Conflict detection PASS historically | Re-prove Conflict=1 blocks double credit | SC-086 | Soft-void only | Stage 17 verification | — | P0 | 2026-07-23 |
| SC-088 | Zoom | Recording approval email to parent | Built in Repository | **117f** + Make scenario; controlled tests PASS; webhook often blank | Permanent webhook; go-live checklist; send-key reconciliation if still pending | SC-086 | Make must not write XP | C-025 117f; overnight send-key docs | Authorize live email | P1 | 2026-07-23 |
| SC-089 | Zoom | Total Zoom counts correct | Installed in PROD | Rollups/formulas Stage 17 | Re-verify formulas after schema export | SC-048 | Preconflict rollup formula critical | Stage 17 formula docs | — | P1 | 2026-07-23 |
| SC-090 | Zoom | Level gate integration for Zoom credit | Installed in PROD | 042 v3.1 | Live prove | SC-080 | — | C-025 | — | P0 | 2026-07-23 |
| SC-091 | Zoom | Perfect Week integration for Zoom credit | Installed in PROD | 057 v1.3 | Live prove | SC-077 | — | C-025 | — | P0 | 2026-07-23 |
| SC-092 | Zoom | Weekly summary shows Zoom correctly | Installed in PROD | 072 Zoom sections historically | Re-test Presentation labels | SC-036, SC-054 | — | V2-004 | — | P1 | 2026-07-23 |
| SC-093 | Zoom | Public website Zoom pages accurate | Installed in PROD | `/shoot` Zoom catalog UI live | Confirm Airtable publish filters after wipe | SC-146 | Read-only web | web Zoom views | — | P2 | 2026-07-23 |
| SC-094 | Assets | Video storage on program-owned S3 | Installed in PROD | Lambda upload-asset; 070b/070c PROD E2E historically | Re-test writeback on Schmidt asset | — | Auth secret hygiene | C-013 | Optional secret rotate | P0 | 2026-07-23 |
| SC-095 | Assets | Homework storage on S3 (070a route) | Built in Repository | Lambda `homework_completion` route; DEV package; **PROD intentionally OFF** | Align 070a version (4.1 vs 4.4 claims); PROD enable when ready; live test | SC-094 | Keep OFF until Mike schedules | AUTOMATION_070A_LAUNCH_DECISION; issues #8/#11/#17 | Authorize PROD 070a ON | P0 | 2026-07-23 |
| SC-096 | Assets | Canonical HTTPS URLs on assets | Installed in PROD | Canonical URL fields + Lambda writeback | Re-verify after wipe | SC-094 | Dual-truth Drive/attachment deferred | C-013; C-023 | — | P0 | 2026-07-23 |
| SC-097 | Assets | SHA-256 hashes recorded | Installed in PROD | Hash pipeline + **116** consequences historically ON | Re-test hash write + review queue | SC-094 | Never filename-only dedup | C-023 | — | P1 | 2026-07-23 |
| SC-098 | Assets | Duplicate file reuse decision (manual, safe) | Installed in PROD | Asset Reuse Decision + 116 | Re-test confirm/reversal; never auto-reuse another athlete’s object | SC-097 | Never auto-block upload incorrectly | C-023 Stage 5 | — | P1 | 2026-07-23 |
| SC-099 | Assets | Writeback verification (070c) | Installed in PROD | 070c v1.1 idempotent verify | Re-test Accepted→verify | SC-094 | Async handoff | C-013 | — | P0 | 2026-07-23 |
| SC-100 | Assets | Attachment / Drive retirement strategy | Deferred | Explicitly deferred after C-013 video | Plan retirement after S3 paths stable for HW+video | SC-095 | Don’t break historical links if any remain | C-023 retirement notes | When to retire Drive? | P3 | 2026-07-23 |
| SC-101 | Assets | Make and Lambda routing correct for video + homework | Installed in PROD | Upload engine blueprints; video live historically; homework router checklist open | Finish homework Module 2 checklist; close stale GitHub overnight issues | SC-095 | Never commit webhooks | make/documentation; issues #1/#8/#9 | — | P1 | 2026-07-23 |
| SC-102 | Website | Airtable-backed public pages work | Installed in PROD | Next.js `/shoot` catalogs live on Vercel; overnight empty/error hardening + visitor-safe Airtable errors | Spot-check deploy against rebuilt PROD; seed catalog content | SC-055 | Server-side token only | `docs/overnight/web-integration/CURRENT-WEB-ARCHITECTURE.md`; `WEB-SECURITY-AUDIT.md` | — | P1 | 2026-07-23 |
| SC-103 | Website | Leaderboard | Installed in PROD | Leaderboard view live | Needs Active enrollments to be meaningful | SC-068 | — | leaderboard-view | — | P2 | 2026-07-23 |
| SC-104 | Website | Homework catalog | Installed in PROD | Catalog routes live; design system update 2026-07-23 | Content seed; Presentation fields later | SC-054 | Publish flag | homework catalog | — | P2 | 2026-07-23 |
| SC-105 | Website | Tutorials | Installed in PROD | Tutorials grid/detail live | Complete table merge SC-052 | SC-052 | — | C-026 | — | P2 | 2026-07-23 |
| SC-106 | Website | Levels pages | Installed in PROD | Levels ladder/detail live | Seed Levels; gate copy | SC-024 | — | levels views | — | P2 | 2026-07-23 |
| SC-107 | Website | Achievements pages | Installed in PROD | Achievements grid live | Seed achievements | SC-026 | — | achievements views | — | P2 | 2026-07-23 |
| SC-108 | Website | Zoom public pages | Installed in PROD | Zoom meetings views live | Seed meetings | SC-093 | — | zoom views | — | P2 | 2026-07-23 |
| SC-109 | Website | Game Manual from config | Built in Repository | `/game-manual` renders live **XP Reward Rules** + **Levels** (inactive filtered, grouped, stable sort); Adobe PDF link retained; unit tests for XP rules | Mike review deploy; editorial copy for Perfect Week/Zoom behavior (do not invent); Shot Milestones public surface later; Presentation fields when SC-054 lands | SC-032, SC-082 | Amounts from config only | `docs/overnight/web-integration/GAME-MANUAL-CONFIG-AUDIT.md`; commits `2684074`, `bf842d9` | Approve public wording | P2 | 2026-07-23 |
| SC-110 | Website | Public display page | Installed in PROD | Public display view + loading states | Wire Presentation fields; real season data | SC-054 | — | public-display | — | P2 | 2026-07-23 |
| SC-111 | Website | Athlete profiles (real data, not mocks) | Built in Repository | Demo/partial/missing-link/error states; Schmidt demo slug labelled mock; privacy-safe model; Playwright coverage | Live Airtable adapter after SC-112; published enrollment slug rules | SC-112 | No browser token; no fabricated athletes for unknown slugs | `docs/overnight/web-integration/REPORT.md`; commit `bf842d9` | — | P2 | 2026-07-23 |
| SC-112 | Website | Athlete auth + dashboard | Decision Needed | Decision matrix + safe scaffolding (`hasAthleteSession` always false); mock dashboard/profile remain labelled demo | Mike pick approach; then schema + session implementation | — | Out of scope: web writes for submissions; no fake login UI | `docs/overnight/web-integration/ATHLETE-AUTH-DECISION.md` | **Pick auth approach** (recommend parent magic-link) | P2 | 2026-07-23 |
| SC-113 | Website | Loading, empty, and error states | Installed in PROD | Shared UI states + recent loading routes | Verify against empty PROD | — | — | web components | — | P2 | 2026-07-23 |
| SC-114 | Website | Softr cutover | Decision Needed | Dual-run; overnight decision doc + readiness checklist | Mike fill Softr inventory; soft cutover (links/redirects) when ready; keep Softr alive initially | SC-102–SC-113 | Do not cut over without Mike; **no cutover performed overnight** | `docs/overnight/web-integration/SOFTR-CUTOVER-DECISION.md`; SOFTR-CUTOVER-READINESS | **Approve cutover timing** | P2 | 2026-07-23 |
| SC-115 | Website | noindex removal / search indexing | Decision Needed | Sitewide `noindex` still on; Playwright asserts it; overnight decision doc | Flip robots only after content + soft cutover + Mike written approval | SC-114 | SEO irreversible-ish; **no indexing change overnight** | `docs/overnight/web-integration/INDEXING-SEO-DECISION.md` | Approve indexing | P2 | 2026-07-23 |
| SC-116 | Website | Admin roadmap (gated read-only first) | Built in Repository | `/admin` placeholder + overnight admin roadmap inventory; staff path scaffolding only | Staff auth then read-only aggregates; no writes in first slice | SC-112 | Do not expose diagnostics behind SITE_ACCESS_TOKEN alone | `docs/overnight/web-integration/ADMIN-ROADMAP.md`; `web/docs/admin-roadmap.md` | Choose staff auth | P3 | 2026-07-23 |
| SC-117 | Website | Public Presentation fields consumed by web | Planned | Depends C-022 | Wire queries to Presentation fields only | SC-054 | — | C-022; V2-009 | — | P1 | 2026-07-23 |
| SC-118 | Website | Playwright coverage for public pages | Built in Repository | `tests/public-experience.spec.ts` covers routes, mobile/desktop, nav, a11y basics, noindex, empty/missing, privacy (no emails), Schmidt demo; screenshot specs retained | Authorize `npm install` + run suite in CI; axe-core later | SC-102 | Specs CI-stable without live Airtable | `docs/overnight/web-integration/PLAYWRIGHT-COVERAGE.md`; commits `2ce6599`, `bf842d9` | Authorize npm install | P2 | 2026-07-23 |

### Additional cross-cutting / historical items

| ID | Area | Mike’s Goal | Current Status | What Already Exists | What Is Still Needed | Dependencies | PROD Safety/Dependency Notes | Evidence | Mike Decision | Priority | Last Updated |
|----|------|-------------|----------------|---------------------|----------------------|--------------|------------------------------|----------|---------------|----------|--------------|
| SC-119 | Platform | Engineering constitution + automation standards active | Complete | ENGINEERING_CONSTITUTION; doc 06; SCRIPT+CONFIG | Keep docs aligned with PROD-direct rules (update later) | — | Operating rules in §1 supersede DEV-first where they conflict | V2-014c | — | P1 | 2026-07-23 |
| SC-120 | Platform | Automation modernization roadmap documented | Complete | V2-014 done (doc) | Execute remaining retirements via SC-059 | — | — | V2-014 | — | P2 | 2026-07-23 |
| SC-121 | Platform | Wave 2A classification decisions captured | Complete | Planning complete; Mike decisions recorded | Implementation of merges/rewrites still open | SC-059 | — | V2-014a | — | P2 | 2026-07-23 |
| SC-122 | Platform | Permanent DEV base exists (optional now) | Complete | `appTetnuCZlCZdTCT` ready | Optional use only under new rules | — | Not required for daily work | V2-015 | — | P3 | 2026-07-23 |
| SC-123 | Historical | 2025–26 close-out repairs (Lyle shots, final emails, Koen HW17, Fillout OFF) | Complete | Wave 0 closed | None for empty-base rebuild | — | Historical only | C-001–C-003, C-008 | — | — | 2026-07-23 |
| SC-124 | Historical | 090F achievement audit false-duplicate fix | Complete | H-001 done | Principles still apply going forward | SC-083 | — | H-001; C-006 | — | — | 2026-07-23 |
| SC-125 | Historical | Archive+clone season rollover | Superseded | Cutover doc kept | Use Program Instance (SC-067) instead | SC-067 | — | V2-001 | — | — | 2026-07-23 |
| SC-126 | Historical | Dual-track progression (shooter vs honors) | Not Needed | Analysis docs | Rejected for 2026–27 | — | — | xp-motivation-analysis; master direction | Revisit only after next season if needed | — | 2026-07-23 |
| SC-127 | Awards | Award Recipients scope metadata cleanup | Deferred | Accepted for 2025–26 | Optional if reports need it | — | Low risk | H-003; C-015 | — | P3 | 2026-07-23 |
| SC-128 | Awards | Awards catalog duplicate `thanks_for_playing` bucket | Deferred | Open low | Consolidate Class/bucket | — | — | H-004; C-016 | — | P3 | 2026-07-23 |
| SC-129 | Other | Conquered Goal Date lookup filter | Deferred | Queued low | Only if parent-facing field wrong | — | — | H-006 | — | P3 | 2026-07-23 |
| SC-130 | Media | 2025–26 newspaper/radio kits sent | Complete | Manual packets sent 2026-07-05 | Platform automation is separate (SC-131) | — | — | V2-028 manual | — | — | 2026-07-23 |
| SC-131 | Media | Generate Media Kits as platform feature | Deferred | Roadmap Phases B–D | Config tables + generator + UI later | SC-094, SC-054 | — | V2-028 platform; media ROADMAP | When to build platform kits? | P3 | 2026-07-23 |
| SC-132 | Media | Facebook kits | Deferred | Optional | Not started | SC-131 | — | media ROADMAP | Want Facebook kits? | P3 | 2026-07-23 |
| SC-133 | Platform | Pre-season parent comms from rules | Planned | Depends game manual | Write/send after SC-109 | SC-109 | — | V2-010 | — | P2 | 2026-07-23 |
| SC-134 | Platform | Full pre-season audit pack green | Planned | Stages A–J tooling exist | Extend audits; run on rebuilt PROD | SC-046–SC-058 | Dry-run first | V2-011 | — | P1 | 2026-07-23 |
| SC-135 | Platform | Dry-run full season on Schmidt before public intake | Planned | Depends testing + pipelines | Execute after phases 1–13 | SC-005 | Controlled emails only | V2-012 | — | P0 | 2026-07-23 |
| SC-136 | Zoom | Stage 16 Homework Completions Zoom design | Superseded | Old 117a/117b S16 scripts moved to `_superseded/` | Do not install S16 | SC-074 | Inventory/KNOWN_ISSUES may still mention S16 (stale) | C025_ARCHITECTURE_RECONCILIATION; `_superseded/` | — | — | 2026-07-23 |
| SC-137 | Testing | “Never install 115 in PROD” old rule | Superseded | Old DEV-only rule under DEV-first model | Replaced by SC-001 decision under empty PROD rules | SC-001 | If 115 enters PROD, isolate carefully | C-020 old guidance | Decide via SC-001 | — | 2026-07-23 |
| SC-138 | Platform | Close stale overnight GitHub issues/PRs for 070a | Planned | Issues #1/#8/#9/#11/#17; PRs still open despite claimed PASS | Close or update with current truth | SC-095 | — | gh issues/PRs | — | P2 | 2026-07-23 |
| SC-139 | Platform | Refresh stale status docs (KNOWN_ISSUES, inventory, E2E Zoom rows, brief) | Planned | Conflicts catalogued in §8 | Edit docs after each SC completes | — | Stale docs cause wrong installs | K-M1 etc. | — | P1 | 2026-07-23 |
| SC-140 | Config | One ladder decision (no dual-track) | Complete | C-014 resolved | Tuning only via SC-082 | — | — | C-014 | — | — | 2026-07-23 |
| SC-141 | Assets | C-013-SEC DEV secret rotation | Complete | Done 2026-07-09 | Optional PROD rotate remains hygiene | SC-094 | — | C-013-SEC | — | — | 2026-07-23 |
| SC-142 | Historical | Monitoring-only close-out leftovers (C-004/C-005/C-007) | Not Needed | Season closed; data wiped | Drop unless Mike wants award history research | — | — | close-out-considerations | — | — | 2026-07-23 |
| SC-143 | Platform | Educational Athletics multi-challenge platform (Dribble, etc.) | Deferred | Long-term vision | Separate repos/bases recommended | — | Out of this repo | master direction § long-term | — | P3 | 2026-07-23 |
| SC-144 | Website | Rename Softr-named publish flag | Planned | Flag still Softr-named in schema | Rename in schema wave; update web queries | SC-054 | Breaking rename | K-M7 | — | P2 | 2026-07-23 |
| SC-145 | Platform | Repo health / security audit follow-ups | Planned | Audits dated 2026-07-21 on master | Triage findings into SC items as needed | — | Secrets discipline | REPOSITORY-HEALTH / SECURITY audits | — | P2 | 2026-07-23 |
| SC-146 | Enrollment | Re-open Fillout daily intake when season ready | Deferred | Form OFF since C-008 | Turn on only after SC-135 dry-run | SC-060, SC-135 | — | C-008 | When to reopen intake? | P2 | 2026-07-23 |

---

## 5. Required Work Areas

### Testing

Primary SC items: **SC-001 … SC-008**, **SC-069**, **SC-135**, **SC-137**.

Must achieve: Schmidt enrollment, Testing views, scenario runner, E2E matrix, duplicate/rerun packs, and failure-path tests for email/Make/upload.

### Homework and Learning Activities

Primary SC items: **SC-009 … SC-020**.

Must achieve: photo/PDF/video/written/quiz paths, multi-file, one HC per assignment, unified review/XP/email, then Learning Activities tables and routing without a second XP pipeline.

### Configuration and XP

Primary SC items: **SC-021 … SC-034**, **SC-140**.

Must achieve: config-over-code, XP Reward Rules, Grade Bands links, Levels/Gates/Achievements/Milestones/Perfect Week/streaks/Zoom %/season switches.

### Weekly Summary and Communications

Primary SC items: **SC-035 … SC-045**, **SC-042**.

Must achieve: guaranteed WAS per enrollment/week, auto build/send, dedupe/retry, Presentation fields, major-event decision, and all email types.

### Data Integrity and Schema

Primary SC items: **SC-046 … SC-059**, **SC-055**.

Must achieve: ownership matrix, one writer, computed-field review, keys, safe backfills, cleanup, schema export, I/O + trigger + version inventory.

### Enrollment and Season Structure

Primary SC items: **SC-060 … SC-069**, **SC-146**.

Must achieve: Fillout validation, new/returning/siblings, calendars, Weeks, testing enrollment behavior, Active? rules. Program Instance remains deferred.

### XP, Levels, and Achievements

Primary SC items: **SC-070 … SC-083**.

Must achieve: every XP source, progression, gates, streak review decision, early-gate tuning, unlock dedupe.

### Zoom

Primary SC items: **SC-084 … SC-093**, **SC-136**.

Must achieve: live + recording exclusivity, approval email, totals, gate/Perfect Week/WAS/web integration. Stage 16 design is superseded.

### Assets and Storage

Primary SC items: **SC-094 … SC-101**, **SC-141**.

Must achieve: video + homework S3, canonical URLs, hashes, reuse decisions, writeback, Make/Lambda routing. Drive retirement deferred.

### Website and Public Experience

Primary SC items: **SC-102 … SC-118**, **SC-144**.

Must achieve: catalogs, game manual from config, real profiles/auth decision, Softr/noindex decisions, admin roadmap, Presentation wiring, Playwright growth.

---

## 6. Recommended Build Order

Optimized for **speed in the emptied PROD base**. Stop criteria are listed per phase.

| Phase | Focus | Exit criteria before moving on |
|------:|-------|--------------------------------|
| **1** | Schema and field ownership | Fresh schema export started; ownership matrix draft for core tables; no known dual writers on XP/email fields |
| **2** | Config and XP Reward Rules | Grade Bands + XP Reward Rules readable; critical hardcodes inventoried |
| **3** | Testing framework | Schmidt enrollment + Testing views + scenario approach decided (incl. 115-in-PROD decision) |
| **4** | Enrollment and Weeks | Athlete/Enrollment/Weeks seeded for test season; intake rules documented |
| **5** | Daily submissions and XP | Schmidt daily submission → XP Event idempotent |
| **6** | Homework and Learning Activities | File + written HC path live-tested; quiz decision made; LA schema only after HC stable |
| **7** | Video and storage | Video upload writeback re-proven; 070a enable decision executed or explicitly deferred |
| **8** | Streaks, milestones, achievements, Perfect Week | 053/066/059/057 live-tested on Schmidt |
| **9** | Levels and gates | Block + clear proven; Zoom credit participates correctly |
| **10** | Zoom | Live + recording exclusivity + approval email path decided/tested |
| **11** | Weekly summaries | Guaranteed WAS create + calc proven |
| **12** | Emails and communication center | Auto send Test-mode proven; Live send authorized for Schmidt only; EMC still deferred |
| **13** | Website integrations | Empty/error states OK; catalogs read live config; Presentation wiring as available |
| **14** | Full live end-to-end test | SC-005 matrix mostly green on Schmidt |
| **15** | Cleanup and final sign-off | Obsolete fields/tables, inventory filled, stale docs refreshed, intake reopen decision |

---

## 7. Mike Decisions

Only decisions that need Mike (not pure engineering choices):

| ID | Decision needed | Why it matters |
|----|-----------------|----------------|
| SC-044 | Major-event alerts: SMS vs email; parent vs athlete; opt-in rules? | Product/comms policy |
| SC-066 | Keep early-bird period for next season? | Calendar/config work |
| ~~SC-068~~ | ~~Schmidt Active? vs standings~~ | **Resolved in Foundation Reset:** Active?=true for processing; exclude standings via view filter (no new field) |
| SC-081 | Change streak repeat-after-break behavior, or only tune amounts? | Code vs config |
| SC-095 | When to turn **070a** homework S3 upload ON in PROD? | Currently intentionally OFF |
| SC-112 | Athlete auth approach for real dashboard/profiles? | Unlocks web Phase 3 |
| SC-114 / SC-115 | Softr cutover timing + public indexing (noindex removal)? | Public traffic / SEO |
| SC-067 | When to schedule Program Instance multi-year wave? | Large architecture |
| SC-002 / SC-006 | Build Scenario Library + auto Expected-vs-Actual now or later? | Testing investment level |

**Resolved this pack**

| ID | Decision | Outcome |
|----|----------|---------|
| SC-001 | Testing Scenarios / 115 in PROD? | **Allowed and Live Tested** — dry + live + rerun PASS; orchestration only |
| SC-004 | Schmidt Active? | **Active?=true**; **keep Schmidt visible** on public standings (do not add exclusion filter) |
| SC-014 | Quiz path A (PDF) vs B (attachment-less)? | **Option B** — attachment-less; no Quiz Result PDF field; no fake attachment; use existing 067 path |
| SC-035 | Empty-week parent email policy? | **`send_short`** — short no-activity reminder; do not suppress; do not send full normal weekly summary |

---

## 8. Superseded and Duplicate Items

Map older IDs into SC items so they are not tracked as separate unfinished work.

| Older ID(s) | Maps to | Notes |
|-------------|---------|-------|
| C-020, C-020a, C-020b, K-M4 | SC-001, SC-006, SC-007 | ETF / scenarios |
| C-019 | SC-003, SC-004, SC-069 | Schmidt + Testing views |
| H-005, C-011, K-M2 | SC-035–SC-041, SC-045 | Automatic weekly email |
| C-009, V2-003 (partial) | SC-013, SC-014, SC-017 | Quiz / HW email presentation overlap with SC-054 |
| LA-000, LA-001, LA-002 | SC-018–SC-020 | Learning Activities |
| V2-002, C-021 | SC-021–SC-023, SC-034 | Config-over-code / grade bands |
| V2-005, V2-006, V2-007, C-014 | SC-024–SC-025, SC-082, SC-140 | Season number tuning |
| C-012, C-024, C-026 | SC-046–SC-053, SC-049 | Schema ownership / keys / tutorials |
| C-022, V2-003, V2-004 | SC-043, SC-054, SC-117 | Presentation fields |
| C-010 | SC-068, SC-069 | Active? hardening |
| C-017, C-018 | SC-060–SC-065 | Intake + calendars |
| C-013, C-013-SEC, C-070a informal, K-M3 | SC-094–SC-101, SC-141 | Storage |
| C-023 | SC-097, SC-098, SC-100 | Hash dedupe / retirement |
| C-025 Stage 17 | SC-074, SC-084–SC-091 | Recording credit |
| C-025 117f / webhook deferred | SC-088 | Approval email |
| S16 117a/117b, K-M1 (stale), old E2E J4–J6 | SC-136 → SC-074 | Superseded design |
| V2-014b | SC-042 | Email Message Center |
| C-027 | SC-044 | Major-event notifications |
| V2-008, V2-009, V2-010 | SC-109, SC-102+, SC-133 | Manual / hub / preseason comms |
| V2-011, V2-012 | SC-134, SC-135 | Audit pack + dry-run |
| V2-001 | SC-125 → SC-067 | Archive/clone superseded by Program Instance |
| V2-013 | SC-067 | Multi-year |
| V2-015 | SC-122 | DEV base (optional now) |
| H-001, C-006 | SC-124, SC-083 | Achievement dedupe |
| H-002, K-H1 | SC-027, SC-076 | 066 milestones |
| H-003/H-004/H-006, C-015/C-016 | SC-127–SC-129 | Low deferred |
| V2-028 | SC-130–SC-132 | Media kits |
| C-001–C-003, C-008 | SC-123 | Wave 0 historical complete |
| C-004/C-005/C-007 | SC-142 | Not needed after wipe |
| Softr cutover / K-H4 / K-L4 / K-M5–M7 | SC-111–SC-116, SC-144 | Web cutover cluster |

**Document conflicts to treat as stale (do not re-open as separate work):**

| Topic | Newer truth | Stale sources |
|-------|-------------|---------------|
| Zoom recording | Stage 17 orchestrator **117** (SC-074) | KNOWN_ISSUES K-M1; inventory 117a/117b S16; E2E matrix Zoom rows; brief “queued”; reconciliation body recommending S16 |
| C-013 video | PROD E2E done historically (SC-094) | Brief Wave 7 queued; some close-out “open” rows |
| H-002 / 066 | **066 v3.3 Installed in PROD** 2026-07-24 (SC-027/076); live proof still open | Stale “paste pending” briefs |
| C-011 | Repo ready (SC-035+) | Backlog plain “queued” without repo-ready nuance |
| C-023 / 116 | Largely installed historically (SC-097) | Some backlog “prod paste pending” lines |
| DEV-first forever | **Superseded by §1 operating rules** | ENGINEERING_CONSTITUTION / doc 04 DEV-first language until those docs are revised |
| Testing Scenarios PROD ban | **Under review via SC-001** | C-020 “never paste 115 to PROD” |

---

## 9. Work Packages

### 9A. Foundation Reset Pack (empty PROD) — **EXECUTED 2026-07-23** (docs/schema/Schmidt)

Still open from that pack: **115 paste**, remaining **Testing views**, leaderboard Schmidt exclusion view filter.

### 9B. DEV↔PROD Automation Reconciliation — **SUPERSEDED IN PART by overnight Agent 1 baseline (2026-07-23)**

**Prior deliverables (still useful history):** `docs/foundation-reset/DEV-PROD-AUTOMATION-RECONCILIATION-2026-07-23.md` + `.json`

**Overnight Agent 1 live baseline (controlling for current PROD facts):** `docs/overnight/testing-integrity/CURRENT-PROD-BASELINE.md`

| Prior recon claim | Overnight Agent 1 claim |
|-------------------|-------------------------|
| PROD 50/50; no 115 | **115 installed**; ~4 free slots |
| Delete 112 first to free 115 | 115 already live-tested (dry+live PASS) |
| Do not delete 032/033/063/111 for capacity | Baseline claims **032, 033, 063, 111 deleted** (plus **043**) |
| 013/020/030 upgrade open | Baseline claims **013, 020, 030** replaced with newer versions |

**Required Mike action:** UI-attest the Agent 1 delete/upgrade set before treating SC-058/SC-059 as Complete. Earlier “do not delete 032/033/063/111” guidance and the overnight baseline **conflict** — do not ignore.

**Next package:** `docs/next-wave/final-reconciliation/MIKE-ACTIONS-NEXT.md` — Automation Attestation + Config year-aware adoption + authorize Live Sunday 118/119 schedules (Test E2E already PASS).

### 9C. Overnight multi-agent run — **RECONCILED 2026-07-23** (Agent 6)

**Deliverables:** `docs/overnight/FINAL-OVERNIGHT-RECONCILIATION.md`, `docs/overnight/MIKE-ACTIONS-TOMORROW.md`, `docs/overnight/web-integration/*`

Confirmed direction preserved: PROD active; Schmidt visible; Weeks manual; website reads live config; athlete auth / Softr / noindex remain Mike decisions.

### 9D. Next-wave Agents 9–12 + Agent 13 final reconciliation — **2026-07-24**

**Deliverables:** `docs/next-wave/final-reconciliation/` · packages under `docs/next-wave/{automation-ownership,config-selection,homework-pipeline,was-email}/`

Key corrections applied: Config year registry (no collapse); 063/111 supersession classifications; 020 v3.0.0 canonical; weekly email `118→072→119→074→Make` verified; formula-only XP Dedupe Keys; WAS hybrid creators; dual-writer inventory.

---

## Maintenance

When finishing an SC item:

1. Update **Current Status**, **What Is Still Needed**, **Last Updated**, and dashboard counts.  
2. Add evidence links (deploy checklist, record IDs, commit SHA).  
3. Mark Complete only when repo + PROD install + live PROD test are all true (where applicable).  
4. Prefer editing this file over reopening parallel status in the old backlog.

---

*End of Shooting Challenge Completion Master*
