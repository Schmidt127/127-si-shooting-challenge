# MRW-B05 — XP Activity WIP resolution (WIP-XP-ACT vs FUT-012 Game Log)

**Date:** 2026-08-30  
**Decision:** **ABANDON** PR #240 xp-activity stack  
**Agent:** Implementation Agent 2  
**Branch:** `cursor/mrw-b05-xp-activity-audit-a2de`

## Summary

Audit of stashed/uncommitted XP Activity ledger work and draft PR #240 against the shipped FUT-012 Game Log on `master` concludes that PR #240 is **fully superseded**. No merge or partial merge is warranted. Master’s Game Log stack remains the single canonical implementation.

## Sources audited

| Source | Status |
|--------|--------|
| `origin/master` (FUT-012 COMPLETE) | Canonical — keep |
| PR #240 `cursor/athlete-xp-activity-perf-9e78` | ABANDON — close when convenient |
| Git stash `lead-audit-wip-2026-08-29` | **Not present** in this environment (`git stash list` empty) |
| Uncommitted `web/lib/data/xp-activity*` on working tree | None — master files match shipped Game Log |

## Comparison: WIP (PR #240) vs master Game Log

| Feature | Master (FUT-012) | PR #240 (WIP) |
|---------|------------------|---------------|
| **Loader** | `web/lib/data/xp-activity-loader.ts` (~1014 lines) — enrollment via `Enrollment Record ID` lookup, submission date authority, reconciliation, same-date sort ranks | Parallel `xp-activity-loader.ts` (~310 lines) + `xp-activity.ts` (~538 lines) — enrollment via `Enrollment` link, simpler mapping |
| **Pagination API** | `GET /api/athletes/[slug]/game-log` — cursor via `game-log-pagination.ts` | `GET /api/athletes/[slug]/xp-activity` — duplicate route |
| **Public profile UI** | `RecentActivityLog` → game-log API, two-row presentation via `game-log-presentation.ts` | `xp-activity-section.tsx` + `xp-activity-table.tsx` — duplicate athlete UI |
| **Dashboard UI** | `web/components/dashboard/xp-activity-table.tsx` (shared) | Would add athlete-scoped table (duplicate) |
| **Types** | `PublicActivityItem`, `XpEventSummary` | New `types/xp-activity.ts` (`XpActivityRow`) — incompatible parallel model |
| **Tests** | `xp-activity-loader.test.ts` (~790 lines), `game-log-presentation.test.ts`, `game-log-pagination.test.ts`, `recent-activity-log.test.ts`, `public-game-log.test.ts` | `xp-activity.test.ts`, `xp-activity-loader.test.ts` (PR-specific), `athlete-profile-cache.test.ts` — test abandoned stack |
| **Reconciliation scripts** | `web/scripts/xp-activity-reconciliation-report.mjs`, `xp-activity-live-probe.mjs` — use master loader | N/A (master scripts already sufficient) |
| **Profile shell split** | Monolithic profile load in `queries.ts` + `public-athlete-profile.ts` | `profile-queries.ts` shell + Suspense segment — **not merged** (separate perf task if needed) |
| **Airtable timeouts** | None (default fetch) | 8s `AbortSignal.timeout` in client — **not merged** (future MRW item if profile hangs recur) |
| **Server segment cache** | Next.js `revalidateSeconds` only | `cache.ts` in-memory TTL — **not merged** (future MRW item) |

## Why ABANDON (not MERGE or PARTIAL)

1. **Duplicate code paths.** Merging PR #240 would introduce two loaders, two API routes, and two athlete UI stacks for the same Game Log feature.
2. **Master is more complete.** FUT-012 loader includes enrollment isolation fixes, submission↔XP reconciliation, deterministic same-date ordering, and production-verified presentation — all absent or simplified in PR #240.
3. **High merge cost, low incremental value.** PR diff: +2084 / −307 lines across 21 files; merge-base predates FUT-012 landing. Conflict resolution would exceed value of any isolated perf ideas (timeouts, shell cache).
4. **No stash to recover.** Referenced stash `lead-audit-wip-2026-08-29` is not in the repo environment; nothing additional to merge.
5. **Scripts already on master.** Reconciliation/live-probe scripts import master’s `xp-activity-loader.ts` — no partial script merge needed.
6. **Scope constraint.** Task forbids XP calculation or Airtable logic changes; cherry-picking PR perf patches would touch shared Airtable client and profile query layers beyond display-only audit scope.

## Recommendation for PR #240

- **Close PR #240** with reference to this decision doc and FUT-012 completion on master.
- Do **not** force-push or delete branch immediately — keep `cursor/athlete-xp-activity-perf-9e78` for historical reference until PR is closed.
- If athlete profile load performance becomes a priority again, open a **new** focused MRW item to port only:
  - Airtable request timeouts (`AIRTABLE_REQUEST_TIMEOUT_MS`)
  - Profile shell / Suspense split
  - Optional in-memory segment cache  
  …onto the existing Game Log stack — not the abandoned parallel stack.

## Stash cleanup

No action required — stash list is empty. If `lead-audit-wip-2026-08-29` exists on Mike’s local machine, drop it after confirming this doc; contents overlap PR #240 and master FUT-012.

## Verification

Decision doc only — no application code changes. Baseline validation on `master`:

- `npm run lint` — pass
- `npm run typecheck` — pass
- `npm test` — pass (see PR CI / agent run output)
- `npm run build` — pass

## Related

- FUT-012: `docs/127-SI-MASTER-FUTURE-WORK-LIST.md` — COMPLETE
- MRW-B05: `MASTER_REMAINING_WORK_LIST.md` — RESOLVED (ABANDON)
- PR #240: https://github.com/Schmidt127/127-si-shooting-challenge/pull/240
