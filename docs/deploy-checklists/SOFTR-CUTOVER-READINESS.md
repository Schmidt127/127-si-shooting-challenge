# Softr → Next.js cutover readiness

**Status:** Checklist only — **do not cut over** and **do not change `noindex`/robots** without explicit Mike approval.  
**As of:** 2026-07-18 · master `3ec489a`  
**Companions:** [PROJECT_STATE.md](../PROJECT_STATE.md) · [web/docs/site-hierarchy.md](../../web/docs/site-hierarchy.md) · [KNOWN_ISSUES.md](../KNOWN_ISSUES.md)

---

## 1. Softr pages that may still exist

Confirm live Softr inventory in the Softr dashboard (names vary by app). Typical participant surfaces historically mapped as:

| Softr-era surface (typical) | Purpose |
|-----------------------------|---------|
| Home / Overview | Program landing |
| Leaderboard | Season XP rankings |
| Athlete / enrollment cards | Public athlete snapshots |
| Homework catalog + detail | FBC curriculum |
| Tutorials / shoutouts / articles | Learning media |
| Zoom meetings | Schedule + links |
| Levels / achievements | Progression reference |
| Game manual / TV display | Static / kiosk |
| Parent-facing dashboards (if any) | Often Airtable/Softr hybrid |

**Action:** Mike exports current Softr page list and pastes into the “Verified Softr inventory” section below before hard cutover.

### Verified Softr inventory (fill before cutover)

| Softr page URL / name | Still live? | Traffic notes | Owner check date |
|-----------------------|-------------|---------------|------------------|
| _TBD_ | | | |

---

## 2. Next.js pages that replace them

Public prefix: `https://www.hoopchallenges.com/shoot`

| Next.js route | Replaces (intent) | Data readiness |
|---------------|-------------------|----------------|
| `/shoot` | Overview / home | Live (leaderboard subset) |
| `/shoot/leaderboard` | Leaderboard | Live |
| `/shoot/homework`, `/shoot/homework/[id]` | Homework catalog | Live |
| `/shoot/tutorials`, `/shoutouts`, `/articles` (+ ids) | Media catalogs | Live (`OK to Publish on Softr` gate) |
| `/shoot/zoom-meetings` (+ id) | Zoom list/detail | Live |
| `/shoot/levels` (+ id) | Level ladder | Live |
| `/shoot/achievements` | Achievements grid | Live |
| `/shoot/game-manual` | Manual | Live (env URL embed) |
| `/shoot/public-display` | TV / kiosk | Live |
| `/shoot/dashboard` | Participant hub | **Demo/mock only** — not cutover-ready |
| `/shoot/athletes/[slug]` | Athlete profile | **Demo/mock only** — not cutover-ready |
| `/shoot/admin` | Staff tools | Placeholder — out of Softr cutover scope |

Canonical route table: [web/docs/site-hierarchy.md](../../web/docs/site-hierarchy.md)

---

## 3. Participant workflows — complete on Next.js?

| Workflow | Next.js ready? | Notes |
|----------|----------------|-------|
| Browse leaderboard | **Yes** | Publish / enrollment views |
| Browse homework catalog | **Yes** | Read-only |
| Browse tutorials / shoutouts / articles | **Yes** | Softr publish flag still required in Airtable |
| Browse levels / achievements / Zoom | **Yes** | Read-only |
| Public TV display | **Yes** | |
| Authenticated athlete dashboard | **No** | Mock only |
| Real athlete public profiles | **No** | Mock only |
| Submit daily shots | **N/A on web** | Fillout (currently **OFF**) |
| Upload video / homework files | **N/A on web** | Make + Lambda + Airtable |
| Receive weekly / feedback emails | **N/A on web** | Make + Airtable automations |
| Staff review / XP awards | **N/A on web** | Airtable (+ future admin) |

---

## 4. Workflows that remain dependent on other systems

| Dependency | What still owns it |
|------------|--------------------|
| **Airtable** | System of record — enrollments, XP, weeks, publish flags, config |
| **Fillout** | Daily submission / quiz intake (form **OFF** for closed season; still architecture for next season) |
| **Make.com** | Email send, upload engine webhooks |
| **AWS Lambda** | Video (and future homework) asset processing |
| **Softr** | Any page not yet replaced or still linked from emails/bookmarks |
| **Vercel** | Next.js hosting at `/shoot` |

---

## 5. Must test before removing `noindex`

Do **not** flip robots until Mike approves. Pre-conditions:

- [ ] All Softr pages intended for replacement have a Next.js equivalent that matches public data rules
- [ ] Spot-check every live catalog route on mobile + desktop
- [ ] Confirm `OK to Publish on Softr` (or successor) still prevents unpublished rows
- [ ] Confirm no private fields (emails, phones, internal notes) on public pages — [public-data-rules.md](../../web/docs/public-data-rules.md)
- [ ] `/shoot/dashboard` and `/shoot/athletes/*` either gated, demo-labeled, or removed from public nav
- [ ] `/shoot/admin` remains noindex and non-sensitive
- [ ] Landing / email links updated to `/shoot/...` where Softr URLs were used
- [ ] `NEXT_PUBLIC_SITE_URL` and metadata verified on production deploy
- [ ] Vercel Preview + Production smoke of health: `GET /shoot/api/airtable`

---

## 6. Must verify before hard cutover (Softr decommission)

- [ ] Verified Softr inventory complete (section 1)
- [ ] DNS / deep links: no critical traffic still hitting Softr-only paths without redirects
- [ ] Redirect map drafted (old Softr URLs → `/shoot/...`) — implement on landing or Softr until DNS moves
- [ ] Parent communication plan (email/SMS) for bookmark changes
- [ ] Rollback path rehearsed (section 7)
- [ ] Mike written approval to decommission Softr app
- [ ] Post-cutover: monitor Airtable API usage and Vercel error rates for 48h

---

## 7. Rollback path

| Step | Action |
|------|--------|
| 1 | Keep Softr app **intact** until 48h post-cutover confidence |
| 2 | If Next.js fails: restore Softr as primary links in emails/landing; do not delete Softr |
| 3 | Vercel: redeploy last known good `master` commit or promote previous deployment |
| 4 | Re-enable `noindex` if SEO was opened and must be closed again |
| 5 | Document incident in `CHANGELOG.md` + [KNOWN_ISSUES.md](../KNOWN_ISSUES.md) |

**Hard stop:** Never delete the Softr project as part of the first cutover window.

---

## 8. Explicit non-goals for this checklist

- No robots/`noindex` code changes in this pass
- No Softr decommission
- No Airtable publish-field rename
- No participant auth implementation
