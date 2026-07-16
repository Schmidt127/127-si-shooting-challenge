# V2 frontend functional readiness

**Branch:** `feature/shooting-v2-light-theme`  
**Scope:** Read-only verification of `/shoot` pages against V2 product features. Safe frontend fixes only — no Airtable business logic changes.

## Feature matrix

| Feature | Web status | Notes |
|---------|------------|--------|
| Dashboard | **Partial (mock)** | Demo adapter until athlete auth; shows weekly summary, streak, Perfect Week, homework, video feedback preview, recent XP source labels |
| Daily submission | **External / out of scope** | No in-app write form (Fillout / Airtable intake). Dashboard CTA no longer pretends homework is shot logging |
| Homework | **Live catalog** | `/homework` + detail from `FBC Curriculum - SYNC` |
| Weekly summary | **Partial (mock)** | Dashboard “Weekly summary” panel; no live Weekly Athlete Summary fetch |
| XP | **Partial** | Lifetime XP on leaderboard/levels; recent XP source labels on mock dashboard/profile; no XP Events query yet |
| Levels | **Live** | Ladder + detail |
| Level gates | **Live (catalog text)** | `Public Gate Criteria` with empty-state copy when unpublished; no athlete gate progress UI |
| Streaks | **Partial (mock)** | Dashboard/profile tiles only |
| Shot milestones | **Partial** | Leaderboard total shots; profile milestone tiles (mock); achievements catalog for definitions |
| Perfect Week | **Partial (mock)** | Dashboard/profile tiles |
| Video feedback | **Partial (mock)** | Preview card; no public Video Feedback route (link to tutorials removed) |
| Zoom attendance | **Catalog only** | Meeting schedule/join; attendance XP is automation-only (101) |
| Zoom recording-credit presentation | **Partial** | Detail page explains makeup quiz + `Zoom Recording` XP source when recording links exist |
| Loading states | **Improved** | Route `loading.tsx` for major catalogs + dashboard/leaderboard/profile |
| Empty / error states | **Mostly live** | Per-catalog empty/error; root + athletes error boundaries |
| Mobile navigation | **Improved** | Horizontal scroll nav with swipe hint (no drawer) |
| Achievements | **Live definitions** | Catalog from Airtable; unlock state still mock on dashboard/profile |
| Athlete profile | **Partial (mock)** | Any slug returns demo until public enrollment adapter |
| Admin | **Stub** | `PlaceholderPage` |

## Safe fixes in this pass

- Corrected misleading dashboard/profile CTAs and milestone XP/shots mix-up
- Aligned XP source display helpers with V2 labels (`Submission Base`, `Homework Completion`, `Video Submission`, `Zoom Recording`, etc.)
- Replaced user-facing “Softr” publish copy (Airtable field names unchanged)
- Null-safe `formatRelativeUpdate` / numeric formatters
- Zoom recording-credit presentation panel on meeting detail
- Catalog route loading states + mobile nav scroll affordance
- Level gate empty state when criteria unpublished

## Intentionally not built here

- Athlete auth / live Enrollment dashboard
- Daily submission writes
- Live XP Events / Weekly Athlete Summary / Video Feedback / Streak Occurrences queries
- Airtable schema or automation changes
- Production deploy
