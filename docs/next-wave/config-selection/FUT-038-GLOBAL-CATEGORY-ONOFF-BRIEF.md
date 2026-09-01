# FUT-038 — Global Configurable Program-Category On/Off System

**Status:** Brief ready (Phase 2) — **do not implement** schema, automations, web, or email from this document alone  
**Canonical ID:** **FUT-038**  
**Date:** 2026-09-01  
**Base SHA:** `58f54618` (`origin/master`)  
**Branch:** `cursor/fut-038-category-brief-e772`  
**Related:** SC-034 config-over-code · C-014 / SC-082 gate tuning · PKG-004 · [CONFIG-CONSUMER-INVENTORY.md](./CONFIG-CONSUMER-INVENTORY.md) · [CONFIG-SELECTION-CONTRACT.md](./CONFIG-SELECTION-CONTRACT.md) · [v2/03-business-rules.md](../../v2/03-business-rules.md) · [CURRENT-TRUTH.md](../../CURRENT-TRUTH.md) § XP / levels · [127-SI-MASTER-FUTURE-WORK-LIST.md](../../127-SI-MASTER-FUTURE-WORK-LIST.md) § FUT-038

---

## 1. Problem statement

Coaches need to **disable whole participation categories** for a **program instance / season** without breaking:

- Lifetime XP integrity for **enabled** categories  
- Level assignment and **Gate Blocked** semantics  
- **G.O.A.T.** (top-of-ladder) reachability  
- Achievements, milestones, Perfect Week, streaks (where still applicable)  
- Weekly summaries, parent/athlete emails, and public web progress displays  

**Initial category keys (extensible):**

| Key | Engine meaning today |
|-----|----------------------|
| `submissions` | Daily shooting submissions → XP (**010**), WAS, streaks (**053–056**) |
| `homework` | PHA schedule, HC lifecycle (**020**), homework XP (**064/065**), parent feedback (**071**) |
| `video_feedback` | Video Feedback + coach review → XP (**013/113/114**) |
| `zoom` | Live attendance XP (**101**), Stage 17 recording path (**117**), gate + Perfect Week credit |
| `streaks` | Streak Occurrences + streak XP (**053/054**), streak gate minimums |
| `achievements` | Non-milestone achievement unlocks + XP from unlocks (**058/059** subset) |
| `milestones` | Shot milestones (**066**) + related unlock XP (**059**) |

Additional keys (e.g. `perfect_week`, `weekly_summaries`, `learning_activities`) may be added later without redesign if the resolver contract is category-key based.

**Non-goals for this brief:** Fillout intake changes, S3 migration (**FUT-040**), card/email styling (**FUT-042/043**), Learning Activities catalog (**PKG-005**).

---

## 2. Engine principles (from Layer 1)

From [v2/03-business-rules.md](../../v2/03-business-rules.md):

- Gates **encourage balanced participation**; they must **not accidentally block** advancement when a category is intentionally off for the season.  
- **042** evaluates five rollup dimensions against **Level Gate Rules** minimums (`Minimum Submissions`, `Minimum Homework`, `Minimum Videos`, `Minimum Zoom Meetings`, `Minimum Streak Days`).  
- **G.O.A.T.** is the highest active **Levels** row (2200 XP cumulative in current PROD ladder per PKG-036 preflight). Reachability requires XP **and** passing gates on intervening levels — so **disabled categories must zero out or auto-pass** their gate dimensions.  
- Config table already holds latent per-year toggles **`HW Review Enabled?`**, **`Video Review Enabled?`**, **`Submission XP Active?`** with **no automation consumers** in repo today ([CONFIG-CONSUMER-INVENTORY.md](./CONFIG-CONSUMER-INVENTORY.md) § C).

---

## 3. Config ownership — options analysis (Mike decision required)

**Do not implement until Mike selects one option and PKG-004 approves field ownership.**

### Option A — Extend **Config** (school-year row)

Add or repurpose checkbox fields on existing **Config** rows (one row per `Active School Year`; four rows today is correct).

