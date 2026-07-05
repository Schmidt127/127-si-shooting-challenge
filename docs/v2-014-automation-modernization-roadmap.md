# V2-014 — Automation Modernization Roadmap

**Backlog ID:** V2-014  
**Status:** Active — **Wave 2A in progress** (classification only — no rewrites, no merges)  
**Owner:** Cursor investigation → ChatGPT review → Mike approval  
**Last updated:** 2026-07-05

**Current focus:** Infrastructure is stable (V2-015 DEV ready). **Stop infrastructure work.** Classify every production automation before any modernization wave.

**Delivery rule:** [v2/04-ai-development-standards.md](./v2/04-ai-development-standards.md) — DEV test before Production for all changes.

**Related:**

- [v2/06-automation-standards.md](./v2/06-automation-standards.md) — V2 rewrite pattern (**066 v3.1** reference)
- [automation-index.md](./automation-index.md) — quick lookup index
- [../airtable/automations/AUTOMATION_SCRIPT_STANDARD.md](../airtable/automations/AUTOMATION_SCRIPT_STANDARD.md)
- [../airtable/schema/current/automation-trigger-map.md](../airtable/schema/current/automation-trigger-map.md)
- [v2-change-backlog.md](./v2-change-backlog.md)

**Do not rewrite automations from this document alone.** Each row is a planning classification until Mike approves a modernization wave.

**Phase 2 goal:** Reduce platform complexity while recovering automation capacity — **not** slot-chasing. Readability and maintainability outrank squeezing automations together.

---

## Modernization philosophy

### Four-axis evaluation (use for every automation)

| Question | Weight |
|----------|--------|
| Is it still needed? | **High** |
| Is it understandable? | **High** |
| Does it follow the V2 standard? | **High** |
| Does it save a slot if merged? | **Medium** |

If merge would reduce slots but hurt readability, **keep separate** (Category A or B).

### Category taxonomy (every automation ends here)

| Cat | Name | Meaning | Examples |
|-----|------|---------|----------|
| **A** | Production — leave alone | Simple, easy to understand, working | **041** (level recalc flag), **066** after deploy |
| **B** | Production — V2 rewrite only | Needed; needs V2 formatting when scheduled | **010**, **042**, **114** |
| **C** | Production — merge candidate | Two+ automations should become one **when clarity allows** | **006+021**, **030+032+033**, **111→013** |
| **D** | Extension Script | Repair, backfill, one-time cleanup — not production triggers | Pipeline audits, safe-backfills |
| **E** | Make / external handoff | Gmail, webhooks, third-party APIs | **070a/b**, **074**, **077**; email via Make today |
| **F** | Retire | Duplicate, obsolete, or superseded | **012** (done), **112**, **043** |

### Automation Complexity Score

Defined in [v2/06-automation-standards.md](./v2/06-automation-standards.md). Record **Score** and **Tier** (Simple / Medium / Complex / Critical) on each inventory row during Wave 2a.

Scripts **>700 lines** (preliminary): **072**, **076**, **101**, **114**, **059**, **010**, **071**, **066**, **075**, **065**, **053**, **054**, **031**, **020** — prioritize understanding before rewriting.

### Platform stack (no Lambda yet)

Current ecosystem is sufficient for Phase 2:

| Tool | Role |
|------|------|
| **Airtable** | Production data + automations |
| **OMNI** | In-base queries, views, live automation audit |
| **Cursor + GitHub** | Script source of truth, docs, audits |
| **Make** | Email send, upload webhooks |
| **Python** | Schema export, media kit builders |
| **S3** (planned) | Canonical asset URLs (C-013) |

**Lambda is deferred.** Introduce only if a clear need emerges that none of the above handle well (e.g. high-volume S3 media processing). Finish simplifying the current stack first.

---

## Product lifecycle context

| Phase | Name | Status |
|-------|------|--------|
| **1** | 2025–2026 Close-Out | **≈99% complete** — Wave 0, H-001/H-002, standards, docs synced |
| **2** | **Platform Modernization** | **Current** — this roadmap |
| **3** | New V2 Features | Blocked until Phase 2 stable |
| **4** | Multi-Year Architecture (V2-013) | Deferred |

