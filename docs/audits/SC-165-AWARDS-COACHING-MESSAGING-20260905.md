# SC-165 — Awards + coaching messaging (2026-09-05)

**Backlog:** SC-165  
**Branch:** `wave/a5-nav-levels-messaging-20260905`  
**Owner:** Agent 5

## Scope

Overview (“What is the Shooting Challenge?”) and What’s Included (pricing module). FAQ gift-card item (FUT-027) left as the detailed policy page — not reopened as primary work. Game Manual untouched.

## Copy added

Shared blurbs in `web/lib/seo/public-program-content.ts` → `OVERVIEW_AWARDS_COACHING`:

- **Awards:** Real prizes/recognition; eligible awards as Amazon gift cards via Award Recipient process; not an automatic payout; no amounts/timing.
- **Coaching:** More than shot-count — real coaching, personalized video feedback, educational homework review, goal support, accountability, encouragement, skill development.

### Surfaces

| Surface | Change |
|---|---|
| Overview body | Coaching + awards blurbs (replaces prior “not about racking up shots” paragraph) |
| What’s Included | Short bullets for coaching touchpoints + eligible Amazon gift card awards via Award Recipients |

## Claim check

| Claim | Grounded by |
|---|---|
| Video feedback | Live submissions + coach review schedule (FAQ / program flows) |
| Homework review | Homework catalog + completion workflows |
| Zoom / tutorials | Existing What’s Included + Zoom/Tutorials routes |
| Amazon gift cards / Award Recipients | Award Recipients operational table + FAQ commitment |
| Not automatic for every athlete | Explicit “not an automatic payout” wording |

## Tests

- `web/lib/seo/public-program-content.test.ts`
- `web/components/home/home-page-view.test.ts`