| Pros | Cons |
|------|------|
| Aligns with [CONFIG-SELECTION-CONTRACT.md](./CONFIG-SELECTION-CONTRACT.md) year-key resolver | **Program Instance** is the enrollment’s operational scope; year alone does not distinguish two PIs in the same year |
| Latent fields already exist (`HW Review Enabled?`, etc.) | Mixes global year defaults with PI-specific coach choices |
| Single resolver entry point for **057** (already Config-aware) | Requires PI→Config link validation (today indirect via PI **Active School Year**) |

**Suggested fields (names provisional):**  
`Category Submissions Enabled?`, `Category Homework Enabled?`, … — or reuse/rename latent review toggles with documented semantics.

### Option B — **Program Instance - Sync** (recommended default for brief)

Store category flags on **Program Instance - Sync**, one row per season instance (e.g. 2027 Shooting Challenge).

| Pros | Cons |
|------|------|
| Matches coach mental model: “this season’s program” | Three PI rows today; must not hardcode PI record ids in scripts |
| Enrollment already links **Program Instance**; **042** reads PI id (unused for Config today) | Duplicates year-level defaults if every PI copies flags manually |
| PI already lookups **Minimum Video** and **Active School Year** → Config | Needs lookup/formula layer for web + email (Presentation-friendly) |

**Suggested fields:** `{Category} Enabled?` checkboxes + optional `{Category} Disabled Public Label` (Presentation).

### Option C — New **Program Category Settings** table

One row per `(Program Instance, Category Key)` or one wide row per PI with linked category records.

| Pros | Cons |
|------|------|
| Extensible without wide-table field sprawl | **PKG-004** cost: new table, interfaces, migration |
| Explicit audit trail per category | More joins for automations and web |
| Clean add-new-category story | Highest implementation surface area |

### Option D — Hybrid **Effective Category Flags** (Config default + PI override)

Mirror Stage 17 pattern (`lib/c025-stage17-zoom-attendance.js`):  
`Effective = PI override ?? Config default ?? safe default (enabled)`.

| Pros | Cons |
|------|------|
| Year defaults in Config; coach overrides per PI | Two sources of truth; resolver must be shared library |
| Best long-term fit for multi-PI same year | Most design/doc work up front |

### Comparison summary

| Criterion | A Config | B PI | C New table | D Hybrid |
|-----------|----------|------|-------------|----------|
| Coach selects per season instance | Weak | **Strong** | **Strong** | **Strong** |
| Extensibility | Medium | Medium | **High** | **High** |
| PKG-004 / schema risk | Low–medium | Low–medium | **High** | Medium |
| Aligns with existing resolver | **High** | Medium | Low | **High** |
| Matches enrollment join path | Medium | **High** | **High** | **High** |

**Brief recommendation (not a Mike decision):** Implement **Option D** with **PI as authority** for coach-facing toggles and **Config** supplying year-level defaults only where PI fields are blank — **after** Mike confirms PI vs Config ownership in PKG-004 matrix.

**Safe defaults (pending Mike):** All categories **enabled** when flag missing (fail-open for progression); administrative UI shows effective flags.

---

## 4. Resolver contract (shared library — Phase 3 prerequisite)

Proposed shared module (repo-only name): `lib/category-flags` or extend `lib/config-selection`.

```text
resolveCategoryFlags({
  enrollmentId,
  programInstanceId,
  schoolYear,
  explicitConfigRecordId?,  // optional override for tests
}) → {
  ok: true,
  flags: {
    submissions: boolean,
    homework: boolean,
    video_feedback: boolean,
    zoom: boolean,
    streaks: boolean,
    achievements: boolean,
    milestones: boolean,
  },
  selectionSource: "program_instance" | "config_default" | "explicit",
  debug: { … }
}
```

**Rules:**

1. Resolve PI from Enrollment when not passed.  
2. Load PI category fields; for each unset/null, fall back to Config row via [CONFIG-SELECTION-CONTRACT.md](./CONFIG-SELECTION-CONTRACT.md) hierarchy.  
3. **Fail closed** on ambiguous Config year (zero or duplicate `Active School Year` match).  
4. Expose **Effective** flags to formulas via lookup fields on Enrollment (recommended) so WAS / gate formulas do not reimplement resolver logic.

**Administrative visibility:** PI interface section “Participation categories” + read-only Effective lookup on Enrollment for support.

---

## 5. Consumer inventory

