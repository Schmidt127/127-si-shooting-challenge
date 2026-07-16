# LA-000 — Shooting Challenge V2 current-state handoff

**Role:** Online Agent 1 architecture reconstruction  
**Date:** 2026-07-16  
**Repo SHA inspected:** `babe74c49bf8d16eda5e55e72ed276e8958e7ce6` (`master`)  
**Working branch for this package:** `cursor/learning-activities-handoff-2ca9`  
**Scope:** Evidence-based status only. No Airtable schema, credentials, production settings, deployments, or GitHub settings changed.

---

## Task Classification

| Field | Value |
|-------|-------|
| Type | Architecture inventory + implementation handoff |
| Priority | High |
| Difficulty | Medium (broad read; small safe code contract) |
| Owner | Online Agent 1 (Cursor) |
| Dependencies | Existing homework / Submission Assets / XP pipelines |
| Backlog ID | None assigned yet — Learning Activities is an approved architecture direction ahead of a numbered backlog item |
| Estimated Scope | Docs + pure TypeScript routing contract (no schema, no automations, no deploy) |
| Phase | Research / pre–Phase 3 prep |
| Correct tool | Cursor (repo evidence); OMNI later for any DEV schema |
| Repo | `127-si-shooting-challenge` |
| Mike's role | Review handoff; authorize next package / backlog ID / DEV schema |

---

## 1. Repository state

| Item | Evidence |
|------|----------|
| Repository | `schmidt127/127-si-shooting-challenge` |
| Remote | `origin` → `https://github.com/schmidt127/127-si-shooting-challenge` |
| Branch at inspection | `master` @ `babe74c` (clean); this work on `cursor/learning-activities-handoff-2ca9` |
| Latest commit | `babe74c` — *docs: standardize agent instructions and brand context* |
| Recent commits | Brand redesign merge `#24` (`fe40739` / `f4bf6ac`); FA-001 four-agent pilot close (`c2d5701`, `a6d534a`, worker merges) |
| Working tree at start | Clean |
| Four-agent CONTROL | `docs/agent-runs/CONTROL.json` — run `idle`, FA-001 **COMPLETE**; canonical SHA still notes `c2d5701` (stale vs tip `babe74c` — Lead tip-sync gap, not blocking this read) |

### Main application stack

| Layer | Stack | Path |
|-------|-------|------|
| Web | Next.js 15.3 / React 19 / TypeScript / Tailwind 4 / Vitest | `web/` |
| Airtable automations | Numbered JS scripts `001`–`116` | `airtable/automations/shooting-challenge/` |
| Audits / backfills | Extension scripts | `airtable/extension-scripts/` |
| Upload engine | Make blueprints + AWS Lambda | `make/`, `lambda/upload-asset/` |
| Schema tools | Python CLI | `tools/airtable/` |
| Public route | `basePath` `/shoot` | `web/next.config.ts`, `APP_CONTEXT.md` |

### Commands (`web/package.json`)

| Command | Script |
|---------|--------|
| Dev | `npm run dev` → `next dev -p 3001` |
| Build | `npm run build` |
| Start | `npm start` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Test | `npm test` / `npm run test:watch` |

CI: `.github/workflows/web.yml` runs lint → typecheck → test → build on `web/**` changes.

### Deployment-related files (inspected only; not modified)

| File | Role |
|------|------|
| `web/vercel.json` | `/` → `/shoot` redirect |
| `.github/workflows/web.yml` | Web CI |
| `docs/PROJECT_STATE.md` | Base IDs, Vercel env names, audit status |
| `docs/deploy-checklists/*` | Promotion checklists (C-013, C-020, C-023, …) |
| `make/blueprints/*`, `lambda/upload-asset/*` | Upload engine artifacts |
| `docs/deployment-notes.md` (if present in docs index) | Deploy notes |

Vercel project root is `web/` (documented in `PROJECT_STATE.md`). Env values are not committed.

---

## 2. Current architecture (compressed)

