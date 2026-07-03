# 03 — Business Rules

**127 Sports Intensity Shooting Challenge — 2026–27 season**  
**Status:** Foundational draft. **Section 8.3 (gate spread) is under active review — not finalized.**  
**Last updated:** 2026-07-03  
**Governed by:** [01-constitution.md](./01-constitution.md) · [02-master-direction.md](./02-master-direction.md)

---

## 1. Purpose of this document

This is the **rule book for how the game works** — for coaches, operators, parents, and (in plain language) athletes.

It answers:

- What earns XP
- How levels work
- What “gates” mean and when they apply
- What full-program participation requires for the highest levels
- Where the **official numbers** live (Airtable config tables, not this file)

**This document is not the database.** At launch, the live rule set is whatever is in **Levels**, **Level Gate Rules**, and **XP Reward Rules** for season `2026-2027`. This doc explains the **design**; those tables hold the **values**.

If we invest time now to get these rules right, every future automation, website feature, parent guide, and AI recommendation has a stable source of truth to build from.

---

## 2. Design philosophy

This section is the **lens** for interpreting every other rule in this document.

- The system rewards **habits** over talent.
- The system rewards **consistency** over intensity.
- The system rewards **complete participation** over specialization.
- The system is designed to **motivate**, not punish.
- Every athlete should experience **success early**.
- The **highest achievements** should require commitment across the entire program.

**Educational Athletics:** Basketball is the vehicle. Shooting is the foundation. Homework, video, Zoom, reading, and character work exist because they develop better players and responsible young people — not as unrelated “extra school.”

**One ladder (2026–27):** Every athlete climbs the same level progression. There is no separate shots-only path this season. Highest levels represent **complete athletes**.

---

## 3. How we review this document (process)

Before polishing prose, we validate **content** in this order:

1. Read top to bottom.
2. For each rule, ask only:
   - **Is this rule correct?**
   - **Is it permanent or configurable?** (see section 6.3)
   - **Does it match the [Constitution](./01-constitution.md)?**
3. After content is agreed, polish wording for parents and operators.

**Current focus:** Section **8.3 (gate spread)** — this will shape parent experience more than almost anything else. Do not finalize gate numbers here; finalize the **learning tiers** first, then tune **Level Gate Rules** in Airtable.

---

## 4. Season calendar

**Season configuration** for dates and week rows; **permanent principles** for when rules take effect.

| Item | Rule type | Rule |
|------|-----------|------|
| **Season dates** | Season configuration | May 1, 2027 – June 30, 2027 (`2026-2027` in program config) |
| **Week boundaries** | Season configuration | **Weeks** table; timezone **America/Denver** |
| **When rules apply** | Permanent principle | All config for this season is **live on Day 1** — no mid-season introduction of levels/gates (2025–26 lesson) |
| **Enrollment** | Permanent principle | One **Enrollment** per athlete per season; must be **Active?** for leaderboard, XP, and emails |

---

## 5. One progression system (locked for 2026–27)

**Permanent principle** for how progression works; **season policy (2026–27)** for one ladder only.

Every athlete has:

1. **Lifetime XP** — total experience points from all qualifying activities  
2. **Current Level** — title from the **Levels** table, driven by XP **and** gates  
3. **Next Level** — the next level they are working toward  
4. **Level Status** — e.g. Assigned, **Gate Blocked**, or Error  

**Gate Blocked** means: the athlete has enough **XP** for the next level but has not yet met the **program requirements** defined for that level in **Level Gate Rules**.

**Season policy (2026–27):** We are **not** using a separate shooter track vs program track. If parent friction remains after this season, architecture may be revisited **next year** — not during 2026–27.

---

## 6. Experience points (XP)

### 6.1 Separate XP buckets (activity types)

**Permanent principle:** XP is one lifetime total on the enrollment, earned from **distinct activity types** (“buckets”). Each bucket has its own meaning; shooting remains the largest share in normal play.

