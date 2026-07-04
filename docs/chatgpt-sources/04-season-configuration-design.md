# Season configuration design (Layer 2)

**Status:** DRAFT — game design guidance for tuning **Level Gate Rules** and related Configuration.  
**Not part of the engine contract.** See [03-business-rules.md](./03-business-rules.md) for platform behavior.

**Last updated:** 2026-07-03

---

## Purpose

This document guides **how a season is configured** — not how the platform works.

Use it when:

- Tuning **Level Gate Rules** for a new season
- Designing gate spread before loading Airtable
- Reviewing whether Configuration matches [Design philosophy](./03-business-rules.md#3-design-philosophy)

Live values always live in Airtable Configuration tables and exported Presentation — never in the engine contract.

---

## Gate spread — learning intent (DRAFT)

**Status: NOT FINALIZED.** Do not load numbers into **Level Gate Rules** until this section is approved.

Optimize gate configuration for **learning**, not difficulty. Introduce activity types gradually so families experience the full program early — avoid a single late-season cliff where many levels have no gates and upper levels demand everything at once.

Map the active **Levels** rows for this season onto the four **progression phases** defined in [03-business-rules.md §3.1](./03-business-rules.md#31-progression-phases-platform-concepts):

| Phase | Configuration intent |
|-------|------------------------|
| **Early progression** | Introduce every program component (shooting, homework, video, Zoom, streaks) with small gate steps |
| **Mid progression** | Reinforce repeat engagement across components; shooting still drives most XP |
| **Advanced progression** | Expect sustained participation — not one-off checkboxes |
| **Highest achievement** | Top level(s) recognize full-program commitment for the season |

**Illustrative intent only (not rules):**

- Early progression might introduce satisfactory homework before athletes leave the first phase.  
- Mid progression might expect multiple video feedback cycles.  
- Advanced progression might expect sustained Zoom participation.

**2025–26 lesson:** Gates clustered late (~1,000 XP at Deadeye); many athletes had zero homework until mid-season. Spread requirements in Configuration instead.

---

## Review checklist (before loading Configuration)

| # | Question |
|---|----------|
| 1 | How many **Levels** rows are active this season, and how do they map to the four progression phases? |
| 2 | Does each phase teach the right purpose? |
| 3 | Which activity types should **first appear** in gates during early progression? |
| 4 | Does this match [Design philosophy](./03-business-rules.md#3-design-philosophy) and the [Constitution](./01-constitution.md)? |

---

## Gate numbers worksheet

**[level-gate-rules-config-template.csv](./level-gate-rules-config-template.csv)** — operator spreadsheet for one season’s **Level Gate Rules** rows.

- Level names and order in the CSV are **examples** from a prior ladder (2025–26 reference names).
- Replace with this season’s **Levels** table before loading Airtable.
- All numeric fields remain `TBD` until approved.

---

## Related

| Doc | Layer |
|-----|-------|
| [03-business-rules.md](./03-business-rules.md) | Engine contract |
| [02-master-direction.md](./02-master-direction.md) | 2026–27 season decisions |
| [../shooting-challenge-v2-config-vs-code.md](../shooting-challenge-v2-config-vs-code.md) | Config vs script |
| [../xp-motivation-analysis-2025-26.md](../xp-motivation-analysis-2025-26.md) | Historical data |
