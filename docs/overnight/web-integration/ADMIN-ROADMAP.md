# Admin Roadmap — SC-116

**Agent 6 overnight** · 2026-07-23 · Route: `/shoot/admin`  
**Decision:** No participant diagnostics without staff auth. No write controls in first slice.

Canonical in-app notes: `web/docs/admin-roadmap.md` (kept in sync with this overnight summary).

---

## Current state

| Item | Reality |
|------|---------|
| Route | `/shoot/admin` — `noindex`, not in public nav |
| Auth | None (deployment `SITE_ACCESS_TOKEN` is not staff auth) |
| Data | Static placeholder only — confirmed by Playwright privacy specs |
| Writes | None |

## Needs inventory (priority order)

| Need | Why | First-slice shape | Risk if exposed now |
|------|-----|-------------------|---------------------|
| Athlete / enrollment lookup | Ops finds Schmidt + real enrollments fast | Search by name/enrollment id → Airtable deep link | **High** — PII |
| Test scenario access | Drive SC-001 / 115 runs | Link to Testing Scenarios view + Dry Run status | Medium |
| Failed automation visibility | Catch silent failures | Aggregate fail counts / last error step (no bodies) | Medium |
| Email retry | Recover Make webhook failures | Read-only Sent?/trigger state + checklist link | High if write |
| Upload retry | Recover Lambda/Make asset stalls | Aggregate pending Accepted counts | Medium |
| XP audit | Source Key collisions / missing awards | Aggregate XP Event counts by source | Medium |
| Achievement audit | Unlock dedupe health | Counts + link to H-001 audit extensions | Medium |
| Weekly summary rebuild | WAS missing / calc drift | WAS create/build/send flags aggregate | Medium |
| Config health | XP rules / levels / gates publish readiness | Active rule counts from public-safe tables | Low |
| Decision flags | Surface SC-014/035/044/112 etc. | Static checklist from Completion Master | Low |

## What was implemented tonight

- **Nothing live against Airtable on `/admin`.** Authorization is inadequate for diagnostics.
- Admin page copy expanded to list the inventory above as a roadmap (still static).
- Protected-path scaffolding helpers in `web/lib/security/index.ts` (`isStaffProtectedPath`, `hasAthleteSession` always false) — documentation/tests only; **no false security claims**.

## Safe to add later without Mike auth product decision

Only after **staff authentication** (separate from SC-112 athlete auth):

1. Config health aggregates (Active XP rules, published levels count) — lowest risk.
2. Airtable deep-link buttons to known Testing / Web views (no record payloads in the web app).
3. Health endpoint already exists: `GET /api/airtable` (token configured boolean).

## Explicitly deferred

- Any write/retry button
- Showing parent emails, phone numbers, or raw submission bodies
- Athlete-facing admin impersonation
- Enabling diagnostics behind only `SITE_ACCESS_TOKEN`

## Mike actions

1. Choose staff auth approach (can ride with SC-112 Option E / Clerk, or Vercel SSO).
2. Until then: use Airtable + OMNI for ops lookups; treat `/admin` as a placeholder.
