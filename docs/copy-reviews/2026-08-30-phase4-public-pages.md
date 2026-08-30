# Phase 4 copy & UX review — public Shooting Challenge pages

**Date:** 2026-08-30  
**Scope:** `/shoot`, `/shoot/tutorials`, `/shoot/zoom-meetings`, parent-facing FAQ/home sections, footer & navigation, athlete privacy/profile path  
**Authority:** FUT-016, FUT-017, FUT-018, FUT-019, SC-149, `docs/CURRENT-TRUTH.md`, `web/lib/seo/program-facts.ts`  
**Branch:** `copy/phase4-public-pages`  
**Release:** PR **#298** merged `082edc7d` · Vercel Production Ready · live copy verified on `/shoot` + `/shoot/faq`

## Verdict

Public program messaging is largely aligned: grades **1–12**, **100% online / worldwide**, annual **May 1–June 30** window, Educational Athletics voice, Fairfield Basketball Club identity (SC-149), and strong registration CTAs. Safe jargon removals + FAQ homework/feedback prose **shipped**. Gaps still pending Mike approval: Dashboard demo exposure in nav, optional homepage “For parents” block, coach SLA wording, adjacent-school FAQ nuance; redesigns owned by FUT-016–019 remain separate.

## Review matrix

| ID | Surface | Current wording (summary) | Problem | Recommended wording | Reason | Priority | Mike approval? | Status |
|----|---------|---------------------------|---------|---------------------|--------|----------|----------------|--------|
| CR-01 | FAQ remote access | Semicolon-joined `REMOTE_PROGRAM_ELEMENTS` list | Hard to read on mobile; feels like an inventory dump | Full prose: 100% online + what families can do from anywhere | Parent clarity | P1 | No (clarity only) | **Implemented** |
| CR-02 | FAQ | No dedicated weekly homework Q&A | Parents miss homework vs daily submissions distinction | New FAQ: weekly homework → Homework page, XP, Perfect Week | Clear daily vs weekly | P1 | No | **Implemented** |
| CR-03 | FAQ video feedback | “part of the program workflow” | Internal-sounding; weak expectation setting | Coaches review videos; not on-demand private lessons; not a substitute for local in-person coaching | Coach expectations | P1 | No (expectation wording only; no SLA/dates) | **Implemented** |
| CR-04 | Zoom recording credit | “XP source”, “configured percent”, “level-gate credit” | Ops/automation jargon | Makeup XP portion of live attendance; one path per meeting; coach may approve | No technical language | P1 | No | **Implemented** |
| CR-05 | Pricing blurb | “live Program Instance record” | Internal Airtable term | “Published registration pricing for this challenge season” | No technical language | P1 | No | **Implemented** |
| CR-06 | Levels detail | “configured in Airtable”; “Gate checklist”; “level gate rules” | Internal systems language | “Advance checklist”; “when published for the season” | Parent clarity | P1 | No | **Implemented** |
| CR-07 | Athlete empty / not-found | “enabled public slug”; “may be disabled” | Technical / cold privacy language | Family chose to share; may be private | Privacy clarity | P1 | No | **Implemented** |
| CR-08 | Hub Zoom card | “recording-credit makeup info” | Hyphenated ops phrasing | “makeup-credit info” | Consistency | P2 | No | **Implemented** |
| CR-09 | Tutorials subtitle | Challenge-only; “external site” phrasing OK | Weak grades/online signal | Add grades 1–12 + online challenge | Audience + format | P2 | No | **Implemented** |
| CR-10 | Zoom catalog hero | Season check-ins copy | Slightly local-challenge tone | Lead with “Online challenge check-ins…” | Online/global | P2 | No | **Implemented** |
| CR-11 | `web/docs/seo.md` | Still said grades **1–8** | Contradicts live `program-facts` (1–12) and WEB-009 | Grades **1–12** | No contradictory claims | P0 docs | No | **Implemented** |
| CR-12 | Nav | “Dashboard” primary item | Demo / not cutover-ready (`site-hierarchy.md`) can mislead families | Hide from public nav/hub until auth ships; keep direct URL | Parent expectations | P1 | Authorized default (2026-08-30 web UX) | **Implemented** — removed from nav/hub; Display also chrome-excluded; see `web/docs/public-route-audit-2026-08-30.md` |
| CR-13 | Home / FAQ CTAs | Strong Register + FAQ | No dedicated “For parents” section on home | Optional short “What parents should know” block linking FAQ + homework + video expectations | Parent clarity | P2 | **Yes** (layout) | Pending — FUT-018 |
| CR-14 | Tutorials page | Catalog grid + technique copy | FUT-016 portfolio redesign not done | Keep links; redesign separately | Design, not copy block | P2 | **Yes** (design) | Deferred FUT-016 |
| CR-15 | Zoom page | Orientation + terminology already strong on master | FUT-017 portfolio redesign still open | Keep orientation; redesign layout separately | Design | P2 | **Yes** (design) | Deferred FUT-017 |
| CR-16 | Footer consent | Consent + FBC home + grades 1–12 | FUT-019 still brainstormed for one footer across all surfaces | Preserve legal/consent; unify chrome when FUT-019 ships | Consistency | P2 | **Yes** | Deferred FUT-019 |
| CR-17 | FAQ grades note | “adjacent school levels” on leaderboard | May confuse eligibility | Keep grades 1–12 as eligibility; clarify bands are display-only | Eligibility clarity | P2 | **Yes** | Pending Mike |
| CR-18 | Video feedback timing | No turnaround promise (good) | Parents may still assume same-day feedback | Optional: “Coaches review on a challenge schedule — not instant replies” | Expectations | P2 | **Yes** | Pending Mike |
| CR-19 | Home XP section | “Exact scoring stays in the program” | Slightly vague but safe | Keep; point to Game Manual for details | Avoid over-claiming | — | N/A | Keep |
| CR-20 | Profile privacy line | “personal contact details are never shown” | Clear and correct | Keep; optional expand: no emails/phones | Privacy | P3 | No if expanding | Keep / optional |
| CR-21 | SC-149 branding | Footer + logo → Fairfield Basketball Club | Legacy Hoop Challenges guarded in `app-config` | Confirm live Vercel `NEXT_PUBLIC_LANDING_URL` / `SITE_URL` still Fairfield | Branding | P0 ops | Env change = **Yes** | **Verified live** — Production public URL envs restored to documented Fairfield values before ship (see Ship log) |
| CR-22 | Dates / season | 2026–2027 · May 1–June 30 consistent | Do not invent intake-open dates | Keep; intake timing stays separate (SC-064) | No contradictory dates | — | **Yes** to change dates | No date changes |

