# Flexible Homework 1 / Homework 2 slot — follow-up plan

**Status:** `optional/future` — **deferred** from 2026-08-24 master closeout  
**Backlog hook:** extend PKG-007 / homework pipeline proof after product sign-off

---

## Product requirement

Parents should be able to submit the **correct homework assignment** in either the **Homework 1** or **Homework 2** intake slot. The system must:

1. Identify the assignment by **assignment identity** (Program Homework Assignment / library link), not by which UI slot the parent clicked.
2. Connect it to the correct scheduled PHA slot for that enrollment and week.
3. Award homework XP **exactly once** with duplicate and wrong-assignment protection preserved.

---

## Current state (2026-08-24)

| Layer | Automation | Flexible slot behavior |
|-------|------------|------------------------|
| Submission intake | **005 v5.5** | **Implemented in GitHub** — `normalizeHomeworkPlacement()` moves misplaced PHA IDs between `Homework Name 1` / `Homework Name 2` on the Submission before week/asset work. Offline tests PASS (`tests/homework/automation-005-020-pha-direct.test.js`). |
| Asset → HC linking | **020 v3.7** | **Strict** — `validateSelectedPha()` fails when PHA official slot ≠ inferred asset slot (`slot mismatch`). No alternate-slot normalization yet. |
| Homework XP prepare | **064** | Prepare-only; inherits HC + PHA identity from upstream |
| Homework XP create | **065 v10.3** | **Strict PHA slot check** on HC when PHA is present — mismatch → ineligible / reconcile skip |
| Parent feedback email | **071** / **078** | Downstream of HC identity — blocked if upstream HC/PHA wrong |

**Gap:** Fillout or asset paths that bypass **005** normalization (or asset slot label ≠ PHA official slot) still fail at **020** or **065** even when the parent selected the correct assignment in the wrong slot.

---

## Correct target behavior (design — not yet implemented end-to-end)

1. **Match by assignment identity** — resolve PHA + library from Submission fields or asset-linked PHA, independent of asset UI slot when unambiguous.
2. **Confirm enrollment + week** — same as today; fail closed on mismatch.
3. **Resolve official PHA slot** — read PHA.`Homework Slot`; treat asset slot as hint only.
4. **Normalize HC slot fields** — when identity is unambiguous, write HC `Item Slot` / `Asset Slot` to official PHA slot (mirror **005** normalization semantics).
5. **Preserve protections** — wrong assignment, wrong week, wrong enrollment, duplicate PHA candidates, ambiguous dual-slot submissions still fail closed.
6. **XP once** — `HOMEWORK_XP|{homeworkCompletionId}` idempotency unchanged.

**Do not** simply delete the PHA slot safety check — replace it with identity-first matching + explicit ambiguity errors.

---

## Proposed implementation slices (separate PR)

| Slice | Scope | Risk |
|-------|-------|------|
| **A — Shared resolver** | Extract `resolveHomeworkAssignmentIdentity()` shared by **005**, **020**, **065** (repo lib + tests) | Low — offline only |
| **B — 020 v3.8** | Asset path: accept alternate slot when PHA identity matches Submission PHA field; normalize HC slot | Medium — Production paste + HC proof |
| **C — 065 v10.4** | Align PHA eligibility with normalized HC slot / official PHA slot | Medium — XP proof |
| **D — Live proof** | Schmidt disposable HC: correct assignment in alternate slot → one XP event, replay safe | Requires Mike authorization |

---

## Tests to add when implementing (offline first)

| Scenario | Expected |
|----------|----------|
| Assignment in normal slot | PASS — today’s behavior |
| Valid assignment in alternate slot | PASS after slice B/C — one HC, one XP |
| Wrong assignment | FAIL closed |
| Wrong week / enrollment | FAIL closed |
| Ambiguous PHA candidates | FAIL closed |
| Replay / idempotency | Reuse same HC + XP row |
| XP create + reconcile | **065** reuses existing `HOMEWORK_XP\|{hcId}` |

Existing **005** normalization tests are the reference pattern: `tests/homework/automation-005-020-pha-direct.test.js`.

---

## Why deferred in 2026-08-24 closeout

- **005** already covers the primary Fillout submission path for misplaced PHA IDs.
- **020 / 065** changes require coordinated Production paste and live homework XP proof.
- No schema change required, but **product sign-off** on “normalize HC slot when parent used alternate upload slot” is needed before paste.

**Next step for Mike:** Confirm whether alternate-slot tolerance should apply to **asset upload slot only**, **Fillout field only**, or **both** — then schedule slice A+B as a focused PR.
