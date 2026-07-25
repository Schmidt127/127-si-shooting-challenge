# Browser QA Report — Shooting Challenge `/shoot`

| Field | Value |
|-------|--------|
| Date | 2026-07-25 |
| Agent | Browser QA and Integration |
| Controlling source | `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` |
| Production URL | https://www.hoopchallenges.com/shoot |
| Test identity | Public read-only + Schmidt enrollment visibility (`Testing Schmidt`, Enrollment `recgP9qZYjAhE7NXm`) |
| Branch | `cursor/browser-qa-integration-0f49` |

---

## Task Classification

| Field | Value |
|-------|--------|
| Type | Browser QA + repository-safe web fixes |
| Priority | P0–P1 functional public surface |
| Phase | 3 Implementation / live PROD spot-check |
| Correct tool | Cursor (web) + OMNI for Airtable content |
| Repo | `127-si-shooting-challenge` |
| Mike’s role | Approve deploy; execute Airtable/Vercel/Fillout tickets below |

---

## Phase 1 — User journey map (actual)

### Athlete (current product reality)

| Step | Actual browser path | Status |
|------|---------------------|--------|
| Open application | `/shoot` | Live |
| Sign in / identify enrollment | **Not available** — SC-112 Decision Needed; dashboard/profile are labelled demos | Blocked on decision |
| View dashboard | `/shoot/dashboard` (mock Jordan Reyes) | Demo only |
| Submit daily activity | **Fillout** (form **OFF** / SC-146 Deferred) — not on `/shoot` | External / deferred |
| Upload homework | Fillout / Make / Lambda path — web is catalog-only | External |
| View XP / level / achievements / weekly / feedback | Public catalogs + mock dashboard; live athlete XP UI requires SC-112 | Partial |

### Parent

| Step | Path | Status |
|------|------|--------|
| Parent-facing info | Weekly email (Make) + public catalogs | Email not triggered by this agent |
| Athlete summary / feedback | Mock dashboard or future auth | Demo / decision |
| Private data limited | Public pages show no emails; profile privacy disclaimer present | Pass |

### Coach / Administrator

| Step | Path | Status |
|------|------|--------|
| Locate athlete / review submissions | Airtable UI (OMNI), not `/shoot/admin` | Admin route is placeholder |
| `/shoot/admin` | Roadmap + “Authentication required” | Placeholder only |

### Routes tested

`/`, `/dashboard`, `/leaderboard`, `/homework`, `/homework/[id]`, `/tutorials`, `/shoutouts`, `/articles`, `/zoom-meetings`, `/zoom-meetings/[id]`, `/levels`, `/levels/[id]`, `/achievements`, `/game-manual`, `/public-display`, `/athletes/schmidt`, `/admin`, `/api/airtable`

---

## Browser matrix

| Viewport | Result |
|----------|--------|
| Desktop ~1440×900 | All public routes 200; nav OK |
| Mobile 390×844 | No horizontal overflow; nav usable |
| Tablet/narrow 1024×768 | Leaderboard, public-display, game-manual OK |

---

## Defects found

### Fixed in repository (this branch)

| ID | Severity | Area | Expected | Actual | Fix |
|----|----------|------|----------|--------|-----|
| WEB-QA-001 | Medium | Favicon / metadata | Icons load under `/shoot` | HTML emitted `/favicon.png` → root **404** | Prefix icon URLs with `NEXT_PUBLIC_BASE_PATH` |
| WEB-QA-002 | Medium | Zoom / homework / levels copy | Bold/italic readable | Raw `**markdown**` in RichContent | Safe Markdown subset renderer |
| WEB-QA-003 | Medium | Zoom (and other) covers | Broken remote images hidden | Airtable attachment **410 Expired Resource** left broken `<img>` | `SafeExternalImage` + icon fallback |
| WEB-QA-004 | Low | Season label default | Neutral default when School Year missing | Hardcoded `2025–2026 Season` default in builder / demo | Default `Current Season`; demo `Demo Season` |

### External / configuration tickets (not fixed here)

