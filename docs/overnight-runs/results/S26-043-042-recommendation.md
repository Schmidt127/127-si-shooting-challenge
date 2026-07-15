# S26 — Recommendation: 043 → 042

**As-of:** 2026-07-14  
**Workstream:** 7  
**Investigation:** [LEVELS-043-042-investigation.md](../../deploy-checklists/LEVELS-043-042-investigation.md)

---

## Recommendation

| Item | Value |
|------|-------|
| **Rank** | **Combine with conditions** → fold *behavior* into 042 already done in GitHub v3.0 |
| **Retire 043?** | **Not tonight.** Optional later under Mike-approved replacement retirement |
| **Basis** | Replacement evidence (042 writes Level Gate Rule) — **not** because OFF |
| **Capacity** | Optional **+1** slot only after Mike UI disable/delete of 043 |

---

## Why this is safe *as a plan*

1. 042 v3.0 already assigns `Enrollments.Level Gate Rule` for both Assigned and Gate Blocked outcomes.
2. 043 is a thinner follow-on (Next Level → gate rule when empty) — redundant when 042 succeeds.
3. V2-014a already listed 043 retirement as approved pending maintenance window.

## Why not execute tonight

1. S26 HARD: no deletes/disables; do not retire 043.
2. Live ON/OFF + pasted script version not Meta-verifiable; need Mike UI soak.
3. Zero urgency for capacity if other consolidations (Phase A–D) are the primary path.

---

## Suggested Mike decision

| Option | When |
|--------|------|
| **A — Keep both ON** | Default until DEV soak proves 042 always fills Level Gate Rule |
| **B — Disable 043 only (keep slot)** | After soak PASS; still not delete |
| **C — Delete 043** | Approved maintenance window only (V2-014a) |

Lead recommendation: **A tonight / near-term**; migrate to **B** then **C** only with Mike explicit go.

---

## Offline tests

`python -m unittest tools.airtable.tests.test_levels_042_043_contracts -v`
