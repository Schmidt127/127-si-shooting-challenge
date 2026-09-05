# SC-169 — Achievement unlocks (Season Sim cascade) checklist

**Status:** Repository complete — **no Airtable automation paste**  
**Backlog:** SC-169  
**Audit:** [`../audits/SC-169-ACHIEVEMENT-UNLOCKS-20260905.md`](../audits/SC-169-ACHIEVEMENT-UNLOCKS-20260905.md)

## Operator actions

| Step | Action | Done |
|---|---|---|
| 1 | Merge PR for `fix/sc-169-achievement-unlocks` after review | ☐ |
| 2 | Do **not** paste 053/054/057/058/059/066 for this item | ☐ |
| 3 | Confirm T122531Z unlock orphans gone (FIND `SHOT_MILESTONE\|recmImoXTlKb5NWSY\|`) | ☑ deleted 2026-09-05 |
| 4 | Future Season Sim cleanup: ensure `build_cleanup_plan(..., client=...)` so Source Key unlock merge runs | ☐ |
| 5 | Optional hygiene: scan other orphan unlocks from prior sim enrollments (coordinator) | ☐ |

## Revised T122531Z expectation

| Metric | Prior discrepancy note | Corrected |
|---|---|---|
| Athlete Achievement Unlocks | Reported 0 | **Expected/actual 4** (shot milestones) |
| SHOT_MILESTONE XP | 4 | 4 (matches unlocks via 059) |
| Perfect Week unlocks | — | **0** (Eligible=0) |
| Streak unlocks on Unlocks table | — | **0 by design** (053/054) |

## Offline verification

```powershell
cd <repo>
python -m unittest tools.season_simulation.tests.test_sc169_achievement_unlocks -v
```

Expect 10 tests OK.
