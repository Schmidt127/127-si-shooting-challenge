# SC-149 / MRW-E02 — Fairfield branding URL verification (Vercel env)

| Field | Value |
|-------|--------|
| Date | 2026-08-30 |
| Status | **Promoted to Production (2026-09-04)** — Vercel Production env MATCH for all three `NEXT_PUBLIC_*` branding vars; live HTML + HTTP smoke PASS; dual SC-149 deliverables COMPLETE; no Mike follow-up |
| Backlog | **SC-149**, **MRW-E02** |
| Related | EXT-QA-011 (live `hooopchallenges.com` typo in Vercel env, 2026-07-25) |
| Public route | `https://www.fairfieldbasketballclub.com/shoot` (`basePath` `/shoot`) |
| Repo | `Schmidt127/127-si-shooting-challenge` — `web/` Vercel root |
| Prod deploy (verified) | `dpl_4WDcPGnGK8wet8pbBX5ZobqQwqWX` @ `824062a00a41f87838da18c6b60e2fe8a3675a68` |

## What changed in GitHub

Repo defaults and runtime normalization already target **Fairfield Basketball Club**:

- `web/lib/app-config.ts` — `resolveLandingUrl` / `resolveSiteUrl` rewrite legacy Hoop Challenges hosts (including **`hooopchallenges.com` triple-o typo**) to `https://www.fairfieldbasketballclub.com`; metadata `SITE_URL` preserves `/shoot`.
- Header logo, footer branding, and `BackToHubLink` use shared `LANDING_URL`.
- Vitest + Playwright + HTTP smoke guard against legacy/typo hosts in rendered HTML.

**This checklist closes the ops gap:** confirm Vercel Production env values are correct so builds do not depend on runtime self-heal alone.

**Repo-side attestation (2026-08-30):** Automated read-only proof against live production:

```bash
node tools/testing/sc-149-fairfield-attestation.mjs --write-evidence
cd web && npm run test:smoke:prod && npm run test:smoke:http:prod
```

Evidence: [`docs/testing/evidence/SC-149-FAIRFIELD-ATTESTATION-2026-08-30.json`](../testing/evidence/SC-149-FAIRFIELD-ATTESTATION-2026-08-30.json) — Fairfield landing hrefs on home/leaderboard/homework/game-manual; zero `hoopchallenges` host strings; HTTP smoke **PASS**.

**Ops re-attest (2026-09-04, Agent 3):** [`docs/testing/evidence/SC-149-FAIRFIELD-ATTESTATION-2026-09-04.json`](../testing/evidence/SC-149-FAIRFIELD-ATTESTATION-2026-09-04.json) — Production env MATCH matrix + live HTML/browser + HTTP smoke. Regression helper: `node tools/testing/sc-149-vercel-env-match.mjs` (MATCH/MISMATCH only; never prints values).

---

## Vercel project — environment variables (Production)

Open the Vercel project that serves **`/shoot`** on `www.fairfieldbasketballclub.com`.  
**Settings → Environment Variables → Production** (and Preview if previews should match prod branding).

| Variable | Required value (Production) | Notes |
|----------|---------------------------|--------|
| `NEXT_PUBLIC_BASE_PATH` | `/shoot` | Must match `next.config.ts` `basePath`. |
| `NEXT_PUBLIC_LANDING_URL` | `https://www.fairfieldbasketballclub.com` | Official club landing — **not** `hoopchallenges.com` or `hooopchallenges.com`. |
| `NEXT_PUBLIC_SITE_URL` | `https://www.fairfieldbasketballclub.com/shoot` | Canonical metadata / Open Graph base for the Shooting Challenge app. |

**Do not log or paste secret values** in tickets or chat. Only the three `NEXT_PUBLIC_*` URLs above are non-secret.

### Values to remove or replace

If any of these appear in Production (or Preview), update and redeploy:

| Bad value (examples) | Action |
|----------------------|--------|
| `https://hooopchallenges.com` | Replace with Fairfield landing URL (EXT-QA-011) |
| `https://www.hoopchallenges.com` | Replace with Fairfield landing URL |
| `https://hoopchallenges.com/shoot` | Replace with Fairfield `/shoot` site URL |
| Blank / missing `NEXT_PUBLIC_LANDING_URL` | Set to Fairfield landing (repo defaults are safe but explicit env is preferred) |

Repo self-heals malformed values at runtime, but **correct Vercel env avoids shipping wrong defaults in SSR HTML and metadata**.

---

## Promotion steps (Mike)

Execute **in order**. No Airtable or credential changes in this package.

| # | Action | Done |
|---|--------|------|
| 1 | Vercel → confirm Production `NEXT_PUBLIC_LANDING_URL` = `https://www.fairfieldbasketballclub.com` | [x] 2026-09-04 Agent 3 CLI MATCH |
| 2 | Vercel → confirm Production `NEXT_PUBLIC_SITE_URL` = `https://www.fairfieldbasketballclub.com/shoot` | [x] 2026-09-04 Agent 3 CLI MATCH |
| 3 | Vercel → confirm `NEXT_PUBLIC_BASE_PATH` = `/shoot` (or unset if project relies on repo default) | [x] 2026-09-04 Agent 3 CLI MATCH |
| 4 | Merge approved GitHub branch to `master` (if not already) | [x] tip `824062a` on Production |
| 5 | Trigger or wait for Vercel Production deploy from `master` | [x] `dpl_4WDcPGnGK8wet8pbBX5ZobqQwqWX` READY (no redeploy needed) |
| 6 | Run production smoke (below) | [x] 2026-09-04 attestation + http-smoke PASS |
| 7 | Visual check: logo + footer + “Home” hub link → Fairfield landing (not Hoop Challenges) | [x] Playwright desktop+mobile; hoop absent |
| 8 | Update backlog: SC-149 → **Live Tested in PROD**; MRW-E02 → **COMPLETE** | [x] 2026-09-04 coordinator closeout |

---

## Production smoke test

From repo `web/` (requires network; no secrets in command):

```bash
cd web
npm run test:smoke:prod
npm run test:smoke:http:prod
```

| Check | Expected | Done |
|-------|----------|------|
| Playwright `production-smoke.spec.ts` | Pass; logo/landing links `href="https://www.fairfieldbasketballclub.com"`; zero `hooopchallenges` anchors | [x] 2026-09-04 browser MCP desktop+mobile (npx deps missing in worktree; live evaluate PASS) |
| HTTP smoke `http-smoke.mjs` | Pass; home HTML contains Fairfield landing href; no `hoopchallenges` host strings | [x] 2026-09-04 PASS |
| View page source on `/shoot/` | No `hooopchallenges` or `hoopchallenges.com` in anchor hrefs | [x] attestation + browser evaluate |
| In-app nav (`/shoot/leaderboard`, etc.) | Stays on `/shoot/*`; does not redirect to landing root | [x] leaderboard stay on `/shoot/leaderboard` |

Optional evidence path: `docs/testing/evidence/` (date-stamped smoke JSON or screenshot note).

---

## Rollback / risk notes

| Risk | Mitigation |
|------|------------|
| Wrong hub links from every page | Fix env + redeploy; repo normalization is a safety net only |
| Metadata / OG URLs point at legacy domain | Set `NEXT_PUBLIC_SITE_URL` to Fairfield `/shoot` and redeploy |
| Accidental `/shoot/shoot` paths | Smoke suite checks for duplicated basePath |

Rollback: revert Vercel env to previous values and redeploy (not recommended — legacy Hoop hosts are retired).

---

## Close-out

- [x] `CHANGELOG.md` — SC-149 dual-deliverable closeout (2026-09-04)
- [x] `docs/127-SI-MASTER-FUTURE-WORK-LIST.md` — both SC-149 rows **COMPLETE / Live Tested in PROD**
- [x] `MASTER_REMAINING_WORK_LIST.md` — MRW-E02 **COMPLETE**
- [x] This doc **Status** → **Promoted to Production** (2026-09-04)

**Status:** **Promoted to Production** — no Mike routine follow-up remaining for SC-149 / MRW-E02.
