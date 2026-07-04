# Close-out considerations watchlist

**Purpose:** Running list of things noticed during ops / review that need a decision, follow-up, or monitoring. Not a substitute for [PROJECT_STATE.md](./PROJECT_STATE.md) (live snapshot) or [CHANGELOG.md](../CHANGELOG.md) (what shipped).

**How to use**

- Add a row when something comes up in review, parent email, or audit — even if we defer action.
- Update **Status** and **Last updated** as things move.
- Move resolved items to **Resolved** (keep for context) or delete after close-out if no longer useful.
- AI sessions: read this file when working on close-out, Kimm family, or final audits.

**Status key:** `open` · `monitoring` · `blocked` · `resolved` · `wont-fix`

Last updated: **2026-07-04** (C-018 intake vs challenge dates; C-019/C-020 no test flags, full pipeline parity)

---

## Using `Active?` on Enrollments (test / sandbox)

**Intent:** Uncheck **`Active?`** on an Enrollment so that athlete is **out of production** — leaderboards, close-out audits, final emails, rankings — while you test behind the scenes.

### What is excluded today when `Active?` is unchecked

| Surface | Behavior |
|---------|----------|
| **Web leaderboard** (`/shoot/leaderboard`, public display) | **Excluded** — view `Web - Leaderboard` / filter `AND({Active?}, …)` |
| **Final audits 090A–090G** | **Excluded** — scoped to Active? enrollments only |
| **Final summary email build (090G repair)** | **Excluded** |
| **New Fillout daily submissions (023)** | **Won't auto-link** — only matches enrollments where `Active?` is checked; clears bad links if no active match |
| **Daily streak refresh (056)** | **Skipped** for inactive enrollments |
| **Shot milestone unlocks (066)** | **Skipped** |
| **Zoom meeting XP (101)** | **Skipped** for inactive attendee enrollments |

### Gaps — inactive is **not** a full air gap yet

If a Submission / Homework Completion / XP row is **already linked** to an inactive enrollment (manual link, or enrollment deactivated after data was created), these can still run:

| Automation | Risk |
|------------|------|
| **010** submission XP | Still awards XP if submission is counted and linked |
| **031** weekly summary | Can still find/create Weekly Athlete Summary |
| **065** homework XP | Still awards if coach marks satisfactory |
| **053** streak occurrences | Still rebuilds from counted submissions |
| **072 / 076** parent emails | No enrollment `Active?` gate today |

**Practical rule for safe testing:** Use a **dedicated Schmidt test Athlete** (**C-019**) with one Enrollment where **`Active?` is unchecked** — hidden from leaderboard and audits, but pipeline runs **identically** to production (no test flags on rows). Test Intake (**C-020**) pre-links that Enrollment. See [testing-and-intake-architecture.md](./testing-and-intake-architecture.md).

**Post–July 1:** See **C-010** — harden `Active?` as a global gate in XP, weekly summary, homework, streak, and email automations.

---

## Active