## Surface notes

### `/shoot` (home)

- Hero, chips, participation facts, level journey, registration gateway, and pricing CTAs are parent-ready.
- Six-step “How it works” covers daily work, homework, video, XP, levels.
- Safe jargon removals applied in pricing; larger “for parents” section needs Mike approval (CR-13).

### `/shoot/tutorials`

- Copy is clear; subtitle now states grades 1–12 + online.
- Full portfolio redesign remains FUT-016 (no layout rewrite in this pass).

### `/shoot/zoom-meetings`

- Terminology + orientation blocks already explain live vs recording well.
- Recording-credit bullets rewritten without XP-source / level-gate jargon.
- FUT-017 redesign deferred.

### Parent-facing section (FAQ + home)

- FAQ is the primary parent explainer; homework + feedback + remote prose improved.
- FAQ hero still uses “fact-based” (slightly editorial); optional soft reword later with Mike approval.

### Footer & navigation

- Footer: 127 SI + FBC identity, grades 1–12, online worldwide, registration links, consent — aligned with SC-149 / FUT-019 direction.
- Nav: FAQ present; Dashboard demo exposure is the main parent-risk item (CR-12).

### Athlete privacy / profile

- Profile shows public progress only; freshness messages already parent-safe.
- Empty/not-found copy no longer mentions “slug” or “disabled.”
- Profiles remain `noindex` per CURRENT-TRUTH / SEO policy.

## Explicitly not changed (still need Mike approval)

- Pricing amounts, registration URLs, eligibility, challenge dates, season label
- Removing or relabeling Dashboard in primary nav (**CR-12**)
- New homepage “For parents” section layout (**CR-13**)
- Further Tutorials / Zoom visual redesign work beyond already-shipped catalogs (**CR-14 / CR-15**; FUT-016/017 portfolio work already on master via #284/#285)
- Coach feedback SLA / turnaround claims (**CR-18**)
- Grades “adjacent school levels” FAQ nuance (**CR-17**)

## Ship log (2026-08-30)

| Item | Value |
|------|--------|
| PR | [#298](https://github.com/Schmidt127/127-si-shooting-challenge/pull/298) |
| Merge SHA | `082edc7d173ff3f7ded3df4a2e513532229690b3` |
| Diff safety | Copy/docs/tests only — no business-rule, date, pricing-amount, eligibility, or automation changes |
| Local validation | Vitest **483/483**, typecheck, lint (0 errors), build — PASS |
| CI | Web CI + Cursor Approval Agent — PASS |
| Vercel Production | `dpl_2uQ1wPJferY189xkCFkg4D67JcFR` — **Ready** (redeploy of merge commit after env restore) |
| Health | `/shoot` 200 · landing 200 · `/shoot/api/airtable` `ok:true` `tokenValid:true` · FAQ/Zoom copy spot-checks PASS · `npm run test:smoke:http:prod` PASS |

**Ops note (not part of the copy PR diff):** First post-merge Production builds failed because Production `NEXT_PUBLIC_BASE_PATH` had been set to a full site URL (must be `/shoot`). Restored documented Production values: `NEXT_PUBLIC_BASE_PATH=/shoot`, `NEXT_PUBLIC_SITE_URL=https://www.fairfieldbasketballclub.com/shoot`, `NEXT_PUBLIC_LANDING_URL=https://www.fairfieldbasketballclub.com` (non-sensitive), then redeployed.

## Validation

Completed on branch `copy/phase4-public-pages` and again after Production ship:

- `npm test` (Vitest) — PASS
- `npm run typecheck` — PASS
- `npm run lint` — PASS (pre-existing unused-arg warnings only)
- `npm run build` — PASS
- `npm run test:smoke:http:prod` — PASS after Production Ready