Phase 2 workstreams: (1) Automation inventory, (2) Capacity, (3) V2 standard, (4) Technical debt, (5) Documentation.

---

## Summary dashboard

Counts as of **2026-07-05** (GitHub + Mike confirmations). Reconcile live count in Airtable OMNI after each retirement.

**Primary metric:** platform complexity reduction (classification complete, duplicates removed, legacy marked).  
**Secondary metric:** automation capacity recovered (side effect of good merges and retirements).

| Metric | Count | Notes |
|--------|------:|-------|
| **Airtable automation limit** | 50 | Hard cap per base |
| **GitHub production scripts** | 46 | `001`–`114` numbered files (excludes 012) |
| **Classified (Category A–F)** | 0 / 46 | **Wave 2a goal** — assign category + complexity to every row |
| **Duplicate paths documented** | 2 | 013/112, 042/043 |
| **Legacy marked** | 3 | 012 deleted, 112 OFF, 043 retire candidate |
| **V2 compliant (SCRIPT + CONFIG + sections)** | 1 | **066 v3.1** |
| **Partial standard** | ~28 | `main()`, CONFIG, outputs — not full V2 |
| **Legacy standard** | ~17 | No `main()`, stub header, or top-level-only |
| **Estimated capacity recoverable** | **~12** | Secondary — only when merge/retire improves clarity |

---

## Standard classification key

| Label | Meaning |
|-------|---------|
| **V2** | `SCRIPT` metadata, `CONFIG` (tables/fields only), numbered sections, schema validation, standard outputs, idempotent keys, batch writes where applicable — **066 v3.1** |
| **Partial** | `async function main()`, CONFIG, try/catch, `statusOut`/`debugStep` — good patterns but missing SCRIPT block or full section layout |
| **Legacy** | Top-level execution (no `main`), placeholder GitHub header, or minimal docblock |

| Category | Meaning |
|----------|---------|
| **A** | Production — simple; leave alone |
| **B** | Production — V2 rewrite when scheduled |
| **C** | Production — merge candidate (clarity first) |
| **D** | Move to Extension Script (repair/backfill) |
| **E** | Make / external handoff |
| **F** | Retire |

Legacy **Disposition** column in inventory tables maps to categories; Wave 2a adds explicit **Cat** + **Cx Score** columns.

| Priority | Meaning |
|----------|---------|
| **P0** | Duplicate path or retire — approved production change only |
| **P1** | High-traffic path or blocks other work |
| **P2** | Medium — when pipeline touched |
| **P3** | Low — keep running until scheduled |

| Effort | Meaning |
|--------|---------|
| **S** | Retire/disable or small merge (<1 day) |
| **M** | Full V2 rewrite one script (1–3 days) |
| **L** | Large rewrite + trigger/audit validation (3–5 days) |
| **XL** | Email EMC migration or multi-script chain (1–2 weeks) |

---

## Wave 2A — Automation inventory and classification (**active**)

**Objective:** Know the automation ecosystem as well as we know the tables. **Do not rewrite. Do not merge. Just understand.**

### Per-automation deliverable (all 46)

For each automation `#`, record in the inventory tables below (or OMNI + doc update):

| Field | Source |
|-------|--------|
| **Purpose** | Docblock + OMNI trigger confirm |
| **Inputs** | Trigger table, conditions, `input.config()` variables |
| **Outputs** | Script outputs + fields written |
| **Complexity Score + tier** | [doc 06](./v2/06-automation-standards.md) |
| **Category (A–F)** | Taxonomy in this doc |
| **Modernization priority** | P0–P3 |
| **Merge opportunities** | Related automations; four-axis pass |
| **Retirement opportunities** | Duplicates, superseded paths |

### Wave 2A — success criteria

