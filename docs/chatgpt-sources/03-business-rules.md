# 03 — Business Rules (Engine Contract)

**127 Sports Intensity Shooting Challenge — platform**  
**Status:** Engine contract (Layer 1). Describes **how the platform works**, not how any season is configured.  
**Last updated:** 2026-07-03  
**Governed by:** [01-constitution.md](./01-constitution.md) · [02-master-direction.md](./02-master-direction.md)

---

## 1. Purpose of this document

This document describes **how the engine behaves** — the stable contract between software, operators, and participants.

It should still be correct five years from now even if every XP value, level threshold, gate requirement, and the **number of levels** has changed.

It answers:

- How XP is created and counted
- How levels are calculated
- How gates are evaluated
- What participants should always be able to see and verify
- Which Configuration tables hold season-specific values (not defined here)

**This document is not:**

- A rulebook for one season
- The live database
- Parent-facing copy (**Presentation**, generated from Configuration + Content)

**Platform vs season configuration:**

| Good (platform — say this) | Not appropriate here (season config) |
|----------------------------|--------------------------------------|
| Athletes progress through a single progression system using Lifetime XP and Level Gate evaluation | Homework is worth 35 XP |
| XP awards are determined by the active **XP Reward Rules** configuration | Level 2 requires one homework assignment |
| Level requirements are determined by the active **Level Gate Rules** configuration | Early levels are Levels 1–5 |
| **Active season configuration** determines gameplay values; the engine reads and applies it | Streak XP is 15 points |
| Level names and thresholds come from the active **Levels** table | Rookie Shooter requires 200 XP |

Season tuning for a specific year lives in Airtable Configuration, [season-configuration-design.md](./season-configuration-design.md), and [02-master-direction.md](./02-master-direction.md) — not here.

---

## 2. Engine vs configuration

**Constitutional principle** ([01-constitution.md](./01-constitution.md)):

> The Shooting Challenge is a **configurable game engine**. Season-specific rules are defined through **configuration data**, not software logic. A new season launches by changing Configuration tables and Presentation — not by rewriting automations or application architecture.

The platform must operate correctly regardless of XP values, level count, level names, gate requirements, activity requirements, award thresholds, week definitions, season dates, or future rule changes. Those belong in **Configuration** (Layer 2).

### Four layers

| Layer | Role | This doc |
|-------|------|----------|
| **1 — Engine** | Stable behavior: create XP, assign levels, evaluate gates, send summaries | **You are here** |
| **2 — Configuration** | Per-season gameplay values | Referenced, never specified |
| **3 — Content** | Homework, videos, Zoom, messages, catalog entries | Activity definitions only |
| **4 — Presentation** | Game manual, website, guides | Generated from 1–3 |

**For developers and AI assistants:** Before adding a number, level name, date, or threshold to this file, stop — it belongs in Layer 2.

---

## 3. Design philosophy

Platform intent — applies every season regardless of Configuration.

- The system rewards **habits** over talent.
- The system rewards **consistency** over intensity.
- The system rewards **complete participation** over specialization.
- The system is designed to **motivate**, not punish.
- Every athlete should experience **success early**.
- The **highest achievements** should require commitment across the entire program.

**Educational Athletics:** Basketball is the vehicle. Shooting is the foundation. Homework, video, Zoom, reading, and character work develop better players and responsible young people.

**Progression model:** Each enrollment follows **one level ladder**. The engine does not hardcode how many levels exist or what they are named. Highest positions on that ladder represent athletes who engaged with the full program — not volume shooting alone.

### 3.1 Progression phases (platform concepts)

The platform does **not** assume a fixed number of levels. Operators map the active **Levels** ladder onto four **progression phases** when tuning Configuration and writing Presentation. These are design concepts — not engine fields, not fixed level ranges.

| Phase | Platform intent |
|-------|-----------------|
| **Early progression** | Athletes learn every activity type; gates introduce program components gradually |
| **Mid progression** | Habits form across shooting and educational activities |
| **Advanced progression** | Sustained full-program participation is expected |
| **Highest achievement** | Top of the ladder recognizes complete program engagement |

How many **Levels** rows fall into each phase, and what each gate requires, is **Configuration** — see [season-configuration-design.md](./season-configuration-design.md).

---

## 4. How we review this document

1. Read top to bottom.
2. For each statement, ask:
   - **Is this platform behavior** (Layer 1)?
   - **Or did we embed season Configuration** (Layer 2)?
   - **Does it match the [Constitution](./01-constitution.md)?**
3. After content is agreed, polish wording.

Gate spread tuning and numeric worksheets belong in [season-configuration-design.md](./season-configuration-design.md) — not here.

---

## 5. Progression engine

Every active **Enrollment** exposes:

| Field / concept | Engine behavior |
|-----------------|-----------------|
| **Lifetime XP** | Sum of qualifying **XP Events** |
| **Current Level** | Highest active **Levels** row the athlete qualifies for (XP + gates) |
| **Next Level** | Next row in active level order |
| **Level Status** | e.g. Assigned, **Gate Blocked**, Error |

**Gate Blocked:** Lifetime XP meets the threshold for the next level, but the athlete has not yet met the active **Level Gate Rules** for that level.

**Recalculation:** Automation **041** marks enrollments for recalc; **042** assigns current/next level and gate rule link.

---

## 6. XP engine

### 6.1 Activity buckets

XP is one lifetime total per enrollment, earned from **distinct activity types**. Each type is governed by active **XP Reward Rules** and/or **Achievements**.

| Bucket | Engine source | Configuration |
|--------|---------------|---------------|
| Daily shooting | Counted submission day → XP Event | **XP Reward Rules** |
| Homework | Satisfactory completion → XP Event | **XP Reward Rules** |
| Video | Posted feedback → XP Event | **XP Reward Rules** |
| Zoom | Attendance → XP Event | **XP Reward Rules** |
| Streaks | Milestone unlock → XP Event | **Achievements** + **XP Reward Rules** |
| Shot milestones | Unlock → XP Event | **Achievements** + **XP Reward Rules** |
| Perfect week | Unlock → XP Event | **Achievements** |
| Manual / bonus | Operator-documented exception | Outside standard rules |

Under typical Configuration, shooting contributes the largest share of XP — that is design intent, not a hardcoded ratio in code.

### 6.2 One source → one XP event

Each qualifying action creates **at most one** **XP Events** row, linked to its source record. Duplicates are prevented by **Source Key** patterns in automations.

### 6.3 Awarding rule

> **XP is awarded according to the active XP Reward Rules** (and achievement-linked rules where applicable).

Amounts, rule keys, and active flags are **Configuration** — never engine constants in scripts.

---

## 7. Level engine

### 7.1 Assignment algorithm

1. Read active **Levels** rows (`Active?`) in progression order.  
2. For each level, compare enrollment **Lifetime XP** to **XP Required (Cumulative)**.  
3. If XP qualifies, evaluate linked **Level Gate Rules** (`Version Active?`, `Gate Enabled?`).  
4. **Current Level** = highest level where XP and all enabled gates pass.  
5. If XP qualifies for next level but gates fail → **Gate Blocked** at current level.

### 7.2 Level ladder

> **Level names, count, and XP thresholds are defined in the active Levels table.**

The engine does not hardcode level count or titles. Operators may add, rename, or remove levels in **Configuration** as long as progression order remains consistent.

### 7.3 Participant visibility

The engine and **Presentation** layer must always expose:

- Current level name (from active **Levels**)  
- Lifetime XP  
- XP required for next level (from active **Levels**)  
- Remaining gate requirements (from active **Level Gate Rules** for next level)  

Copy is generated from live Configuration — e.g. *“You’re ready on XP — complete [N] more [activity] to advance.”*

---

## 8. Activity definitions

Engine terms — what counts toward XP, gates, and rollups. Requirements *how many* of each activity are **Configuration**.

### 8.1 Shooting / submissions

| Term | Definition |
|------|------------|
| **Submission** | Daily log via configured intake channel |
| **Counted submission** | Submission with `Count This Submission?` and valid enrollment link |
| **Counted submission day** | At most one shooting XP event per enrollment per calendar day |
| **Shots counted** | Rollup for milestones/stats — separate from daily XP award |

### 8.2 Homework

| Term | Definition |
|------|------------|
| **Homework Completion** | Row linked to enrollment, program period, and assignment |
| **Satisfactory** | Coach review complete + satisfactory — gates and homework XP use this state |

### 8.3 Video

| Term | Definition |
|------|------------|
| **Video submission** | Athlete submission per program schedule |
| **Posted feedback** | Coach posted feedback — video XP and gate counts use this state |

### 8.4 Zoom

| Term | Definition |
|------|------------|
| **Attendance** | Record linked to enrollment and meeting; XP per active **XP Reward Rules** |

### 8.5 Streaks

| Term | Definition |
|------|------------|
| **Streak block** | Consecutive calendar days with counted submissions; gaps break the block |
| **Streak milestone** | Defined in active **Achievements** |
| **Longest streak** | Enrollment rollup; may be referenced in gate minimums |

Milestone values and repeat-after-break economics are **Configuration**.

### 8.6 Shot milestones & perfect week

**Athlete Achievement Unlocks** award XP via achievement automations. Separate from gates unless a gate row references a rollup.

---

## 9. Gate engine

### 9.1 Guiding principle

> **The purpose of Level Gates is not to prevent advancement. Their purpose is to encourage balanced participation and ensure that athletes experience every important component of the Educational Athletics program.**