| Bucket | Typical source | Where configured |
|--------|----------------|------------------|
| **Daily shooting** | One counted submission day | **XP Reward Rules** (e.g. `SHOOTING_BASE`) |
| **Homework** | Coach-marked satisfactory homework | **XP Reward Rules** + automation 065 |
| **Video** | Posted coach video feedback | **XP Reward Rules** + automation 114 |
| **Zoom** | Attendance / participation | **XP Reward Rules** + automation 101 |
| **Streaks** | Consecutive counted shooting days | **Achievements** + **XP Reward Rules** |
| **Shot milestones** | Shot count milestones | **Achievements** + **XP Reward Rules** |
| **Perfect week** | Perfect week unlock | **Achievements** + automation 059 |
| **Manual / bonus** | Coach-issued exceptions | Documented separately |

### 6.2 One source → one XP event

**Permanent principle:** Each qualifying action creates **at most one** row in **XP Events**, linked to its source. Duplicates are prevented by **Source Key** patterns in automations.

Families should trust: *if the activity counted, the XP is there once.*

### 6.3 Permanent vs configurable vs historical

Use this distinction everywhere in this document and in parent-facing copy.

| Type | Meaning | Example |
|------|---------|---------|
| **Permanent principle** | Design truth — rarely changes | “One counted shooting day can earn at most one shooting XP event.” |
| **Season configuration** | **Official values for 2026–27** — live in Airtable tables | XP amount for `SHOOTING_BASE`; cumulative XP for Rookie Shooter; homework minimum on a gate row |
| **Historical reference** | Past season data for planning only — **not** a rule for 2026–27 unless copied into config | 2025–26: ~20 XP per shooting day; gates clustered at Deadeye |

**Rule:** If a number is not exported from **XP Reward Rules**, **Levels**, or **Level Gate Rules** for `2026-2027`, it is **not** the live rule — even if it appears in this doc as history or example.

### 6.4 Historical reference — XP amounts (2025–26 only)

**Not season configuration. Not permanent principles.**

| Activity | Historical reference (2025–26) |
|----------|--------------------------------|
| Counted shooting day | 20 XP |
| Satisfactory homework | 35 XP |
| Video (posted feedback) | 25 XP |
| Zoom (attendance / participation) | 60 XP (+ bonuses per rules) |
| Streak milestones | 10–105 depending on length (see **Achievements**) |

2026–27 amounts are set in **XP Reward Rules** during Q1 2027 tuning and exported into the parent game manual at launch.

---

## 7. Levels

### 7.1 How level assignment works

**Permanent principle:**

1. Automation **041** marks an enrollment for recalculation when XP or gate-related stats change.  
2. Automation **042** reads **Levels** (cumulative XP thresholds) and **Level Gate Rules** (requirements).  
3. **Current Level** is the highest level the athlete qualifies for — XP sufficient **and** all enabled gates for that level met.  
4. If XP qualifies for the next level but gates are not met, status is **Gate Blocked** until requirements are met.

### 7.2 Level ladder (names)

**Season configuration:** Level **names** and **XP Required (Cumulative)** live in the **Levels** table.

The program uses **twelve** level titles (2025–26 reference names):

| Order | Level name |
|-------|------------|
| 1 | Beginner |
| 2 | Rookie Shooter |
| 3 | Developing Shooter |
| 4 | Consistent Shooter |
| 5 | Dangerous Shooter |
| 6 | Hot Hand |
| 7 | Deadeye |
| 8 | Sharpshooter |
| 9 | Pro |
| 10 | All-Star |
| 11 | Legend |
| 12 | G.O.A.T. |

**Historical reference (2025–26):** ~200 XP per level step if only shooting days drive XP. **2026–27 thresholds are tuned in the Levels table** — verify config at launch.

### 7.3 What families see

**Permanent principle:** Athletes and parents should always see current level, lifetime XP, XP to next level, and **what program activity unlocks the next level** — in plain language, from **Level Gate Rules**.