```
Fillout / C-020 Testing Scenarios
  → Submissions
      → 005 Week · 007 Dedupe · 009 Submission Assets
      → Daily XP 010 · Weekly Athlete Summary 031+
      → Homework: 020 → 070a → 022 → coach → 064/065 → 071
      → Video: 013 → 070b → 070c/022 → 111/113/114 → 073
  → HW17 quiz: Final Reflection Quiz Submissions → 067 → Homework Completions (no asset)
Enrollment / Athlete identity: 001–003, 023
Levels: 041–043 · Achievements/streaks: 053–059 · Shot milestones: 066 · Zoom: 101

Web (/shoot): read-only catalogs (leaderboard, homework curriculum, levels,
achievements, tutorials, zoom meetings) + mock athlete dashboard/profile.
```

**Naming note (important):** There is no Airtable table literally named `Homework`. The official homework **assignment catalog** is **`FBC Curriculum - SYNC`**. Homework Completions link to it via the field **`Homework`**. Product language and this handoff treat that catalog as the Homework table to preserve.

---

## 3. Domain implementation status

Legend: **Full** · **Partial** · **Stub/planned** · **External** · **Broken/uncertain**

| Domain | Status | Evidence |
|--------|--------|----------|
| Auth / athlete access | **Partial** | Site preview gate only: `web/middleware.ts`, `web/lib/security/`. No athlete login. Dashboard/profile mock: `web/lib/data/athlete-dashboard.ts`. |
| Enrollment | **External** (+ web read) | Writers in Airtable `001–003`, `023`. Web reads Enrollments for leaderboard: `web/lib/airtable/queries.ts`. |
| Submission intake | **Full** (Airtable) / **Stub** (web) | Chain `005/007/009/010/021/031`. Web does not write submissions (`web/docs/project-roadmap.md`). |
| Shot tracking | **Full** (via Submissions + milestones) | `010`, `053–059`, `066`, Enrollments `Total Shots Counted`. |
| Dribbling | **External / out of repo** | Not a product surface here; option values only on Tutorials-type content. |
| Homework catalog | **Full** | Airtable `FBC Curriculum - SYNC`; web `/homework` + `lib/data/homework.ts`. |
| Homework Completions | **Full** (file path) / **Partial** (HW17) | `020`, `063–065`, `070a`, `071`. HW17 via `067` without assets — **C-009**. |
| XP Events | **Full** (Airtable) / **Stub** (web) | Source Keys in `010/065/114/054/059/101`. Web: table named in `AIRTABLE_TABLES`, no fetchers; `web/types/xp.ts` stub. |
| Levels / gates | **Full** (engine + web display) | Automations `041–043`; web ladder from Levels + `Public Gate Criteria`. |
| Achievements / streaks | **Full** (Airtable) / **Partial** (web) | `053–059` + Achievements catalog on web; unlocks/streaks mock on dashboard. |
| Weekly summaries | **Full** (Airtable) / **Stub** (web) | `031–034`, `072/074`. Web table constant only. |
| Video feedback | **Full** (Airtable; C-013 PROD complete) | `013`, `070b/070c`, `114`, `073`. Web: named + mock coach note only. |
| Zoom meetings | **Full** (catalog web + live XP) | Web zoom pages; attendance XP `101`. Recording path **C-025** planned. |
| Admin UI | **Stub** | `web/app/(program)/admin/page.tsx` → `PlaceholderPage`. |
| Airtable integration (web) | **Full** (server read) | `lib/airtable/client.ts`, `queries.ts`, `GET /api/airtable`. |
| Fillout / external intake | **External** | Live forms + quiz table; daily form **OFF** (C-008). Not in `web/`. |
| Upload / Submission Assets | **Full** (core pipeline) | `009`, `020/013`, `070a/b/c`, `022`, `116`. Submission Assets = canonical file layer (`docs/upload-workflow-homework-video.md`). **070a OFF in PROD** (homework upload slice). |
| Learning Activities | **Stub/planned** | **Zero** schema/code matches before this package. |
| Env vars | **Documented** | `web/.env.example`: `AIRTABLE_API_TOKEN`, `AIRTABLE_BASE_ID`, `SITE_ACCESS_TOKEN`, `NEXT_PUBLIC_BASE_PATH`, `NEXT_PUBLIC_LANDING_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GAME_MANUAL_URL`. |
| Tests | **Partial** | 12 Vitest unit files under `web/lib/**/*.test.ts`; CI build; `GET /api/airtable` health. No e2e/Playwright. Airtable audits in `airtable/extension-scripts/audits/`. |

