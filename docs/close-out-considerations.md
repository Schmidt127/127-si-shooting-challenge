# Close-out considerations watchlist

**Purpose:** Running list of things noticed during ops / review that need a decision, follow-up, or monitoring. Not a substitute for [PROJECT_STATE.md](./PROJECT_STATE.md) (live snapshot) or [CHANGELOG.md](../CHANGELOG.md) (what shipped).

**V2 build order:** For sequencing all change requests (including new ones), see **[v2-change-backlog.md](./v2-change-backlog.md)**.

**How to use**

- Add a row when something comes up in review, parent email, or audit — even if we defer action.
- Update **Status** and **Last updated** as things move.
- Move resolved items to **Resolved** (keep for context) or delete after close-out if no longer useful.
- AI sessions: read this file when working on close-out, Kimm family, or final audits.

**Status key:** `open` · `monitoring` · `blocked` · `resolved` · `wont-fix`

Last updated: **2026-07-05** (Wave 0 **closed**; C-006/H-001/H-002 resolved)

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

**Practical rule for safe testing:** Use a **dedicated Schmidt test Athlete** (**C-019**) with one Enrollment where **`Active?` is unchecked** — hidden from leaderboard and audits, but pipeline runs **identically** to production (no test flags on rows). **Testing Scenarios** (**C-020**) pre-links that Enrollment. See [testing-and-intake-architecture.md](./testing-and-intake-architecture.md).

**Post–July 1:** See **C-010** — harden `Active?` as a global gate in XP, weekly summary, homework, streak, and email automations.

---

## Active

