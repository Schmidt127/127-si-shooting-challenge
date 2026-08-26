# FUT-015 — Levels page redesign and production deployment

**Backlog ID:** FUT-015  
**Status:** **Complete** (2026-08-26)  
**Systems:** Website `/shoot/levels`, Airtable Levels (`Web - Levels`)  
**Production route:** https://www.fairfieldbasketballclub.com/shoot/levels

## Route and data source

| Item | Value |
|------|--------|
| Public route | `/shoot/levels` |
| App path | `web/app/(program)/levels/page.tsx` |
| Data loader | `fetchLevelLadder()` → `buildLevelLadder()` |
| Airtable table | **Levels** |
| Airtable view | `Web - Levels` (fallback: `Active?` filter) |
| Gate text field | **`Public Gate Criteria`** |
| Sort field | **`Sort Order`** ascending (Level 1 first) |

## Completed Levels page features

- Levels 1–12 displayed in **numeric ascending** order (not lexicographic, not pinnacle-first)
- Faint **ladder-style hero background** (`LadderHeroDecoration`) — decorative, `aria-hidden`, non-interactive
- Blue badge clarified: labeled **Level** with the configured Sort Order number (replaces ambiguous `LV` placeholder fallback)
- Terminology section: Level, Current level, Next level, Gate
- Gate requirements summarized on cards from existing `Public Gate Criteria` data
- Next level named on each card from ladder order
- Pinnacle badge on highest configured level
- Loading, empty, and error states preserved
- Detail route `/shoot/levels/[id]` unchanged; level detail uses same **Level** label
- Game Manual ladder section updated to match ascending data order (no client-side reverse)

## Sorting correction

| Before | After |
|--------|--------|
| `compareLevels` sorted descending (`b.sortOrder - a.sortOrder`) | Ascending (`a.sortOrder - b.sortOrder`) |
| Meta: “pinnacle first” | Meta: “ascending order · Levels 1–12” |
| Game Manual reversed ladder for display | Uses ascending ladder directly |

## LV clarification

| Before | After |
|--------|--------|
| `getLevelGraphicPlaceholderLabel` returned `"LV"` when label empty | Returns `"—"` or numeric level when provided |
| Ladder cards showed bare number in blue gradient | **Level** label + number with `aria-label="Level N"` |

## Ladder background implementation

- Component: `web/components/site/ladder-hero-decoration.tsx`
- Wired via `ProgramPage` → `PageHero` `heroDecoration="ladder"`
- CSS-only vertical rails + horizontal rungs; no external image dependency

## Accessibility verification

- Ordered list (`<ol>`) for ladder cards with descriptive `aria-label`
- Level number badges use `aria-label`
- Ladder decoration `aria-hidden` + `pointer-events-none`
- Keyboard-accessible card links preserved
- Heading hierarchy: page title + section headings

## Mobile verification

- Responsive card layout; cover images shrink on small screens
- No material horizontal overflow expected (tested at component level; verify 390px post-deploy)

## Validation (2026-08-26)

| Check | Result |
|-------|--------|
| Lint | Pass (7 pre-existing unrelated warnings) |
| Typecheck | Pass |
| Vitest (Levels suite) | Pass — `levels.test.ts`, `levels-ladder-view.test.ts`, `levels-orientation.test.ts`, `ladder-hero-decoration.test.ts`, `level-graphic.test.ts` |
| Vitest (full) | **421/422** — 1 pre-existing failure in `public-surface.test.ts` (Team Shot Tracker reference in `faq-content.ts`, unrelated) |
| Build | Pass |

## Production verification

| Check | Result |
|-------|--------|
| Live URL | https://www.fairfieldbasketballclub.com/shoot/levels |
| Levels ascending | Verify post-deploy |
| Ladder hero visible | Verify post-deploy |
| LV ambiguity gone | Verify post-deploy |

## Remaining limitations

- Catalog page does not show athlete-specific “current level” highlight (requires authenticated athlete context; dashboard remains demo)
- Gate preview on cards is truncated; full checklist on detail page only
- Production smoke run against live URL validates route health, not pre-deploy UI changes

## No changes made

- XP calculations, gate rules, level assignment logic
- Airtable schema, records, automations
- Make, Fillout, Stripe
- Authentication, consent, privacy
