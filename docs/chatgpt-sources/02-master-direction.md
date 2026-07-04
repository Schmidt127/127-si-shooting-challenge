# Shooting Challenge v2 — Master Direction Plan

**Status:** Constitution document — read this before any V2 feature, rule change, or automation work.  
**Target season:** May 1, 2027 – June 30, 2027 (`2026-2027`)  
**Last updated:** 2026-07-03

**Architecture:** The platform is a **configurable game engine** — see [v2/01-constitution.md](./v2/01-constitution.md) (four layers) and [v2/03-business-rules.md](./v2/03-business-rules.md) (engine contract). This document covers **season direction** and locked 2026–27 decisions, not engine behavior.

**Related planning docs:** [v2/README.md](./v2/README.md) (numbered pack) · [shooting-challenge-v2-config-vs-code.md](./shooting-challenge-v2-config-vs-code.md) · [shooting-challenge-v2-base-cutover.md](./shooting-challenge-v2-base-cutover.md) · [close-out-considerations.md](./close-out-considerations.md) · [post-close-hygiene-2025-26.md](./post-close-hygiene-2025-26.md) · [xp-motivation-analysis-2025-26.md](./xp-motivation-analysis-2025-26.md) · [PROJECT_STATE.md](./PROJECT_STATE.md)

---

## The one question (constitution test)

Before we add or change anything in V2, ask:

> **Does this make the platform more aligned with this Master Direction Plan?**

If the answer is **no**, we modify the idea or defer it. This keeps V2 focused as it grows.

---

## V2 locked decisions (2026-07-03)

These are **decided** for the 2026–27 season. Do not reopen during build unless the owner explicitly revisits.

| Decision | What we are doing |
|----------|-------------------|
| **One ladder, not two paths** | Keep **one level system**: XP drives levels; **Level Gate Rules** set homework/video/zoom/streak requirements. **No dual-track** (no separate “shooter level” vs “program honors”) for 2026–27. |
| **Philosophy unchanged** | Full-program athletes earn the highest levels. Shooting is still the foundation. Gates exist for a reason. |
| **Spread gates early** | Requirements increase **gradually** from low levels — not a cliff at Deadeye. Example: leaving **level 1** may require **1 homework**. Exact numbers live in **Level Gate Rules** (tune before launch). |
| **Communication first** | V1 failed partly because rules were not explained before Day 1 and the platform was built while the season ran. V2: **build and explain before May 2027** — game manual, website rules, weekly emails that teach the ladder. |
| **Revisit dual-track only if needed** | If better communication + platform reliability **still** cause major parent friction after 2026–27, **then** consider architectural changes — not now. |
| **Config over scripts** | Game math and tunable rules belong in **Levels**, **Level Gate Rules**, **XP Reward Rules**, and related tables — not hardcoded in automations. See [config vs code](./shooting-challenge-v2-config-vs-code.md). |
| **Numbers later** | Do **not** lock final XP and level thresholds in planning docs now. Tune config tables in Q1 2027; manual and website publish from those tables before Day 1. |
| **Season base** | **Archive** 2025–26 base (read-only). **Clone** for 2026–27; **delete season data** in clone; **keep** config/rules tables. Details: [base cutover plan](./shooting-challenge-v2-base-cutover.md). |
| **GitHub** | **No fork** for season rollover — tag `season-2025-26-final`, continue V2 on `master`. Separate repo only for other programs (e.g. Dribble). |

---

## Mission statement

127 Sports Intensity Shooting Challenge exists to develop better basketball players through **consistent daily practice** while also teaching **life skills, discipline, character, responsibility, and independent growth**.

**Shooting will always remain the foundation** of the challenge. The highest levels of success are earned by athletes who fully embrace every part of the program.

The challenge should reward both **effort** and **excellence** while remaining **enjoyable, motivating, and fair** for athletes of all ability levels.

**This is not simply a shot-tracking app.**

**It is an Educational Athletics platform.**

---

## Vision

### When a season ends, parents should believe:

> *"My child became a better shooter, became more responsible, thought differently about basketball, and enjoyed doing it."*

### When a season ends, athletes should:

**Want to come back the following year.**

---

## Long-term vision

The Shooting Challenge becomes the **flagship program** inside a much larger **Educational Athletics platform**, including:

- Shooting Challenge
- Dribble Challenge
- Free Throw Challenge
- Basketball Reading Challenge
- Basketball Workout Challenge
- Future educational challenges

Each challenge should share a **common design philosophy** while maintaining **its own identity**.

