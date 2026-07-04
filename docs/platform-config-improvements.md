# Platform config — grade bands and public display

**Status:** V2 architecture / ops planning  
**Last updated:** 2026-07-04  
**Tracked in:** [close-out-considerations.md](./close-out-considerations.md) **C-021**, **C-022**

---

## C-021 — Grade bands must propagate from Configuration

### Problem (2025–26)

**Grade Bands** are stored in a dedicated table and linked from Enrollments, Homework, XP Reward Rules, Target Goal Shots, etc. — but **changing band names or ranges does not reliably propagate**:

| Area | Risk today |
|------|------------|
| **002 / 003** | Match enrollment grade → band by **Min/Max Grade** (good — table-driven) |
| **010** shooting XP | Matches `SHOOTING_BASE` by rule key only — **ignores Grade Band link** on XP Reward Rules |
| **072** weekly email | **`normalizeGradeBandForRule()` hardcodes** `K2`, `34`, `56`, `78`, `912` string matching — breaks if band names change |
| **032** challenge goals | Matches Target Goal Shots by **Grade Band record link** (good) |
| **065** homework XP | Uses rule lookup — verify grade-band link usage |
| **Web / Presentation** | Any hardcoded band labels in UI |

**Owner concern (confirmed):** If grade bands are renamed or restructured, automations and XP Reward Rules may **stop matching** or show wrong values.

### Target (Configuration-first)

| Principle | Implementation |
|-----------|----------------|
| **Single source of truth** | **Grade Bands** table — name, min/max grade, sort order, `Active?` |
| **Match by record link** | XP Reward Rules, Target Goal Shots, enrollments use **linked Grade Band** — not string parsing |
| **No hardcoded band names in scripts** | Remove `normalizeGradeBandForRule()`-style literals; match `enrollment.gradeBandId === rule.gradeBandId` or lookup by link |
| **Rename-safe** | Changing **Grade Band Name** updates all lookups/rollups automatically |
| **Range changes** | **003** re-runs when grade changes; audit enrollments after band table edits |
| **Web** | Read band label from linked field or API — never hardcode band list in `web/` |

### Work items

1. Audit all automations + extensions for grade-band **string** matching vs **link** matching.
2. Fix **072** (and any similar) to resolve XP rules by **Grade Band link** on enrollment.
3. Fix **010** / **065** if grade-scaled rules should filter by linked band on XP Reward Rules row.
4. Document: editing Grade Bands table + re-running **003** on affected enrollments.
5. Extension audit: `audit-grade-band-rule-coverage.js` (dry-run) — enrollments with band X have matching active XP rules.

### Layer

| Layer | Role |
|-------|------|
| **Configuration** | Grade Bands rows, XP Reward Rules links |
| **Engine** | Match rules by link + rule key, not display string |
| **Presentation** | Show `Grade Band Label` lookup on enrollment |

---

## C-022 — Public display fields (Presentation layer)

### Problem (2025–26)

Emails and summaries often use **primary field** or **formula concatenation** when a shorter public label is needed.

**Example (homework parent email — automation 071):**

| Column shown | Source today | Problem |
|--------------|--------------|---------|
| Week | Week link on Homework Completion | OK |
| Homework | `Assignment Title` **or** `homeworkRecord.name` (primary) | Primary is often **Assignment Full Name** formula — too long / includes internal fields |

**072** weekly homework table is better — prefers `Assignment Title` before `Assignment Full Name` before primary — but **Homework Completion** rows still fall back to linked Homework **primary**.

### Target — explicit Presentation fields

**Do not use primary field or long formulas for parent/public output.**

| Table | Operator field (internal) | Presentation field (public) |
|-------|---------------------------|-----------------------------|
| **FBC Curriculum - SYNC** | `Assignment Full Name` (formula) | **`Assignment Title`** or new **`Public Assignment Name`** |
| **Weeks** | Week primary / internal name | **`Week Label - Public`** (e.g. "Week 1", "Early Bird") |
| **Homework Completions** | Linked Homework primary | Read **`Public Assignment Name`** via lookup — not `record.name` |
| **Enrollments** | Internal names | Existing `Full Name - Display` pattern — extend consistently |

### Engine rule (Presentation layer)

> **Public emails, weekly summaries, and `/shoot` pages read only fields marked for Presentation — never `record.name` / primary field as fallback.**

### Work items

1. Schema: confirm/add **`Public Assignment Name`** (or standardize on **`Assignment Title`**) on curriculum; lookup on Homework Completions.
2. **071** — `homeworkTitle` = `Assignment Title` / `Public Assignment Name` only; remove `homeworkRecord.name` fallback.
3. **072** — homework column = Presentation field only; same for video/zoom titles where needed.
4. **Web** — leaderboard and rules pages use Display fields (already partially true for athlete names).
5. Document field ownership: Presentation fields are **operator-edited** or formula-from-short-fields — not auto-primary.

### Relation to four layers

| Layer | This item |
|-------|-----------|
| **Content** | Curriculum assignment text |
| **Configuration** | Which field is the public label |
| **Presentation** | Emails, web, PDFs read Presentation fields only |
| **Engine** | Automations must call named fields — not primary |

---

## Related

| Doc | Topic |
|-----|--------|
| [v2/03-business-rules.md](./v2/03-business-rules.md) | Four layers |
| [shooting-challenge-v2-config-vs-code.md](./shooting-challenge-v2-config-vs-code.md) | Config vs script |
| [close-out-considerations.md](./close-out-considerations.md) | C-021, C-022 |
