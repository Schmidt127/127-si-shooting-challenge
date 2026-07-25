# Shooting Challenge — Post-Outage Recovery Audit

| Field | Value |
|-------|--------|
| Date | 2026-07-25 |
| Auditor | Cursor (desktop, local repo) |
| Repo | `Schmidt127/127-si-shooting-challenge` |
| Local HEAD at audit start | `ee9578b` on `master` (clean, matches `origin/master`) |
| Expected PROD base | `appn84sqPw03zEbTT` |
| Controlling source | `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` (master copy dated 2026-07-24) |
| Companion docs | [Recovery matrix](./SHOOTING-CHALLENGE-RECOVERY-MATRIX-2026-07-25.md) · [Mike next actions](./SHOOTING-CHALLENGE-MIKE-NEXT-ACTIONS-2026-07-25.md) |

**Audit rules followed:** no implementation changes, no PR merges, no Airtable writes, no automation enables, no emails/webhooks, no PROD pastes, no Complete marks without live evidence.

---

## 1. Executive summary

Power-loss interruptions did **not** leave corrupted or uncommitted work on the local `master` working tree. All four known draft packages (**PR #43–#46**) are **pushed** to GitHub with clean mergeability. Local `master` is clean and synced.

What remains blocked is almost entirely **PROD install / live proof / Vercel production promotion**, not missing Git work:

| Area | Verdict |
|------|---------|
| Local Git health | Healthy — clean tree, no locks, no merge/rebase |
| Lost / unpushed package work | **None found** for PRs #43–#46 |
| Airtable PROD read access (desktop) | **Works** via `.env.local` `AIRTABLE_API_TOKEN` |
| Airtable MCP CLI | **Auth fails** — process `AIRTABLE_TOKEN` is a 23-char placeholder |
| Automation 035 | Repo-ready on PR #43 only — **not in PROD inventory**; 0 `WEEKLY_THRESHOLD` XP Events |
| Automation 057 | PR #43 and #44 script blobs **identical** (v1.4); PROD inventory shows **057 Live** (script version not readable via inventory); master still v1.3 |
| Automation 067 | Option B install packet on PR #44; **067 absent from PROD Automations inventory** |
| SC-041 | Repo SOP on PR #46 — **no live failure test** |
| PR #45 web fixes | Preview READY; **not on production**; PROD HTML still contains `hooopchallenges.com` typo; favicon still `/favicon.png` (no `/shoot` prefix) |
| Completion master on `master` | **Stale** vs PR branch claims (esp. SC-041 Planned; SC-049/021 not Ready for Paste on master) |

**Exact next package:** PR #45 production path — correct Vercel `NEXT_PUBLIC_LANDING_URL`, promote browser QA fixes, rerun production Playwright toward 44/44.

---

## 2. Repository health

| Check | Result |
|-------|--------|
| Current branch | `master` at audit start → recovery docs on `docs/post-outage-recovery-2026-07-25` |
| HEAD (master) | `ee9578b89e217a2610cba3fe983c85c8d8aeafe5` — `docs: correct final launch certification identifiers` |
| Working tree | Clean (no modified / staged / untracked package files on master) |
| Stashes | None |
| Locks | No `index.lock`, no `MERGE_HEAD`, no rebase/cherry-pick |
| `git fsck --full` | Many **dangling** blobs/trees/commits (normal after rebases/amends) — **no missing objects / corruption reported** |
| Remotes | `origin` → `Schmidt127/127-si-shooting-challenge` |
| Ahead/behind master | Even with `origin/master` |
| Nested directory | `127-si-shooting-challenge/127-si-shooting-challenge/` is a **separate nested git clone** at unrelated SHA `bba4ee7` with untracked `web/scripts/compare-page-screenshots.mjs` — **not** the active workspace tip; do not confuse with main repo |

Reflog (recent): local activity on 2026-07-25 morning was launch certification commits on master + archive branch; no evidence of orphaned unpushed package commits for #43–#46 (those landed via remote Cursor agents).

---

## 3. Lost, corrupted, uncommitted, or unpushed work

| Category | Finding |
|----------|---------|
| Uncommitted on master | **None** |
| Unpushed on PR #43–#46 | **None** — local tips were missing only because branches were never checked out; remotes match PR HEADs |
| Corrupted files | **None** — JS “conflict markers” on 067 were section dividers (`====`), not merge markers; JSON fixtures on PR tips validate; Airtable scripts use top-level `await` (expected; `node --check` false alarm) |
| Dangling commits | Present but not identified as unique unfinished package content for #43–#46 |
| Nested clone drift | Separate issue — ignore for package recovery unless Mike uses that folder |

**Verdict:** Outages did **not** lose the four PR packages. Risk is **documentation overclaim** and **PROD/live gaps**, not missing Git objects.

---

## 4. PR #43 status

| Field | Value |
|-------|--------|
| URL | https://github.com/Schmidt127/127-si-shooting-challenge/pull/43 |
| Branch | `cursor/sc-completion-threshold-date-311c` |
| HEAD | `7aff310de46c5442ddcf76e81658f573e29bf6e5` |
| Draft | Yes |
| Mergeable | MERGEABLE / CLEAN |
| Local checkout | Was absent; remote tip matches PR |
| Unpushed | No |
| CI | Vercel Preview SUCCESS (no Web CI job on this PR’s check rollup) |

**Contents (matches PR description):** 035 v1.1, 057 v1.4 Denver date-key, SCN-021–026, deploy checklists, Schmidt live-proof pack, completion-master Ready for PROD Paste for SC-049 / SC-021.

**Rerun tests (this audit, worktree @ `7aff310`):**

| Command | Result |
|---------|--------|
| `node tools/testing/run-agent4-suite.js` | **23/23 PASS** |
| `weekly-threshold-xp.test.js` | PASS |
| `overnight-perfect-week.test.js` | PASS |
| `agent4-perfect-week-edges.test.js` | PASS |
| `xp-date-normalization.test.js` (incl. DST mirrors) | PASS |

**PROD:** Not pasted. Not live-tested. Do not mark Complete.

**Overstatement risk:** PR body correctly says Ready for PROD Paste / not Complete. Keep draft until paste + Schmidt evidence.

---

## 5. PR #44 status

| Field | Value |
|-------|--------|
| URL | https://github.com/Schmidt127/127-si-shooting-challenge/pull/44 |
| Branch | `cursor/prod-completion-pack-cbb3` |
| HEAD | `7b5fa487d81dec071c3011a2e558f5054e6c454c` |
| Draft | Yes |
| Mergeable | MERGEABLE / CLEAN |
| Unpushed | No |
| CI | Vercel Preview SUCCESS |

**Contents:** 057 Denver v1.4 (same blob as PR #43), 067 Option B install packet + header alignment, public `/shoot` smoke docs, RCC fixture run archives, Schmidt A–F protocols, SC-139 stale-doc start, ACCESS-BLOCKER (cloud agent lacked PAT).

**Rerun tests (worktree @ `7b5fa48`):**

| Command | Result |
|---------|--------|
| `node tools/testing/run-agent4-suite.js` | **20/20 PASS** (no weekly-threshold suite on this branch) |
| `xp-date-normalization.test.js` | PASS (fewer cases than PR #43 — hash differs) |

**Overlap:** Automation **057** identical to PR #43. **SCN-027** ID collides with PR #46 (quiz Option B vs weekly-email retry).

**PROD:** 067 **not** in Automations inventory; Option B **not** live-tested. Cloud ACCESS-BLOCKER is **stale for desktop** — local `.env.local` now reaches PROD read API.

**Overstatement risk:** Commit message advancing SC-102 to Live Tested via smoke alone should not silently override master honesty without reconciled evidence; keep draft.

---

## 6. PR #45 status

| Field | Value |
|-------|--------|
| URL | https://github.com/Schmidt127/127-si-shooting-challenge/pull/45 |
| Branch | `cursor/browser-qa-integration-0f49` |
| HEAD | `18cd2df28f112eb73b6d4bb23d28f816f03335f3` |
| Draft | Yes |
| Mergeable | MERGEABLE / CLEAN |
| Unpushed | No |
| CI | Web CI **SUCCESS** + Vercel Preview **SUCCESS** |

**Implemented in repo:** favicon/`basePath` metadata, RichContent Markdown, SafeExternalImage for expired Airtable media, single-H1 empty/error demotion, landing URL typo guard, Playwright nav landmark, browser QA report.

**Rerun tests (worktree @ `18cd2df`):**

| Command | Result |
|---------|--------|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` (Vitest) | **132/132 PASS** |
| Local Playwright | **Not rerun this session** (time/browser); do not cite historical 44/44 as new) |
| Production Playwright | **Not rerun**; prior report claimed pre-deploy gaps |

**Deployment evidence:**

| Target | State |
|--------|--------|
| Preview | READY — `18cd2df` (PR #45) |
| Production | Still `master` `ee9578b` (`dpl_HJ9W5Yij5D4mtR5QXFfH8k5wAQBX`) — **PR #45 not production** |
| Live PROD HTML | Contains **`hooopchallenges.com`** typo; favicon hrefs **`/favicon.png`** (missing `/shoot`) |
| Preview HTML | No `hooopchallenges` typo string observed |

**Vercel env:** Canonical needed value `NEXT_PUBLIC_LANDING_URL=https://www.hoopchallenges.com`. Live PROD proves incorrect/old value still baked into production build. `NEXT_PUBLIC_*` requires **redeploy** after correction.

---

## 7. PR #46 status

| Field | Value |
|-------|--------|
| URL | https://github.com/Schmidt127/127-si-shooting-challenge/pull/46 |
| Branch | `cursor/sc-041-weekly-email-retry-sop-311c` |
| HEAD | `1c2dcc70fe51f0942f6ea414bfcc6b5ad8fec74f` |
| Draft | Yes |
| Mergeable | MERGEABLE / CLEAN |
| Unpushed | No |
| CI | Vercel Preview SUCCESS (no Web CI on rollup) |

**Contents:** Weekly email retry SOP, webhook outcome helpers, SCN-027 (email retry — **ID collides with PR #44 quiz SCN-027**), completion-master SC-041 → Built in Repository.

**Rerun tests (worktree @ `1c2dcc7`):**

| Command | Result |
|---------|--------|
| `node tools/testing/run-agent4-suite.js` | **20/20 PASS** |
| `v2-engine-contracts.test.js` (incl. SC-041 cases) | PASS |

**Live failure→recovery:** **Not run.** No evidence of deliberate webhook break or email send from this package. Requires Mike authorization before any failure test.

---

## 8. Automation 035

| Criterion | Evidence |
|-----------|----------|
| Authoritative candidate | PR #43 — `035-weekly-summary-and-goal-logic-create-weekly-threshold-xp-events.js` **v1.1** |
| On master | **Absent** |
| On PR #44/#45/#46 | **Absent** |
| Trigger table | Weekly Athlete Summary (`Threshold XP Ready?` = 1) — per deploy checklist |
| Tiers | 100 / 125 / 150 |
| Inactive skip | Yes (`Active?=false`) |
| Grade Band link-ID preference | Yes |
| Rule keys | `WEEKLY_THRESHOLD_{percent}_{band}` |
| Source Key | `WEEKLY_THRESHOLD\|{enrollmentId}\|{weekId}\|{percent}` |
| Semantic dedupe | Enrollment + Week + XP Source label |
| Denver dating | America/Denver week-end activity date |
| Targeted recheck | `filterByFormula` with in-memory fallback |
| Tests | PASS on PR #43 (see §4) |
| PROD Automations inventory | **No 035 row** among 48 tracked automations |
| PROD XP Events | **0** rows with `WEEKLY_THRESHOLD` in Source Key |
| Live proof | **None** |

**Status:** Ready for PROD Paste (repository) · **not** Installed · **not** Live Tested · **not** Complete.

---

## 9. Automation 057 comparison

| Aspect | master | PR #43 | PR #44 |
|--------|--------|--------|--------|
| Version header | 1.3 (2026-07-18) | **1.4** (2026-07-25) | **1.4** (2026-07-25) |
| Blob hash | `be09867…` | **`ed1affa…`** | **`ed1affa…` (identical)** |
| `getDateKeyFromDateOnly` | UTC `toISOString().slice(0,10)` | America/Denver via `Intl` | Same as PR #43 |
| Content diff #43 vs #44 | — | — | **Empty** |
| xp-date tests | older | Full DST mirror suite | Subset (different hash) |
| Deploy checklist | — | `057-perfect-week-denver-v1.4.md` | `docs/prod-completion/2026-07-25/057-PERFECT-WEEK-PROD-PASTE.md` |

**Classification:** **Identical** (script file). Tests/docs on PR #43 are the **superset**.

**Authoritative repository version:** **PR #43 / `7aff310` 057 v1.4** — correctness + fuller offline DST coverage + formal deploy checklist + Schmidt live-proof pack.

**PROD:** Automations inventory shows **057 Live** on Weekly Athlete Summary. Script body version **cannot** be confirmed from inventory fields (script stored in Code field but not version-parsed this audit). Assume **v1.3 risk** until Mike UI-confirms header after paste. Do not paste during audit.

---

## 10. Automation 067

| Item | Finding |
|------|---------|
| Script on master | v2.0 with Option B `no_attachment_*` paths |
| PR #44 delta | Header/docs alignment + install packet; blob **differs** from master (`cb6c4c8` vs `519adaa`) |
| Install packet | `docs/next-wave/homework-pipeline/067-OPTION-B-PROD-INSTALL.md` (PR #44 only) |
| PROD Automations inventory | **067 not listed** (create-if-missing still required) |
| Live Option B proof | **Missing** — blocked in cloud by PAT; desktop now has read token but audit did not create records |
| Status | Built / Ready for PROD install packet · **not** confirmed Installed · **not** Live Tested |

---

## 11. SC-041

| Item | Finding |
|------|---------|
| Master status | **Planned** |
| PR #46 status | **Built in Repository** |
| SOP | `docs/next-wave/was-email/WEEKLY-EMAIL-RETRY-SOP.md` |
| Contracts | `planWeeklyEmailWebhookOutcome` / `decideWeeklyEmailRetryAction` + 074 failure-path offline proof |
| Live failure test | **Not executed** |
| Email/webhook sent by package | **No evidence** |
| Mike auth required before deliberate failure | **Yes** |

---

## 12. Web deployment status

| Item | Evidence |
|------|----------|
| Production deploy | `ee9578b` / `dpl_HJ9W5Yij5D4mtR5QXFfH8k5wAQBX` |
| PR #45 on production | **No** |
| Landing URL typo in PROD HTML | **Yes** (`hooopchallenges.com`) |
| Favicon under `/shoot` on PROD | **No** (still `/favicon.png`) |
| Public API health | `ok: true`, `tokenValid: true`, base preview `appn84…` |
| Local `.env.local` landing URL | Already `https://www.hoopchallenges.com` |
| Completion-master Live Tested claims on PR #45 | Insufficient for Complete; partial browser smoke only; Playwright 44/44 production **not** evidenced this audit |

---

## 13. Airtable access

| Source | Result |
|--------|--------|
| Process env `AIRTABLE_TOKEN` | Present but **len=23**, prefix `PAST…` — **placeholder**; MCP `whoami` shows it; **`airtable-mcp tools` auth fails** |
| Root `.env.local` `AIRTABLE_API_TOKEN` | len=82, `patL…` — **works** |
| Root `.env.local` `AIRTABLE_BASE_ID` | `appn84sqPw03zEbTT` (**PROD**) |
| `web/.env.local` base | `appTetnu…` (**DEV**) |
| `tools/airtable/.env` | Separate `patK…` + DEV base |
| Scripts/web client expect | Primarily **`AIRTABLE_API_TOKEN`** (+ `AIRTABLE_BASE_ID`) |
| PROD meta read | **HTTP 200**, 31 tables |
| PROD Automations inventory read | **48 rows** |
| Token scopes this audit | Used **read-only** (meta + select). Do not assume write without Mike. |

Secrets were not printed.

---

## 14. Tests rerun (current evidence only)

| Suite | Branch / SHA | Command | Result |
|-------|--------------|---------|--------|
| Agent 4 | PR43 `7aff310` | `node tools/testing/run-agent4-suite.js` | **23/23 PASS** |
| Weekly Threshold | PR43 `7aff310` | `weekly-threshold-xp.test.js` | PASS |
| Perfect Week | PR43 `7aff310` | `overnight-perfect-week.test.js` + edges | PASS |
| XP date / DST | PR43 `7aff310` | `xp-date-normalization.test.js` | PASS |
| Agent 4 | PR44 `7b5fa48` | `run-agent4-suite.js` | **20/20 PASS** |
| Agent 4 | PR46 `1c2dcc7` | `run-agent4-suite.js` | **20/20 PASS** |
| SC-041 contracts | PR46 `1c2dcc7` | `v2-engine-contracts.test.js` | PASS |
| Web lint/type/vitest | PR45 `18cd2df` | `npm run lint|typecheck|test` | PASS / PASS / **132/132** |
| Playwright local/prod | — | — | **Not rerun this audit** |
| RCC live CLI on PROD export | — | — | **Not rerun** (fixture JSON archives exist on PR #44 only) |

---

## 15. Completion-master discrepancies

Master file last updated **2026-07-24**. PR branches advance statuses without merge. Audit corrections (do **not** silently accept PR claims on master):

| SC | Master status | PR claim(s) | Audit correct status | Missing evidence |
|----|---------------|-------------|----------------------|------------------|
| SC-013 | Built in Repository | PR44 Option B packet | **Built in Repository** (install pending) | PROD 067 present + Schmidt HC/0 assets/1 XP |
| SC-014 | Built in Repository | Decision locked | **Built in Repository** / decision locked | Same live proof as SC-013 |
| SC-028 | Installed in PROD | — | **Installed in PROD** (057 Live) | v1.4 paste + Zoom exclusivity re-proof |
| SC-041 | Planned | PR46 Built | **Built in Repository** (after #46 merge) else Planned | Controlled failure→recovery |
| SC-077 | Installed in PROD | — | **Installed in PROD** | Live Perfect Week after 057 v1.4 |
| SC-102 | Installed in PROD | PR44/45 Live Tested | **Installed in PROD** (partial smoke) | Full prod Playwright 44/44 + catalog seed quality |
| SC-103/106/108/113 | Installed in PROD | PR45 Live Tested | Keep **Installed** until PR45 prod + broader proof | Production deploy of #45 |
| SC-109 | Built in Repository | PR45 Installed partial | **Built / partial Installed** | Game Manual PDF env + Mike wording |
| SC-112 | Decision Needed | Unchanged | **Decision Needed** | Mike auth approach |
| SC-115 | Decision Needed | Unchanged | **Decision Needed** | Mike indexing approval |
| SC-139 | Planned | PR44 started | **Planned** (pack started on branch only) | Merged doc refresh |
| SC-147 | Built (PR40) | — | **Built in Repository** | MVP views install + PROD export run |
| SC-049 / SC-021 | Built (master) | PR43 Ready for Paste | **Ready for PROD Paste** on #43 only | Paste + Schmidt tests 1–6 |

Also: inventory lists automation **112 as Live** while completion guidance says **112 must stay OFF** — UI-attest required (out of scope for this package set, but flagged).

---

## 16. Recovery matrix

See [SHOOTING-CHALLENGE-RECOVERY-MATRIX-2026-07-25.md](./SHOOTING-CHALLENGE-RECOVERY-MATRIX-2026-07-25.md).

---

## 17. Exact next package

**PR #45 production path — Vercel landing URL correction + promote browser QA fixes + production Playwright validation (target 44/44).**

Rationale vs priority order:

1. No uncommitted/unpushed recovery needed.  
2. No repository corruption.  
3. 057 overlap **resolved as Identical** — authoritative paste source = **PR #43** (no further code work).  
4. Nearest **dependency-safe** live package: web/Vercel only — no email, no Airtable mutations, Preview already green.  
5. Live PROD HTML **currently broken** on hub links (`hooopchallenges.com`) and favicon path — highest confidence live defect.

Defer (ordered later): 057 v1.4 paste (PR #43), 035 install, 067 Option B live proof, SC-041 failure test.

---

## 18. Mike’s exact next actions

See [SHOOTING-CHALLENGE-MIKE-NEXT-ACTIONS-2026-07-25.md](./SHOOTING-CHALLENGE-MIKE-NEXT-ACTIONS-2026-07-25.md).

**First action:** In Vercel project `127-si-shooting-challenge` (Production), set `NEXT_PUBLIC_LANDING_URL=https://www.hoopchallenges.com`, then redeploy Production (prefer after approving/merging PR #45 so favicon/Markdown/image fixes ship with the env fix).

---

## 19. Risks and rollback points

| Risk | Mitigation / rollback |
|------|------------------------|
| Merging PRs #43–#46 together | **Do not combine** — SCN-027 collision; completion-master thrash; 057 duplicate already identical |
| Pasting 057 from wrong PR | Use **PR #43** only |
| Enabling 035 without dual-writer check | UI-attest no competing Threshold writer ON |
| Creating 067 when a silent live copy exists | Search Airtable Automations UI before create |
| SC-041 deliberate failure | Mike auth required; can send parent email |
| Placeholder process `AIRTABLE_TOKEN` | Fix shell/MCP config to use real PAT or stop exporting placeholder |
| Nested clone confusion | Work only in outer repo path |
| Claiming Complete from Preview | Production HTML + Playwright after deploy |

Rollback: Vercel previous production deployment `dpl_HJ9W5Yij…` / prior prod SHAs; Airtable automation OFF + re-paste prior script body from git tag/revision.