Gate spread and pacing are **Configuration** choices. The engine evaluates whatever minimums are in active **Level Gate Rules**.

### 9.2 Evaluation rule

> **An athlete progresses by satisfying the currently active Level Gate Rules** for each level, in addition to meeting XP thresholds in **Levels**.

Automation **042** compares enrollment rollups to gate fields:

| Field | Compared to enrollment rollup |
|-------|------------------------------|
| `Gate Enabled?` | If false, XP alone controls this level |
| `Minimum Submissions` | Total Submissions |
| `Minimum Homework` | Total Homework Completions (satisfactory) |
| `Minimum Videos` | Total Video Submissions (posted feedback) |
| `Minimum Zoom Meetings` | Total Zoom Attendances |
| `Minimum Streak Days` | Longest Streak Days |
| `Version Active?` | Selects which Configuration rule set is live |

### 9.3 Gate Blocked — messaging pattern

| Avoid | Prefer |
|-------|--------|
| “You’re blocked.” | “You’re ready on XP — here’s what unlocks the next level…” |
| “You failed homework.” | “Complete [N] more satisfactory homework.” |
| “Shooting doesn’t matter.” | “Shooting got you here; the next level also needs [activity].” |

**[N]** and activity names come from live Configuration / enrollment display.

---

## 10. Awards engine

| Concept | Layer |
|---------|-------|
| **Awards** catalog metadata | Configuration + Content |
| **Award Recipients** | Season operational data |
| Awards **recognize**; levels **structure** progression | Engine principle |

Recognition rules and thresholds are **Configuration** — not hardcoded in progression automations.

---

## 11. Communication & transparency

| Principle | Engine expectation |
|-----------|-------------------|
| **Before season start** | Presentation publishes rules derived from active Configuration |
| **On summary schedule** | Summary engine delivers progress, level, and next gate item per active **Weeks** / program cadence |
| **End of season** | Individual family summary (not generic bulk) |
| **Transparency** | XP Events, level, gate status, and activity completion are verifiable |
| **Mid-season stability** | Do not change Configuration gameplay values mid-season without documented migration and family notice |

Exact dates, copy, channels, and summary frequency are **Configuration / Content / Presentation**.

---

## 12. Configuration tables (Layer 2)

> **Active season configuration determines gameplay values; the engine reads and applies it.**

Operators edit these per season. Automations **read** them; they should not duplicate tunable values in script `CONFIG`.

| Table | Holds |
|-------|--------|
| **Levels** | Names, count, cumulative XP thresholds, `Active?` |
| **Level Gate Rules** | Gate minimums, `Gate Enabled?`, `Version Active?` |
| **XP Reward Rules** | Rule keys, XP amounts, `Active?` |
| **Achievements** | Milestone definitions, streak lengths |
| **Weeks** | Program period boundaries |
| **Awards** | Catalog metadata |

See [../shooting-challenge-v2-config-vs-code.md](../shooting-challenge-v2-config-vs-code.md).

**Season launch:** Update Configuration → export → update Presentation. No engine deploy required if this contract is unchanged.

---

## Appendix A — Layer classification by section

| Section | Layer |
|---------|-------|
| 1–4 Purpose, engine vs config, philosophy, review | Engine |
| 5 Progression | Engine |
| 6 XP | Engine |
| 7 Levels | Engine |
| 8 Activities | Engine |
| 9 Gates | Engine |
| 10 Awards | Engine + Configuration pointer |
| 11 Communication | Engine principles |
| 12 Config tables | Configuration pointer |
| Appendix B | External references only |

---

## Appendix B — Where season-specific material lives

**Not part of this document.**

| Topic | Document |
|-------|----------|
| Gate spread design and numeric worksheet | [season-configuration-design.md](./season-configuration-design.md) |
| Locked decisions for a target season | [02-master-direction.md](./02-master-direction.md) · [master direction](../shooting-challenge-v2-master-direction.md) |
| Base cutover and launch checklist | [base cutover](../shooting-challenge-v2-base-cutover.md) |
| Historical season analysis | [xp-motivation-analysis](../xp-motivation-analysis-2025-26.md) |

---

## Related documents

| Doc | Layer |
|-----|-------|
| [01-constitution.md](./01-constitution.md) | Engine principle + four layers |
| [season-configuration-design.md](./season-configuration-design.md) | Configuration design (not engine) |
| [02-master-direction.md](./02-master-direction.md) | Season direction |
| [../shooting-challenge-v2-config-vs-code.md](../shooting-challenge-v2-config-vs-code.md) | Config vs script |

---

## Revision log

| Date | Notes |
|------|-------|
| 2026-07-03 | v4 — reframed as Engine Contract; four layers |
| 2026-07-03 | **v5** — progression phases without fixed level counts; season design moved to separate doc; removed automation IDs from activity table; cadence language generalized |
