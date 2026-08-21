# Verification card — Automations 041 and 042 (level recalculation)

| Field | Value |
|-------|--------|
| Enrollment | `rec93mAfo5jKqP3g5` |
| Approximate Lifetime XP | **~540** (verify live value before comparing levels) |
| Automations | **041** (queue) → **042** (assign + gate) |
| Base | PROD `appn84sqPw03zEbTT` |
| Retired | **043** — do not enable or recreate |

## Purpose

Verify that progression queueing and level assignment behave correctly for a real enrollment with meaningful XP: signature changes queue recalculation, **042** writes level outputs, and **Gate Blocked** appears when lifetime XP qualifies for the next level but gate stats (especially **Total Submissions**) remain below the active gate requirement.

## Preconditions

1. Enrollment `rec93mAfo5jKqP3g5` is **Active?** checked.
2. Note baseline before testing:
   - **Lifetime XP Total** (~540 expected)
   - **Total Submissions**, **Total Homework Completions**, **Total Video Submissions**, **Total Zoom Attendances**, **Longest Streak Days**
   - **Current Level**, **Next Level**, **Level Gate Rule**, **Level Status**
   - **Level Recalc Needed?**
   - **Progression Last Queued Signature** and **Progression Last Reconciled Signature**
   - **Gate Debug Summary**

## Expected level ladder context (2026–2027 config)

From repository config baseline (verify live Levels table before asserting names):

| Level | Cumulative XP threshold |
|-------|-------------------------|
| Beginner | 0 |
| Rookie Shooter | 200 |
| Developing Shooter | 400 |
| Consistent Shooter | 600 |
| … | higher tiers |

At **~540 Lifetime XP**, the athlete has passed **Rookie** and **Developing** thresholds. **042** should assign **Current Level** at or below the highest level whose cumulative XP threshold is met (~Developing Shooter) and **Next Level** toward the next tier (~Consistent Shooter at 600 XP).

## Gate Blocked expectation (submissions below requirement)

**Gate Blocked is expected** when:

- Lifetime XP is high enough that **Next Level** points at a gated tier, **and**
- One or more **Level Gate Rules** minimums are not met — commonly **Minimum Submissions** on the active gate.

For many 2026–2027 enrollments blocked below full progression, **Gate Debug Summary** shows submission shortfall (example pattern from other PROD proofs: `Sub 9/10`). On `rec93mAfo5jKqP3g5`, compare **Total Submissions** to the **Minimum Submissions** on the **Level Gate Rule** that **042** selects for the next level.

**Expected while submissions remain below the gate requirement:**

| Field | Expected |
|-------|----------|
| **Level Status** | `Gate Blocked` |
| **Current Level** | Highest level fully supported by XP **and** gate logic (not advanced into gated next tier) |
| **Next Level** | The gated tier the athlete is working toward |
| **Level Gate Rule** | Active rule for that next tier (e.g. Level 3/4 gate — verify live name on enrollment) |
| **Gate Debug Summary** | Shows which minimum failed (Sub / HW / Vid / Zoom / Streak) |

If Lifetime XP were lower (e.g. just above 200 with low submissions), **Level 2 Gate** / Rookie progression shows the same **Gate Blocked** pattern — XP threshold met, gate stats not.

## How to run 041 (queue)

**Scheduled path (normal PROD):** 041 runs every ~15 minutes and compares progression signatures.

**Controlled single-record proof:**

1. Automations → **041** → **Run a script**.
2. Input `recordId` = `rec93mAfo5jKqP3g5` (Enrollment ID).
3. Expect outputs such as:
   - `statusOut` = `success`
   - `actionOut` = `queued` if signature changed, or `skipped_unchanged` if already aligned
   - `queuedCount` / `scannedCount` populated

**Enrollment writeback when queued:**

| Field | Expected |
|-------|----------|
| **Level Recalc Needed?** | Checked when active enrollment needs recalc |
| **Progression Last Queued Signature** | Updated to current input signature |

041 **never** writes Current Level, Next Level, Level Gate Rule, or Level Status.

## How to run 042 (assign + gate)

1. Confirm enrollment appears in view **042 - Needs Level Assignment** (`Level Recalc Needed?` checked + **Active?** checked), **or** run script directly.
2. Automations → **042** → **Run a script**.
3. Input `recordId` = `rec93mAfo5jKqP3g5`.
4. Wait for formula settlement inside the run.

**Expected 042 success outputs (gate blocked case):**

| Field / output | Expected |
|----------------|----------|
| **Level Status** | `Gate Blocked` |
| **Current Level** / **Next Level** | Consistent with ~540 XP + gate failure (verify live) |
| **Level Gate Rule** | Active applicable rule for next tier |
| **Gate Debug Summary** | Explicit shortfall (e.g. submissions below minimum) |
| **Level Recalc Needed?** | Unchecked after verified success |
| **Progression Last Reconciled Signature** | Updated to match 041 signature contract |

## Expected signature behavior

| Signature field | Writer | Purpose |
|-----------------|--------|---------|
| **Progression Last Queued Signature** | **041** | Idempotent queue — avoids re-queue churn |
| **Progression Last Reconciled Signature** | **042** | Acknowledges processed state — 041 compares against this |

After a full 041→042 cycle, queued and reconciled signatures should align for unchanged inputs. Changing XP, gate stats, or deactivating/reactivating enrollment should produce a new queue cycle.

## Duplicate-safety / replay checks

1. Run **042** again immediately with the same `recordId`.
   - Expect identical level outputs — no link churn, no duplicate gate rules.
2. Run **041** scan with no data changes.
   - Expect `skipped_unchanged` — **Level Recalc Needed?** stays unchecked.
3. Do **not** run retired **043**.

## Failure signals

| Signal | Meaning |
|--------|---------|
| **Level Status** = `Error` | 042 failed closed — **Level Recalc Needed?** stays checked for retry |
| Ambiguous gate rules | Multiple applicable rules — configuration defect |
| Level Recalc Needed? never clears | Formula lag or partial write — capture debug outputs |

## Mike verification steps (live)

1. Open enrollment `rec93mAfo5jKqP3g5` — confirm Lifetime XP ~540.
2. Read **Gate Debug Summary** — confirm submission (or other) shortfall vs active gate.
3. Confirm **Gate Blocked** with **Level Recalc Needed?** cleared after 042.
4. Optional: add one counted submission (via approved test path) and re-run 041→042 to observe gate movement — only if Mike approves data change.

## Out of scope

- Tremendous awards · Team Shot Tracker
- Automation **043** (retired)
- Changing Level Gate Rules config without approved change control