### Schema snapshot tables (2026-07-06)

Prod 29 / DEV 30 (+ **Testing Scenarios**). Includes: Enrollments, Athletes, Submissions, Submission Assets, XP Events, Homework Completions, FBC Curriculum - SYNC, Video Feedback, Weekly Athlete Summary, Levels, Level Gate Rules, Achievements, Streak Occurrences, Shot Milestones, Zoom Meetings, Final Reflection Quiz Submissions, …  
**Not present:** Learning Activities, Learning Activity Responses.

---

## 4. Relevant files

### Web

- `web/lib/airtable/client.ts`, `queries.ts`, `app/api/airtable/route.ts`
- `web/lib/data/homework.ts`, `levels.ts`, `achievements.ts`, `leaderboard.ts`, `zoom-meetings.ts`
- `web/lib/data/athlete-dashboard.ts`, `athlete-profile.ts` (mock)
- `web/types/homework.ts`, `xp.ts`, `levels.ts`, `achievements.ts`
- `web/docs/site-hierarchy.md`, `airtable-data-map.md`, `project-roadmap.md`
- **New (this package):** `web/types/learning-activities.ts`, `web/lib/learning-activities/routing.ts` (+ test)

### Airtable pipeline

- `docs/automation-index.md`, `docs/upload-workflow-homework-video.md`, `docs/data-flow/homework-flow.md`
- `009-…submission-assets.js`, `020-…homework-completion.js`, `064/065` XP, `067` reflection quiz, `070a/b/c`, `071`, `013/114`, `101`, `041–043`, `053–059`, `066`
- Audits: `audit-homework-pipeline-integrity.js`, `audit-homework17-reflection-quiz-pipeline.js`, Stages G–J / 090\*

### Planning

- `docs/v2-change-backlog.md` (C-009, C-013, C-020, C-023, C-024)
- `docs/PROJECT_STATE.md`, `docs/v2/03-business-rules.md`, `docs/v2/05-system-architecture.md`
- Schema: `airtable/schema/snapshots/prod-20260706/`, `dev-20260706/`

---

## 5. Recent completed work

| Item | Status | Notes |
|------|--------|-------|
| Brand redesign web (`#24`) | Merged | Tip `babe74c` after docs standardization |
| FA-001 four-agent pilot | Complete | Docs/rules/CONTROL; kit idle |
| C-013 video upload PROD | Complete (2026-07-11) | 070b v4.4 + 070c v1.1 |
| C-020 Engineering Test Framework | DEV functional complete | Fillout-shaped scenarios; not all XP/Make paths |
| H-001 090F audit fix | Complete | Shot milestone dedupe |
| 066 v3.1 | DEV ready / sandbox pending | Per PROJECT_STATE |
| Wave 0 2025–26 close-out | Closed | Awards, final emails, outreach |

---

## 6. Known gaps

1. **Learning Activities not in schema or code** (until this package’s contract-only prep).
2. **C-009 / HW17:** `067` creates Homework Completions without Submission Assets → coach/upload/`071` assumptions break.
3. **Web athlete identity:** no login; dashboard/profile/completions/XP feed/video feedback are mock or unwired.
4. **070a homework Make upload OFF in PROD** (video path shipped first).
5. **C-023 / C-024** hash dedupe + Source Key catalog hardening still open.
6. **Stale docs:** `airtable/schema/current/table-map.md`, parts of `homework-flow.md`, CONTROL tip SHA.
7. **Admin** placeholder only.

---

## 7. Risks

| Risk | Why it matters |
|------|----------------|
| Parallel credit models | Inventing credit outside Homework Completions would fork XP (`064/065`), gates, emails (`071`), WAS (`033`). |
| Stand-alone quiz → accidental HC | Must require explicit “counts as homework” + Homework link. |
| Asset fan-out | One response → N Submission Assets must reuse `009`/`020` semantics, not bypass them. |
| Catalog rename | Renaming `FBC Curriculum - SYNC` or Homework Completions would break web views + dozens of automations. |
| Schema without Mike auth | Hard stop — DEV schema only after explicit authorization. |
| HW17 hybrid left in place | Learning Activities must absorb or supersede C-009 path cleanly. |