**Illustrative example only:** *“You’re ready on XP for the next level — complete one more satisfactory homework assignment to advance.”* (Exact counts come from config, not from this sentence.)

---

## 8. Level gates

### 8.1 Guiding principle

> **The purpose of Level Gates is not to prevent advancement. Their purpose is to encourage balanced participation and ensure that athletes experience every important component of the Educational Athletics program.**

Gates optimize for **learning**, not for **difficulty**. They introduce homework, video, Zoom, streaks, and submissions in a rhythm that teaches the whole program — not a surprise wall after weeks of shooting-only play.

### 8.2 What gates are

**Permanent principle:** A **gate** is a minimum count of program activities (submissions, homework, videos, zoom, streak days) stored in **Level Gate Rules**. Automation **042** compares enrollment rollups to these minimums before assigning a level, even when XP is already high enough.

**Configurable per season:** Each field below on each gate row.

| Field | Meaning |
|-------|---------|
| `Gate Enabled?` | If off, XP alone controls this level |
| `Minimum Submissions` | Counted submission days (lifetime on enrollment) |
| `Minimum Homework` | Satisfactory homework completions |
| `Minimum Videos` | Video submissions with posted feedback |
| `Minimum Zoom Meetings` | Zoom attendance records |
| `Minimum Streak Days` | Longest streak days (enrollment rollup) |
| `Version Active?` | Which rule set applies (e.g. `2026-2027`) |

### 8.3 Gate spread — learning tiers (DRAFT — under review)

**Status: NOT FINALIZED.** Do not enter these ideas into **Level Gate Rules** as numbers until this section is approved. Exact minimums belong **only** in Airtable config after review.

We optimize gate design for **what the athlete learns at each stage**, not how hard we can make advancement.

**Conceptual bands vs level rows:** The four tiers below are **learning bands** — design intent, not Airtable rows. The 2026–27 ladder has **twelve** named levels in the **Levels** table. If a future season adds more level rows, bands can span more rows without changing the philosophy (e.g. “build habits” might cover levels 6–15 on a longer ladder). For 2026–27, map bands to the twelve levels in the table.

| Tier | Levels (12-level ladder) | Purpose |
|------|--------------------------|---------|
| **Teach the system** | 1–5 — Beginner through Dangerous Shooter | Introduce **every part** of the program: shooting, first homework, first video, first Zoom, streaks. Small gate steps so families learn early that levels use XP **and** program activities. |
| **Build habits** | 6–8 — Hot Hand through Sharpshooter | Reinforce **repeat** engagement: homework rhythm, video cadence, Zoom participation, consistency. Gates rise gradually; shooting still drives most XP. |
| **Educational Athletics depth** | 9–11 — Pro through Legend | Expect **sustained** participation across all components — not one-off checkboxes. Athletes demonstrate they are living the full program, not only logging shots. |
| **Complete development** | 12 — G.O.A.T. | Recognize athletes who met the **highest** program expectations across shooting and educational components for the season. |

**Illustrative examples only (not rules):**

- *Advancing from an early level might require one completed satisfactory homework assignment* — so homework is in mind from the start.  
- *A mid ladder level might expect athletes to have experienced video feedback more than once* — habit, not a single token submission.  
- *Upper tiers might expect regular Zoom participation over the season* — community and coaching relationship, not punishment.

**What we are avoiding (2025–26 lesson):** Zero homework/video gates for many levels, then a large jump at Deadeye (~1,000 XP). That taught “shots only” until mid-season.

**Review checklist (rule correctness only — before approving §8.3):**

