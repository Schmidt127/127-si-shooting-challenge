# FUT-043 — Consistent card design system (website + Hub emails)

**Backlog:** FUT-043  
**Status:** DEV complete — Vercel preview + Hub email render tests  
**Branch:** `cursor/fut-043-card-design-system-e772`

## Summary

Standardized SC card shells across athlete homework rows, dashboard XP/activity lists, Game Log rows, and Hub email InfoCard / MetricCard / summary shells using shared design tokens.

## Token source of truth

| Layer | Location |
|-------|----------|
| **Web (canonical)** | `web/app/globals.css` — `--sc-card-*` CSS variables |
| **Web helpers** | `web/components/ui/sc-card.tsx` |
| **Hub emails (mirror)** | `communications/emails/lib/card-tokens.js` |

See also: [`web/docs/sc-card-design-tokens.md`](../../web/docs/sc-card-design-tokens.md)

## Web surfaces updated

- Athlete profile homework assignment rows (`homework-assignments.tsx`)
- Dashboard XP activity table (`xp-activity-table.tsx`)
- Athlete Game Log (`recent-activity-log.tsx`)
- Dashboard achievement inset rows + catalog panels (`athlete-dashboard-view.tsx`, `catalog-surface.ts`)

**Out of scope (FUT-042):** coach feedback quotation inner block styling.

## Hub email surfaces updated

- `InfoCard`, `MetricCard`, `SessionDetailsCard`
- Weekly summary `SectionCard` + `WeekDetailsCard`
- Level progress level badge shells

## Promotion steps

### Web (Shooting Challenge)

1. Merge PR to `master` (Mike approval).
2. Vercel auto-deploys from `web/` root — verify on preview:
   - `/shoot/athletes/{slug}` — homework section card rows (rounded, consistent padding)
   - `/shoot/dashboard` (or mock dashboard route) — XP activity list shell
3. No env var changes.

### Hub (Communications)

1. Merge matching Hub PR from `communications` repo (card-tokens + component shells).
2. Vercel deploy Communications Hub.
3. Spot-check rendered HTML for homework feedback + weekly summary emails (card radius 12px, 1px border).

## Validation checklist

- [ ] `web`: lint, typecheck, vitest (homework + game log + xp activity)
- [ ] `communications`: `npm test` email render tests
- [ ] Browser: athlete profile homework section at mobile + desktop widths
- [ ] Email HTML: InfoCard / MetricCard borders match web token table

## Rollback

Revert web CSS + component class changes; revert Hub `card-tokens.js` and email component imports. No schema or automation impact.
