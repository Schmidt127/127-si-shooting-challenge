# Close-out considerations watchlist

**Purpose:** Running list of things noticed during ops / review that need a decision, follow-up, or monitoring. Not a substitute for [PROJECT_STATE.md](./PROJECT_STATE.md) (live snapshot) or [CHANGELOG.md](../CHANGELOG.md) (what shipped).

**How to use**

- Add a row when something comes up in review, parent email, or audit — even if we defer action.
- Update **Status** and **Last updated** as things move.
- Move resolved items to **Resolved** (keep for context) or delete after close-out if no longer useful.
- AI sessions: read this file when working on close-out, Kimm family, or final audits.

**Status key:** `open` · `monitoring` · `blocked` · `resolved` · `wont-fix`

Last updated: **2026-07-01** (C-001 Lyle restore — benefit of doubt)

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

**Practical rule for safe testing:** Use a **dedicated test Athlete** whose only enrollment is **inactive**. Do not share the same Athlete record with a live enrollment. Avoid manually setting Enrollment on test rows to an inactive record if you want the pipeline to stay idle — and never link test rows to a **production** enrollment.

**Post–July 1:** See **C-010** — harden `Active?` as a global gate in XP, weekly summary, homework, streak, and email automations.

---

## Active

| ID | Added | Area | Summary | Detail | Next step | Status |
|----|-------|------|---------|--------|-----------|--------|
| C-001 | 2026-06-29 | Submissions / Lyle Kimm | Parent dispute ~300 missing shots | Enrollment `rec83ku1pTHmPNwRo`. **Close-out decision:** benefit of the doubt — **not duplicates**; restore **Count It** on `rec8dui4l30DYGUgx` (5/7, 140) and `recBI4Np85t5X9Z8u` (5/19, 200). Repair: `repair-kimm-lyle-restore-excluded-submissions.js` → then `backfill-submission-xp-events.js` or 010; re-run **090A** + **090E**. | Run repair script (CONFIRM_WRITE), XP backfill, then close-out audits | open |
| C-002 | 2026-06-29 | Close-out | Final audit + email sequence not run | After form off and automations settle: **090A → 090D → 090E** (E last). Spot-check leaderboard vs Airtable. Then `repair-final-090g-build-final-challenge-summary-email.js` dry-run → test 1 via **074** → ~65 per-athlete emails. `CONFIRM_BUILD` not applied yet. | Run after midnight Denver close | open |
| C-003 | 2026-06-29 | Homework / Koen Kimm | Week 10 Final Reflection not coach-reviewed | `recKmhET7B097SKli` — quiz may show `Completion Status = Satisfactory` from auto-pass, but **Satisfactory?** and **Review Complete** not set. Enrollment `recZZ4Op05Hg0FpQq`. Symptom of C-009 attachment-less quiz path. | Coach review before close-out email if we want it in summary; fix properly in C-009 | open |
| C-004 | 2026-06-29 | Homework / Koen Kimm | Week 7 Thank You Note — multiple completion rows | **3** Homework Completion records for same assignment key (re-submits 6/9, 6/10, 6/11). All marked satisfactory + XP awarded. Not 4 in current data. IDs: `recbICOMuZiPx5QBh`, `recIP78dmNeFIVEP7`, `recvkicBA6buq9wAM`. | Decide if duplicate rows stay for history or get archived after close; no action required for XP if 090B passes | monitoring |
| C-005 | 2026-06-29 | Homework / Liam Kimm | Youngest brother — minimal homework | Enrollment `recIh9oF3NYfMzkoS`. Only Week 1 Shot Tracker marked satisfactory (`rec7g5MjorrrRmqMc`). | None unless parent asks; include accurately in any summary | monitoring |
| C-006 | 2026-06-29 | Achievements | 090F duplicate unlock groups | 8 duplicate unlock groups reported; optional repair, not blocking close. Script stub: `repair-final-090f-unlock-week-from-source.js`. | Re-run 090F after close; fix only if leaderboard/unlocks look wrong | open |
| C-007 | 2026-06-29 | Data integrity | 090E false duplicate XP fix applied | 15 homework XP events had `Duplicate Status = Duplicate - Remove` with `Active?` true → rollup under-count. Repaired via `repair-final-090e-xp-rollup-duplicate-status.js`. 090E then **91/91 PASS**. | Re-run 090E after any late submissions or Lyle shot restore | monitoring |
| C-008 | 2026-06-29 | Intake | Fillout daily submission form | User plan: turn **OFF** at midnight America/Denver to close contest. | Confirm off; allow automations to drain before final audits | open |
| C-009 | 2026-06-29 | Homework / Fillout quiz | **Redo Fillout HW17 quiz intake end-to-end** | Rushed last-second design. `Final Reflection Quiz Submissions` → **067** creates a `Homework Completion` **without** `Submission Asset`, **without** `Airtable Attachment`, **without** Make/Drive upload. Rest of homework stack assumes file-based turn-in: `Upload Ready?` (= Attachment + Enrollment + Asset Type), coach views filtered on attachment not empty, **020** link/create from assets, **070** Make upload, **071** parent email reads Submission Assets, etc. Quiz rows break or skip those steps; coach review / satisfactory / XP / email path is inconsistent (see C-003). **Likely fix direction:** Fillout exports/submits a **PDF** (quiz results or certificate) so intake rejoins the normal daily-submission → asset → attachment → Make pipeline and one Homework Completion model works for all HW types. **Alternate:** keep quiz table for scoring only but redesign Homework Completions + automations + views for attachment-less `Source System = Fillout` rows (bigger schema/automation pass). Docs today: [homework-flow.md](./data-flow/homework-flow.md) § HW17; scripts **067**, `audit-homework17-reflection-quiz-pipeline.js`, `backfill-homework17-completions-from-reflection-quiz.js`. | **Start after 2026-07-01** — (1) decide PDF-via-Fillout vs dual-path schema; (2) rework table fields, views, filters, automations 067/020/064/065/071; (3) audit + backfill existing quiz completions; (4) update homework-flow doc | open |
| C-010 | 2026-06-29 | Enrollments / `Active?` | **Harden inactive enrollment sandbox** | User wants `Active?` unchecked = fully out of production (leaderboards, audits, XP, emails). **Already works** for web leaderboard, 090 audits, 090G, **023** auto-link, **056**, **066**, **101**. **Gaps:** **010**, **031**, **065**, **053**, **072**, **076** do not skip inactive enrollments if rows are already linked. See section **Using Active? on Enrollments** above. | After July 1: add early `Enrollment.Active?` guard (skip, no error) to intake/XP/email automations; extension audit for inactive enrollment leakage; document test-athlete pattern | open |
| C-011 | 2026-06-29 | Weekly email / WAS | **Fully automatic weekly parent email (no manual steps)** | User wants Weekly Athlete Summary emails every week in a fixed format with **no manual checkboxes**. **Today:** (1) WAS rows created ad hoc via **031** when submissions happen — not guaranteed one per active enrollment per week; (2) **072** builds HTML only when staff checks **`Build Weekly Email Now?`**; (3) **072 deliberately leaves `Send to Make?` unchecked** for review (see CHANGELOG); (4) **074** sends only when staff checks **`Send to Make?`**; (5) `docs/data-flow/weekly-summary-flow.md` describes a scheduled build but **no scheduled automation exists in repo**. Close-out **090G** audit simulates 072/074 triggers; final one-time email is separate (`repair-final-090g`). | **Start after 2026-07-01:** define schedule (e.g. Monday AM Denver, prior week ended); batch extension or scheduled automation: for each Active? enrollment + ended week → ensure WAS → run 072 package build → auto-handoff to 074/Make (or merge 072+074 with idempotency); skip if `Weekly Email Sent?`; optional test mode; lock HTML template in 072; update weekly-summary-flow + weekly checklist | open |
| C-012 | 2026-06-29 | Schema / all tables | **Post-close field ownership & lineage pass (“Stage K”)** | After challenge: go **table by table** and prove every field is (a) needed, (b) filled by the **correct** writer — automation script, Make writeback, Fillout intake, or formula/rollup — and (c) delete or archive unused / low-value fields. **Already started** as **Stage J** in repo: `audit-field-coverage-report.js` (fill rates on canonical fields), `audit-legacy-cleanup-candidates.js` (LEGACY/ZZZ names), `docs/airtable/stage-j-legacy-cleanup.md` (hide → delete runbook). **Not done yet:** full per-table **field ownership matrix** (field → sole writer automation #), cross-check that no two automations fight over same field, verify formulas only depend on live fields, export fresh schema after deletes, update `field-map.md` + automation-index. User goal: confidence that “everything always gets written correctly” without mystery blanks. | **Start after 2026-07-01:** fresh schema export → table-by-table checklist → extend audits or add `audit-field-ownership-matrix.js` → Phase 3–5 from stage-j doc → update `airtable/schema/current/` | open |
| C-013 | 2026-06-29 | Storage / assets | **Google Drive–only assets (no Airtable file storage)** | User over Airtable attachment limit; deletes early-week assets to free space → **breaks audits/history**. **Today = triple storage:** (1) Fillout → `Submissions.HW Sub 1/2`, `Video Upload` attachments; (2) **009** **copies** each file → `Submission Assets.Airtable Attachment`; (3) after Make upload, Drive URLs exist **but attachments often remain**. Homework Completions also has `Airtable Attachment` + `Upload Ready?` formula requires it. Enrollment **`Athlete Headshot`** attachment feeds web leaderboard. Many gates (`Ready to Send to Make?`, **020**, **070a**, **013**) require `Airtable Attachment` not empty. **Target:** Google Drive File URL (+ File ID, folder) = **canonical asset**; Airtable holds **metadata + links only**; optional transient intake URL until Make confirms upload, then **clear** submission/asset attachment fields. Relates to **C-009** (quiz PDF path) and **C-012** (retire attachment fields). | **Start after 2026-07-01:** (1) document current copy chain; (2) rewrite formulas/views to `Google Drive File URL` / `Upload Status = Uploaded`; (3) update **009**/**070a**/**020**/**013**/**022** + Make engine; (4) headshot → Drive URL on Enrollment/Athletes + web `queries.ts`; (5) post-upload **clear attachment** automation; (6) update audits (`audit-stuck-upload-processing`, field coverage) to never require stored binaries | open |
| C-014 | 2026-06-29 | XP / levels / streaks | **Post-season game design review (no changes until challenge ends)** | **First year of levels + XP.** Many kids still on last-year “shots only” mental model; **gates/levels not live first two weeks** — mid-stream transition likely hurt adoption. **2025–26 snapshot (91 active):** shooting ~64% of XP; median HW **0**; 16 gate-blocked at 1,000+ XP; participation cliff at Deadeye. **Streak economics:** 053 awards 3/5/7/… on **each new block after a break** — e.g. **3×7-day streaks (135 XP) beat 1×20-day (125 XP)**; needs explicit review so continuity is not under-incentivized vs stop-start. Full write-up: [xp-motivation-analysis-2025-26.md](./xp-motivation-analysis-2025-26.md). | **No rule changes until after close-out.** **Start 2026-07-01:** re-pull stats; streak occurrence report; model gate/level/streak alternatives; parent comms for clean Week 1 2026–27 launch | open |

---

## Post close-out — start after **July 1, 2026**

Items intentionally deferred until the contest is closed and final emails/audits are done.

| ID | Priority | What to do |
|----|----------|------------|
| **C-009** | **High** | **Redo Fillout Final Reflection Quiz intake** — full end-to-end rework (see Active row). First decision: PDF from Fillout into normal homework file pipeline vs attachment-less dual path. |
| **C-010** | **High** | **Harden `Active?` on Enrollments** — inactive must mean fully out of XP, emails, weekly summaries, streaks (not just leaderboard + audits). See **Using Active? on Enrollments** section. |
| **C-011** | **High** | **Automate weekly parent emails end-to-end** — remove `Build Weekly Email Now?` / `Send to Make?` manual gates; scheduled build+send every week in 072 format. See C-011 in Active table. |
| **C-012** | **High** | **Stage K — field ownership & lineage pass** — every table: who writes each field, delete cruft. Builds on [stage-j-legacy-cleanup.md](./airtable/stage-j-legacy-cleanup.md). |
| **C-013** | **High** | **Drive-only assets** — stop storing files/headshots in Airtable; URLs + metadata only; clear attachments after upload. See C-013 + diagram below. |
| **C-014** | **Medium** | **XP / levels / streaks game design** — motivation analysis, gate timing, streak break-vs-hold economics. **No changes until after close-out.** See [xp-motivation-analysis-2025-26.md](./xp-motivation-analysis-2025-26.md). |

### C-013 — Current vs target asset flow

**Today (same bytes stored multiple times):**

```
Fillout → Submissions (HW Sub 1/2, Video Upload)     ← attachment #1
    → 009 copies file → Submission Assets            ← attachment #2
    → 070a/070b → Make downloads attachment.url → Google Drive
    → 022 writeback → Drive URL on Asset (+ sometimes Homework Completion attachment)
    → attachments often NEVER cleared → storage limit
```

**Target (next season):**

```
Fillout → brief intake (URL or one-hop temp) → Make → Google Drive (canonical file)
    → Airtable: Submission Assets row = metadata + Google Drive File URL only
    → clear any intake attachment after Upload Status = Uploaded
    → formulas/automations gate on Drive URL + status, NOT Airtable Attachment
    → headshots: Drive URL on Enrollment (web leaderboard reads URL field)
```

---

## Resolved

| ID | Resolved | Summary | Outcome |
|----|----------|---------|---------|
| C-R01 | 2026-06-29 | Liam Week 1 homework “orphan” | Record `rec7g5MjorrrRmqMc` is correctly linked to Liam Kimm (`recIh9oF3NYfMzkoS`), not orphaned. |
| C-R02 | 2026-06-29 | 090E enrollment XP rollup | Repair applied; audit pass 91/91 active enrollments. |

---

## Template (copy for new rows)

```markdown
| C-00X | YYYY-MM-DD | Area | One-line summary | Context, record IDs, numbers | What to do | open |
```

---

## Related docs

- [PROJECT_STATE.md](./PROJECT_STATE.md) — bases, audit index, deploy paths
- [data-flow/homework-flow.md](./data-flow/homework-flow.md) — file-based homework path; HW17 Fillout section needs rework (C-009)
- [data-flow/weekly-summary-flow.md](./data-flow/weekly-summary-flow.md) — **aspirational** scheduled flow; production still manual (C-011)
- [airtable/stage-j-legacy-cleanup.md](./airtable/stage-j-legacy-cleanup.md) — Stage J field cleanup; extends to **Stage K** (C-012)
- [extension-scripts/audits/README.md](../airtable/extension-scripts/audits/README.md) — 090A–090G
- [extension-scripts/safe-backfills/README.md](../airtable/extension-scripts/safe-backfills/README.md) — repair run order
- [xp-motivation-analysis-2025-26.md](./xp-motivation-analysis-2025-26.md) — deferred XP / levels / streak review (C-014)