Wave 2A is **classification and documentation**, not bulk rewrites.

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Every production automation has **Category A–F** | Pending |
| 2 | Every automation has **Complexity Score + tier** ([doc 06](./v2/06-automation-standards.md)) | Pending |
| 3 | Every duplicate path identified and documented | **Partial** (013/112, 042/043) |
| 4 | Every legacy automation marked | **Partial** (012, 112, 043) |
| 5 | Every automation has **modernization priority** (P0–P3) | Preliminary in inventory |
| 6 | **No production behavior changes** except Mike-approved (e.g. **112** OFF, future **112** delete) | In progress |

When Wave 2a is complete, work proceeds **one approved wave at a time** — no wondering what to do next.

---

## Complexity reduction plan (capacity is secondary)

Apply four-axis evaluation before any merge. Slot savings are recorded but not the primary driver.

| Action | Automation(s) | Category | Clarity benefit | Slots (secondary) | Status |
|--------|---------------|----------|-----------------|------------------:|--------|
| Delete legacy automation | **012** | F | Remove dead path | +1 | **Done** |
| Retire duplicate video create | **112** | F | Single VF path (**013**) | +1 | **OFF — monitor** |
| Retire superseded level helper | **043** | F | **042** owns gate assignment | +1 | Pending verify |
| Merge submission prep (if clear) | **006 + 021** | C | One submission status pass | +1 | Planned |
| Email Message Center | **071–077** (7 → 2) | C/E | Centralize email build/send | +5 net | Planned |
| Merge WAS bootstrap (if clear) | **030 + 032 + 033** | C | One WAS bootstrap script | +2 | Planned — **do not merge if timing differs** |
| Merge grade band copy | **111 → 013**, **063 → 020** | C | Copy at create time | +1–2 | Planned |
| **Do not merge** | 041↔010, 064↔065, 113↔114, 057↔058 | — | Formula/timing separation | 0 | **Keep separate** |

Target after Phase 2: **lower average complexity tier** and **~37–38 automations** (~12 headroom) — headroom is a consequence, not the goal.

---

## Duplicate paths (known)

| Path A | Path B | Verdict | Action |
|--------|--------|---------|--------|
| **013** (production) | **112** (legacy) | Same trigger table; 112 wrong key format; no asset writeback | **013 Keep** · **112 Retire** (monitoring) |
| **042** (assigns gate rule) | **043** (gate rule only) | 042 docblock says turn 043 off | **042 Keep** · **043 Retire** |
| **013/112** | — | Audit: "Run 013 (not 112)" | Extension backfill uses 013 pattern |

---

## Master inventory — Enrollment (001–003)

| # | Name | Purpose | Trigger table | Trigger conditions | Reads | Writes | Ver | Std | Risk | Disposition | Related | Effort | Pri |
|---|------|---------|---------------|-------------------|-------|--------|-----|-----|------|-------------|---------|--------|-----|
| 001 | Find or Create Athlete and Link Enrollment | Match/create Athlete; link Enrollment; activate | Enrollments | *confirm in Airtable* | Enrollments, Athletes | Enrollments, Athletes | v5.1 | Partial | Med | **Rewrite** | 002, 003 | M | P2 |
| 002 | Assign Grade Band — Initial | Set Grade Band on new enrollment | Enrollments | *confirm* | Enrollments, Grade Bands | Enrollments | v8.1 | Partial | Med | **Rewrite** | 001, 003 | M | P2 |
| 003 | Assign Grade Band — If Grade Changes | Update Grade Band when grade changes | Enrollments | Grade changes | Enrollments, Grade Bands | Enrollments | v2.0 | Partial | Med | **Rewrite** | 002 | M | P3 |

---

## Master inventory — Submission intake (005–007, 009, 010, 013, 021–023)