Each surface must read **Effective category flags** (not hardcoded assumptions). Priority = regression risk if ignored.

### 5.1 Level gates and progression

| Consumer | File / surface | Category dimensions | Required behavior when category OFF |
|----------|----------------|---------------------|-------------------------------------|
| **042** gate evaluation | `042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js` — `evaluateGate()` | Submissions, Homework, Videos, Zoom, Streaks | Treat corresponding **minimum as 0** (auto-pass dimension). Do not change XP-based level qualification. |
| **041** recalc queue | `041-levels-and-progression-mark-enrollment-for-level-recalculation.js` | Indirect | Requeue when category flags change (signature includes effective flags). |
| Enrollment gate formulas | `Gate Passes: *`, `Public Missing *`, `Public Gate Missing Reason` | All five gate dimensions | Formula layer should mirror 042 effective minimums (or lookup precomputed “Effective Minimum Homework” fields). |
| **Level Gate Rules** `Public Gate Criteria` | Formula text on gate rules | All | Presentation: optionally hide disabled lines via Effective flags (Phase 3b). |
| Web levels ladder | `web/components/levels/*`, `/levels` | All | Show adjusted gate copy from Presentation fields. |
| Web progression panel | `web/components/athlete/progression-panel.tsx`, `Public Missing *` | All | Omit disabled categories from `missingRequirements`. |

**042 today:** compares raw rollups to configured minimums with no category awareness (`evaluateGate` at lines 1070–1115). **042 does not read Config** ([AUTOMATION-042-CONFIG-AUDIT.md](./AUTOMATION-042-CONFIG-AUDIT.md)).

### 5.2 XP award writers (suppress when category OFF)

| Automation | Category | Action when OFF |
|------------|----------|-----------------|
| **010** | submissions | Skip create/reconcile; set skipped output (do not block submission intake). |
| **064/065** | homework | Skip XP prepare/create; HC may still exist for audit — **Mike decision:** skip vs allow completion without XP. |
| **013/113/114** | video_feedback | Skip video XP path; optional skip VF create — **Mike decision**. |
| **101** | zoom (live) | Skip live Zoom XP. |
| **117** / Stage 17 | zoom (recording) | Skip recording XP + gate credit stamping when zoom off. |
| **054** | streaks | Skip streak XP events. |
| **053/055/056** | streaks | Skip or no-op rebuild/recalc — **Mike decision** on whether streak display freezes at 0. |
| **059** | achievements / milestones | Skip XP from unlocks in disabled categories; **058/066** should not create unlocks for disabled types. |
| **066** | milestones | Skip shot milestone unlock creation. |
| **035** | submissions (weekly threshold) | Skip if submissions off. |

**XP display:** Lifetime XP on Enrollment should reflect **only enabled categories**; disabling must not leave orphan XP from disabled pipelines (reconcile or prevent — Phase 3 test).

### 5.3 Perfect Week chain

| Step | Script | Categories involved | When OFF |
|------|--------|---------------------|----------|
| Eligibility calc | **057** v2.2 | Submissions (daily), Homework, Video, Zoom | Skip disabled requirement branches; set helper fields to “N/A” / met. |
| Unlock | **058** | achievements | Do not create unlock if eligibility impossible by design; skip when Perfect Week category disabled entirely — **Mike decision** on whether PW is its own flag or subordinate to components. |
| XP | **059** | achievements | Skip if unlock not created. |
| WAS formulas | `Perfect Week * Requirement Met?` | Homework, Video, Zoom | Must match 057 semantics. |

**Recorded Zoom + Homework off:** 057 conditional Zoom requirement applies only when a meeting exists for the week; if **zoom** off, skip Zoom branch entirely (including Stage 17 recording credit for PW).

### 5.4 Weekly summary and email

| Consumer | Categories | Behavior |
|----------|------------|----------|
| **031–034** WAS builders | homework, submissions | Omit disabled sections from WAS linkage where applicable. |
| **033** PHA → WAS homework | homework | Skip homework assignment to WAS when homework off. |
| **072** weekly email package | homework, video, PW, zoom | Omit sections; adjust “Perfect Week Progress” block. |
| **118/119/074** schedulers | — | No change to schedule; content driven by 072 payload. |
| **076** daily submission email | submissions | Suppress or shorten when submissions off — **Mike decision**. |
| **071/073** feedback emails | homework, video | Do not send when category off. |
| Hub templates | all | Conditional blocks keyed off payload flags (Communications Hub). |