| ID | System | Current | Expected | Required change | Risk |
|----|--------|---------|----------|-----------------|------|
| EXT-QA-001 | Vercel env | `NEXT_PUBLIC_GAME_MANUAL_URL` empty → “Manual link not configured” | Adobe manual open button works | Set env to Adobe-hosted Game Manual URL; redeploy | Low — XP/Levels sections already live |
| EXT-QA-002 | Airtable Achievements | Only **Streak** (9) Active+Visible | Shot Milestones + Perfect Week definitions public | Re-seed / set `Active?`+`Visible?` on milestone & Perfect Week rows; confirm `Web - Achievements` view | Medium — catalog incomplete for parents |
| EXT-QA-003 | Airtable Tutorials (Articles) | Category **Dribble** articles published into Shoot site | Confirm Associated Program + category taxonomy for 2026–27 | Audit `Associated Program` / categories; unpublish non-Shoot rows or retag | Medium — looks like cross-program content (may be skill category) |
| EXT-QA-004 | Airtable Zoom Cover Media | Signed `airtableusercontent.com` URLs **410** | Stable cover images (S3 canonical or refreshed attachments) | Re-upload covers or point to canonical HTTPS URLs (SC-096) | Medium — UI now degrades gracefully |
| EXT-QA-005 | Airtable Enrollment (Schmidt) | Grade shows **Pre K**; season label **2025-2026** | Correct grade band / school year for test athlete | OMNI: fix Grade + School Year on Enrollment `recgP9qZYjAhE7NXm` | Low for test identity |
| EXT-QA-006 | Airtable Curriculum / Zoom | Homework Week 10 + Zoom Week 9 still published after wipe | Season-appropriate published set | Unpublish prior-season rows or set Published?/status for 2026–27 | High for public confusion |
| EXT-QA-007 | Fillout | Daily submission form **OFF** (SC-146) | Controlled reopen after SC-135 | Do not reopen until dry-run; enrollment validation SC-060 still Built-only | High if opened early |
| EXT-QA-008 | Product decision SC-112 | No athlete auth | Real dashboard / private XP history | Mike pick auth approach (recommend parent magic-link) | Blocks athlete journeys 2–11 |
| EXT-QA-009 | Product decision SC-115 | Sitewide `noindex,nofollow` | Index only after Mike approval | Keep until content+cutover ready | SEO irreversible-ish |
| EXT-QA-010 | Landing repo | Root `/favicon.ico` 404 | Optional brand favicon at apex | Fix in `hoopchallenges-landing` if desired | Low — `/shoot` icons fixed in this PR |

---

## Phases not fully executable in browser on `/shoot`

Enrollment validation matrix, daily submission matrix, XP event creation, homework upload, video feedback writeback, Zoom attendance XP, and weekly email sends are **Airtable / Fillout / Make / Lambda** pipelines. This agent did **not** send uncontrolled emails and did **not** mutate Communications Make scenarios.

Public proof available today:

- Leaderboard shows **Testing Schmidt** — 81 XP, 100 shots (SC-004 visibility direction honored).
- Levels ladder: 12 active tiers.
- Game Manual: XP Reward Rules + Levels render from config; PDF link env missing.
- API health: `ok: true`, `tokenValid: true`, base `appn84…`.
- Security: no Airtable token in client HTML; no athlete emails on public pages; demo labels present.

---

## Tests run

| Check | Result |
|-------|--------|
| Production HTTP smoke (all major routes) | 200 |
| `web` vitest | **128/128 PASS** |
| Manual desktop + mobile + tablet browser QA | Pass (defects above) |
| Lint / typecheck / build | See PR commit notes |

---

## Completion-master impact

| SC | Prior | After this package | Notes |
|----|-------|--------------------|-------|
| SC-102 | Installed in PROD | **Live Tested in PROD** | Spot-check against rebuilt PROD + API health + catalogs |
| SC-103 | Installed in PROD | **Live Tested in PROD** | Schmidt visible; ranking renders |
| SC-106 | Installed in PROD | **Live Tested in PROD** | 12 levels live |
| SC-108 | Installed in PROD | **Live Tested in PROD** | Meetings render; cover 410 mitigated in web |
| SC-109 | Built in Repository | **Installed in PROD** (partial) | Config sections live; PDF env still missing (EXT-QA-001) |
| SC-113 | Installed in PROD | **Live Tested in PROD** | Empty/error/demo states verified |
| SC-114 | Superseded | Unchanged | Softr not used |
| SC-112 / SC-115 | Decision Needed | Unchanged | Mike decisions |

---

## Bracket website

No work moved to the bracket website. Actionable Shooting Challenge browser work remained (fixes + external tickets).

---

## Recommended next testing area

1. Mike: EXT-QA-001…006 content/config cleanup in PROD Airtable + Vercel.
2. After SC-112 decision: authenticated athlete dashboard against Schmidt.
3. Controlled Fillout reopen dry-run (SC-135 / SC-146) — not before.
4. Live streak / milestone / Perfect Week unlocks on Schmidt (SC-075–077) then re-check achievements catalog.
