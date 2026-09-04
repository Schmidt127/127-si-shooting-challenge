# SC-154 — Weekly Athlete Summary duplicate uniqueness (SF-03)

**Date:** 2026-09-04  
**Agent:** A3 P1 (`fix/sc-154-156-p1-workflows-a3`)  
**Base:** Production `appn84sqPw03zEbTT`  
**Verdict:** **Conclusively disproven for live valid Enrollment+Week duplicates.** Residual risk remains (no Airtable unique index; orphan/malformed rows; concurrent race fail-closed).

---

## Task Classification

| Field | Value |
|-------|-------|
| Type | Workflow reliability / uniqueness |
| Priority | P1 |
| Backlog ID | **SC-154** (SF-03) |
| Phase | 3 Implementation / 5 Close |
| Correct tool | Cursor + Airtable MCP/API |
| Repo | `127-si-shooting-challenge` |

---

## Writers inventory (create vs update)

| Writer | Creates WAS? | Live status | Notes |
|--------|--------------|-------------|-------|
| **031** `wflKviSzqoWMnKNrE` | **Yes** (sole create path) | deployed · script **v4.1** | Find-or-create from counted Submission; post-create revalidation; fails closed on >1 valid candidate |
| **032–035** | No | deployed | Update helpers / threshold XP only |
| **101** | **No** (requires existing WAS) | deployed | Docblock: 031 sole create owner; throws on multiple WAS |
| **118** | **No** (v1.9+) | deployed | Docblock: 031 sole create owner; ensure/arm only |
| Manual / harness / season-sim tools | Can create | N/A | Outside automation graph; can insert Enrollment+Week pairs |

**Logical unique key:** Enrollment + Week (formula `Summary Key` = Enrollment Key \| Week Key). Never script-write `Summary Key`.

Stale doc `docs/next-wave/data-model/WAS-CREATOR-RESOLUTION.md` still lists 101/118 as create-capable — **live/GitHub truth is 031-only**.

---

## Live evidence (2026-09-04, IDs redacted)

| Metric | Value |
|--------|-------|
| WAS rows scanned | 8 |
| Valid 1 Enrollment + 1 Week | 2 |
| **Valid Enrollment+Week duplicate groups** | **0** |
| Orphan (Enrollment empty) | 5 |
| Multi-Enrollment link on one WAS | 1 |
| Existing operator view | `ADMIN - DUPLICATE SUMMARY CLEANUP - OK TO DELTE` (`viwb3YN5G8Md20q2K`) |

Orphan/blank-`Summary Key` rows clustered by missing Enrollment — **not** concurrent 031 creates of the same Enrollment+Week.

### Disposable concurrency / uniqueness proof

1. Created a second WAS with the same Enrollment+Week as a canonical Schmidt summary.  
2. Pair count rose **1 → 2** (Airtable has no unique constraint).  
3. Deleted the disposable duplicate immediately → pair count **2 → 1**.  
4. Offline coverage already asserts 031 post-create race fail-closed: `tools/testing/tests/test_031_offline.mjs` (`post-create concurrent canonical duplicate fails before readiness`).

**No auto-merge. No field deletion.** Keeper selection for any future real duplicate remains operator/OMNI with evidence.

---

## Code / live changes

| Change | Result |
|--------|--------|
| 031 script logic | **No paste required** — live v4.1 already fail-closed |
| Live Airtable data | Disposable duplicate created then deleted only |
| Rollback snapshot | `airtable/rollbacks/20260904-sc154-156/031-v4.1-pre-wave.js` |

---

## Operator reconciliation (do not auto-merge)

**Airtable filter / view recipe (Weekly Athlete Summary):**

1. Open or clone `ADMIN - DUPLICATE SUMMARY CLEANUP - OK TO DELTE`.  
2. Group by `Summary Key` (or Enrollment then Week).  
3. Investigate any group with count > 1 **and** non-blank Enrollment.  
4. Separately filter `Enrollment` is empty → treat as orphan junk (historical), not merge targets.  
5. Filter Enrollment linked-record count > 1 → multi-link repair (unlink extras; do not invent a second week).

**Merge SOP (manual only):**

1. Stop writers if an automation is erroring on the pair.  
2. Choose keeper = row with Submissions / Homework Completions / Perfect Week Unlock / XP links.  
3. Relink dependents to keeper; archive/delete extras only after link audit.  
4. Re-run 031 on a counted Submission only after a single valid candidate remains.

---

## Remaining risk

- Concurrent miss-then-create still possible under Airtable; 031 fails closed rather than picking a winner.  
- Orphan WAS rows and one multi-Enrollment WAS need operator cleanup (not blocking uniqueness of valid pairs).  
- Manual/harness creates can still insert duplicates until deleted.
