# Public Athlete Profile Duplicate Slug — PROD Fix

Date: 2026-08-08  
System: Shooting Challenge public web / PROD Airtable  
Official route: `https://www.fairfieldbasketballclub.com/shoot/athletes/testing-schmidt`

## Problem detected

Vercel runtime observability for project `127-si-shooting-challenge` reported:

`[public-athlete-profile] Duplicate enabled Public Profile Slug "testing-schmidt" (2 enrollments). Correct in Airtable: ensure only one Active enrollment has this slug with Public Profile Enabled. Failing closed.`

The error group had occurred twice on `/athletes/[slug]` on 2026-08-05.

## PROD Airtable root cause

Two Enrollment records had the same enabled public profile slug:

### Current controlled enrollment — keep enabled

- Enrollment: `recCyFEPeATOVNlr9`
- Athlete: Testing Schmidt
- School Year: `2026-2027`
- Program Instance: `rec5mEM0YPqPqq0hZ` — Shooting Challenge | 2026-2027
- Active?: true
- Public Profile Enabled: true
- Public Profile Slug: `testing-schmidt`

### Obsolete prior-year enrollment — disable

- Enrollment: `recgP9qZYjAhE7NXm`
- Athlete: Testing Schmidt
- School Year: `2025-2026`
- Public Profile Enabled: true before repair
- Public Profile Slug: `testing-schmidt`

The obsolete record should not remain an enabled public-profile candidate for the current slug.

## PROD change

Updated only the obsolete Enrollment:

`recgP9qZYjAhE7NXm.Public Profile Enabled = false`

No change was made to the current controlled 2026-2027 Enrollment.

## Live verification

After the Airtable correction, fetched:

`https://www.fairfieldbasketballclub.com/shoot/athletes/testing-schmidt`

Result:

- HTTP `200 OK`
- current athlete profile rendered rather than failing closed
- Testing Schmidt
- Fairfield · Grade 3
- `2026-2027 Season`
- current Level displayed as Rookie
- Lifetime XP displayed as 708 during the verification
- current/longest streak displayed as 7 days
- total shots displayed as 26,225
- canonical URL points to the official Fairfield profile route

The live page continues to emit `noindex, nofollow`; that is the separate SC-115 indexing decision and was not changed by this fix.

## Architecture note

The public-profile reader is behaving correctly by failing closed on duplicate enabled slugs. The defect was stale PROD data, not permissive website logic.

The correct operational rule is:

- one enabled public profile per public slug
- prior-year/obsolete Enrollment records must not remain enabled for a slug currently owned by the active season Enrollment

## Completion Master implications

Current master rows that still cite `recgP9qZYjAhE7NXm` as the controlled Schmidt Enrollment are stale. The controlled identity is `recCyFEPeATOVNlr9` for 2026-2027.

This evidence should be included in the Completion Master reconciliation tracked by GitHub issue #122.

## Related evidence

- `docs/prod-completion/2026-08-08/SC-148-149-FAIRFIELD-PROD-LIVE-PROOF.md`
- GitHub issue #122 — current Completion Master stale-row reconciliation
