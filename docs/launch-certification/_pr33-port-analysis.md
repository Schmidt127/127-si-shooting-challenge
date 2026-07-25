# PR #33 web port analysis

**Source commit:** `06a2349656b268aeb3cecb5830974a53e76341fd`  
**Parent:** `1d403df38a335237e69715de98efb0cb75182ab5`  
**Compared against:** `master` / current `HEAD` web tree (`launch/final-production-certification` @ analysis time)  
**Scope:** Unique frontend fixes from PR #33 only. Airtable / CHANGELOG / next-wave cherry-pick paths untouched.

## Verdict summary

| Theme | Status |
|-------|--------|
| Dashboard / athlete-profile fixes | **NEEDS_PORT** (data + views) |
| XP source display | **NEEDS_PORT** (`formatXpSourceLabel`, types, UI) |
| Milestone labeling | **NEEDS_PORT** (profile mock + heading) |
| Loading states | **ALREADY_ON_MASTER** (via `LOADING_LABELS`) |
| Navigation behavior | **ALREADY_ON_MASTER** (primary + More dropdown supersedes swipe-only nav) |
| Zoom recording presentation | **NEEDS_PORT** |
| Level-gate empty states | **NEEDS_PORT** |
| Formatter safety | **NEEDS_PORT** |
| Tests | **NEEDS_PORT** (new + additive) |
| Obsolete Softr user-facing copy | **REJECT_OBSOLETE** / already superseded by `EMPTY_STATE_COPY` |

---

## File-by-file

### Loading routes

| File | Classification | Evidence |
|------|----------------|----------|
| `web/app/(program)/achievements/loading.tsx` | **ALREADY_ON_MASTER** | Master already has `LoadingState` + `LOADING_LABELS.achievements`. PR33 hardcoded label is a regression vs centralized copy. |
| `web/app/(program)/articles/loading.tsx` | **ALREADY_ON_MASTER** | Same pattern via `LOADING_LABELS`. |
| `web/app/(program)/homework/loading.tsx` | **ALREADY_ON_MASTER** | Same. |
| `web/app/(program)/levels/loading.tsx` | **ALREADY_ON_MASTER** | Same. |
| `web/app/(program)/public-display/loading.tsx` | **ALREADY_ON_MASTER** | Same. |
| `web/app/(program)/shoutouts/loading.tsx` | **ALREADY_ON_MASTER** | Same. |
| `web/app/(program)/tutorials/loading.tsx` | **ALREADY_ON_MASTER** | Same. |
| `web/app/(program)/zoom-meetings/loading.tsx` | **ALREADY_ON_MASTER** | Same. |

### Components

| File | Classification | Evidence |
|------|----------------|----------|
| `web/components/dashboard/athlete-dashboard-view.tsx` | **NEEDS_PORT** | Master missing: “Weekly summary” label, season shots line, “Video feedback” label, optional feedback href, Recent XP list, `formatXpSourceLabel`. UI shell evolved (`ProgramPage`) — port behavior onto current layout. |
| `web/components/athlete/athlete-profile-view.tsx` | **NEEDS_PORT** | Master has richer profile shell + empty milestones already, but missing: “Shot milestones & season marks” title, Recent XP section with source labels. Do **not** regress SC-111/112 partial/missing-link states. |
| `web/components/layout/product-nav.tsx` | **ALREADY_ON_MASTER** | Master uses `splitNavItems` + More dropdown + a11y labels. PR33 “Swipe for more pages” horizontal-only nav is obsolete relative to current nav. |
| `web/components/levels/level-detail-view.tsx` | **NEEDS_PORT** | Master still hides gate section when `gateCriteria` empty; PR33 always shows section with empty-state copy. |
| `web/components/zoom-meetings/zoom-meetings-views.tsx` | **NEEDS_PORT** | Master has raw recording links in header only; missing Recording credit / makeup quiz presentation panel. |
| `web/components/tutorials/tutorials-grid-view.tsx` | **ALREADY_ON_MASTER** / **REJECT_OBSOLETE** | Master uses `EMPTY_STATE_COPY.tutorials` (“Published tutorials will appear…”) — no staff Softr instructions. PR33 string swap already superseded. |

### Data / lib / types

