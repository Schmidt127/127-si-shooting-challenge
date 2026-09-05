# SC-161 evidence — Production leaderboard (2026-09-05)

## Pre-fix

- Anonymous GET `/shoot/leaderboard` → error alert “Could not load leaderboard”
- Anonymous GET `/shoot/public-display` → same unexpected fetch error (shared adapter)
- `GET /shoot/api/airtable` → configured + tokenValid

## Live Airtable readback (Production base)

- Registering Program Instance: exactly one Shooting Challenge | 2026-2027
- `Web - Leaderboard` returned 4 rows; one duplicate Athlete ID Lookup identity across two Active enrollments
- Fail-closed eligibility threw → page catch → generic public error

## Data heal

- Cleared `Active?` on the lower-XP duplicate disposable enrollment (high-autonomy disposable-data mode)
- View count after heal: 3; eligibility failures: 0

## Post-heal (pre-deploy)

- `/shoot/leaderboard` showed 3 ranked athletes, Updated timestamp, 2026-2027 Season

## Post-deploy expectation

- Code path skips future ineligible/duplicate rows instead of blanking standings
- Hard failures (missing Registering Program Instance, missing view, Airtable outage) keep safe retry UI
