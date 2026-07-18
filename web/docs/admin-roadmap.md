# Admin roadmap — `/shoot/admin`

**Status:** Placeholder UI only. **No Airtable write controls** in this phase.  
**Auth:** Not implemented. Until staff authentication exists, do **not** expose private participant diagnostics on this route.  
**As of:** 2026-07-18

Related: [site-hierarchy.md](./site-hierarchy.md) · [public-data-rules.md](./public-data-rules.md) · [PROJECT_STATE.md](../../docs/PROJECT_STATE.md)

---

## Current state

| Item | Reality |
|------|---------|
| Route | `/shoot/admin` (basePath → public `/shoot/admin`) |
| Nav | **Not** in `SHOOTING_CHALLENGE_NAV` (intentional) |
| SEO | `noindex` |
| UI | Placeholder + roadmap summary (no private data) |
| API | `GET /shoot/api/airtable` health only — no table dumps |

---

## Auth requirements (before any diagnostics)

Minimum before showing enrollment-, athlete-, or email-related readiness:

1. **Staff authentication** (Clerk, Auth.js, or Vercel SSO — TBD by Mike)
2. **Role gate** — coach/admin only; no athlete tokens
3. **Server-only Airtable reads** — reuse `web/lib/airtable/*`; never ship PAT to the browser
4. Optional interim: require `SITE_ACCESS_TOKEN` for Preview environments (already used by middleware / health route)
5. Audit log of who opened admin (nice-to-have)

Until (1)–(3) exist, admin may only show:

- Static architecture / roadmap copy
- Non-sensitive deploy pointers (docs links)
- Optionally: Airtable **token configured / valid** boolean from the existing health endpoint (no record payloads)

---

## Priority 1 — Safe read-only diagnostics (post-auth)

Aggregate counts and readiness flags only — **no** names, emails, phone numbers, or raw submission bodies on the first UI.

| Diagnostic | Source tables (read) | Ready signal (examples) |
|------------|----------------------|-------------------------|
| Enrollment processing | Enrollments | Active count; missing required links |
| Submission readiness | Submissions | Counts by status / week |
| Asset handoff readiness | Submission Assets | Pending Make / Lambda / Accepted |
| Homework completion readiness | Homework Completions | Awaiting review vs satisfactory |
| XP event status | XP Events | Created today / idempotent Source Key collisions |
| Weekly summary readiness | Weekly Athlete Summary | Build ready / send ready / sent |
| Video feedback readiness | Video Feedback | Pending coach vs complete |
| Zoom attendance readiness | Zoom Meetings + Attendees | Live award vs missing |
| Level recalculation state | Enrollments / Levels | Stale level vs XP (aggregate) |
| Perfect Week state | Weekly summaries / gates | Count incomplete PW candidates |

Implementation sketch:

```text
Browser (staff session)
  → Route Handler / Server Component (authz)
    → existing listAirtableRecords helpers
      → aggregate DTOs only
        → AdminStatusView
```

Do **not** add write endpoints until a separate approved backlog item covers mutations, CSRF, and audit trails.

---

## Priority 2 — Operator convenience (still read-only)

- Deep links into Airtable views (open in new tab) using known view names from [airtable-views.md](./airtable-views.md)
- Last health-check timestamp
- Link to [KNOWN_ISSUES.md](../../docs/KNOWN_ISSUES.md) and deploy checklists
- Softr cutover checklist status (manual checkboxes in docs — not automated)

---

## Priority 3 — Explicitly deferred

| Capability | Why deferred |
|------------|--------------|
| Publish toggles | Writes + audit |
| XP repair buttons | High blast radius |
| Trigger Make webhooks from web | Secret handling |
| Edit enrollments | Prefer Airtable / OMNI |
| Anything Team Shot Tracker | Wrong product — not this repo |

---

## Reserved Airtable tables (web client)

These are declared in `AIRTABLE_TABLES` for future dashboard/admin work and are **not** queried by public pages today:

- Weekly Athlete Summary
- XP Events
- Homework Completions
- Video Feedback

Public pages must continue to use publish-safe views only.

---

## Acceptance criteria for first real admin slice

- [ ] Staff auth enforced server-side
- [ ] No PII in HTML payloads for Priority 1 aggregates
- [ ] Uses production or explicit DEV base via env — never mixed accidentally
- [ ] Feature flagged or `SITE_ACCESS_TOKEN` protected on Preview
- [ ] Tests cover: unauthenticated redirect/deny; no data leak on placeholder; health-only without auth