| File | Classification | Evidence |
|------|----------------|----------|
| `web/lib/data/athlete-dashboard.ts` | **NEEDS_PORT** | Missing `seasonShots`, `recentXp`, optional `feedback.href`, homework CTA copy (not “Log shots”), `weeklyShotPercent` non-finite guard. |
| `web/lib/data/athlete-dashboard.test.ts` | **NEEDS_PORT** | File absent on master; add PR33 readiness tests. |
| `web/lib/data/athlete-profile.ts` | **NEEDS_PORT** | Master milestones still mix demo week shots; missing Lifetime XP milestone, `recentXp`, omit feedback→tutorials href, “Weekly summary” activity title. Preserve advanced load-result API. |
| `web/lib/data/athlete-profile.test.ts` | **NEEDS_PORT** | Add season-shots≠XP, no feedback tutorials link, `recentXp` assertions; keep existing SC-111/112 tests. |
| `web/lib/formatters/index.ts` | **NEEDS_PORT** | Missing `formatXpSourceLabel`; `formatXp`/`formatShots` lack non-finite guard; `formatRelativeUpdate` not null-safe. |
| `web/lib/formatters/xp.test.ts` | **NEEDS_PORT** | File absent on master. |
| `web/types/xp.ts` | **NEEDS_PORT** | Missing `XpSourceLabel` / V2 bucket labels; `XpEventSummary` source docs. |
| `web/lib/navigation/program-hub-links.ts` | **NEEDS_PORT** | Zoom hub description still lacks recording-credit mention. |
| `web/lib/tutorial-media/config.ts` | **ALREADY_ON_MASTER** / **REJECT_OBSOLETE** | Empty copy already sourced from `EMPTY_STATE_COPY` (no Softr staff instructions). |

### Docs

| File | Classification | Evidence |
|------|----------------|----------|
| `web/docs/site-hierarchy.md` | **NEEDS_PORT** | Dashboard / zoom detail rows lack PR33 feature notes (weekly summary, XP sources, recording-credit). |
| `web/docs/v2-frontend-readiness.md` | **NEEDS_PORT** (as historical snapshot) | Missing on master. Port with note that Softr user-copy item is historical — master uses `EMPTY_STATE_COPY` / field-name dual-run indicators instead. |

### Explicit rejects (historical Softr language)

| Item | Classification | Evidence |
|------|----------------|----------|
| User-facing “OK to Publish on Softr” empty-state strings | **REJECT_OBSOLETE** | Fixed on master via `web/lib/release/public-surface.ts` `EMPTY_STATE_COPY` + `public-surface.test.ts` (“no staff Softr instructions”). |
| Airtable field names `OK to Publish on Softr` / `Level Sort Order - For Softr` | **KEEP** (not user copy) | Still required for dual-run queries; documented as cutover indicators. |
| PR33 `types/xp.ts` comment “prefer these strings over Softr-era aliases” | Port with softer wording if needed; field dual-run Softr names remain historical/ops. |

### Out of scope (do not touch this session)

- `CHANGELOG.md` (cherry-pick conflict)
- `airtable/**`
- `docs/next-wave/**`
- Aborting / continuing the 118 v1.5 cherry-pick

---

## Port plan applied (2026-07-25)

Surgical port onto current master web/ shapes (not a blind file overwrite from `06a2349`). Applied directly under `web/` because the working tree was clean there (cherry-pick conflicts remain elsewhere and were not touched).

1. Formatters + XP types + tests — **done**
2. Dashboard/profile data models + tests — **done**
3. Dashboard/profile/level/zoom views — **done**
4. Hub link + site-hierarchy + readiness doc — **done**
5. Unified patch mirror: `docs/launch-certification/_pr33-port.patch` — **done** (~819 lines)

**Validation:** `vitest run` for `xp.test.ts`, `athlete-dashboard.test.ts`, `athlete-profile.test.ts`, `public-surface.test.ts` — 36/36 passed.

**Not committed** (per instructions).

## Residual after port

Unique PR33 web fixes listed as **NEEDS_PORT** are now applied in the working tree. Intentional rejects remain unported:

- Hardcoded loading labels (master `LOADING_LABELS` wins)
- Swipe-only product nav (master More dropdown wins)
- Softr empty-string variants (master `EMPTY_STATE_COPY` wins)

Optional follow-up after cherry-pick settles: web-related `CHANGELOG.md` note only (do not resolve CHANGELOG conflicts as part of this port).