### 5.5 Intake and operational (skip or fail-soft)

| Consumer | Category | Behavior |
|----------|----------|----------|
| **005–009** submission intake | submissions, homework, video | **Mike decision:** reject Fillout vs accept-but-no-XP. Brief recommends **accept with coach-visible “not scored this season”** for submissions; block homework/video asset types when off. |
| **020** HC create | homework | Skip HC create when homework off. |
| **070a/b/c** Make upload | homework, video | Skip send when category off. |
| Fillout forms | all | Out of repo scope (**FUT-039**); document coach procedure to hide forms manually until Fillout work lands. |

### 5.6 Web public surfaces (`/shoot`)

| Route / component | Data loader | Categories |
|-------------------|-------------|------------|
| Public athlete profile | `web/lib/data/public-athlete-profile.ts`, `public-athlete-homework-queries.ts` | All sections |
| `HomeworkAssignments` | PHA + HC queries | homework |
| `StreakSection` | enrollment rollups | streaks |
| `PerfectWeekPanel`, `WeeklyPerformance` | WAS | homework, zoom, video, submissions |
| `AchievementCollection` | unlocks | achievements, milestones |
| `/homework` catalog | `homework-queries` | homework |
| `/zoom-meetings` | zoom catalog | zoom |
| Game manual / FAQ | static + config | copy pass for disabled categories |
| Leaderboard | level + XP | hide nothing; XP already reflects enabled categories only |

**Web does not read Config table today** ([CONFIG-CONSUMER-INVENTORY.md](./CONFIG-CONSUMER-INVENTORY.md) § D). Load Effective flags via **Enrollment lookups** or server-side PI query keyed by athlete’s active enrollment.

### 5.7 Tools, backfills, audits

| Tool | Note |
|------|------|
| `090g` final email repair | Respect category flags in week counts. |
| `preview_final_email.py`, `generate_final_summary_preview.py` | Use year-aware Config + PI flags. |
| Extension audits Stages A–J | Add category-flag consistency checks (Phase 5). |

---

## 6. Gate adjustment algorithm

### 6.1 Level gates (042)

For each active **Level Gate Rule** and enrollment:

```text
effectiveMinimum(dimension) =
  categoryEnabled(dimension) ? configuredMinimum(dimension) : 0

passes(dimension) =
  enrollmentRollup(dimension) >= effectiveMinimum(dimension)
```

**Dimensions map:**

| Gate field | Category key |
|------------|--------------|
| `Minimum Submissions` | `submissions` |
| `Minimum Homework` | `minimum_homework` → `homework` |
| `Minimum Videos` | `video_feedback` |
| `Minimum Zoom Meetings` | `zoom` |
| `Minimum Streak Days` | `streaks` |

If **`Gate Enabled?`** is false on the rule, existing behavior unchanged (XP-only level).

**Highest reachable level / G.O.A.T.:** With all non-submission categories disabled, gates that only required disabled dimensions auto-pass; athlete advances on **Lifetime XP** and any remaining enabled minimums. Verify Legend → **G.O.A.T.** path with XP-only fixture in Phase 3 tests.

**042 Zoom count:** Continue using `computeEffectiveZoomAttendanceCount` (live ∪ recording credit). When **zoom** off, effective minimum Zoom = 0; recording credits should not be stamped (**117** off).

### 6.2 Perfect Week (057 + WAS)

Evaluate requirements **only for enabled categories:**

| Requirement | Skip when |
|-------------|-----------|
| Daily shooting days / goal | `submissions` off → PW disabled entirely **or** skip PW — **Mike decision** (recommend: disable Perfect Week when submissions off). |
| Homework 100% satisfactory for week | `homework` off |
| Video minimum (Config `Perfect Week Video Minimum`) | `video_feedback` off |
| Zoom attendance when meeting scheduled | `zoom` off |

When a requirement is skipped, set WAS fields e.g. `Perfect Week Homework Requirement Met?` = true (or `N/A`) and exclude from `Perfect Week Eligible?` AND logic.