| # | Question | Answer when approved |
|---|----------|----------------------|
| 1 | Are tier boundaries correct for 2026–27 (1–5 / 6–8 / 9–11 / 12)? | |
| 2 | Does each tier teach the right *purpose* (system → habits → depth → complete)? | |
| 3 | Should any level move to a different tier? | |
| 4 | Which activity types should **first appear** in gates in the “Teach the system” tier? | |
| 5 | Does this match [Design philosophy](#2-design-philosophy) and the [Constitution](./01-constitution.md)? | |

**Next step after approval:** Fill [level-gate-rules-config-template.csv](./level-gate-rules-config-template.csv) (numbers only — not in this doc), then load **Level Gate Rules** on the 2026–27 clone base in Q1 2027.

### 8.4 Gate Blocked — parent messaging

**Permanent principle:**

| Do not say | Say instead |
|------------|-------------|
| “You’re blocked.” | “You’re ready on XP — here’s what unlocks the next level…” |
| “You failed homework.” | “Complete [N] more satisfactory homework — see your progress page.” |
| “Shooting doesn’t matter.” | “Shooting got you here; the next level also needs [activity].” |

Use **[N]** and activity names from live config / enrollment display — not from this document.

---

## 9. Activity definitions

Permanent definitions unless the pipeline changes in a documented way.

### 9.1 Shooting / submissions

| Term | Definition |
|------|------------|
| **Submission** | Daily log via Fillout (makes, attempts, date) |
| **Counted submission** | Submission marked to count (`Count This Submission?`) with valid enrollment |
| **Counted submission day** | At most one shooting XP event per enrollment per calendar day (automation 010) |
| **Shots counted** | Rollup for milestones and stats — separate from the daily XP award |

### 9.2 Homework

| Term | Definition |
|------|------------|
| **Homework Completion** | Row linked to enrollment + week + homework assignment |
| **Satisfactory** | Coach review complete + satisfactory — used for **gates** and homework XP |
| **HW17 (Final Reflection)** | Week 10 quiz — must follow same satisfactory path (V2 intake fix planned) |

### 9.3 Video

| Term | Definition |
|------|------------|
| **Video submission** | Athlete submits per program schedule |
| **Posted feedback** | Coach posted feedback — used for video XP and gate counts |

### 9.4 Zoom

| Term | Definition |
|------|------------|
| **Attendance** | Record linked to enrollment and meeting; XP per **XP Reward Rules** |

### 9.5 Streaks

| Term | Definition |
|------|------------|
| **Streak block** | Consecutive calendar days with counted submissions; gaps break the block |
| **Streak milestone** | Defined in **Achievements**; XP per **XP Reward Rules** |
| **Longest streak** | Enrollment rollup; may be used in gate minimums |

**Configurable / under review for 2026–27:** Streak **economics** (repeat-after-break vs long continuous runs) — tune in **Achievements** / **053** during Q1 2027.

### 9.6 Shot milestones & perfect week

Unlock rows in **Athlete Achievement Unlocks**; XP via **059**. Separate from gates unless a gate row references a rollup.

---

## 10. Awards and recognition

| Concept | Rule type |
|---------|-----------|
| **Awards catalog** | Season configuration (**Awards** table) |
| **Award Recipients** | Season data (per fulfillment) |
| **Weekly / end-of-season awards** | Permanent principle: awards **recognize**; levels **structure** progression |

---

## 11. Parent expectations

### 11.1 Time (honest guide)

**Permanent principle** — rough guide, not a gate requirement.

| Commitment | Rough time |
|------------|------------|
| **Shooting (foundation)** | ~5 minutes/day to log shots |
| **Full program** | Above + homework, periodic video, scheduled Zoom |

### 11.2 Communication

**Permanent principle** for timing; **season configuration** for exact copy and links.

| When | What |
|------|------|
| **Before Day 1** | Game manual from **exported config** + this doc’s principles |
| **Each week** | Automated email: progress, level, next gate item, rules link |
| **End of season** | Individual family summary |

### 11.3 Transparency

**Permanent principle:** Families can verify XP, level, gate status, and activity completion. Operators run audits when numbers disagree.

---

## 12. Config tables — source of truth (operators)

**Season configuration** for 2026–27 lives here:

| Table | Contents |
|-------|----------|
| **Levels** | Names, cumulative XP thresholds, `Active?` |
| **Level Gate Rules** | Gate minimums, `Gate Enabled?`, `Version Active?` |
| **XP Reward Rules** | Rule keys, XP amounts, `Active?` |
| **Achievements** | Milestone definitions |
| **Weeks** | Season week dates |
| **Awards** | Catalog |

See [../shooting-challenge-v2-config-vs-code.md](../shooting-challenge-v2-config-vs-code.md).

---

## 13. What we are fixing from 2025–26

**Historical reference** — V1 problems that motivate V2 rules (not live 2026–27 config).

| V1 problem | V2 response |
|------------|-------------|
| Gates clustered late | Learning tiers + spread gates in config |
| Rules not explained Week 1 | Manual + website before first submission |
| Homework felt optional for months | Early-tier gates **teach** homework’s role |
| Dual-track debated | **Rejected for 2026–27** — one ladder + communication |

---

## 14. Launch workflow (Q1 2027)

**Operator process** — numbers loaded from [level-gate-rules-config-template.csv](./level-gate-rules-config-template.csv), not from this doc.

1. Finalize **section 8.3** (this doc) — learning tiers approved via review checklist.  
2. Map tiers → **Level Gate Rules** spreadsheet (numbers in CSV / Airtable only).  
3. Clone base; clear season data; load config ([base cutover](../shooting-challenge-v2-base-cutover.md)).  
4. Test enrollments; run **041** → **042**; run audits.  
5. Export config → parent game manual + `/shoot` rules.  
6. Week 0 email; open Fillout May 1, 2027.

---

## 15. Mid-season changes

**Permanent principle:** Do not change XP amounts or gate thresholds mid-season without a documented migration and family notice.

---

## Appendix A — Rule classification by section

Use during the [review process](#3-how-we-review-this-document-process) (content before prose).

| Section | Primary rule type | Notes |
|---------|-------------------|-------|
| 1 Purpose | Permanent principle | Doc role vs Airtable config |
| 2 Design philosophy | Permanent principle | Lens for all rules |
| 3 Review process | Permanent principle | How we validate this doc |
| 4 Season calendar | Mixed | Dates = config; Day 1 / enrollment = permanent |
| 5 One progression | Mixed | Mechanics = permanent; one ladder = 2026–27 policy |
| 6 XP | Mixed | Buckets + idempotency = permanent; amounts = config / §6.4 historical |
| 7 Levels | Mixed | Assignment logic = permanent; names/thresholds = config |
| 8 Level gates | Mixed | Philosophy + fields = permanent; minimums = config after §8.3 approval |
| 9 Activities | Permanent principle | Definitions unless pipeline changes |
| 10 Awards | Mixed | Catalog = config; recognize vs structure = permanent |
| 11 Parent expectations | Permanent principle | Communication timing and transparency |
| 12 Config tables | Season configuration | Source of truth for launch numbers |
| 13 V1 fixes | Historical reference | Why V2 exists |
| 14 Launch workflow | Operator process | Not athlete-facing rules |
| 15 Mid-season | Permanent principle | Stability during season |

---

## 16. Related documents

| Doc | Purpose |
|-----|---------|
| [02-master-direction.md](./02-master-direction.md) | Mission, vision, constitution test |
| [level-gate-rules-config-template.csv](./level-gate-rules-config-template.csv) | Gate numbers worksheet (DRAFT — load to Airtable after §8.3 approval) |
| [../shooting-challenge-v2-config-vs-code.md](../shooting-challenge-v2-config-vs-code.md) | Config vs script |
| [../xp-motivation-analysis-2025-26.md](../xp-motivation-analysis-2025-26.md) | V1 historical data |

---

## Revision log

| Date | Notes |
|------|-------|
| 2026-07-03 | Full business rules v1 |
| 2026-07-03 | v2 — Design philosophy, review process, permanent/config/historical XP split; gate guiding principle; learning tiers (8.3 draft, not finalized); removed hard-coded gate number table |
| 2026-07-03 | v3 — §8.3 review checklist + conceptual bands; Appendix A rule classification; gate config CSV template |