---

## 8. Tests currently available

| Suite | Location |
|-------|----------|
| Web unit (Vitest) | `web/lib/data/*.test.ts`, `formatters/*.test.ts`, `security/index.test.ts`, `airtable/errors.test.ts` |
| Web CI | `.github/workflows/web.yml` |
| Airtable health | `GET /shoot/api/airtable` |
| Pipeline audits | `airtable/extension-scripts/audits/` (Stages A–J, 090A–G, HW17) |
| Lambda/Make smoke artifacts | `docs/audits/C-013-*.json` |
| **New** | `web/lib/learning-activities/routing.test.ts` — LA routing contract |

No browser e2e suite in repo.

---

## 9. Approved Learning Activities architecture (authoritative)

1. Keep existing Homework catalog (`FBC Curriculum - SYNC` / Homework link) — do not replace/rename/restructure.
2. Add **Learning Activities** = routing + completion-method config layer.
3. Add **Learning Activity Responses** = intake for questions, files, videos, quizzes, assessments, reflections, special assignments.
4. Learning Activity may optionally link to a Homework (curriculum) record.
5. When linked **and** configured to count as homework → create/update existing Homework Completion process; reuse review + XP (`064/065`, `071`).
6. Stand-alone quizzes/assessments may leave Homework blank.
7. Stand-alone activities must **not** create Homework Completions unless explicitly configured.
8. One Learning Activity Response may create **multiple** normalized Submission Asset records.
9. Submission Assets remain the canonical upload/file-processing layer.
10. (Implied) Do not invent a second XP/credit pipeline for homework-linked activities.

---

## 10. Recommended next integration unit

### Unit ID: **LA-001 — Response → Homework Completion routing contract**

**Goal:** Codify and document the pure routing rules before any Airtable schema or automation paste.

**In scope (this package started it):**

- Type definitions for Learning Activity + Response + asset intents
- Pure `resolveHomeworkCompletionRouting()` decision helper
- Unit tests locking the authoritative rules
- This handoff doc

**Out of scope until Mike authorizes:**

- Creating Airtable tables/fields
- Automation scripts that write HC / assets
- Fillout form changes
- Web UI for activities
- Production paste / deploy

### Acceptance criteria (LA-001)

1. Types distinguish catalog Homework link, `countsAsHomework`, completion method, and response payload kinds.
2. Routing returns `create_or_update_homework_completion` only when Homework link is present **and** `countsAsHomework === true`.
3. Blank Homework → `no_homework_completion` (even if response has files/quiz answers).
4. Homework linked but `countsAsHomework === false` → `no_homework_completion`.
5. File/video responses produce N asset intents; Submission Assets remain the named processing layer (no alternate upload model in the contract).
6. Stand-alone assessment/quiz responses do not imply HC creation.
7. Unit tests cover the above; `npm test` passes for the new module.
8. No Airtable schema, secrets, or deployment config changed.

### Files likely changed for LA-001 / follow-ons

| Now (safe) | Later (after backlog + Mike auth) |
|------------|-----------------------------------|
| `docs/learning-activities/LA-000-current-state-handoff.md` | DEV schema for Learning Activities + Responses |
| `web/types/learning-activities.ts` | New automation(s) Response → assets / optional HC |
| `web/lib/learning-activities/routing.ts` (+ test) | Adapt `067` or replace with Response intake |
| (optional) backlog entry in `docs/v2-change-backlog.md` | Wire `009`/`020` from Response-produced assets |
| | Web read surfaces / admin review queues |
| | `CHANGELOG.md` + deploy checklist when promoting |

### Suggested LA-002 (after LA-001 + schema auth)

DEV-only schema sketch + automation stub that: Response with files → N Submission Assets; if routing says HC → find/create Homework Completion (`Enrollment | Week | Homework`) without awarding XP itself.

---

## 11. What this agent did / did not do

**Did:** Repository inspection; domain status report; LA-001 types + routing validation + tests; local branch commit only.

**Did not:** Push, deploy, open PR, edit CONTROL.json, change Airtable schema, touch credentials, modify Vercel/GitHub settings, or paste production automations.
