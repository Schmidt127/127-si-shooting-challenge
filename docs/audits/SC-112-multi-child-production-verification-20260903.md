# SC-112 / SC-SEASON-SIM-002 — Multi-child production verification (Agent 1)

**Date:** 2026-09-03  
**Agent:** Agent 1 (multi-child production verification)  
**Branch:** `verify/sc-112-multi-child-prod-a1`  
**Base SHA (required):** `a686e50b109337e4ad564be16ab8b98aedd9597f` (`origin/master` verified via `git fetch` + `rev-parse`)  
**Worktree:** `WORKTREE_ID=sc112-a1-79d80416` · setup skipped (no `.cursor/worktrees.json` in repo or worktree)

---

## Task Classification

| Field | Value |
|-------|--------|
| Type | Production verification / audit |
| Priority | P2 (SC-112) |
| Difficulty | Medium |
| Owner | Cursor Agent 1 |
| Dependencies | SC-112 PR **#373** merged; Vercel Production deploy of `a686e50` |
| Backlog ID | **SC-112** · related **SC-SEASON-SIM-002** (complete; no sim/run this pass) |
| Estimated Scope | Report-only audit + read-only live probes + existing tests |
| Phase | Phase 5 Close (verification) |
| Correct tool | Cursor (code + live probes); Airtable MCP read-only |
| Repo | `127-si-shooting-challenge` |
| Mike's role | Provide multi-child disposable enrollments + complete authenticated walkthrough |

---

## Status labels

| Label | Applies? | Notes |
|-------|----------|--------|
| **COMPLETE** | No | Multi-child authenticated path not Production-proven |
| **MERGED** | Yes | PR **#373** `97548cee` is ancestor of verified SHA |
| **DEPLOYED** | Yes | Vercel Production `dpl_BbyjH6HVTAmvrnBLVdHVh9pyqgcy` (and prior) at SHA `a686e50b…` |
| **PRODUCTION-VERIFIED** | No (multi-child) | Data unblocked; signed-in walkthrough still needed |
| **CODE-ONLY** | Partial | Code + unit tests + anonymous Production probes done; full auth flows need Mike |
| **PASTE-PENDING** | N/A | Web-only; no Airtable paste for this slice |
| **NEEDS-MIKE** | Yes | Signed-in multi-child walkthrough (select / switch / reuse) |
| **NEEDS-PRODUCTION-PROOF** | Yes | Items 2–5, 8–10 below (authenticated) |
| **PARTIAL** | Yes | Multi Active parent data present; auth path unproven live |
| **BLOCKED** | No (data) | Second disposable VERIFY enrollment created 2026-09-03 |
| **STALE** | No | Checklist copy still says “multi-enrollment future”; code is merged |
| **DUPLICATE** | No | |
| **DO-NOT-TOUCH** | Weeks / schemas / env writes | Honored this pass |

---

## Final verdict (multi-child)

**PARTIAL — disposable multi-child Active data now present; authenticated walkthrough still NEEDS-MIKE**

Code is **merged and deployed** to Production at the required SHA. Anonymous privacy, public surfaces, selection API unauthorized rejection, invalid magic-link rejection, and magic-link request uniformity are Production-evidenced.

**Agent 1 follow-up (2026-09-03):** Mike authorized creation of **one** additional disposable Active enrollment with a **distinct** VERIFY athlete identity (same approved school parent as Athlete1). Welcome Email Handoff Queue row was created Ready (Test Mode?) and immediately set to **Cancelled** — never Accepted/Succeeded. Athlete1 enrollment/athlete unchanged. Parent `Active?` + `Parent Email - Cleaned` resolve now returns **≥2** Active enrollments (see creation evidence below). Full signed-in multi-child walkthrough still **NEEDS-MIKE**.

Closest accurate secondary labels: **MERGED** · **DEPLOYED** · **PARTIAL** · **NEEDS-MIKE** · **NEEDS-PRODUCTION-PROOF**

Not yet: Production-verified for authenticated multi-child path.

---

## Evidence summary (no secrets)

### Git / deploy

| Check | Result |
|-------|--------|
| `origin/master` SHA | `a686e50b109337e4ad564be16ab8b98aedd9597f` (matches required base) |
| Multi-child merge | PR **#373** `97548cee` is ancestor of base |
| Production deploy | Vercel project `127-si-shooting-challenge` Production READY at same SHA (`dpl_BbyjH6HVTAmvrnBLVdHVh9pyqgcy` redeploy of `dpl_87eZSLmz…`) |
| Local main TREE note | Local checkout may be ahead of `origin/master` (e.g. unmerged docs); **this audit used the required SHA only** |

### Automated tests (worktree `web/`)

| Suite | Result |
|-------|--------|
| Vitest: `lib/auth/**`, `app/api/auth/**`, dashboard-access, protected-paths | **56/56 passed** |
| Playwright vs Production `https://www.fairfieldbasketballclub.com/shoot/` — `multi-child-auth`, `dashboard-privacy`, `athlete-auth-privacy` | **12 passed, 4 skipped** (skipped = local `ATHLETE_AUTH_ENABLED` unset on runner; not a Production failure) |