| ID | Added | Area | Summary | Detail | Next step | Status |
|----|-------|------|---------|--------|-----------|--------|
| C-001 | 2026-06-29 | Submissions / Lyle Kimm | Parent dispute ~300 missing shots | Enrollment `rec83ku1pTHmPNwRo`. **Resolved 2026-07-05:** Mike restored **Count It** on excluded submissions; shots counted. | — | **resolved** → C-R07 |
| C-004 | 2026-06-29 | Homework / Koen Kimm | Week 7 Thank You Note — multiple completion rows | **3** Homework Completion records for same assignment key (re-submits 6/9, 6/10, 6/11). All marked satisfactory + XP awarded. Not 4 in current data. IDs: `recbICOMuZiPx5QBh`, `recIP78dmNeFIVEP7`, `recvkicBA6buq9wAM`. | Decide if duplicate rows stay for history or get archived after close; no action required for XP if 090B passes | monitoring |
| C-005 | 2026-06-29 | Homework / Liam Kimm | Youngest brother — minimal homework | Enrollment `recIh9oF3NYfMzkoS`. Only Week 1 Shot Tracker marked satisfactory (`rec7g5MjorrrRmqMc`). | None unless parent asks; include accurately in any summary | monitoring |
| C-006 | 2026-06-29 | Achievements | 090F duplicate unlock groups | **Resolved 2026-07-05 (H-001):** 9 groups were **false positives** — multiple legitimate shot milestones in same week (unique Milestone Source Key each). **Fix the audit, not the data.** Audit v1.1 dedupes shot milestones on Source Key only. **0 rows deleted.** | — | **resolved** → C-R08 |
| C-007 | 2026-06-29 | Data integrity | 090E false duplicate XP fix applied | 15 homework XP events had `Duplicate Status = Duplicate - Remove` with `Active?` true → rollup under-count. Repaired via `repair-final-090e-xp-rollup-duplicate-status.js`. 090E then **91/91 PASS**. | Re-run 090E after **C-001** Lyle shot restore if that repair runs | monitoring |
| C-009 | 2026-06-29 | Homework / Fillout quiz | **Redo Fillout HW17 quiz intake end-to-end** | Rushed last-second design. `Final Reflection Quiz Submissions` → **067** creates a `Homework Completion` **without** `Submission Asset`, **without** `Airtable Attachment`, **without** Make/Drive upload. Rest of homework stack assumes file-based turn-in: `Upload Ready?` (= Attachment + Enrollment + Asset Type), coach views filtered on attachment not empty, **020** link/create from assets, **070** Make upload, **071** parent email reads Submission Assets, etc. Quiz rows break or skip those steps; coach review / satisfactory / XP / email path is inconsistent (see C-003). **Likely fix direction:** Fillout exports/submits a **PDF** (quiz results or certificate) so intake rejoins the normal daily-submission → asset → attachment → Make pipeline and one Homework Completion model works for all HW types. **Alternate:** keep quiz table for scoring only but redesign Homework Completions + automations + views for attachment-less `Source System = Fillout` rows (bigger schema/automation pass). Docs today: [homework-flow.md](./data-flow/homework-flow.md) § HW17; scripts **067**, `audit-homework17-reflection-quiz-pipeline.js`, `backfill-homework17-completions-from-reflection-quiz.js`. | **Start after 2026-07-01** — (1) decide PDF-via-Fillout vs dual-path schema; (2) rework table fields, views, filters, automations 067/020/064/065/071; (3) audit + backfill existing quiz completions; (4) update homework-flow doc | open |
| C-010 | 2026-06-29 | Enrollments / `Active?` | **Harden inactive enrollment sandbox** | User wants `Active?` unchecked = fully out of production (leaderboards, audits, XP, emails). **Already works** for web leaderboard, 090 audits, 090G, **023** auto-link, **056**, **066**, **101**. **Gaps:** **010**, **031**, **065**, **053**, **072**, **076** do not skip inactive enrollments if rows are already linked. See section **Using Active? on Enrollments** above. | After July 1: add early `Enrollment.Active?` guard (skip, no error) to intake/XP/email automations; extension audit for inactive enrollment leakage; document test-athlete pattern | open |
| C-011 | 2026-06-29 | Weekly email / WAS | **Fully automatic weekly parent email (no manual steps)** | User wants Weekly Athlete Summary emails every week in a fixed format with **no manual checkboxes**. **Today:** (1) WAS rows created ad hoc via **031** when submissions happen — not guaranteed one per active enrollment per week; (2) **072** builds HTML only when staff checks **`Build Weekly Email Now?`**; (3) **072 deliberately leaves `Send to Make?` unchecked** for review (see CHANGELOG); (4) **074** sends only when staff checks **`Send to Make?`**; (5) `docs/data-flow/weekly-summary-flow.md` describes a scheduled build but **no scheduled automation exists in repo**. Close-out **090G** audit simulates 072/074 triggers; final one-time email is separate (`repair-final-090g`). | **Start after 2026-07-01:** define schedule (e.g. Monday AM Denver, prior week ended); batch extension or scheduled automation: for each Active? enrollment + ended week → ensure WAS → run 072 package build → auto-handoff to 074/Make (or merge 072+074 with idempotency); skip if `Weekly Email Sent?`; optional test mode; lock HTML template in 072; update weekly-summary-flow + weekly checklist | open |
| C-012 | 2026-06-29 | Schema / all tables | **Post-close field ownership & lineage pass (“Stage K”)** | After challenge: go **table by table** and prove every field is (a) needed, (b) filled by the **correct** writer — automation script, Make writeback, Fillout intake, or formula/rollup — and (c) delete or archive unused / low-value fields. **Already started** as **Stage J** in repo: `audit-field-coverage-report.js` (fill rates on canonical fields), `audit-legacy-cleanup-candidates.js` (LEGACY/ZZZ names), `docs/airtable/stage-j-legacy-cleanup.md` (hide → delete runbook). **Not done yet:** full per-table **field ownership matrix** (field → sole writer automation #), cross-check that no two automations fight over same field, verify formulas only depend on live fields, export fresh schema after deletes, update `field-map.md` + automation-index. User goal: confidence that “everything always gets written correctly” without mystery blanks. | **Start after 2026-07-01:** fresh schema export → table-by-table checklist → extend audits or add `audit-field-ownership-matrix.js` → Phase 3–5 from stage-j doc → update `airtable/schema/current/` | open |
| C-013 | 2026-06-29 | Storage / assets | **AWS S3 canonical assets (no Airtable file storage; retire Google Drive)** | User over Airtable attachment limit; deletes early-week assets to free space → **breaks audits/history**. **Today = triple storage:** (1) Fillout → `Submissions.HW Sub 1/2`, `Video Upload` attachments; (2) **009** **copies** each file → `Submission Assets.Airtable Attachment`; (3) after Make upload, Drive URLs exist **but attachments often remain**. Homework Completions also has `Airtable Attachment` + `Upload Ready?` formula requires it. Enrollment **`Athlete Headshot`** attachment feeds web leaderboard. Many gates (`Ready to Send to Make?`, **020**, **070a**, **013**) require `Airtable Attachment` not empty. **Personal Google Drive will not remain available** after retirement — Drive is not a viable long-term canonical store. **Target:** Program-owned **AWS S3** (+ CloudFront for public headshots); **one canonical HTTPS URL per asset** used by *every* consumer (automations, Make, web, emails, coach views, audits) — URL is the asset; Airtable holds metadata + URL only; clear attachment fields after `Upload Status = Uploaded`. Full architecture: [asset-storage-migration.md](./asset-storage-migration.md). Relates to **C-009**, **C-012**. | **Start after 2026-07-01:** see [asset-storage-migration.md](./asset-storage-migration.md) implementation phases — S3 buckets, Make engine rewrite, field rename (`Canonical File URL`), automation/formula/web pass, attachment clear | open |
| C-014 | 2026-06-29 | XP / levels / streaks | **Post-season game design review (no changes until challenge ends)** | **First year of levels + XP.** Many kids still on last-year “shots only” mental model; **gates/levels not live first two weeks** — mid-stream transition likely hurt adoption. **2025–26 snapshot (91 active):** shooting ~64% of XP; median HW **0**; 16 gate-blocked at 1,000+ XP; participation cliff at Deadeye. **Streak economics:** 053 awards 3/5/7/… on **each new block after a break** — e.g. **3×7-day streaks (135 XP) beat 1×20-day (125 XP)**; needs explicit review so continuity is not under-incentivized vs stop-start. Full write-up: [xp-motivation-analysis-2025-26.md](./xp-motivation-analysis-2025-26.md). | **DECIDED 2026-07-03:** **One ladder** for 2026–27 (XP + gates in **Level Gate Rules**). **Spread gates early** (e.g. 1 HW past level 1). **No dual-track.** Better comms + platform before May 2027. Revisit dual-track **only if** friction remains after 2026–27. Tune numbers in config tables Q1 2027 — see [shooting-challenge-v2-master-direction.md](./shooting-challenge-v2-master-direction.md). | resolved |
| C-015 | 2026-07-02 | Award Recipients | Scope field vs catalog (49 rows) | `recipient_scope_vs_catalog_scope`: catalog **Overall/Both**, recipient row **Weekly** on historical **Sent** rows. Close-out audit **passed** (`needConqueredRow: 0`). | **Do not bulk-fix** for 2025–26. Optional row-by-row post-season. See **H-003** | monitoring |
| C-016 | 2026-07-02 | Awards catalog | Duplicate `thanks_for_playing` class bucket | Three awards share bucket: Participation Award, Thanks for Playing, Zoom Attendance/Participation. | Post-season catalog cleanup. See **H-004** | open |
| C-017 | 2026-07-03 | Fillout / Athletes intake | **Validate Fillout → Athletes path; clean Athlete fields** | Enrollment intake via Fillout → **001** find/create Athlete. Need stronger **Fillout validation rules** (email, names, required fields) and Athletes/Enrollments **field hygiene** (Stage K subset). Document test matrix for new vs returning athletes. Minimum bar: trust Athlete identity before downstream pipeline. | Audit Fillout forms + field map; tighten Fillout validation; extend **001** guards; Athletes field cleanup. See [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) § C-017 | open |
| C-018 | 2026-07-03 | Weeks / calendar | **Intake open vs challenge run (date-driven Weeks)** | **Two calendars in config:** (1) **Intake open** — e.g. early bird partial week; setting start date = day app/Fillout accepts input; (2) **Challenge run** — official Week 1+ from challenge start date. All date ranges in **Weeks** table; **005** maps by range only. Optional per-row flags (`Intake Open?`, XP/leaderboard counts). | Design Weeks schema; 2026–27 rows scoped by Program Instance (**V2-013**); Fillout/web open gate on intake-open date. See [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) § C-018 | open |
| C-019 | 2026-07-03 | Testing / sandbox | **Schmidt test enrollment (visibility only)** | Dedicated Schmidt Athlete + Enrollment; **`Active?` = false** for leaderboard/audits/emails only. **No test flags** — base runs pipeline **identically** to production. Testing views filter by Schmidt Enrollment link. | Document test enrollment on 2026–27 clone; add **Testing** views per pipeline table. See [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) § C-019 | open |
| C-020 | 2026-07-03 | Testing / framework | **Engineering Test Framework (C-020)** | **Testing Scenarios** table on DEV (OMNI finishing schema). Script **paused** until final field list. Framework fields (**Scenario Type**, **Test Status**, **Expected/Actual Result**, **Pass/Fail Notes**) on **Testing Scenarios only** — pipeline production-shaped. Future **Testing Scenario Library** deferred. [Script checklist](./deploy-checklists/C-020-testing-scenarios-script-checklist.md) | OMNI schema → Cursor script after field list | open |
| C-021 | 2026-07-04 | Grade Bands / config | **Grade bands propagate from Configuration** | Grade Bands table is source of truth, but **072 hardcodes** band name strings (`K2`, `34`, …); **010** ignores grade-band link on XP Reward Rules. Renaming/restructuring bands can break XP display and rule matching. | Audit scripts; match XP rules by **Grade Band link** not strings; web reads linked labels. See [platform-config-improvements.md](./platform-config-improvements.md) § C-021 | open |
| C-022 | 2026-07-04 | Presentation / emails | **Public display fields — no primary-field fallback** | Homework emails (071) use Week + assignment name but fall back to **primary/formula** (`Assignment Full Name`) — too much detail for parents. Need explicit **Presentation** fields (`Assignment Title`, `Week Label - Public`); emails/web never use `record.name`. | Schema + 071/072 field sources; document Presentation field standard. See [platform-config-improvements.md](./platform-config-improvements.md) § C-022 | open |
| C-023 | 2026-07-04 | Assets / dedup | **File dedup by content hash (SHA-256), not title/filename** | **007** dedupes submissions by stat formula; **009** by attachment id only. `File Content Hash` exists on Submission Assets but not enforced end-to-end. Same file re-uploaded under new name can pass. | Wire hash at upload (C-013); block/flag duplicates; see [v2-change-backlog.md](./v2-change-backlog.md) § dedupe | open |
| C-024 | 2026-07-04 | Data integrity / engine | **Rock-solid dedupe keys + idempotent backfills** | **Source Key** / dedupe keys must be consistent intake → XP → achievements. Backfill/repair scripts safe to **rerun** without double-creates. Duplicates caught at intake, not in close-out audits. | Document all key patterns; audit 007/009/010/065/101/114; backfill standard; extension `audit-dedupe-key-coverage` | open |
| C-025 | 2026-07-04 | Zoom / gates / fairness | **Recording watch = partial attendance + XP** | Missed live Zoom should not block higher levels. **101** = live attendees only; manual supplemental re-run exists but no recording workflow. Need config-driven partial credit (smaller XP) + gate credit when kid watches **Zoom recording**; distinct Source Key from live. | Design attestation path; XP Reward Rule + Level Gate Rule rows; extend **101** or sibling automation | open |
| C-026 | 2026-07-04 | Schema / content | **Consolidate Tutorials vs Tutorials & Assets** | Duplicate tables with overlapping fields. **Web uses `Tutorials` only** (`/tutorials`, shoutouts, articles). `Tutorials & Assets` not in repo code — likely legacy duplicate. Audit rows, migrate unique content, delete one table on clone. | Extension audit row counts; Stage K ownership; see [v2-change-backlog.md](./v2-change-backlog.md) § C-026 | open |
| C-027 | 2026-07-04 | Notifications / new component | **Instant alerts on major events (SMS TBD)** | Level up (**042**), milestones (**066**/**059**), etc. — **not** daily submissions. Email today is batch/parent-focused. Cell numbers on Enrollments/Athletes. Discuss Twilio/Make, consent, templates, idempotent send keys. | Design session; prototype after C-024; see [v2-change-backlog.md](./v2-change-backlog.md) § C-027 | open |

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
| **C-020** | **High** | **Engineering Test Framework** — **Testing Scenarios** on DEV; script blocked on OMNI field list |
| **C-018** | **Medium** | **Intake open vs challenge run** — date-driven **Weeks** config. |
| **C-021** | **High** | **Grade bands** — link-based matching; remove hardcoded band strings in scripts. |
| **C-022** | **High** | **Public display fields** — emails/web use Presentation labels, not primary field. |
| **C-023** | **High** | **File hash dedup** — SHA-256 content hash, not filename/title. |
| **C-024** | **High** | **Dedupe keys + idempotent backfills** — safe to rerun repairs. |
| **C-025** | **High** | **Zoom recording attendance** — partial XP/gate credit when live missed. |
| **C-026** | **Medium** | **Tutorials table merge** — keep `Tutorials` (web uses it); retire `Tutorials & Assets` after audit. |
| **C-027** | **Medium** | **Major-event notifications** — level up / milestones; SMS via cell number TBD (not daily XP). |
| **C-014** | **Medium** | **XP / levels / streaks game design** — **DECIDED 2026-07-03:** one ladder, spread gates in config, comms-first; no dual-track for 2026–27. Streak economics may still need **053** review. See [shooting-challenge-v2-master-direction.md](./shooting-challenge-v2-master-direction.md). |
| **H-001** | **Done** | **090F audit fix** — Milestone Source Key dedupe for shot milestones; 0 data deleted. See [post-close-hygiene-2025-26.md](./post-close-hygiene-2025-26.md). |
| **H-002** | **GitHub done** | **Automation 066 v3.1** — V2 standard rewrite; Week write; **Airtable paste pending**. See [v2/06-automation-standards.md](./v2/06-automation-standards.md). |
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
| C-R04 | 2026-07-05 | Final summary emails (**C-002**) | Mike confirmed all final summary emails sent via **074** / Make. |
| C-R05 | 2026-07-05 | Koen Kimm HW17 coach review + email (**C-003**) | Final Reflection (HW17) graded; parent email sent via **071**. Record `recKmhET7B097SKli`; enrollment `recZZ4Op05Hg0FpQq`. |
| C-R06 | 2026-07-05 | Fillout daily form off (**C-008**) | Contest intake closed; Fillout daily submission form disabled. |
| C-R07 | 2026-07-05 | Lyle Kimm shots restored (**C-001**) | ~300 shots switched to Count It; XP counted. **090A** + **090E** pass on live re-run **2026-07-05**. |
| C-R08 | 2026-07-05 | 090F duplicate unlock audit (**C-006** / **H-001**) | Audit v1.1 — shot milestones dedupe on Milestone Source Key; groups were legitimate multi-milestone same-week unlocks. **0 rows deleted.** Principle: **fix the audit, not the data.** |
| C-R09 | 2026-07-05 | Automation 066 V2 rewrite (**H-002**) | **v3.1** in GitHub (`45b17d7`); V2 automation reference template. Airtable production paste **not done** — awaiting deploy checklist. |

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
- [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) — Fillout validation, flexible Weeks, Schmidt sandbox, Engineering Test Framework (C-017–C-020)
- [platform-config-improvements.md](./platform-config-improvements.md) — Grade bands + public display (C-021, C-022)
- [data-flow/weekly-summary-flow.md](./data-flow/weekly-summary-flow.md) — **aspirational** scheduled flow; production still manual (C-011)
- [airtable/stage-j-legacy-cleanup.md](./airtable/stage-j-legacy-cleanup.md) — Stage J field cleanup; extends to **Stage K** (C-012)
- [extension-scripts/audits/README.md](../airtable/extension-scripts/audits/README.md) — 090A–090G
- [extension-scripts/safe-backfills/README.md](../airtable/extension-scripts/safe-backfills/README.md) — repair run order
- [xp-motivation-analysis-2025-26.md](./xp-motivation-analysis-2025-26.md) — deferred XP / levels / streak review (C-014)
