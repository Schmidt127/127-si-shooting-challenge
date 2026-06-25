# Site hierarchy — Hoop Challenges

Canonical map for navigation, routing, and copy. When asking for new pages, reference this structure.

## Level 1 — Hub (site root)

| URL | Name | Role |
|-----|------|------|
| `/` | **Hoop Challenges** | Top-level landing. Program picker only — not a challenge dashboard. |

**Brand:** `HUB_BRAND` in `lib/products.ts`  
**UI:** `components/hub/hub-landing.tsx`

---

## Level 2 — Programs

Each program has its own overview page and (when live) a `ProductShell` nav.

| URL | Program | Status |
|-----|---------|--------|
| `/shooting-challenge` | Shooting Challenge | Live |
| `/dribbling-challenge` | Dribble Challenge | Coming soon |
| `/referee-clinics` | Referee Clinics | Coming soon |

Program cards on the hub come from `PRODUCTS` in `lib/products.ts`.

---

## Level 3 — Shooting Challenge pages

All use `SHOOTING_CHALLENGE_NAV` in `lib/navigation/shooting-challenge-nav.ts` and `ProductShell` via per-section `layout.tsx`.

| URL | Nav label | Airtable source |
|-----|-----------|-----------------|
| `/shooting-challenge` | Overview | — |
| `/shooting-challenge/leaderboard` | Leaderboard | Enrollments |
| `/tutorials` | Tutorials | Tutorials (`Tutorial Type` = Tutorial) |
| `/homework` | Homework | FBC Curriculum - SYNC |
| `/shoutouts` | **Shoutouts** | Tutorials (`Tutorial Type` = Shout-out) |
| `/articles` | Articles | Tutorials (`Tutorial Type` = FBC Article Book) |
| `/zoom-meetings` | Zoom Meetings | Zoom Meetings |
| `/game-manual` | Game Manual | Adobe share URL (`NEXT_PUBLIC_GAME_MANUAL_URL`) or future HTML sections |
| `/levels` | Levels | Levels |
| `/achievements` | Achievements | Achievements |
| `/public-display` | Display | — |

Detail pages: `/[section]/[airtableRecordId]` (e.g. `/homework/rec…`).

### URL note

Catalog routes currently live at the **site root** (`/homework`, not `/shooting-challenge/homework`) for shorter URLs. They are **logically** under Shooting Challenge via shared nav and `ProductShell`. Nesting under `/shooting-challenge/…` is a future option if desired.

---

## Style rule

Hub, program overview, and all Shooting Challenge catalog/detail pages share:

- Dark ambient backgrounds (`AmbientPage` variants)
- `catalog-surface` card elevation
- `DisplayHeading` / `DetailTitle` typography
- `ProductShell` header + program nav

---

## How to describe changes to the AI

Use this template:

```
Hub: hoopchallenges.com/
Program: Shooting Challenge
Page: [Nav label]
Route: /path
Airtable: [table + filter]
```

Example: *"Under Shooting Challenge, add a Game Manual page at `/game-manual` from the Rules table, same card style as Homework."*