### 6.3 Achievements and milestones

| Type | When category OFF |
|------|-------------------|
| Streak achievements | No new unlocks/XP (**053/054** off) |
| Shot milestones (**066**) | `milestones` off |
| Perfect Week (**058**) | Treat as achievements category or separate — recommend **`achievements` off** skips PW unlock |
| Other achievement catalog rows | Filter by achievement `Category` mapping to flag keys |

### 6.4 Public gate messaging

Enrollment **Public Missing *** fields and **Public Gate Missing Reason** must **not** list disabled categories. Align formula layer with 042 effective minimums to prevent “Complete 2 more homework” when homework is off.

---

## 7. Web UX — hide vs “not part of this season”

**Mike decision required.** Options:

| Pattern | When to use | Example |
|---------|-------------|---------|
| **A — Hide section** | Category fully absent from athlete experience | No homework block on profile; `/homework` returns empty state “Homework is not part of this season.” |
| **B — Visible disabled state** | Transparency for returning athletes | Section header + muted note: “Homework is not part of the 2027 season.” No CTAs. |
| **C — Hub-only hide** | Marketing vs enrolled athlete | Public homepage still describes program; enrolled views use A or B. |

**Brief recommendation:** **B** for profile sections athletes may expect (homework, zoom, video); **A** for nav links (remove homework/zoom from program nav when off). Game manual and FAQ should mention season-specific category set.

**Implementation sketch:**

- Add `categoryAvailability: Record<CategoryKey, 'enabled' | 'disabled'>` to public profile API model.  
- Components branch: `enabled` → current UI; `disabled` → compact “not part of this season” panel; omit from `missingRequirements`.  
- Do not expose raw Airtable flag field names publicly.

---

## 8. Test matrix — Homework enabled vs disabled

Primary acceptance scenario from Master Future Work List. Run on **DEV** with disposable enrollments; no Production access from agents.

### 8.1 Fixtures

| Fixture | PI flags | Enrollment |
|---------|----------|------------|
| **HW-ON** | `homework: true` (all others default on) | Active test enrollment, 2027 PI |
| **HW-OFF** | `homework: false` | Same grade band / PI |

### 8.2 Cases

| # | Scenario | HW-ON expected | HW-OFF expected |
|---|----------|----------------|-----------------|
| T1 | Satisfactory HC + **065** XP | `HOMEWORK_XP\|{hcId}` created | No HC/XP path (**020** skip) or HC without XP — per Mike |
| T2 | **042** level with `Minimum Homework > 0` | Gate blocks until HW met | Gate passes HW dimension; advancement on XP + other gates |
| T3 | Reach **G.O.A.T.** (XP threshold) | Baseline | Same XP path; HW gate dimensions auto-pass |
| T4 | **057** Perfect Week week with PHA | Homework requirement enforced | Homework branch skipped; PW eligible without HW |
| T5 | **072** weekly email | Homework section present | Homework section omitted |
| T6 | Public profile | Homework assignments list PHA rows | Empty/disabled state; no “missing homework” gate text |
| T7 | **071** parent feedback | Sends on satisfactory HC | No send |
| T8 | Category flag flip mid-season | Document migration | **041** recalc; no orphan gate block — **Mike approval** for mid-season toggle |

### 8.3 Secondary matrix (smoke)

Repeat T2/T3/T6 for **zoom off** and **video off** once homework path is proven.

---

## 9. Phased implementation plan (Phase 3 slices)

**Prerequisite:** Mike selects §3 ownership option; PKG-004 field ownership matrix signed; DEV schema applied.

| Slice | Scope | Deliverables |
|-------|-------|--------------|
| **3a — Schema + resolver** | PKG-004 approved fields; Enrollment Effective lookups | `lib/category-flags` + unit tests; schema notes; deploy checklist |
| **3b — Gate layer** | **042** + Enrollment gate formulas + **041** signature | Adjusted gates; disposable HW-OFF level proof |
| **3c — XP suppress** | **010**, **064/065**, **101**, **113/114**, **054**, **066**, **059** | Skipped outputs; no duplicate XP; HW-ON/HW-OFF tests |
| **3d — Perfect Week** | **057**, **058**, WAS formulas | HW-OFF PW eligibility proof |
| **3e — Weekly + daily email** | **072**, **076**, Hub conditionals | Snapshot tests / MRW-F07 harness with flags |
| **3f — Web** | Profile loaders + nav + `/homework` + `/zoom-meetings` | UX per §7; Playwright athlete-profile spec updates |
| **3g — Intake** | **005–020**, **070** | Fail-soft paths; Fillout coach runbook (manual) |
| **3h — Promotion** | Prod paste order doc | `docs/deploy-checklists/FUT-038-*`; CHANGELOG |

