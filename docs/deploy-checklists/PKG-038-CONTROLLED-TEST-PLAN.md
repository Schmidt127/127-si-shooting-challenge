# PKG-038 — Controlled Production test plan (one test athlete)

**Owner:** Mike only — no agent Production access.  
**Scope:** Streak + shot-milestone corrected-history lifecycle on **one** Schmidt test enrollment.  
**Out of scope:** Email, Make, Perfect Week new fixtures (unless separately approved), schema changes, record deletes.

**Primary fixture (verify live before start):**

| Role | Record ID | Notes |
|---|---|---|
| Enrollment | `recCyFEPeATOVNlr9` | Schmidt Testing 2026-2027 |
| Program Instance | `rec5mEM0YPqPqq0hZ` | Confirm link on enrollment |
| Athlete | Resolve via Enrollment → Athlete link | Record ID in evidence sheet |

**Alternate:** `recwuMDL6dqIVfvqH` only if Mike explicitly approves and fixture is isolated from progression proof.

---

## Preconditions (all must pass)

Complete [do-not-proceed gate](./PKG-038-DO-NOT-PROCEED-GATE.md) and [repository audit](./PKG-038-REPOSITORY-VS-PRODUCTION-AUDIT.md).

1. **010** ON at approved PKG-006R version; submission reversal proven for this athlete.
2. **031** ON; exactly one canonical WAS per Enrollment + Week used in test.
3. **041 / 042** ON; Mike confirms no competing lifetime-XP observation window.
4. Read-only audit v2.1 → save `before-pkg-038-audit.json` (zero blockers).
5. Turn **OFF** only 053, 054, 059, 066; paste in order; configure triggers; leave OFF until step 6.
6. Paste order: **053 v5.5 → 054 v5.8 → 066 v3.8 → 059 v3.6** ([paste packets](./PKG-038-053-PASTE-PACKET.md)).
7. Re-run audit with all four OFF; still zero blockers.
8. Enable order: **053 → 054 → 066 → 059**; screenshot ON state after each.
9. Disable email arms (072/074/076/079/071/073) for test window.

---

## Phase A — Baseline capture

Record every ID in [evidence checklist](./PKG-038-EVIDENCE-CHECKLIST.md) **Before** column.

1. List all Submissions for `recCyFEPeATOVNlr9` with `Count This Submission?` = 1 — pick **one** controlled submission `SUB_TEST` for reversal (prefer isolated week).
2. List existing **Streak Occurrences** (IDs, `Active?`, `Source Status`, `Streak End Date`).
3. List existing **Athlete Achievement Unlocks** with `SHOT_MILESTONE|` keys (8 expected from 2026-08-08 replay).
4. List linked **XP Events** (`STREAK_XP|…` and `SHOT_MILESTONE|…`) with `Active?`, `Source Key`, points.
5. Capture WAS IDs per affected Week; Enrollment lifetime XP rollup; one WAS weekly XP total.

---

## Phase B — Award and replay (happy path)

### B1 — Milestone replay (066 → 059)

1. Check `Run Shot Milestone Check?` on `recCyFEPeATOVNlr9` (or let 010 arm it via counted submission).
2. Wait for **066** run; capture `statusOut`, `actionOut`, run ID.
3. **Expect:** `skipped_existing` or `reconciled` with **0 new unlocks** if thresholds already earned; no duplicate `SHOT_MILESTONE` keys.
4. For each unlock still `Pending` with empty XP link, **059** should award; for already-awarded, replay must skip.
5. **Replay:** run 066 again (re-check box). **Expect:** identical unlock IDs, no new rows.

### B2 — Streak award and replay (053 → 054)

1. Use a counted submission that extends or confirms streak (or controlled new submission on consecutive days if fixture allows).
2. **053** runs from submission update; capture outputs.
3. **Expect:** canonical occurrence; `Source Status` reaches `Awarded` via 054; one `STREAK_XP` event per occurrence key.
4. **Replay:** touch same submission field watched by trigger. **Expect:** same occurrence ID + same XP event ID.

---

## Phase C — Corrected history: withdrawal

**Stop** if installed trigger does not fire on withdrawal (record gate failure).

### C1 — Submission disqualification (drives 053 + 010 + 066)

1. On `SUB_TEST`, apply approved disqualification (e.g. `Duplicate Review Status` → `Exclude It` or correction that clears `Count This Submission?` after formula settles).
2. Wait for **010** → submission XP `Active?` = false (same event ID).
3. Wait for **053** → unsupported streak occurrences `Active?` = false (same IDs, not deleted).
4. Wait for **054** → linked `STREAK_XP` events `Active?` = false (same IDs).
5. Wait for **066** (via `Run Shot Milestone Check?`) → below-threshold unlocks `Active?` = false.
6. Wait for **059** → linked `SHOT_MILESTONE` XP `Active?` = false.
7. Allow rollups to settle (WAS XP, lifetime XP ↓); observe **041** queue → **042** (do not manual-write levels).

### C2 — Evidence

Screenshot + field values per [checklist](./PKG-038-EVIDENCE-CHECKLIST.md) **After withdrawal** column.

---

## Phase D — Restoration

1. Restore `SUB_TEST` to qualifying state (reverse disqualification; wait for `Count This Submission?` = 1).
2. **010** reactivates same submission XP event ID.
3. **053/054** reactivate same streak occurrence + `STREAK_XP` event IDs.
4. **066/059** reactivate same unlock + `SHOT_MILESTONE` XP IDs.
5. Totals restore; no duplicate Source Keys in audit.
6. **Replay** 053/066 on same records — still no new IDs.

---

## Phase E — Post proof

1. Save `after-pkg-038-audit.json` — zero findings.
2. Complete evidence checklist all columns.
3. Store automation run history exports for every manual/ natural run.
4. If any step fails: execute [rollback](./PKG-038-ROLLBACK-PLAN.md); do not delete rows.

---

## Stop conditions (immediate)

- Duplicate Source Key or second XP Event for same canonical identity
- Wrong Enrollment, Week, or WAS on any write
- New XP/unlock/occurrence ID on replay where same ID required
- Email/Make send triggered
- Audit error or ambiguous ownership
- Formula not settled within agreed window (15 min; re-check once)
- Trigger did not fire on withdrawal or restoration

---

## Success criteria

| # | Criterion |
|---|---|
| 1 | Award path creates or reuses exactly one canonical record per identity |
| 2 | Replay produces no duplicate IDs or Source Keys |
| 3 | Withdrawal deactivates same XP/unlock/occurrence IDs (no deletes) |
| 4 | Restoration reactivates those same IDs |
| 5 | Before/after audit clean; WAS and lifetime XP reflect inactive/active transitions |
| 6 | 041/042 observe only — no manual progression writes |