**Planning note (2026-07):** Dribble and other challenges may use a **separate Airtable base** (copy + customize) or a **shared base with clear program tags**. That decision must be made before large architecture work (file storage, field cleanup, automation standardization).

---

## Core design philosophy

### Shooting always comes first

Everything else exists to support becoming a better basketball player:

- Homework
- Video feedback
- Reading
- Character development
- Zoom sessions
- Family engagement

These are **not separate activities**. They exist because they help athletes improve.

---

## Athlete experience philosophy

The challenge should feel:

- rewarding
- exciting
- professional
- fair
- transparent
- motivating

Athletes should **always know**:

| They should see… | Why |
|----------------|-----|
| Their score | Progress is visible |
| Their level | Status is clear |
| Their progress | Momentum matters |
| What comes next | No guessing |
| What to improve | Growth is actionable |

**Nothing should ever feel mysterious.**

---

## Level philosophy

One of the biggest lessons from Version 1:

**The highest levels should represent complete athletes.**

However — the system **cannot surprise families mid-season.**

### V2 approach: one ladder + gradual gates + clear communication

| Principle | Meaning |
|-----------|---------|
| **One level ladder** | XP + gates on the same progression — no separate “paths” for 2026–27 |
| **Shooting earns XP fastest** | Daily shooting remains the main XP source |
| **Gates ramp up slowly** | Small requirements early (e.g. **1 homework** to advance past early levels) so homework is in everyone’s mind from the start |
| **Highest levels need full program** | Homework, video, zoom, and streaks matter more as levels go up |
| **Rules before Day 1** | Game manual and website explain the ladder before the first submission |
| **Every level feels achievable** | No single level jumps from “zero homework” to “six homework” |

**V1 problem we will not repeat:** Homework and video requirements appeared late (around level 7 / ~1,000 XP) while shooting alone carried kids for weeks. Many families never knew homework mattered until levels stopped.

**V2 fix:** Edit **Level Gate Rules** for a spread curve + communicate it early. Exact counts are **config**, not constitution.

**Explicitly not doing for 2026–27:** Dual-track / parallel “shooter level” vs “program honors” (see [xp-motivation-analysis](./xp-motivation-analysis-2025-26.md) for historical brainstorm — **not adopted**).

---

## Config-driven game design

The game should **run from Airtable config tables**, not from numbers buried in scripts.

| Table | Role |
|-------|------|
| **Levels** | Level names, cumulative XP thresholds |
| **Level Gate Rules** | Per-level homework, video, zoom, streak minimums; gate on/off |
| **XP Reward Rules** | XP per activity (shooting, homework, streaks, etc.) |
| **Achievements** | Milestone definitions linked to reward rules |

Automations **read** these tables (e.g. **042** for levels/gates, **010** for daily shooting XP). Staff tune the season by editing rows — then run level recalc and audits.

**V2 engineering goal:** Move **more** tunable data out of scripts into these tables. Full map: [shooting-challenge-v2-config-vs-code.md](./shooting-challenge-v2-config-vs-code.md).

---

## Educational Athletics philosophy

**Basketball is the vehicle. Education is the destination.**

The challenge teaches:

- consistency
- responsibility
- communication
- reflection
- discipline
- growth mindset

…without athletes feeling like they are in school.

---

## Parent philosophy

Parents should **never** feel:

- confused
- surprised
- overwhelmed
- punished

Parents should **always** know:

- how their child is doing
- what comes next
- how they can help

**Weekly emails should create excitement rather than stress** — and should teach the ladder (current level, next gate, link to game manual).

**V1 problem we will not repeat:** 293 weekly summaries were never built; 48 were built but never sent because staff had to click manual checkboxes. V2: **automatic weekly emails** are a top priority.

---

## Coach philosophy

Your job should become **coaching**, not **administration**.

Weekly responsibilities should mainly be:

- reviewing homework
- reviewing videos
- providing feedback
- choosing award winners
- creating future content

**Everything else should happen automatically.**

---

## Automation philosophy

**Automation should be the default.**

Manual work should exist only when it **improves the athlete experience**.

Every automation should be:

| Quality | What it means |
|---------|----------------|
| Reliable | Works every week without babysitting |
| Repeatable | Same inputs → same outputs |
| Understandable | You can explain what it does |
| Documented | Lives in GitHub + automation index |
| Testable | Audit scripts can prove it worked |
| Config-aware | Reads game rules from tables where possible |

**V1 gap:** Weekly email flow was manual. Final season emails required Python staging. V2 standardizes documented, testable flows.

---

## Data philosophy

**Trust is everything.**

If families cannot trust XP, levels, shots, achievements, and summaries, they will lose motivation.

