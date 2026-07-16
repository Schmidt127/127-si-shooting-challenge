# PR #34 / #35 / #37 — Contract Reconciliation

**Date:** 2026-07-16  
**Authoritative tip:** PR **#35** @ `8ded6fa` (migration-safety review)  
**Reconcile branch:** `cursor/pr-reconcile-contracts-2565`  
**Merge to master:** **Do not merge** until Mike/Lead approve after this reconciliation.

---

## Scope

| PR | Tip (at reconcile) | Owns |
|----|--------------------|------|
| **#35** | `8ded6fa` | C-009/010/011/019 DEV install docs + 067 v2.0, 072 v3.8, 118/119 + Python contracts |
| **#37** | `d4104e2` | `v2-engine-contracts` blocker closure + release-readiness validator gates |
| **#34** | `e48fb4d` | DEV operator CLI / runbook / launch smoke fixtures |

---

## Authoritative contracts (from PR #35)

| Topic | Contract |
|-------|----------|
| Weekly **eventId** | `WEEKLY_EMAIL\|{enrollmentId}\|{weekId}` (072 payload includes `eventId`) |
| Week key | `priorSaturdayKeyDenver()` — Sun→prior Sat; Mon–Sat rerun→same prior Sat; Sat→previous Sat (−7) |
| PPE rollout | 1 create field → 2 backfill intended active to **true** → 3 paste guards |
| PPE missing | Treat as **enabled** |
| PPE false | Explicitly skip progress |
| Progress guards | **010 / 031 / 053 / 065** → PPE only |
| Comms guards | **072** → `Active?` + Schmidt `recgP9qZYjAhE7NXm` (not PPE) |
| HW17 | HW1-only (`Homework 1` / `HW1`); parent Submission required; multi-file; Source Attachment ID dedupe; Send to Make Trigger = **false** |

---

## File conflicts resolved on reconcile branch

| File | Conflict | Resolution |
|------|----------|------------|
| `docs/v2/README.md` | #35 packages vs #34 runbook links | **Union** — keep both + this reconciliation doc |
| `tools/validate-v2-release-readiness.js` | #37 launch-scope gates vs #34 runbook required paths | **Union** (auto-merge) + require C-009/010/011 docs/tests + PR #35 needles |

No other path overlaps between the three PRs.

---

## Drift found and fixed (reconcile branch)

| Area | Pre-reconcile drift | Fix |
|------|---------------------|-----|
| `#37` `evaluateEnrollmentProcessingGuard` | Combined Active?+PPE would skip XP when Active?=false even if PPE=true | Split `evaluateProgressProcessingGuard` (PPE only) + `evaluateCommsProcessingGuard` (Active?+Schmidt) |
| `#37` `ENROLLMENT_ACTIVE_GUARD_COVERAGE` | Listed **072** as Active? gap | Mark **072** guarded (repo 072 v3.8); progress PPE scripts remain gaps until paste |
| `#37` weekly eventId / week key | Missing `WEEKLY_EMAIL` helper + `priorSaturdayKeyDenver` | Added `buildWeeklyEmailEventId` + `priorSaturdayKeyDenver` + tests |
| `#37` HW17 | Completion dedupe only; no HW1 asset defaults | `HW17_ASSET_DEFAULTS` (HW1 / Send to Make false) on `decideHw17QuizIntakeAction` |
| `#34` weekly fixture | No eventId / priorSaturday / dryRun safety | Extended `fixtures/weekly_summary.json` |
| `#34` homework fixture | C6 lacked HW17 HW1 contract | Extended `fixtures/homework_completion.json` |
| `#34` `fixture_builders` | No weekly email eventId | `weeklyEmailEventId` via `buildWeeklyEmailEventId` |

---

## Alignment checklist (post-fix)

| Check | #35 | #37 (after reconcile) | #34 (after reconcile) |
|-------|-----|------------------------|------------------------|
| `WEEKLY_EMAIL\|…\|…` | ✅ 072 + Python | ✅ engine helper + tests | ✅ fixture + builder |
| `priorSaturdayKeyDenver` | ✅ 118/119 + Python | ✅ engine helper + tests | ✅ fixture `week_key_rule` |
| PPE missing=enabled | ✅ docs + Python | ✅ progress guard | ✅ homework fixture note |
| PPE false skips | ✅ | ✅ | ✅ |
| 010/031/053/065 = PPE only | ✅ | ✅ coverage map | N/A (no progress paste in CLI) |
| 072 = Active? + Schmidt | ✅ | ✅ comms guard | ✅ weekly fixture |
| HW17 HW1-only / Send to Make false | ✅ 067 v2.0 + Python | ✅ `HW17_ASSET_DEFAULTS` | ✅ homework fixture |

---

## Remaining live DEV actions (unchanged — Mike)

1. Create **Quiz Result PDF** and **Progress Processing Enabled?**  
2. Backfill PPE **true** on intended active enrollments  
3. Paste **067 v2.0**, **072 v3.8**, **010/031/053/065** PPE guards, **118/119**  
4. Keep **118/119** schedules **OFF** and `dryRun=true`  
5. Create C-019 Testing views  
6. Attest **059**, **112**, **042**  
7. Verify DEV Make Test webhook  

---

## Merge guidance (Lead / Mike)

1. Prefer merging this reconcile branch **or** merge #37 → #35 → #34 with the same README union + contract fixes.  
2. Do **not** merge individual worker PRs to master until this checklist is green.  
3. Workers must not merge; Mike approves master.
