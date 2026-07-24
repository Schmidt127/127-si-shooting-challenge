# Annual Config / Week Separation Audit

**Target season (planning):** 2026–2027 · May–June 2027 window (V2 master direction)  
**Evidence:** Config selection tests, Weeks schema, Enrollment Key formula, WAS Summary Key live shape

---

## Confirmed year-separation mechanisms

| Mechanism | How it works | Evidence |
|-----------|--------------|----------|
| Config rows per year | Primary `Active School Year` unique per year (`2025-2026` … `2028-2029` known in tests) | `tests/config-selection/resolve-config.test.js` |
| Enrollment year | `School Year` on Enrollment; in `Enrollment Key` | `schema-snapshot` |
| Program Instance | Enrollment + Weeks link to Program Instance - Synced | `schema-snapshot` |
| WAS identity | Summary Key includes Enrollment Key (has year) + Week RID | overnight live shape |
| XP / unlocks | Source keys use Enrollment RID (year-scoped record) | registry |

---

## Week naming for 2026–2027

| Concept | Canonical meaning | Field |
|---------|-------------------|-------|
| Human week label | `Week 0` … challenge weeks … `Post-Challenge` (and Early Bird in seed fixtures) | Weeks.`Week Name` (primary **text**) |
| Stable machine key | Airtable record ID | Weeks.`Week Key` = `RECORD_ID()` |
| Ops composite label | `{Active School Year}\|{Week Name}` e.g. `2026-2027\|Week 0` | **Not a stored formula field** in snapshot — documentation / seed convention |
| Scheduler match key | Prior Saturday `YYYY-MM-DD` from Week `End Date` in America/Denver | Derived in **118/119** — **no** `Week End Key` field |

**Correction:** Do not tell operators that `Week Key` equals `2026-2027|Week 0`. That string is a **naming convention**, not the Week Key formula.

---

## Checks (pass / fail / unverified)

| Check | Result | Notes |
|-------|--------|-------|
| Config is year-specific; do not collapse rows | **Pass** (repo contract) | Max Videos differ by year in fixture |
| Enrollment Key includes School Year | **Pass** | formula |
| Week Key includes year | **N/A / Pass differently** | RID unique; year via Program Instance / Enrollment |
| Summaries combine years | **Fail if** Enrollment+Week links cross years | Prevent by linking Week from same Program Instance as Enrollment |
| XP crosses enrollment years | **Low if** Enrollment link correct | Athlete can have multiple enrollments — never XP to Athlete-only |
| Levels use active enrollment | **Intended** via **042** on Enrollment | Unverified live for all athletes |
| Forms default to old Config | **Unverified** | Fillout/Make must be checked in OMNI/UI — Mike action |
| Historical records preserved | **Policy** | No deletes in this agent work |

---

## Contamination vectors

1. Selecting wrong Config row when reading Max Videos / XP toggles (first-record fallback forbidden by `resolveConfig`).  
2. Linking a 2025–2026 Week onto a 2026–2027 Enrollment.  
3. Using Week Name `Week 1` without Program Instance filter in views/automations.  
4. Reusing Athlete-level rollups that span enrollments (prefer Enrollment fields).  
5. Docs/`airtable/schema/current` Athlete-hub language encouraging Athlete-centric joins.

---

## Operator rules for 2026–2027 seed

1. Create/confirm Config row `Active School Year = 2026-2027`.  
2. Confirm Program Instance for 2026–2027; link all season Weeks.  
3. Set Week Name values (`Week 0`…`Post-Challenge` as product requires).  
4. Set Start/End dateTime in America/Denver (Sat 23:59 end pattern already used in PROD).  
5. Enrollments for the season must have `School Year = 2026-2027` and matching Program Instance.  
6. Do not rename Week Name after HC/WAS formulas depending on display keys without migration plan.