| # | Name | Purpose | Trigger table | Trigger conditions | Reads | Writes | Ver | Std | Risk | Disposition | Related | Effort | Pri |
|---|------|---------|---------------|-------------------|-------|--------|-----|-----|------|-------------|---------|--------|-----|
| 005 | Assign Week to Submission | Map Week from activity date | Submissions | *confirm* | Submissions, Weeks | Submissions | v4.0 | Legacy | Med | **Rewrite** | 023, C-018 | M | P2 |
| 006 | Set Video Count | Set video count fields | Submissions | *confirm* | Submissions | Submissions (Video Count) | v3.0 | Legacy | Low | **Merge → 021** | 021, 009 | S | P1 |
| 007 | Duplicate Checker | Flag duplicate submissions | Submissions | *confirm* | Submissions | Submissions (duplicate flags) | v2.0 | Legacy | Med | **Keep** then Rewrite | C-024 | M | P2 |
| 009 | Create Submission Assets | Copy attachments to Submission Assets | Submissions | *confirm* | Submissions | Submission Assets | — | Legacy | High | **Rewrite** | 020, 013, C-013 | L | P1 |
| 010 | Create XP Event from Submission | Award shooting XP | Submissions | Count This Submission? + eligible | Submissions, XP Events, WAS | XP Events, Submissions | 10.4 | Partial | High | **Keep** then Rewrite | 031, 041 | L | P1 |
| 013 | Create or Link Video Feedback | Create/repair VF; arm 070b | Submission Assets | Video destination; attachment; links | Assets, VF, Enrollments | VF, Assets | v2.0 | Partial | High | **Keep** (production) | 112, 070b, 111 | M | P0 |
| 021 | Set Attachment Upload Status | Processing / No Files status | Submissions | *confirm* | Submissions | Submissions (Upload Status) | v2.0 | Legacy | Low | **Merge → 006** | 006, 009 | S | P1 |
| 022 | Sync Child Upload Writeback | Write Make upload results to child | Submission Assets | Upload status + child linked | Assets, HW/VF | HW or VF, Assets | v1.1 | Partial | High | **Keep** | 070a/b, Make | M | P1 |
| 023 | Assign Enrollment to Submission | Link submission to enrollment | Submissions | *confirm* | Submissions, Enrollments | Submissions | v2.0 | Legacy | Med | **Keep** then Rewrite | 001, C-010 | M | P2 |

---

## Master inventory — Homework (020, 063–065, 067, 070a, 071)

| # | Name | Purpose | Trigger table | Trigger conditions | Reads | Writes | Ver | Std | Risk | Disposition | Related | Effort | Pri |
|---|------|---------|---------------|-------------------|-------|--------|-----|-----|------|-------------|---------|--------|-----|
| 020 | Link or Create Homework Completion | Create/link HW completion from asset | Submission Assets | Homework asset ready | Assets, HW, Enrollments | HW, Assets | v2.3 | Partial | High | **Keep** | 070a, 064 | M | P1 |
| 063 | Copy Grade Band to HW Completion | Backfill Grade Band | Homework Completions | *confirm* | HW, Enrollments | HW | v2.0 | Legacy | Low | **Merge → 020** | 020 | S | P2 |
| 064 | Prepare Homework XP Award | Set award prep fields | Homework Completions | *confirm* | HW, Enrollments | HW, Enrollments | v12.1 | Legacy | High | **Keep** (split from 065) | 065, 066 | M | P1 |
| 065 | Create Homework XP Event | Create XP; arm 071 | Homework Completions | Reviewed, satisfactory, pending | HW, XP Events | HW, XP Events | v9.2 | Partial | High | **Keep** | 064, 071, EMC | L | P1 |
| 067 | Link HW from Reflection Quiz | HW17 Fillout path | Final Reflection Quiz | Ready + enrollment | Quiz, HW | HW | v1.0 | Partial | Med | **Rewrite** | C-009 | L | P2 |
| 070a | Send Homework Asset to Make | Upload engine webhook | Submission Assets | Send to Make + homework ready | Assets | Assets | v4.1 | Partial | High | **Keep** (not email) | 020, Make | M | P1 |
| 071 | Homework Feedback Email | Build + send parent email | Homework Completions | Parent feedback ready | HW, Enrollments | HW (package) | v3.4 | Partial | Med | **Move → EMC** | 065, Make | M | P1 |

---

## Master inventory — Weekly summary (030–034)

