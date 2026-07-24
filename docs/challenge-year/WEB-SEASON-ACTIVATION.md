# Website (/shoot) Season Activation Package

**Status:** Active Season Launch package  
**Front end:** Next.js at `https://www.hoopchallenges.com/shoot` (Vercel root `web/`)  
**Softr:** Obsolete / Not Used — see [`SOFTR-SEASON-ACTIVATION.md`](./SOFTR-SEASON-ACTIVATION.md)

## Active systems in scope

| System | Role in season launch |
|--------|----------------------|
| Airtable PROD | Config, Weeks, Enrollments, WAS, XP, views |
| Airtable automations | Intake, Week assign, XP, email chain |
| Fillout | Enrollment + daily submission (when ON) |
| Make.com | Weekly email + upload/approval scenarios |
| Gmail | Delivery |
| Google Drive / storage / Lambda | Asset upload where applicable |
| Next.js `/shoot` | Public participant front end |
| GitHub | Canonical scripts + launch tooling |

## Surfaces to inspect (annual)

| Route / surface | Season-sensitive checks |
|-----------------|-------------------------|
| `/shoot` home | Current-year messaging if any |
| `/shoot/leaderboard` | Enrollment Active? + challenge year / Program Instance scope |
| `/shoot/levels`, `/shoot/achievements` | Enrollment-year linkage; no prior-season mix |
| `/shoot/game-manual` | Config-driven XP/levels |
| Catalogs (homework/tutorials/articles/shoutouts) | Publish gate field (may still be Softr-named historically) |
| Empty state | New season with zero rows must not show prior-year standings |
| Mobile | Same query filters as desktop |

## Exact UI / repo verification steps

1. Confirm public traffic uses `/shoot` (not Softr).
2. Review Airtable views used by `web/lib/airtable/` for year/Active? filters.
3. Spot-check leaderboard with Schmidt Enrollment (SC-004: keep visible unless policy changes).
4. Confirm no hard-coded prior-year label in web query code for “current season.”
5. Record evidence URL on launch manifest / Launch Evidence.

## Mike attestations

| ID | Exact question |
|----|----------------|
| W-ATT-01 | Which Airtable view(s) back `/shoot/leaderboard` for the new year? |
| W-ATT-02 | Any hard-coded challenge-year string in `web/` queries for current season? |
| W-ATT-03 | Publish gate field still named `OK to Publish on Softr`? (rename is SC-144 — not a Softr launch step) |

## Rollback

1. Restore prior-year Airtable view filters / Config current flags.  
2. Do **not** re-enable Softr as part of rollback.  
3. Keep `/shoot` as the public surface.
