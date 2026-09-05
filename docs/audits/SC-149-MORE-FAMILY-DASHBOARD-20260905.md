# SC-149 residual — Family Dashboard under More (2026-09-05)

**Backlog:** SC-149 residual (wave ledger)  
**Branch:** `wave/a5-nav-levels-messaging-20260905`  
**Owner:** Agent 5

## Gap

Footer, header, mobile enrolled CTA, and parent/FAQ CTAs already linked `/dashboard/sign-in`. Desktop **More** (`MORE_NAV_HREFS`) did not include Family Dashboard.

## Change

| Surface | Before | After |
|---|---|---|
| `SHOOTING_CHALLENGE_NAV` | No FD row | `{ Family Dashboard, /dashboard/sign-in }` |
| `MORE_NAV_HREFS` | game-manual, faq, achievements | + `/dashboard/sign-in` |
| Header FD button | Present | Unchanged |
| Mobile enrolled CTA | Present | Unchanged; catalog list filters FD to avoid duplicate identical links |
| Footer `FOOTER_QUICK_LINKS` | Already had FD | Confirmed; no gap fix needed |
| Private `/dashboard` | Excluded | Still excluded |
| basePath | App href only | No `/shoot/shoot` doubling |

## Coverage checklist

- [x] Header → `/shoot/dashboard/sign-in`
- [x] More menu → Family Dashboard
- [x] Mobile enrolled CTA → Family Dashboard
- [x] Footer quick links → Family Dashboard
- [x] Homepage + FAQ CTAs unchanged
- [x] No private IDs/tokens in public chrome

## Tests

- `web/lib/navigation/nav-priority.test.ts`
- `web/lib/navigation/family-dashboard-link.test.ts`
- `web/lib/navigation/public-route-readiness.test.ts`
- `web/tests/family-dashboard-nav.spec.ts` (More menu case)