| # | Name | Purpose | Trigger table | Trigger conditions | Reads | Writes | Ver | Std | Risk | Disposition | Related | Effort | Pri |
|---|------|---------|---------------|-------------------|-------|--------|-----|-----|------|-------------|---------|--------|-----|
| 030 | Copy Grade Band to WAS | Copy grade band link | Weekly Athlete Summary | *confirm* | WAS, Enrollments | WAS | v3.0 | Partial | Low | **Merge 030+032+033** | 031 | S | P2 |
| 031 | Find or Create WAS from Submission | Create/link WAS | Submissions | Counted + WAS empty | Submissions, WAS | WAS, Submissions | v3.1 | Partial | High | **Keep** | 010, 030–034 | M | P1 |
| 032 | Link Challenge Goal to WAS | Link goal record | Weekly Athlete Summary | *confirm* | WAS, Goals | WAS | v3.2 | Partial | Low | **Merge 030+032+033** | 030, 033 | S | P2 |
| 033 | Assign Homework to WAS | Link homework assignment | Weekly Athlete Summary | *confirm* | WAS, Curriculum | WAS | v3.1 | Partial | Med | **Merge 030+032+033** | 057 | M | P2 |
| 034 | Set Previous Week Helpers | Week helper fields | Weeks / WAS | *confirm* | Weeks, WAS | WAS, Weeks | v3.4 | Partial | Med | **Keep** | 057 | M | P2 |

---

## Master inventory — Levels (041–043)

| # | Name | Purpose | Trigger table | Trigger conditions | Reads | Writes | Ver | Std | Risk | Disposition | Related | Effort | Pri |
|---|------|---------|---------------|-------------------|-------|--------|-----|-----|------|-------------|---------|--------|-----|
| 041 | Mark Level Recalc Needed | Flag enrollment for 042 | XP Events | XP created with points | XP Events, Enrollments | Enrollments (checkbox) | 3.0 | Partial | Med | **Keep** (do not merge into 010) | 042 | S | P2 |
| 042 | Assign Current/Next Level | Level + gate assignment | Enrollments | Enters view: Recalc Needed | Enrollments, Levels, Gates | Enrollments | 3.0 | Partial | High | **Keep** then Rewrite | 041, 043 | L | P1 |
| 043 | Set Level Gate Rule from Next Level | Copy gate rule link | Enrollments | *confirm* | Enrollments, Levels | Enrollments | v2.0 | Legacy | Low | **Retire** | 042 supersedes | S | P0 |

---

## Master inventory — Achievements & streaks (053–059, 066)

| # | Name | Purpose | Trigger table | Trigger conditions | Reads | Writes | Ver | Std | Risk | Disposition | Related | Effort | Pri |
|---|------|---------|---------------|-------------------|-------|--------|-----|-----|------|-------------|---------|--------|-----|
| 053 | Streak Occurrences Rebuild | Upsert streak occurrence rows | Submissions | *confirm* | Submissions, Streak Occ | Streak Occ | 5.1 | Legacy | High | **Keep** then Rewrite | 054, 055 | L | P2 |
| 054 | Create Streak XP Event | Award streak XP | Streak Occurrences | Ready for XP | Streak Occ, XP Events | XP Events | v5.4 | Partial | High | **Keep** | 053 | M | P2 |
| 055 | Recalc Current Shooting Streak | Update enrollment streak fields | Submissions | *confirm* | Submissions, Enrollments | Enrollments | v3.2 | Partial | Med | **Keep** | 056 | M | P2 |
| 056 | Refresh Streaks Daily | Scheduled streak refresh | Enrollments | Scheduled | Enrollments | Enrollments | v1.2 | Partial | Med | **Keep** | 055 | M | P2 |
| 057 | Perfect Week Eligibility | Calculate perfect week helpers | Weekly Athlete Summary | *confirm* | WAS | WAS | 1.2 | Legacy | Med | **Keep** (split from 058) | 033, 058 | M | P2 |
| 058 | Create Perfect Week Unlock | Create achievement unlock | Weekly Athlete Summary | *confirm* | WAS, Unlocks | Unlocks | 1.0 | Legacy | Med | **Keep** | 057, 059 | M | P2 |
| 059 | Create XP from Achievement Unlock | Award achievement XP | Athlete Achievement Unlocks | Pending + ready | Unlocks, XP Events | XP Events | v3.5 | Partial | High | **Keep** | 066, 058 | M | P1 |
| 066 | Create Shot Milestone Unlocks | Milestone unlocks + Week | Enrollments | Run Shot Milestone Check? | Enrollments, Submissions, Milestones, Weeks, Unlocks | Unlocks, Enrollments | **v3.1** | **V2** | High | **Keep** — deploy to Airtable | 059, H-002 | S | P0 |