| ID | Added | Area | Summary | Detail | Next step | Status |
|----|-------|------|---------|--------|-----------|--------|
| C-001 | 2026-06-29 | Submissions / Lyle Kimm | Parent dispute ~300 missing shots | Enrollment `rec83ku1pTHmPNwRo`. **Close-out decision:** benefit of the doubt — **not duplicates**; restore **Count It** on `rec8dui4l30DYGUgx` (5/7, 140) and `recBI4Np85t5X9Z8u` (5/19, 200). Repair: `repair-kimm-lyle-restore-excluded-submissions.js` → then `backfill-submission-xp-events.js` or 010; re-run **090A** + **090E**. | Run repair script (CONFIRM_WRITE), XP backfill, then close-out audits | open |
| C-002 | 2026-06-29 | Close-out | Final audit + email sequence | **Audits done:** Scripts 1–6 run in Airtable (2026-07-02). Awards/cart **PASS**. 090F duplicate unlocks accepted for close-out. 090G: 92 sent, 293 never built, 48 built-not-sent — **do not retro-send weeklies**. **Remaining:** `repair-final-090g-build-final-challenge-summary-email.js` dry-run → test 1 via **074** → ~91 family emails. | Build + send final summary | open |
| C-003 | 2026-06-29 | Homework / Koen Kimm | Week 10 Final Reflection not coach-reviewed | `recKmhET7B097SKli` — quiz may show `Completion Status = Satisfactory` from auto-pass, but **Satisfactory?** and **Review Complete** not set. Enrollment `recZZ4Op05Hg0FpQq`. Symptom of C-009 attachment-less quiz path. | Coach review before close-out email if we want it in summary; fix properly in C-009 | open |
| C-004 | 2026-06-29 | Homework / Koen Kimm | Week 7 Thank You Note — multiple completion rows | **3** Homework Completion records for same assignment key (re-submits 6/9, 6/10, 6/11). All marked satisfactory + XP awarded. Not 4 in current data. IDs: `recbICOMuZiPx5QBh`, `recIP78dmNeFIVEP7`, `recvkicBA6buq9wAM`. | Decide if duplicate rows stay for history or get archived after close; no action required for XP if 090B passes | monitoring |
| C-005 | 2026-06-29 | Homework / Liam Kimm | Youngest brother — minimal homework | Enrollment `recIh9oF3NYfMzkoS`. Only Week 1 Shot Tracker marked satisfactory (`rec7g5MjorrrRmqMc`). | None unless parent asks; include accurately in any summary | monitoring |
| C-006 | 2026-06-29 | Achievements | 090F duplicate unlock groups | **9 groups** (2026-07-02 Airtable run): Shot Milestone `reclgScxpCba3m1Mo`, ~6 enrollments, ~15 extra rows. XP parity clean — **not blocking** cart/emails. Dedupe manually; see [post-close-hygiene-2025-26.md](./post-close-hygiene-2025-26.md) **H-001** (full unlock ID table). `repair-final-090f-unlock-week-from-source.js` is for **empty Week**, not duplicates. | After season: dedupe per H-001; fix **066** Week write (**H-002**) before next season | open |
| C-007 | 2026-06-29 | Data integrity | 090E false duplicate XP fix applied | 15 homework XP events had `Duplicate Status = Duplicate - Remove` with `Active?` true → rollup under-count. Repaired via `repair-final-090e-xp-rollup-duplicate-status.js`. 090E then **91/91 PASS**. | Re-run 090E after any late submissions or Lyle shot restore | monitoring |
| C-008 | 2026-06-29 | Intake | Fillout daily submission form | User plan: turn **OFF** at midnight America/Denver to close contest. | Confirm off; allow automations to drain before final audits | open |
| C-009 | 2026-06-29 | Homework / Fillout quiz | **Redo Fillout HW17 quiz intake end-to-end** | Rushed last-second design. `Final Reflection Quiz Submissions` → **067** creates a `Homework Completion` **without** `Submission Asset`, **without** `Airtable Attachment`, **without** Make/Drive upload. Rest of homework stack assumes file-based turn-in: `Upload Ready?` (= Attachment + Enrollment + Asset Type), coach views filtered on attachment not empty, **020** link/create from assets, **070** Make upload, **071** parent email reads Submission Assets, etc. Quiz rows break or skip those steps; coach review / satisfactory / XP / email path is inconsistent (see C-003). **Likely fix direction:** Fillout exports/submits a **PDF** (quiz results or certificate) so intake rejoins the normal daily-submission → asset → attachment → Make pipeline and one Homework Completion model works for all HW types. **Alternate:** keep quiz table for scoring only but redesign Homework Completions + automations + views for attachment-less `Source System = Fillout` rows (bigger schema/automation pass). Docs today: [homework-flow.md](./data-flow/homework-flow.md) § HW17; scripts **067**, `audit-homework17-reflection-quiz-pipeline.js`, `backfill-homework17-completions-from-reflection-quiz.js`. | **Start after 2026-07-01** — (1) decide PDF-via-Fillout vs dual-path schema; (2) rework table fields, views, filters, automations 067/020/064/065/071; (3) audit + backfill existing quiz completions; (4) update homework-flow doc | open |
| C-010 | 2026-06-29 | Enrollments / `Active?` | **Harden inactive enrollment sandbox** | User wants `Active?` unchecked = fully out of production (leaderboards, audits, XP, emails). **Already works** for web leaderboard, 090 audits, 090G, **023** auto-link, **056**, **066**, **101**. **Gaps:** **010**, **031**, **065**, **053**, **072**, **076** do not skip inactive enrollments if rows are already linked. See section **Using Active? on Enrollments** above. | After July 1: add early `Enrollment.Active?` guard (skip, no error) to intake/XP/email automations; extension audit for inactive enrollment leakage; document test-athlete pattern | open |
| C-011 | 2026-06-29 | Weekly email / WAS | **Fully automatic weekly parent email (no manual steps)** | User wants Weekly Athlete Summary emails every week in a fixed format with **no manual checkboxes**. **Today:** (1) WAS rows created ad hoc via **031** when submissions happen — not guaranteed one per active enrollment per week; (2) **072** builds HTML only when staff checks **`Build Weekly Email Now?`**; (3) **072 deliberately leaves `Send to Make?` unchecked** for review (see CHANGELOG); (4) **074** sends only when staff checks **`Send to Make?`**; (5) `docs/data-flow/weekly-summary-flow.md` describes a scheduled build but **no scheduled automation exists in repo**. Close-out **090G** audit simulates 072/074 triggers; final one-time email is separate (`repair-final-090g`). | **Start after 2026-07-01:** define schedule (e.g. Monday AM Denver, prior week ended); batch extension or scheduled automation: for each Active? enrollment + ended week → ensure WAS → run 072 package build → auto-handoff to 074/Make (or merge 072+074 with idempotency); skip if `Weekly Email Sent?`; optional test mode; lock HTML template in 072; update weekly-summary-flow + weekly checklist | open |
| C-012 | 2026-06-29 | Schema / all tables | **Post-close field ownership & lineage pass (“Stage K”)** | After challenge: go **table by table** and prove every field is (a) needed, (b) filled by the **correct** writer — automation script, Make writeback, Fillout intake, or formula/rollup — and (c) delete or archive unused / low-value fields. **Already started** as **Stage J** in repo: `audit-field-coverage-report.js` (fill rates on canonical fields), `audit-legacy-cleanup-candidates.js` (LEGACY/ZZZ names), `docs/airtable/stage-j-legacy-cleanup.md` (hide → delete runbook). **Not done yet:** full per-table **field ownership matrix** (field → sole writer automation #), cross-check that no two automations fight over same field, verify formulas only depend on live fields, export fresh schema after deletes, update `field-map.md` + automation-index. User goal: confidence that “everything always gets written correctly” without mystery blanks. | **Start after 2026-07-01:** fresh schema export → table-by-table checklist → extend audits or add `audit-field-ownership-matrix.js` → Phase 3–5 from stage-j doc → update `airtable/schema/current/` | open |
| C-013 | 2026-06-29 | Storage / assets | **AWS S3 canonical assets (no Airtable file storage; retire Google Drive)** | User over Airtable attachment limit; deletes early-week assets to free space → **breaks audits/history**. **Today = triple storage:** (1) Fillout → `Submissions.HW Sub 1/2`, `Video Upload` attachments; (2) **009** **copies** each file → `Submission Assets.Airtable Attachment`; (3) after Make upload, Drive URLs exist **but attachments often remain**. Homework Completions also has `Airtable Attachment` + `Upload Ready?` formula requires it. Enrollment **`Athlete Headshot`** attachment feeds web leaderboard. Many gates (`Ready to Send to Make?`, **020**, **070a**, **013**) require `Airtable Attachment` not empty. **Personal Google Drive will not remain available** after retirement — Drive is not a viable long-term canonical store. **Target:** Program-owned **AWS S3** (+ CloudFront for public headshots); **one canonical HTTPS URL per asset** used by *every* consumer (automations, Make, web, emails, coach views, audits) — URL is the asset; Airtable holds metadata + URL only; clear attachment fields after `Upload Status = Uploaded`. Full architecture: [asset-storage-migration.md](./asset-storage-migration.md). Relates to **C-009**, **C-012**. | **Start after 2026-07-01:** see [asset-storage-migration.md](./asset-storage-migration.md) implementation phases — S3 buckets, Make engine rewrite, field rename (`Canonical File URL`), automation/formula/web pass, attachment clear | open |
| C-014 | 2026-06-29 | XP / levels / streaks | **Post-season game design review (no changes until challenge ends)** | **First year of levels + XP.** Many kids still on last-year “shots only” mental model; **gates/levels not live first two weeks** — mid-stream transition likely hurt adoption. **2025–26 snapshot (91 active):** shooting ~64% of XP; median HW **0**; 16 gate-blocked at 1,000+ XP; participation cliff at Deadeye. **Streak economics:** 053 awards 3/5/7/… on **each new block after a break** — e.g. **3×7-day streaks (135 XP) beat 1×20-day (125 XP)**; needs explicit review so continuity is not under-incentivized vs stop-start. Full write-up: [xp-motivation-analysis-2025-26.md](./xp-motivation-analysis-2025-26.md). | **DECIDED 2026-07-03:** **One ladder** for 2026–27 (XP + gates in **Level Gate Rules**). **Spread gates early** (e.g. 1 HW past level 1). **No dual-track.** Better comms + platform before May 2027. Revisit dual-track **only if** friction remains after 2026–27. Tune numbers in config tables Q1 2027 — see [shooting-challenge-v2-master-direction.md](./shooting-challenge-v2-master-direction.md). | resolved |
| C-015 | 2026-07-02 | Award Recipients | Scope field vs catalog (49 rows) | `recipient_scope_vs_catalog_scope`: catalog **Overall/Both**, recipient row **Weekly** on historical **Sent** rows. Close-out audit **passed** (`needConqueredRow: 0`). | **Do not bulk-fix** for 2025–26. Optional row-by-row post-season. See **H-003** | monitoring |
| C-016 | 2026-07-02 | Awards catalog | Duplicate `thanks_for_playing` class bucket | Three awards share bucket: Participation Award, Thanks for Playing, Zoom Attendance/Participation. | Post-season catalog cleanup. See **H-004** | open |
| C-017 | 2026-07-03 | Fillout / Athletes intake | **Validate Fillout → Athletes path; clean Athlete fields** | Enrollment intake via Fillout → **001** find/create Athlete. Need stronger **Fillout validation rules** (email, names, required fields) and Athletes/Enrollments **field hygiene** (Stage K subset). Document test matrix for new vs returning athletes. Minimum bar: trust Athlete identity before downstream pipeline. | Audit Fillout forms + field map; tighten Fillout validation; extend **001** guards; Athletes field cleanup. See [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) § C-017 | open |
| C-018 | 2026-07-03 | Weeks / calendar | **Intake open vs challenge run (date-driven Weeks)** | **Two calendars in config:** (1) **Intake open** — e.g. early bird partial week; setting start date = day app/Fillout accepts input; (2) **Challenge run** — official Week 1+ from challenge start date. All date ranges in **Weeks** table; **005** maps by range only. Optional per-row flags (`Intake Open?`, XP/leaderboard counts). | Design Weeks schema; 2026–27 rows in clone; Fillout/web open gate on intake-open date. See [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) § C-018 | open |
| C-019 | 2026-07-03 | Testing / sandbox | **Schmidt test enrollment (visibility only)** | Dedicated Schmidt Athlete + Enrollment; **`Active?` = false** for leaderboard/audits/emails only. **No test flags** — base runs pipeline **identically** to production. Testing views filter by Schmidt Enrollment link. | Document test enrollment on 2026–27 clone; add **Testing** views per pipeline table. See [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) § C-019 | open |
| C-020 | 2026-07-03 | Testing / intake | **Test Intake harness (production-identical)** | **Test Intake** table + extension: fill scenario (incl. **multiple video attachments**), check **`Run Test?`** → creates Submission with Enrollment pre-linked → **unchecks trigger**. No test metadata on pipeline rows. Verify e.g. 3 files → 3 S3 URLs → 3 Video Feedback rows. | Design table + extension script; Testing views on all submission tables. See [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) § C-020 | open |
| C-021 | 2026-07-04 | Grade Bands / config | **Grade bands propagate from Configuration** | Grade Bands table is source of truth, but **072 hardcodes** band name strings (`K2`, `34`, …); **010** ignores grade-band link on XP Reward Rules. Renaming/restructuring bands can break XP display and rule matching. | Audit scripts; match XP rules by **Grade Band link** not strings; web reads linked labels. See [platform-config-improvements.md](./platform-config-improvements.md) § C-021 | open |
| C-022 | 2026-07-04 | Presentation / emails | **Public display fields — no primary-field fallback** | Homework emails (071) use Week + assignment name but fall back to **primary/formula** (`Assignment Full Name`) — too much detail for parents. Need explicit **Presentation** fields (`Assignment Title`, `Week Label - Public`); emails/web never use `record.name`. | Schema + 071/072 field sources; document Presentation field standard. See [platform-config-improvements.md](./platform-config-improvements.md) § C-022 | open |

---

## Post close-out — start after **July 1, 2026**

Items intentionally deferred until the contest is closed and final emails/audits are done.

| ID | Priority | What to do |
|----|----------|------------|
| **C-009** | **High** | **Redo Fillout Final Reflection Quiz intake** — full end-to-end rework (see Active row). First decision: PDF from Fillout into normal homework file pipeline vs attachment-less dual path. |
| **C-010** | **High** | **Harden `Active?` on Enrollments** — inactive must mean fully out of XP, emails, weekly summaries, streaks (not just leaderboard + audits). See **Using Active? on Enrollments** section. |
| **C-011** | **High** | **Automate weekly parent emails end-to-end** — remove `Build Weekly Email Now?` / `Send to Make?` manual gates; scheduled build+send every week in 072 format. See C-011 in Active table. |
| **C-012** | **High** | **Stage K — field ownership & lineage pass** — every table: who writes each field, delete cruft. Builds on [stage-j-legacy-cleanup.md](./airtable/stage-j-legacy-cleanup.md). |
| **C-013** | **High** | **AWS S3 + canonical URL assets** — retire personal Google Drive; no files in Airtable; every consumer uses the same HTTPS URL. See [asset-storage-migration.md](./asset-storage-migration.md). |
| **C-017** | **High** | **Fillout → Athletes validation** + field cleanup. See [testing-and-intake-architecture.md](./testing-and-intake-architecture.md). |
| **C-019** | **High** | **Schmidt test enrollment** — `Active?` false for standings only; **no test flags**; full pipeline parity. |
| **C-020** | **High** | **Test Intake harness** — production-identical runs; multi-file video example; Testing views by Enrollment. |
| **C-018** | **Medium** | **Intake open vs challenge run** — date-driven **Weeks** config. |
| **C-021** | **High** | **Grade bands** — link-based matching; remove hardcoded band strings in scripts. |
| **C-022** | **High** | **Public display fields** — emails/web use Presentation labels, not primary field. |
| **C-014** | **Medium** | **XP / levels / streaks game design** — **DECIDED 2026-07-03:** one ladder, spread gates in config, comms-first; no dual-track for 2026–27. Streak economics may still need **053** review. See [shooting-challenge-v2-master-direction.md](./shooting-challenge-v2-master-direction.md). |
| **H-001** | **Medium** | **Dedupe 090F unlock rows** — 9 duplicate groups, manual cleanup. Full ID table: [post-close-hygiene-2025-26.md](./post-close-hygiene-2025-26.md). |
| **H-002** | **High** | **Automation 066 writes Week** on shot-milestone unlocks (match 058). Before 2026–27 season. |
| **H-003 / C-015** | **Low** | Award Recipients scope metadata — accepted for close-out; no bulk fix. |
| **H-004 / C-016** | **Low** | Awards catalog `thanks_for_playing` duplicate bucket. |

### C-013 — Current vs target asset flow

Full architecture: **[asset-storage-migration.md](./asset-storage-migration.md)**

**Today (same bytes stored multiple times; Drive tied to personal account):**

```
Fillout → Submissions (HW Sub 1/2, Video Upload)     ← attachment #1
    → 009 copies file → Submission Assets            ← attachment #2
    → 070a/070b → Make downloads attachment.url → Google Drive (personal)
    → 022 writeback → Drive URL on Asset (+ sometimes Homework Completion attachment)
    → attachments often NEVER cleared → storage limit
    → web/coach/email paths sometimes read attachment, sometimes URL — dual truth
```

**Target (2026–27):**

```
Fillout → transient intake only (optional one-hop)
    → Make Upload Engine → AWS S3 (program-owned bucket)
    → writeback: Canonical File URL on Submission Assets (+ metadata)
    → clear any intake attachment after Upload Status = Uploaded
    → formulas/automations/views gate on Canonical File URL + status — NOT attachment
    → headshots: Canonical File URL on Enrollment; web/emails use that URL exactly
    → EVERY consumer (coach UI, Make emails, /shoot, audits) uses the same URL string
```

---

## Resolved

| ID | Resolved | Summary | Outcome |
|----|----------|---------|---------|
| C-R01 | 2026-06-29 | Liam Week 1 homework “orphan” | Record `rec7g5MjorrrRmqMc` is correctly linked to Liam Kimm (`recIh9oF3NYfMzkoS`), not orphaned. |
| C-R02 | 2026-06-29 | 090E enrollment XP rollup | Repair applied; audit pass 91/91 active enrollments. |
| C-R03 | 2026-07-02 | Award Recipients close-out | Scripts 1–4 PASS in Airtable; June 29 snapshot reconcile; Goal/Conquer 14/14; cart 70/$595. Detail: [post-close-hygiene-2025-26.md](./post-close-hygiene-2025-26.md). |

---

## Template (copy for new rows)

```markdown
| C-00X | YYYY-MM-DD | Area | One-line summary | Context, record IDs, numbers | What to do | open |
```

---

## Related docs

- [post-close-hygiene-2025-26.md](./post-close-hygiene-2025-26.md) — **2025–26 post-close cleanup backlog (H-001–H-006)**
- [PROJECT_STATE.md](./PROJECT_STATE.md) — bases, audit index, deploy paths
- [asset-storage-migration.md](./asset-storage-migration.md) — AWS S3 + canonical URL assets (C-013)
- [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) — Fillout validation, flexible Weeks, Schmidt sandbox, Test Intake harness (C-017–C-020)
- [platform-config-improvements.md](./platform-config-improvements.md) — Grade bands + public display (C-021, C-022)
- [data-flow/weekly-summary-flow.md](./data-flow/weekly-summary-flow.md) — **aspirational** scheduled flow; production still manual (C-011)
- [airtable/stage-j-legacy-cleanup.md](./airtable/stage-j-legacy-cleanup.md) — Stage J field cleanup; extends to **Stage K** (C-012)
- [extension-scripts/audits/README.md](../airtable/extension-scripts/audits/README.md) — 090A–090G
- [extension-scripts/safe-backfills/README.md](../airtable/extension-scripts/safe-backfills/README.md) — repair run order
- [xp-motivation-analysis-2025-26.md](./xp-motivation-analysis-2025-26.md) — deferred XP / levels / streak review (C-014)
