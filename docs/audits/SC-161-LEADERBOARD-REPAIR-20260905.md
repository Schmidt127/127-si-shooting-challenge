# SC-161 — Production leaderboard functional repair (2026-09-05)

## Task Classification

| Field | Value |
|---|---|
| Type | Bug fix / production repair |
| Priority | P0 (public standings blank for all visitors) |
| Difficulty | Medium |
| Owner | Agent 2 (wave 2026-09-05) |
| Dependencies | None (exclusive leaderboard paths) |
| Backlog ID | SC-161 |
| Estimated Scope | Web eligibility + error UX + evidence |
| Phase | 3 Implementation |
| Correct tool | Cursor |
| Repo | `127-si-shooting-challenge` |
| Mike's role | Review PR; coordinator merges |

## Production failure (reproduced)

- URL: https://www.fairfieldbasketballclub.com/shoot/leaderboard
- Scope: **all anonymous visitors** (no auth gate). Same failure on `/shoot/public-display` (shared `fetchLeaderboard`).
- UI: `Could not load leaderboard` / `An unexpected error occurred while fetching data.`
- Health: `GET /shoot/api/airtable` → `{ ok: true, tokenValid: true }` (config not the cause).
- Mobile/cache: server-rendered error state (not a client hydration-only issue). Airtable client uses `revalidate: 120`.

## Root cause

`requireEligibleLeaderboardRecords` **failed closed on the entire board** when the `Web - Leaderboard` view returned two active Enrollments sharing the same canonical identity (`Athlete ID Lookup` + Program Instance + School Year).

Live diagnostic (before heal):

| Metric | Value |
|---|---|
| Registering Program Instance | 1 (`Shooting Challenge \| 2026-2027`) |
| Active Levels | 12 |
| View rows | 4 |
| Integrity failures | 1 duplicate identity |

Two Active enrollments shared one Athlete ID Lookup for the 2026-2027 Shooting Challenge Program Instance. The integrity throw was mapped by `publicErrorMessage` to the generic “unexpected error” copy (not an `AirtableApiError`).

## Fix summary

1. **Code (resilience):** Skip ineligible rows instead of blanking the board. Duplicate identities keep the higher-ranked enrollment (level → XP → shots → record id). Zero eligible rows → empty state. Scope/config failures still surface a safe error with retry.
2. **UX:** Soft failure copy (“Live standings are temporarily unavailable…”) + **Try again** link; no Airtable IDs, emails, enrollment internals, or stack details in the UI.
3. **Data heal (disposable):** Cleared `Active?` on the lower-XP duplicate test enrollment so Production recovered after the 120s Airtable fetch TTL without waiting for deploy.

## Privacy

Public model unchanged: display name, school, grade, level, XP, shots, optional public profile slug only. Server skip log emits **counts only** (no record IDs). Error UI does not expose Airtable IDs, emails, magic links, or internal messages.

## Tests

```text
npx vitest run lib/data/leaderboard.test.ts \
  lib/airtable/leaderboard-queries.test.ts \
  lib/airtable/public-rest-contract.test.ts \
  components/leaderboard/leaderboard-ranking-explanation.test.ts
→ 4 files, 57 tests passed
```

## Post-heal live check

After TTL refresh, Production `/shoot/leaderboard` rendered **3 players** with season label `2026-2027 Season` (anonymous). Code change still required so a future duplicate cannot take the board offline again.