---

## Master inventory — Email & Make (070b, 072–077)

| # | Name | Purpose | Trigger table | Trigger conditions | Reads | Writes | Ver | Std | Risk | Disposition | Related | Effort | Pri |
|---|------|---------|---------------|-------------------|-------|--------|-----|-----|------|-------------|---------|--------|-----|
| 070b | Send Video Asset to Make | Upload engine webhook | Submission Assets | Send to Make + video ready | Assets | Assets | v4.1 | Partial | High | **Keep** (not email) | 013, Make | M | P1 |
| 072 | Build Weekly Summary Email | Build HTML package | Weekly Athlete Summary | Build Weekly Email Now? | WAS, many | WAS (email fields) | v3.7 | Partial | Med | **Move → EMC builder** | 074, C-011 | XL | P1 |
| 073 | Video Feedback Parent Email | Build + send | Video Feedback | Feedback ready | VF, Enrollments | VF | v3.2 | Partial | Med | **Move → EMC** | 114, Make | M | P2 |
| 074 | Send Weekly Summary to Make | Webhook send | Weekly Athlete Summary | Send to Make? + ready | WAS | WAS (handoff) | v2.0 | Legacy | Med | **Move → EMC sender** | 072 | M | P1 |
| 075 | Build Welcome Email | Welcome package | Enrollments | Program Instance + empty package | Enrollments | Enrollments | v3.0 | Partial | Low | **Move → EMC** | 001 | M | P3 |
| 076 | Build Daily Submission Email | Build daily receipt | Submissions | Build Daily Email Now? | Submissions, WAS | Submissions | v6.4 | Partial | Med | **Move → EMC builder** | 077 | M | P1 |
| 077 | Send Daily Email to Make | Webhook send | Submissions | Send Daily Email Now? | Submissions | Submissions | v5.0 | Partial | Med | **Move → EMC sender** | 076 | M | P1 |

---

## Master inventory — Video review & XP (111–114)

| # | Name | Purpose | Trigger table | Trigger conditions | Reads | Writes | Ver | Std | Risk | Disposition | Related | Effort | Pri |
|---|------|---------|---------------|-------------------|-------|--------|-----|-----|------|-------------|---------|--------|-----|
| 111 | Copy Grade Band to Video Feedback | Backfill Grade Band | Video Feedback | *confirm* | VF, Enrollments | VF | v1.1 | Legacy | Low | **Merge → 013** | 013 | S | P2 |
| 112 | Create Video Feedback from Asset | Create VF row only | Submission Assets | Video route; VF empty | Assets, VF | VF only | v2.1 | Legacy | Low | **Retire** (OFF, monitor) | 013 duplicate | S | P0 |
| 113 | Assign Base Video XP | Prep XP fields | Video Feedback | *confirm* | VF | VF | v6.2 | Partial | High | **Keep** (split from 114) | 114 | M | P1 |
| 114 | Create/Update Video XP Event | Award video XP | Video Feedback | Posted + ready for XP | VF, XP Events | VF, XP Events | v5.8 | Partial | High | **Keep** (reference XP pattern) | 113, 073 | L | P1 |

---

## Master inventory — Zoom (101)

| # | Name | Purpose | Trigger table | Trigger conditions | Reads | Writes | Ver | Std | Risk | Disposition | Related | Effort | Pri |
|---|------|---------|---------------|-------------------|-------|--------|-----|-----|------|-------------|---------|--------|-----|
| 101 | Award Meeting XP | Zoom attendance XP | Zoom Meetings | Create XP Events + ready | Meetings, Attendees, XP | XP Events | v5.4 | Partial | High | **Keep** | C-025 | M | P2 |

---

## Retired / non-GitHub automations

