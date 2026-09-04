# SC-149 Truth Ledger — 2026-09-04

| Field | Value |
|-------|--------|
| Agent | Agent 1 — Truth and Dependency Audit |
| Branch | `audit/sc-149-truth-ledger` |
| Worktree | `127-si-worktrees/sc-149-wave/a1-audit` |
| Base checkpoint | `origin/master` = `824062a00a41f87838da18c6b60e2fe8a3675a68` |
| Scope | Evidence collection + task definition only (no application code) |
| Do not reopen | SC-109, SC-112, SC-151 (authoritative COMPLETE / MERGED-DEPLOYED) |

---

## 1. Scope determination

**One backlog ID (`SC-149`), two distinct deliverables.**

| Deliverable | Priority | Short name | What it is |
|-------------|----------|------------|------------|
| **A** | P0 | Fairfield branding URLs | Official landing / site chrome / metadata use Fairfield Basketball Club (not Hoop Challenges) |
| **B** | P1 | Public Family Dashboard navigation | Public “Family Dashboard” CTAs → `/shoot/dashboard/sign-in`; private `/shoot/dashboard` stays auth-gated |

**Recommendation:** Keep dual Master Future Work List rows under the same **SC-149** ID. Clarify titles/status per deliverable. Do **not** invent `SC-149-NAV` or another backlog ID — historical PRs (#52/#55/#280/#288/#358), MRW-E02, checklists, and CHANGELOG already cite SC-149 for both tracks.

---

## 2. Dual-row inventory (Master Future Work List)

Exact rows at checkpoint `824062a0`:

| Row | Title | Priority | Status (as written) | Depends |
|-----|-------|----------|---------------------|---------|
| § P0 | Official landing + branding links use Fairfield Basketball Club (not Hoop Challenges) | P0 | **Repo attestation complete** (2026-08-30 prod smoke) | SC-102 |
| § Website near SC-112 | Public Family Dashboard navigation | P1 | **Built in Repository** | SC-112 |

Also referenced from: FUT-034/036 notes, FUT-019 related, SC-112 depends-on SC-149 (nav entry for private dashboard), MRW-E02, CURRENT-TRUTH §4 (two lines), PROJECT_STATE routes/env table.

---

## 3. Acceptance criteria

### 3A — Fairfield branding (P0)

| # | Criterion | Source |
|---|-----------|--------|
| A1 | Logo / header / footer / hub links resolve to `https://www.fairfieldbasketballclub.com` (not `hoopchallenges.com` / `hooopchallenges.com`) | Master list; completion master §9F; deploy checklist |
| A2 | Vercel Production env (preferred explicit): `NEXT_PUBLIC_LANDING_URL=https://www.fairfieldbasketballclub.com`, `NEXT_PUBLIC_SITE_URL=https://www.fairfieldbasketballclub.com/shoot`, `NEXT_PUBLIC_BASE_PATH=/shoot` | `docs/deploy-checklists/SC-149-fairfield-branding-url-verification.md` |
| A3 | Repo runtime self-heal: `resolveLandingUrl` / `resolveSiteUrl` rewrite legacy/typo hosts | `web/lib/app-config.ts` |
| A4 | In-app `/shoot/*` nav does not bounce to landing root; no `/shoot/shoot` duplication | Checklist smoke; Playwright |
| A5 | Production smoke / HTTP smoke PASS with Fairfield hrefs present and zero Hoop host strings | Attestation harness + checklist |
| A6 | Backlog close: SC-149 branding → Live Tested / COMPLETE; MRW-E02 → COMPLETE; checklist Status → Promoted | Checklist close-out |

### 3B — Family Dashboard navigation (P1)

| # | Criterion | Source |
|---|-----------|--------|
| B1 | Public entry label **Family Dashboard** in header (desktop), mobile menu, footer quick links, homepage parent CTA, FAQ get-started | PR #358 body; CHANGELOG; Master list |
| B2 | All public CTAs use Next.js `basePath`-aware href `/dashboard/sign-in` → public path `/shoot/dashboard/sign-in` | `web/lib/navigation/family-dashboard-link.ts` |
| B3 | Outline/secondary styling — does not outrank Register / Leaderboard | PR #358 |
| B4 | Public leaderboard / catalogs remain unauthenticated | PR #358 test plan; Playwright |
| B5 | Private `/shoot/dashboard` remains auth-gated (no private data on public chrome) | PR #358; SC-112 boundary |
| B6 | After merge: production header/mobile/footer link to `https://www.fairfieldbasketballclub.com/shoot/dashboard/sign-in` | PR #358 unchecked post-merge item |
| B7 | Vitest + Playwright coverage for nav constants and chrome | `family-dashboard-link.test.ts`, `family-dashboard-nav.spec.ts` |

---

## 4. Implemented / merged / deployed / tested / documented / missing

### Matrix

| Item | Implemented | Merged | Deployed | Tested | Documented | Still missing |
|------|:-----------:|:------:|:--------:|:------:|:----------:|---------------|
| **A Branding code + defaults** | ✅ | ✅ #52/#55 | ✅ since 2026-08-04+ | ✅ Vitest/Playwright | ✅ CHANGELOG 2026-08-04 | — |
| **A Deploy checklist + MRW-E02** | ✅ | ✅ #280 | N/A (docs) | — | ✅ | Checklist Mike checkboxes still `[ ]` in file |
| **A Prod render attestation JSON** | ✅ | ✅ #288 | N/A | ✅ 2026-08-30 PASS | ✅ evidence JSON | Formal “Mike dashboard checkbox” line still open in CURRENT-TRUTH |
| **A Live branding on official domain** | ✅ | — | ✅ | ✅ 2026-08-08 proof + 2026-08-30 attestation + **2026-09-04 Agent 1 HTML** | ✅ prod-completion + CR-21 ship log | Docs status lag (“Repo attestation” vs Live Tested) |
| **A Explicit Vercel env attestation** | Ops | — | Env restored 2026-08-30 (CR-21 ship log) | Render/smoke prove effect | Ship log names values (non-secret) | Optional: re-tick checklist / MRW-E02 COMPLETE |
| **B Family Dashboard nav code** | ✅ | ✅ #358 `29904b45` | ✅ Prod deploy of merge + tip `824062a0` | ✅ PR tests; **2026-09-04 live HTML** | ✅ CHANGELOG; CURRENT-TRUTH “Merged” | Master list still “Built in Repository”; FAQ CTA not in Playwright (code present; live FAQ HTML has links) |
| **B Post-merge prod confirm (PR plan)** | — | — | — | Partial via Agent 1 HTML | — | Optional Agent 2 interactive mobile/header click proof |
| **SC-112 / SC-151** | — | — | — | — | — | **Out of scope — do not reopen** |

### Git / PR evidence (branding A)

| PR | Merge | Role |
|----|-------|------|
| #52 | `9e43d204` (2026-08-04) | Move public landing links to Fairfield |
| #55 | `ea4edb4f` (2026-08-04) | Integrate Fairfield + smoke + mobile a11y |
| #280 | `7bdf7572` (2026-08-30) | Checklist + URL audit closeout |
| #288 | `b51e0bdd` (2026-08-30) | Production attestation script + JSON |

### Git / PR evidence (nav B)

| PR | Merge | Role |
|----|-------|------|
| #358 | `29904b45` (2026-09-03) | Family Dashboard public navigation |
| Feature commit | `783dab24` | Implementation |

Production deployments (GitHub Deployments API):

- `29904b45` → Production deployment id `6248387514` (2026-09-03)
- Tip `824062a0` → Production deployment id `6264795695` (2026-09-04) — **includes #358** (ancestor check PASS)

Open PRs mentioning SC-149: **none** (merged history only). Related local worktree branches (`ops/sc-149-fairfield-vercel-env`, `fix/sc-149-family-dashboard-nav`, `verify/sc-149-e2e-privacy`, `coord/sc-149-closeout`) are at the same tip as `824062a0` (no unique commits). Stale remote `origin/cursor/sc-149-fairfield-branding-a2de` ends at checklist commit `531caeca` (already merged via #280).

---

## 5. Live proof snapshot (Agent 1, 2026-09-04)

Read-only fetches against Production (no secrets logged):

| Check | Result |
|-------|--------|
| `GET https://www.fairfieldbasketballclub.com/shoot` | **200** |
| “Family Dashboard” string count (home) | **6** |
| `family-dashboard-` testid markers (home) | **6** |
| `href="/shoot/dashboard/sign-in"` | **present** |
| Fairfield landing root `href="https://www.fairfieldbasketballclub.com"` | **present** |
| `hoopchallenges` host substring | **absent** |
| `/shoot/shoot/` | **absent** |
| `GET …/shoot/dashboard/sign-in` | **200**, sign-in copy present |
| `GET …/shoot/faq` | Family Dashboard + `dashboard/sign-in` **present** |

Prior dated proofs retained:

- `docs/prod-completion/2026-08-08/SC-148-149-FAIRFIELD-PROD-LIVE-PROOF.md` — branding Live Tested recommendation
- `docs/testing/evidence/SC-149-FAIRFIELD-ATTESTATION-2026-08-30.json` — `pass: true`; `mikeStillRequired` = dashboard env checkboxes
- CR-21 ship log (2026-08-30): Production env restored to documented Fairfield values after bad `NEXT_PUBLIC_BASE_PATH`; redeploy `dpl_2uQ1wPJferY189xkCFkg4D67JcFR`

**Verdict on live proof:** Both deliverables are already live on Production at checkpoint tip. Remaining work is primarily **documentation status reconciliation** plus optional interactive reconfirm / checklist tick.

---

## 6. Dependencies

### Env / config (non-secret)

| Name | Expected Production value | Used by |
|------|---------------------------|---------|
| `NEXT_PUBLIC_LANDING_URL` | `https://www.fairfieldbasketballclub.com` | `LANDING_URL` / chrome |
| `NEXT_PUBLIC_SITE_URL` | `https://www.fairfieldbasketballclub.com/shoot` | metadata / OG |
| `NEXT_PUBLIC_BASE_PATH` | `/shoot` | `withBasePath`, next `basePath` |
| `ATHLETE_AUTH_ENABLED` | (SC-112) | Private dashboard gate — **do not change under SC-149** |

Repo defaults / self-heal: `PUBLIC_LANDING_ORIGIN`, `resolveLandingUrl`, `resolveSiteUrl` in `web/lib/app-config.ts`.

### Routes

| Route | Role |
|-------|------|
| `/shoot` and public catalogs | Branding chrome + nav entry points |
| `/shoot/dashboard/sign-in` | Public Family Dashboard entry (SC-149 B) |
| `/shoot/dashboard` | Private family dashboard (**SC-112 — closed**) |
| `/shoot/faq` | FAQ CTA to sign-in |

### Components / modules

| Path | Role |
|------|------|
| `web/lib/app-config.ts` | Landing/site URL resolution |
| `web/lib/navigation/family-dashboard-link.ts` | Href/label constants |
| `web/components/site/family-dashboard-link.tsx` | Shared CTA component |
| `web/components/site/site-header.tsx` | Header CTA |
| `web/components/layout/product-nav.tsx` | Mobile menu CTA |
| `web/components/site/site-footer.tsx` + `web/lib/site-chrome/footer-config.ts` | Footer quick link |
| `web/components/home/home-page-view.tsx` | Homepage parent CTA |
| `web/components/faq/faq-page-view.tsx` | FAQ CTA |
| `web/lib/release/public-surface.ts` | Public surface allowlist includes sign-in |

### Tests / harnesses

| Path | Role |
|------|------|
| `web/lib/navigation/family-dashboard-link.test.ts` | Unit constants + footer config |
| `web/tests/family-dashboard-nav.spec.ts` | Header/footer/home/mobile Playwright |
| `web/tests/production-smoke.spec.ts` / `http-smoke.mjs` | Prod smoke includes sign-in route |
| `web/lib/site-chrome-links.test.ts` / `app-config.test.ts` | Branding link integrity |
| `tools/testing/sc-149-fairfield-attestation.mjs` | Branding prod attestation |
| `docs/testing/evidence/SC-149-FAIRFIELD-ATTESTATION-2026-08-30.json` | Stored PASS evidence |

**Gap:** FAQ `family-dashboard-faq-cta` is implemented and live, but not asserted in `family-dashboard-nav.spec.ts` (optional Agent 2/3 coverage).

---

## 7. Doc drift / conflicts

| Location | Says | Conflict |
|----------|------|----------|
| Master list branding row | Repo attestation complete; Mike Vercel confirm | Live render + CR-21 ship log already prove Fairfield; status understates |
| Master list nav row | Built in Repository | Merged #358 + Prod deploy + live HTML — understates |
| CURRENT-TRUTH §4 | Branding: Mike checkbox pending; Nav: Merged | Tip SHA elsewhere still mentions older `9a68281e` in places — tip is `824062a0` |
| CURRENT-TRUTH pending list | SC-149 / MRW-E02 Mike checkbox | Same lag |
| Checklist checkboxes | Steps 1–8 unchecked | Process file not updated after CR-21 env restore + attestation |
| MRW-E02 | REPO COMPLETE; Mike checkboxes pending | Same |
| Archived season-sim patch | Proposed split to SC-149-NAV | **Reject** — clarify dual rows instead |
| Copy review CR-21 | **Verified live** env restore | Stronger than Master list status |

---

## 8. Recommended dual-row clarification (no new IDs)

Keep both rows as **SC-149**, with explicit suffixes in the **Title** column only:

1. **SC-149** — Fairfield branding URLs (landing / site env / chrome) — target status: **COMPLETE / Live Tested in PROD** (after Agent 4 docs closeout; evidence already sufficient if coordinator accepts render + ship log)
2. **SC-149** — Public Family Dashboard navigation — target status: **COMPLETE / Live Tested in PROD** (or **Merged/Deployed + live HTML verified** if Mike wants one interactive pass)

Preserve historical references to SC-149 in CHANGELOG, MRW-E02, PRs, and checklists.

---

## 9. Recommended Agent 2 / 3 / 4 / coordinator actions

### Agent 2 — Live nav verification (light)

- Confirm Production header / footer / mobile / FAQ → `/shoot/dashboard/sign-in` (Agent 1 HTML already PASS; interactive mobile click optional).
- Confirm private `/shoot/dashboard` still gated (smoke / privacy specs — do not reopen SC-112 feature work).
- Optional: add FAQ assertion to Playwright **only if** coordinator wants code change; otherwise evidence-only.

### Agent 3 — Branding env / ops closeout (light)

- Prefer **docs-only**: cite CR-21 ship log + 2026-08-30 attestation + 2026-09-04 HTML as superseding unsigned checklist boxes.
- If Mike still wants dashboard eyes-on: tick checklist steps 1–3 without logging secret values (only the three `NEXT_PUBLIC_*` URL/path names/values already published as non-secret).
- Do **not** change Vercel env unless a mismatch is found.

### Agent 4 — Documentation closeout (primary remaining work)

- Update Master Future Work List dual SC-149 rows (clarify titles + COMPLETE / Live Tested).
- Update CURRENT-TRUTH §4 + pending list; PROJECT_STATE tip SHA if stale; MRW-E02 → COMPLETE; checklist Status → Promoted / checkboxes annotated “satisfied by …”.
- CHANGELOG docs note for SC-149 dual-deliverable closeout.
- Explicitly state SC-112 / SC-151 / SC-109 unchanged.

### Coordinator

- Prefer **docs-only closeout** — live proof already exists for both A and B.
- Application code changes not required unless Agent 2 finds a broken CTA (none observed 2026-09-04).
- Do not run Season Simulation; do not touch Airtable; do not reopen SC-109/112/151.

---

## 10. Docs-only closeout sufficiency

**Yes — docs-only closeout is sufficient** for SC-149 as of this ledger, provided coordinator accepts:

1. Branding: 2026-08-08 official-domain proof + 2026-08-30 attestation PASS + CR-21 Production env restore + 2026-09-04 HTML (no Hoop hosts).
2. Nav: PR #358 merged `29904b45`, Production deploys through `824062a0`, 2026-09-04 HTML shows Family Dashboard → `/shoot/dashboard/sign-in` on home and FAQ.

Remaining “Mike checkbox” language is **process lag**, not an open implementation gap, unless Mike explicitly requires a fresh Vercel dashboard screenshot.

---

## 11. Out of scope (confirmed)

- SC-109 Game Manual — COMPLETE / Live Tested
- SC-112 Athlete auth + dashboard — COMPLETE — Production Verified by Mike
- SC-151 Gmail access — MERGED/DEPLOYED
- Season Simulation, Airtable deletes/schema, secrets exposure, app feature work
)
