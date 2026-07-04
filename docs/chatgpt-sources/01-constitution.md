# 01 — Constitution

**Status:** Active principles. Expanded 2026-07-03 with configurable game engine architecture.

## The one question

Before any V2 feature, rule change, or automation work:

> **Does this make the platform more aligned with the Master Direction Plan?**

If **no**, modify the idea or defer it.

---

## Constitutional principle — configurable game engine

**The Shooting Challenge is a configurable game engine.**

The software **engine** is intentionally separated from **annual game design**.

Season-specific rules — including XP values, level thresholds, gate requirements, achievements, award values, progression pacing, and other gameplay parameters — are defined through **configuration data**, not software logic.

A new season should be able to launch by changing **configuration tables** and updating **participant-facing documentation**, without requiring changes to automations, scripts, formulas, or application architecture.

This is fundamentally different from saying only that “rules live in config tables.” It defines what we are building: a **platform** where the game can be redesigned each year through configuration while the underlying engine remains stable.

---

## Four layers

Every feature, document, and automation belongs to exactly one primary layer.

| Layer | Changes | What it is |
|-------|---------|------------|
| **1 — Engine** | Never (behavior contract only) | XP Event creation; level calculation; gate evaluation; weekly summary; awards; email delivery; automation framework |
| **2 — Configuration** | Every season | **XP Reward Rules**, **Levels**, **Level Gate Rules**, **Achievements**, award rules, season dates, **Weeks** |
| **3 — Content** | Constantly | Homework, videos, Zoom meetings, email copy, parent messages, awards catalog entries, weekly challenges |
| **4 — Presentation** | Generated from 1–3 | Game manual, website, parent guide, coach guide, FAQ |

**Documentation map:**

| Layer | Primary doc |
|-------|-------------|
| Engine | [03-business-rules.md](./03-business-rules.md) — **engine contract** |
| Configuration | Airtable config tables + [season-configuration-design.md](./season-configuration-design.md) + [level-gate-rules-config-template.csv](./level-gate-rules-config-template.csv) |
| Content | Airtable content tables + operator workflows |
| Presentation | Exported config + guides (not hardcoded in engine doc) |

**Engineering rule:** If a change requires editing automation logic to tune gameplay for a new season, the design has drifted — move the value into Layer 2 instead.

---

## Non-negotiables (summary)

1. Shooting remains the centerpiece.
2. Every athlete experiences meaningful success.
3. The highest honors require full program participation.
4. Rules are explained before the season begins.
5. Every important calculation is transparent.
6. Automation is preferred over manual work.
7. Every important process is auditable.
8. Every field has a clear owner.
9. Every automation has one defined responsibility.
10. Duplicate records should be prevented rather than repaired.
11. The system should detect common problems automatically whenever practical.
12. Simplicity should not be sacrificed without a clear benefit.
13. **The platform is a configurable game engine** — season gameplay lives in configuration, not in scripts (see principle above).
14. **Gates encourage balanced participation** — they are not designed to prevent advancement (see [03-business-rules.md](./03-business-rules.md) §9).

---

## Canonical source (read next)

- **[02-master-direction.md](./02-master-direction.md)** — mission, vision, season decisions (e.g. 2026–27)
- **[03-business-rules.md](./03-business-rules.md)** — engine contract (how the system behaves)
- **[../shooting-challenge-v2-master-direction.md](../shooting-challenge-v2-master-direction.md)** — full master direction text today