**Data integrity is more important than adding new features.**

**V1 wins to protect:** One source → one XP event; pipeline audits; close-out audits; award reconciliation.

**V1 problems to fix before V2 launch:** Duplicate badges; inactive enrollments still in some paths; Airtable file storage; legacy fields.

---

## Website philosophy

The website should become the **heart of the challenge**.

It should be where athletes check progress, read rules, celebrate achievements, view feedback, and stay motivated — not only rankings.

**V2:** Rules / game manual page is **required** before launch. Content mirrors **Level Gate Rules** and **Levels** config.

---

## AI philosophy

AI is the **Assistant Director** — audits, drafts, reports, health checks — not a replacement for your coaching voice.

---

## National philosophy

Build as though the program will eventually support **thousands of athletes** — scalable, maintainable, professional.

---

## Non-negotiable design principles

1. **Shooting remains the centerpiece.**
2. **Every athlete experiences meaningful success.**
3. **The highest honors require full program participation.**
4. **Rules are explained before the season begins.**
5. **Every important calculation is transparent.**
6. **Automation is preferred over manual work.**
7. **Every important process is auditable.**
8. **Every field has a clear owner.**
9. **Every automation has one defined responsibility.**
10. **Duplicate records should be prevented rather than repaired.**
11. **The system should detect common problems automatically whenever practical.**
12. **Simplicity should not be sacrificed without a clear benefit.**
13. **Tunable game rules live in config tables, not in scripts.**

---

## Technical priorities (order of work)

**Fix the machine before tuning the game.** **Tune the game in config tables before writing the parent manual.**

| Phase | Focus |
|-------|--------|
| **1** | Stable architecture — **archive 2025–26 base; clone for 2026–27** (see [base cutover](./shooting-challenge-v2-base-cutover.md)); Dribble base decision if applicable |
| **2** | Remove technical debt (badge dedupe, Stage J legacy fields) |
| **3** | Standardize automations; **move tunable values toward config tables** |
| **4** | Data ownership map (Stage K) |
| **5** | Reliability (`Active?` gates, 066 Week write, automatic weekly emails) |
| **6** | Scalability (Google Drive–only files) |
| **7** | Intake fixes (HW17 quiz, etc.) |
| **8** | **Config tuning** — Levels, Level Gate Rules, XP Reward Rules for 2026–27 (spread gates) |
| **9** | Game manual + website rules (published from config) |
| **10** | Website features (leaderboard, achievements, profiles) |
| **11** | Polish and pre-season audit pack |

**Nothing in Airtable changes until you explicitly approve each phase.**

---

## Definition of success

Version 2 is successful when:

| Outcome | Measure |
|---------|---------|
| **Systems run themselves** | XP, levels, shots, homework, achievements, summaries, awards — minimal manual fixes |
| **Your time shifts to coaching** | Review, feedback, awards, content |
| **Families trust the platform** | Consistent, transparent, no surprises |
| **Rules were clear on Day 1** | Manual + website + emails matched config |
| **The website is the hub** | Progress and rules at `/shoot` |
| **Growth-ready** | More athletes without a redesign |

---

## Appendix: V1 lessons → V2 work

| V1 lesson | V2 work |
|-----------|---------|
| Weekly emails manual | Automatic weekly emails |
| Rules not ready Week 1 | Game manual + website **before** first submission |
| Gate cliff at ~1,000 XP | **Spread gates in Level Gate Rules** (e.g. 1 HW early) |
| Dual-track debated | **Rejected for 2026–27** — one ladder + better comms |
| Numbers in scripts | **Config-first** — XP Reward Rules, Levels, gates |
| Streak break beats continuity | Tune Achievements / rules; may need **053** logic review |
| Week 10 quiz | Redo HW17 intake |
| Airtable storage full | Drive-only assets |
| Inactive kids not fully off | Harden `Active?` |
| Duplicate milestone badges | Dedupe + fix 066 |

Detail: [post-close-hygiene-2025-26.md](./post-close-hygiene-2025-26.md) · [close-out-considerations.md](./close-out-considerations.md)

---

## Revision log

| Date | Notes |
|------|-------|
| 2026-07-03 | Initial constitution. |
| 2026-07-03 | **Locked decisions:** one ladder (no dual-track for 2026–27); spread gates via config; config-over-scripts; communication-first; revisit architecture only after next season if needed. Added config-driven section; reordered technical priorities. |
| 2026-07-03 | **Base strategy:** archive 2025–26; clone for 2026–27; scrub season tables in clone; keep config; no GitHub fork. |
