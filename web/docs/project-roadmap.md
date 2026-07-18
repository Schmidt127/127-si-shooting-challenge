# Project Roadmap

## Vision

Replace Softr.io with a custom Next.js site that reads from the same Airtable base used by production automations. Athletes, parents, and gym displays get a faster, branded experience; staff keep Airtable as the system of record.

## Phases

### Phase 0 — Pipeline scaffold (current)

- [x] Next.js + TypeScript + Tailwind project under `web/`
- [x] Folder structure for all planned routes and components
- [x] Private homepage proving Cursor → GitHub → Vercel path
- [x] Airtable client stub + `/api/airtable` health route
- [ ] First Vercel deployment with env vars
- [ ] Confirm `/api/airtable` returns `configured: true` in production

### Phase 1 — Read-only public slice

- Leaderboard (top N enrollments by Total XP)
- Levels reference page (from Levels table)
- Public display mode (auto-refresh, no auth)
- Respect `OK to Publish on Softr` (or successor publish flag) on all public queries

### Phase 2 — Athlete profiles

- `/athletes/[slug]` with XP summary, level, streak, recent activity
- Stable public slug field on Enrollments (define in airtable-data-map.md)
- Homework + video progress widgets (read-only)

### Phase 3 — Participant dashboard (auth)

- Login (magic link, Clerk, or similar — TBD)
- Scoped to own enrollment only
- Homework status, video feedback links, weekly summary highlights

### Phase 4 — Achievements & polish

- Achievement grid, shot milestones, perfect weeks
- Charts (weekly XP trend)
- Branding, animations, mobile layout

### Phase 5 — Admin (staff)

- Review queues (optional — may stay in Airtable)
- Publish toggles, featured athlete picker for public display

### Phase 6 — Softr cutover

**Checklist (do not execute without Mike approval):** [SOFTR-CUTOVER-READINESS.md](../../docs/deploy-checklists/SOFTR-CUTOVER-READINESS.md)

- DNS / URL switch from Softr to Vercel
- Redirect old Softr paths if needed
- Remove sitewide `noindex` only after pre-cutover tests pass
- Decommission Softr app only after rollback window
- Keep Softr intact for rollback during the first 48h

## Success metrics

- Public pages load in &lt; 2s on mobile
- No PII leaked beyond what Softr already showed
- Airtable API usage within plan limits (cache + ISR)
- Zero duplicate writes from the website (read-only until admin phase)

## Out of scope (for now)

- Writing submissions or homework from the website
- Replacing Airtable automations
- Replacing Make.com email flows