Slices **3b–3d** are order-sensitive (gates before mass XP changes). Web (**3f**) may parallelize after **3b** lookups exist.

---

## 10. Risks and PKG-004 schema gate

### 10.1 PKG-004 (blocked package)

From [SHOOTING_CHALLENGE_COMPLETION_MASTER.md](../../SHOOTING_CHALLENGE_COMPLETION_MASTER.md): **PKG-004** — establish field ownership and dedupe-key contracts **before new schema/features**. Status: **blocked**.

**FUT-038 must not:**

- Create tables/fields in Production without PKG-004 ownership matrix  
- Repurpose `HW Review Enabled?` / `Video Review Enabled?` without documenting semantic change (review vs category off)  
- Collapse Config year rows to simplify flag reads  

**Required PKG-004 outputs before schema paste:**

1. Owner table per new field (PI vs Config vs Enrollment lookup)  
2. One writer per Effective flag (PI coach UI vs automation)  
3. Dedupe: flag change → **041** recalc signature includes flag hash  
4. Safe rerun tests for **042** with injected flag fixtures  

### 10.2 Regression risks

| Risk | Mitigation |
|------|------------|
| Gate Blocked on G.O.A.T. with HW off | Effective minimum = 0; T3 proof |
| Orphan homework XP when toggling off | Reconcile job or prevent toggle with open HC — Mike policy |
| 057 / 042 mismatch | Single Effective lookup source on Enrollment |
| Web shows stale “missing homework” | Formula + loader both read Effective flags |
| Config year ambiguity | [CONFIG-SELECTION-CONTRACT.md](./CONFIG-SELECTION-CONTRACT.md) fail-closed |
| Stage 17 stale gate credit | When zoom off, **117** must not stamp `Zoom Gate Credit Earned?` |
| Mid-season flag change | Documented migration + family notice per business rules §11 |

### 10.3 Cross-item dependencies

- **FUT-026** Player Manual — update after flags exist  
- **SC-034** — extend config-over-code audit to category flags  
- **PKG-029** PI architecture — long-term may subsume PI flag storage  
- **FUT-042/043** — email/website card styling should respect category availability  

---

## 11. Open decisions for Mike

1. **Config ownership:** Option A / B / C / D (§3)?  
2. **Default on/off** for 2026–27 launch — all enabled unless explicitly turned off?  
3. **Homework off:** skip **020** HC entirely vs allow completion without XP?  
4. **Perfect Week:** separate category flag or derive from submissions + components?  
5. **Mid-season category toggle:** allowed with recalc, or locked at PI launch?  
6. **Web UX:** hide (A), disabled notice (B), or mixed (C) (§7)?  
7. **Fillout / intake:** reject submissions vs accept without XP when category off?  
8. **Repurpose** existing Config `HW Review Enabled?` / `Video Review Enabled?` vs new field names?  
9. **Achievements vs milestones:** one flag or two when disabling “bonus” progression?  
10. **Recorded Zoom** when zoom off but homework on — already N/A if zoom category off (confirm).  

---

## 12. References

- Gate evaluation: `airtable/automations/shooting-challenge/042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js` (`evaluateGate`, `getEnrollmentGateStats`)  
- Perfect Week: `057-achievements-and-milestones-calculate-perfect-week-eligibility.js`  
- Config latent toggles: schema snapshot `prod-20260831-fut002-batch1` Config table  
- Web progression: `web/lib/data/public-athlete-profile.ts` (`Public Missing *`, `gateMissingReason`)  
- Automation index: [docs/automation-index.md](../../automation-index.md)  

---

*End of FUT-038 Phase 2 architecture brief.*