### Live Production probes (anonymous / API)

| Check | Result |
|-------|--------|
| Auth feature gate | **On** — sign-in page live; `/dashboard` redirects toward sign-in (not coming-soon placeholder) |
| `/dashboard/sign-in` | Reachable; parent-email sign-in UI |
| `/dashboard/select` (anonymous) | No private options / no `rec…` IDs; redirects toward sign-in |
| `?enrollmentId=rec…` | Does not authorize anonymous dashboard (Playwright + code strip) |
| POST `/api/auth/select-enrollment` (no session) | **401** `{"ok":false,"error":"unauthorized"}` |
| POST `/api/auth/magic-link` known vs unknown school emails | **200** `ok:true`, **identical** confirmation message hash |
| POST magic-link Gmail | **400** blocked (expected) |
| GET `/api/auth/verify?token=not-a-real-token` | **307** → `/shoot/dashboard/sign-in?error=invalid` |
| POST `/api/auth/sign-out` | **200** |
| `/shoot/leaderboard` | Public **200** (anonymous) |
| `/shoot/homework` | Public **200** |
| `/shoot/athletes/athlete1-schmidt` | Public **200** |
| Authenticated dashboard marker anonymous | Absent (`athlete-dashboard-authenticated` not present) |

### Airtable (Production)

| Check | Result |
|-------|--------|
| Base | Production `appn84sqPw03zEbTT` |
| Active enrollments (`Active?` = true) at initial audit | **1** (Athlete1) — later live reconfirm before create found **2** (Athlete1 + pre-existing “Athlete 2” sharing Athlete1’s athlete record) |
| Multi-child parent after Agent 1 create | **Yes** — approved school parent resolves **3** Active enrollments; **2 distinct athlete records** (Athlete1 + VERIFY) |
| Schema / deletes this pass | No fields created/renamed. No records deleted. |

#### Agent 1 creation evidence (IDs OK in audit; parent email redacted)

| Item | Value |
|------|--------|
| New athlete | `rec0DOgWwzfDQxMaS` — First `VERIFY` / Last `VERIFY-SC112-20260903` |
| New enrollment | `recr3OaRi1HdFCB2V` — Active?; School Year 2026-2027; Program Instance `rec5mEM0YPqPqq0hZ`; Grade Band **K-2** `recK7BDVSpHy2ipCS` (reused Athlete1); School `recvQPRTplZeTmV0Y` (reused Athlete1) |
| Parent email | Same approved school address as Athlete1 *(redacted in public prose)* |
| Sequencing | Athlete + enrollment **without** Program Instance first → then set PI → cancel WELCOME queue |
| Email Handoff Queue | `rec6VgBXOtasiPbbH` key `WELCOME\|ENROLLMENTS\|recr3OaRi1HdFCB2V` — Ready (Test Mode?) → **Cancelled**; never Accepted / no Hub Accepted At |
| Athlete1 unchanged | Confirmed — enrollment `recZEwkkXTJanDlG6` / athlete `recTfxT6WMsPvobAW` |
| Cleanup manifest | `docs/audits/SC-112-multi-child-second-enrollment-cleanup-manifest-20260903.md` |
| Evidence JSON | `docs/audits/SC-112-multi-child-second-enrollment-evidence-20260903.json` |

**Note:** Pre-existing Active enrollment `rec2UamYHzyc9ELd9` (“Athlete 2”) was already present at create time and links to Athlete1’s athlete record — not created by this task; listed on cleanup manifest for coordinator decision.

### Docs consulted

