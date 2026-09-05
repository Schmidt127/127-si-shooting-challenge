# SC Completion Wave 2026-09-05 — Coordinator Ledger

**Starting SHA:** `ba287eef8be430d1606950c39f2cf5a2e3875d46` (origin/master)
**Production deploy at start:** `dpl_77Pb8YJT8NXEX9yjWeTTpxJZ1ccc` READY @ same SHA
**Open PRs at start:** none

## Backlog IDs (assigned this wave)

| ID | Scope | Owner | Notes |
|---|---|---|---|
| SC-161 | Leaderboard Production functional repair | Agent 2 | Reopens live-proof gap from Completion Master; not a duplicate of SC-103 hygiene |
| SC-162 | Homework compact list + durable assignment links | Agent 3 | Follow-on to FUT-014; **NOT FUT-029** |
| SC-163 | Enrollments Goal Met Date reliability + backfill | Agent 4 | New |
| SC-164 | Levels progress UX simplification | Agent 5 | Follow-on to FUT-015; no XP/gate logic change |
| SC-165 | Awards + coaching messaging (Overview / What's Included) | Agent 5 | FAQ gift-card (FUT-027/MRW-G13) already COMPLETE — do not reopen FAQ as primary |
| SC-166 | Coach Homework + Video Feedback active work queues | Agent 6 | Interface/filter likely UI-only |
| SC-149 residual | Family Dashboard under More menu | Agent 5 | Footer already has FD; More menu (`MORE_NAV_HREFS`) does not — add consistently |

## Explicitly out of scope

FUT-029, Season Sim, broad Airtable cleanup, Automation 021/013/067 pastes, restore 006/043/075/077/111/112/115, XP amount changes, Perfect Week rule changes, FUT-003 activation, Fillout reopen, Game Manual changes.

## File ownership (exclusive write)

### Agent 1 — Truth / preflight
- `docs/audits/SC-WAVE-20260905-*` ownership + completion ledger only until closeout
- Stale test fix only if Automation 058 asserts v1.6 (repo assertion only)
- May prepare ID rows in Future Work List / Remaining / Completion Master **at closeout only** after other PRs merge
- **Do not** edit live automations or web UI

### Agent 2 — Leaderboard (SC-161)
- `web/app/(program)/leaderboard/**`
- `web/components/leaderboard/**`
- `web/lib/data/leaderboard*`
- `web/lib/airtable/leaderboard*`
- `web/types/leaderboard*`
- Related leaderboard tests only
- Evidence: `docs/audits/SC-161-*`, `docs/testing/evidence/sc-161-*`

### Agent 3 — Homework UX + durable links (SC-162)
- `web/app/(program)/homework/**`
- `web/components/homework/**`
- `web/lib/data/homework*`
- `web/lib/airtable/homework*`
- `web/types/homework*`
- Related homework tests / API routes for durable content delivery only
- Evidence: `docs/audits/SC-162-*`, `docs/testing/evidence/sc-162-*`
- **Do not** implement FUT-029 / grade-band player / intake adapter

### Agent 4 — Goal Met Date (SC-163)
- Automations/scripts/extensions/tools that write Goal Met Date
- Backfill dry-run + apply tooling under `tools/` / `airtable/extension-scripts/`
- Evidence + Mike checklist: `docs/audits/SC-163-*`, `docs/deploy-checklists/SC-163-*`
- **Do not** change Weeks table; disposable enrollments only for live tests

### Agent 5 — Nav / Levels / messaging (SC-149 residual, SC-164, SC-165)
- `web/lib/navigation/**` (add Family Dashboard to More)
- `web/lib/site-chrome/**`, `web/components/site/site-footer*`, `web/components/site/site-header*`, `web/components/site/family-dashboard-link*`
- `web/components/layout/product-nav*`
- `web/app/(program)/levels/**`, `web/components/levels/**`, `web/lib/data/levels*`, `web/lib/levels/**`, `web/types/levels*`
- Overview / What's Included copy surfaces (home / program content modules) — **not** Game Manual
- Evidence: `docs/audits/SC-164-*`, `docs/audits/SC-165-*`, `docs/audits/SC-149-MORE-*`

### Agent 6 — Coach queues + independent QA (SC-166)
- Coach queue docs/checklists only in repo (Interface filters are UI-only)
- May add view/filter documentation under `docs/deploy-checklists/SC-166-*`
- Independent QA reports: `docs/audits/SC-WAVE-20260905-QA-*`
- **Read-only** on other agents' paths until their PRs exist; then review diffs
- **Do not** delete Airtable records (except disposable fixtures created this wave if authorized)

## Shared conflict rules

1. No agent edits another agent's exclusive paths without coordinator merge mediation.
2. Agent 5 owns all shared nav/footer — Agents 2/3 must not patch chrome.
3. Documentation master lists: Agent 1 updates only in final closeout PR after merges.
4. Prefer existing detail route for homework details (`/homework/[id]`).
5. Game Manual: do not touch route, page, or document integration.

## Merge order

1. A1 truth/preflight (+ stale 058 test if needed)
2. A2 leaderboard
3. A4 goal met date
4. A3 homework
5. A5 nav/levels/messaging
6. A6 coach queues (+ QA fixes)
7. Integration/regression
8. Docs closeout (A1)

## Worktrees

| Agent | Branch | Path |
|---|---|---|
| 1 | wave/a1-truth-preflight-20260905 | C:/Users/mschmidt_fairfield/.cursor/worktrees/sc-wave-20260905/a1-truth |
| 2 | wave/a2-leaderboard-repair-20260905 | C:/Users/mschmidt_fairfield/.cursor/worktrees/sc-wave-20260905/a2-leaderboard |
| 3 | wave/a3-homework-ux-links-20260905 | C:/Users/mschmidt_fairfield/.cursor/worktrees/sc-wave-20260905/a3-homework |
| 4 | wave/a4-goal-met-date-20260905 | C:/Users/mschmidt_fairfield/.cursor/worktrees/sc-wave-20260905/a4-goal-met |
| 5 | wave/a5-nav-levels-messaging-20260905 | C:/Users/mschmidt_fairfield/.cursor/worktrees/sc-wave-20260905/a5-nav-levels |
| 6 | wave/a6-coach-queues-qa-20260905 | C:/Users/mschmidt_fairfield/.cursor/worktrees/sc-wave-20260905/a6-coach-qa |