| # | Name | Status | Notes |
|---|------|--------|-------|
| **012** | *(unknown — not in GitHub)* | **Deleted** | Mike confirmed legacy, unused. **+1 slot recovered.** |
| **112** | Create Video Feedback from Submission Asset | **OFF — monitor before delete** | Legacy duplicate of **013**. Do not re-enable. |

---

## Modernization schedule (recommended order)

**Do not rewrite out of order.** Each wave ends with audit pass before next wave starts.

| Wave | Focus | Automations | Goal |
|------|-------|-------------|------|
| **2a — Classify everything** | Category A–F + Complexity Score for all 46 | All | Wave 2a success criteria; OMNI trigger confirm; **no unapproved production changes** |
| **2b — Deploy V2 reference** | Paste **066 v3.1** | 066 | Production parity; Category A after deploy |
| **2c — Approved retirements** | Duplicates + superseded | 112 delete, 043 retire | Reduce complexity; slots secondary |
| **2d — EMC design** | Schema + Email Key registry | — (doc only) | Unblocks C-011 |
| **2e — EMC pilot** | Weekly email | 072+074 → EMC | Simpler email architecture |
| **2f — Pipeline merges (if clarity allows)** | WAS + video helpers | 006+021, 030+032+033, 111 | Merge only after four-axis pass |
| **2g — EMC remaining** | Daily + feedback + welcome | 076+077, 071, 073, 075 | Simpler email architecture |
| **2h — V2 rewrites by priority** | XP + intake core | 010, 009, 020, 065, 114, 042… | Category B — complexity tier order |
| **3 — Features** | Parent UX, reports, media | *after 2h* | New work only |

---

## Per-automation review workflow (repeat for each #)

1. Confirm live trigger in Airtable OMNI (match docblock).
2. **Four-axis evaluation** — still needed? understandable? V2 standard? slot savings if merged?
3. Assign **Category A–F** and **Complexity Score + tier** ([doc 06](./v2/06-automation-standards.md)).
4. Set **modernization priority** (P0–P3).
5. If Category B rewrite: full script to **066 v3.1** structure.
6. If Category C merge: confirm clarity benefit before combining.
7. Dry-run matching audit extension on **dev** base.
8. Test one sandbox record (Complex/Critical tiers required).
9. GitHub commit → paste to **dev** Airtable → audit → Mike approves → paste to **prod** → `CHANGELOG.md`. See [V2-015](./v2-015-development-base-architecture.md).
10. Update this roadmap row + [automation-index.md](./automation-index.md).

---

## OMNI verification checklist (Wave 2a — Mike)

Run in Airtable OMNI to complete Wave 2a classification. Record results in this doc revision log.

| # | Check | Expected | Actual (fill in OMNI) |
|---|-------|----------|----------------------|
| 1 | Total automations (active + disabled) | ~49 after 012 delete | |
| 2 | **012** absent from automation list | Deleted | |
| 3 | **112** status | OFF (disabled) | |
| 4 | **013** status | ON — production Video Feedback | |
| 5 | **043** status + **042** docblock note | 043 can retire if 042 assigns gate rule | |
| 6 | Rows with *confirm in Airtable* in [automation-index.md](./automation-index.md) | Triggers match docblocks | |
| 7 | Every automation assigned **Category A–F** | 46/46 in inventory below | |
| 8 | Every automation has **Complexity Score + tier** | Per [doc 06](./v2/06-automation-standards.md) | |

**After monitor period:** delete **112** automation (Category F) — Mike-approved production change only.

---

## Revision log

| Date | Notes |
|------|-------|
| 2026-07-05 | V2-014 created — Phase 2 Platform Modernization master inventory; 012 deleted; 112 OFF; 066 V2 reference |
| 2026-07-05 | Cross-linked from backlog, PROJECT_STATE, automation-index, ChatGPT brief |
| 2026-07-05 | Philosophy update — complexity-first framing; Category A–F; four-axis evaluation; Complexity Score in doc 06; Wave 2a = classify everything; Lambda deferred |
| 2026-07-05 | **Wave 2A active** — classification-only; infrastructure stable; DEV-first rule in doc 04 |