- `docs/deploy-checklists/SC-112-athlete-auth-preview-and-production.md` (on this SHA; still mentions multi-enrollment as “remaining” — **stale relative to merged #373**)
- `docs/deploy-checklists/parent-email-live-cutover-2026-09-02.md` (on this SHA; filename differs from later `…-2026-09-03` draft on newer local commits)
- `web/docs/athlete-auth-architecture.md`
- Master list: SC-112 **Built in Repository — not Production-verified for multi-child**

---

## Checklist (1–13)

| # | Requirement | Code review | Unit tests | Live Production | Status |
|---|-------------|-------------|------------|-----------------|--------|
| 1 | One parent → one active enrollment | Verify sets `selectedEnrollmentId` + `/dashboard` | Covered | Data exists (1 Active); **authenticated open not run this pass** | **PARTIAL** — code OK; live signed-in single-child still **NEEDS-MIKE** |
| 2 | One parent → multiple active enrollments | Verify → `/dashboard/select` | Covered | **Multi Active parent data present** (Agent 1 VERIFY + Athlete1); signed-in select **NEEDS-MIKE** | **PARTIAL** — data unblocked; auth walkthrough pending |
| 3 | Secure child-selection page | `/dashboard/select` + opaque keys; session required | Covered | Anonymous protected | **PARTIAL** — route live; populated select **NEEDS-MIKE** |
| 4 | Child switching | Family switcher → select-enrollment | Covered | Not exercised signed-in | **NEEDS-PRODUCTION-PROOF** |
| 5 | Server-side authorization every selection | Live Active? + email + session intersect; HMAC resolve | Covered | Unauth POST denied | **PARTIAL** |
| 6 | No `enrollmentId=rec…` in URLs | Strip on dashboard; selection keys only | Playwright + code | Anonymous strip/privacy pass | **PASS** (anonymous + code) |
| 7 | Cross-enrollment access denied | Session grant + live intersect; forged keys 403 | Covered | Unauth 401 proven; cross-child needs 2 kids | **PARTIAL** |
| 8 | Session expiration | Signed cookie `exp` | Covered | Not live-aged | **CODE-ONLY** / **NEEDS-PRODUCTION-PROOF** |
| 9 | Sign-out | Clears cookie; API 200 | Code | Endpoint 200 anonymous | **PARTIAL** |
| 10 | Reused magic-link rejection | Token store consume → `used` | Covered | Invalid token → `error=invalid`; real reuse after send **NEEDS-MIKE** | **PARTIAL** |
| 11 | Public leaderboard without login | Public route | Playwright | **PASS** | **PASS** |
| 12 | Public athlete pages without login | Public slug route | Playwright | **PASS** (`athlete1-schmidt`) | **PASS** |
| 13 | Private enrollment / homework / video / coach notes / awards / parent info protected | Auth gate + dashboard loader | Privacy Playwright | Anonymous no authenticated dashboard | **PASS** (anonymous); full private payload after login **NEEDS-MIKE** |

---

## Code architecture (verified on SHA)

- Session cookie `athlete_session` **v:2** with `selectedEnrollmentId`
- Opaque HMAC selection keys (`selection-token.ts`) — never raw `rec…` as client selection
- `POST /api/auth/select-enrollment` rejects missing session, forged keys, and raw enrollment IDs
- `loadAuthorizedEnrollmentForSession` re-fetches Active enrollments by `Parent Email - Cleaned` and intersects with session grants
- Magic-link verify: 1 child → `/dashboard`; N children → `/dashboard/select`
- Legacy `?enrollmentId=` / `?slug=` on `/dashboard` redirected away (IDs never authorize)

**No blocking code bug found.** Report-only; no web/auth implementation edits.

---

## If `/dashboard/select` fails later — diagnosis matrix

| Class | When to suspect | This pass |
|-------|-----------------|-----------|
| **Code** | Unit/route tests fail; wrong redirect paths | Unlikely — 56/56 green; merge present |
| **Deployment** | Prod SHA lacks #373; 404 on select | Ruled out — SHA + select route metadata live |
| **Env vars** | Auth off (coming-soon); magic-link 503; missing secret/Upstash/Resend | Auth on; magic-link 200 success path works |
| **Airtable relationships** | Parent email empty/mismatched; Active? false; only one Active child | **Primary blocker** — only one Active enrollment |
| **Test setup** | No second disposable enrollment; wrong inbox; test mode confusion | **Required next step** |

---

## Mike actions required

1. ~~**Create disposable multi-child test data**~~ — **DONE (Agent 1):** VERIFY athlete `rec0DOgWwzfDQxMaS` + enrollment `recr3OaRi1HdFCB2V`; welcome queue Cancelled; Athlete1 untouched. See cleanup manifest.
2. **Confirm Vercel Production env (read-only check in dashboard):**  
   - `ATHLETE_AUTH_ENABLED=true` (already behaves on)  
   - `ATHLETE_AUTH_TEST_MODE=true` + test recipient = approved inbox only  
   - `ATHLETE_AUTH_SECRET`, Resend, Upstash present (magic-link success implies store + send path OK)
3. **Authenticated Production walkthrough (test inbox only):**  
   - Request magic link once → land on **/dashboard/select** with **multiple** athlete options (expect Athlete1 + VERIFY; may also see pre-existing “Athlete 2” enrollment).  
   - Confirm URL has **no** `enrollmentId=rec…`.  
   - Open child A → private dashboard; switch to child B via family switcher.  
   - Attempt forged selection / other-child access → denied.  
   - Sign out; reopen same magic link → rejected as used.  
   - Confirm leaderboard + public athlete profile still work logged out.
4. **After proof:** update Master Future Work List SC-112 status to Production-verified for multi-child (separate docs edit / PR).  
5. **Cleanup:** follow `docs/audits/SC-112-multi-child-second-enrollment-cleanup-manifest-20260903.md` (VERIFY athlete/enrollment only unless Mike directs otherwise; Weeks untouched).

---

## Hard stops honored

No season simulation / preflight / dry-run. No Airtable deletes or formula/schema changes. No automation paste. Welcome queue for new enrollment Cancelled before dispatch (no welcome email send). No Vercel/Resend/Upstash/Hub/AWS/Make setting changes. No `git clean` / `reset --hard`. No merge/deploy. No secrets or magic-link URLs. Parent email redacted in public prose; enrollment/athlete IDs recorded in this audit + cleanup manifest for ops. No `enrollmentId=rec…` introduced in product URLs.

---

## Merge-back / cleanup

- Apply worktree changes: `/apply-worktree`  
- Remove worktree: `/delete-worktree`
