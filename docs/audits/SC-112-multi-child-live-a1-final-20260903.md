# SC-112 — Multi-child live finalization (Agent 1)

> **SUPERSEDED (2026-09-04):** SC-112 multi-child is **COMPLETE — PRODUCTION VERIFIED BY MIKE**. Canonical status + ledger: [`SC-112-multi-child-select-404-fix-20260904.md`](./SC-112-multi-child-select-404-fix-20260904.md). Body below is a **historical** 2026-09-03 Agent 1 audit (PARTIAL / NEEDS-MIKE inbox at that time).

**Date:** 2026-09-03  
**Agent:** Agent 1 (live multi-child Production verification)  
**Branch:** `verify/sc-112-multi-child-live-a1-final`  
**Base SHA:** `9a68281eadce33b101bcb2a1f0876530b9179e1d` (`origin/master`; includes multi-child code via PR **#373** and prior evidence via **#380**)  
**Worktree:** `sc112-a1-final-live`

---

## Task Classification

| Field | Value |
|-------|--------|
| Type | Production verification / audit |
| Priority | P2 (SC-112) |
| Difficulty | Medium |
| Owner | Cursor Agent 1 |
| Dependencies | PR **#373** merged; disposable multi-child data from prior Agent 1 pass |
| Backlog ID | **SC-112** |
| Estimated Scope | Live proof + tests + evidence doc |
| Phase | Phase 5 Close (verification) |
| Correct tool | Cursor |
| Repo | `127-si-shooting-challenge` |
| Mike's role | Inbox click for authenticated select / switch / reuse / sign-out |

---

## Status labels

| Label | Applies? | Notes |
|-------|----------|--------|
| **COMPLETE** | No | Authenticated select/switch/sign-out not inbox-proven |
| **MERGED** | Yes | Multi-child code on tip via **#373** |
| **DEPLOYED** | Yes | Production auth surfaces live (sign-in, select gate, magic-link API) |
| **PRODUCTION-VERIFIED** | Partial | Anonymous + API + data + request-path verified; signed-in multi-child path not |
| **CODE-ONLY** | No | Live Production probes executed |
| **PARTIAL** | Yes | Data + tests + anonymous/API + controlled magic-link request done |
| **NEEDS-MIKE** | Yes | Inbox open of magic link → select → switch → unauthorized → sign-out → reuse reject |
| **NEEDS-PRODUCTION-PROOF** | Yes | Authenticated multi-child walkthrough only |
| **BLOCKED** | No (data) | ≥2 Active enrollments already present; no create this pass |
| **DO-NOT-TOUCH** | Honored | Weeks / schema / automations 003/067/101/117/SC-147 untouched |

**Final verdict:** **PARTIAL** · **NEEDS-MIKE** (inbox) · **NEEDS-PRODUCTION-PROOF** (authenticated select/switch)

---

## Evidence summary (no secrets)

### Git

| Check | Result |
|-------|--------|
| Worktree HEAD | `9a68281e…` matches required `origin/master` tip |
| PR **#373** ancestor | Confirmed (`merge-base --is-ancestor`) |

### Automated tests (this worktree `web/`)

| Suite | Result |
|-------|--------|
| Vitest `lib/auth/**`, `app/api/auth/**`, `lib/security/dashboard-access`, `lib/security/protected-paths` | **56/56 passed** |
| Playwright vs Production `https://www.fairfieldbasketballclub.com/shoot/` — `multi-child-auth`, `dashboard-privacy`, `athlete-auth-privacy` | **12 passed, 4 skipped** (skipped = runner-local auth-env gated cases; not Production failures) |

### Live Production probes (anonymous / API)

| Check | Result |
|-------|--------|
| Auth gate | **On** — `/dashboard/sign-in` **200**; `/dashboard/select` reachable without private options |
| POST `/api/auth/select-enrollment` (no session) | **401** unauthorized |
| GET `/api/auth/verify?token=not-a-real-token` | **307** → sign-in `error=invalid` |
| POST `/api/auth/sign-out` | **200** |
| `/leaderboard`, `/homework` | Public **200** |
| Magic-link known vs unknown school parent | Both **200** `ok:true`, **identical** response body hash |
| Magic-link Gmail | **400** blocked (expected) |
| Controlled magic-link send | **Attempted once** to approved school parent / test-recipient category only (no address/token/URL printed) |

### Airtable (Production)

| Check | Result |
|-------|--------|
| Active enrollments sharing one approved parent | **3** Active (Athlete1 + Athlete 2 + VERIFY disposable) — reconfirmed live |
| Distinct athlete identities for multi-child | **≥2** (Athlete1 family + VERIFY) |
| Creates/changes this pass | **None** — prior disposable VERIFY enrollment reused; no new athlete/enrollment/queue rows |
| Schema / Weeks / automations | Untouched |
| Welcome handoff | Prior VERIFY welcome already **Cancelled** (prior evidence); not re-triggered |

### Authenticated multi-child path

| Step | Result |
|------|--------|
| Request magic link (controlled) | **Done** (API success) |
| Inbox open / click | **NEEDS-MIKE** — agent has no inbox access |
| `/dashboard/select` with ≥2 options | **NEEDS-MIKE** |
| Select child A → dashboard | **NEEDS-MIKE** |
| Family switch to child B | **NEEDS-MIKE** |
| Unauthorized / forged selection | Unauth API **401** proven; signed-in forged **NEEDS-MIKE** |
| Sign-out + magic-link reuse reject | **NEEDS-MIKE** |

**No blocking code bug found.** No web/auth implementation edits. No code PR.

---

## Mike actions required

1. Open the controlled magic-link email in the approved test inbox only.  
2. Confirm landing on **/dashboard/select** with multiple athlete options (no `enrollmentId=rec…` in URL).  
3. Open child A → private dashboard; switch to child B via family switcher.  
4. Attempt forged/unauthorized selection → denied.  
5. Sign out; reopen same magic link → rejected as used.  
6. Confirm public leaderboard + public athlete profile still work logged out.  
7. After proof: flip Master Future Work List / CURRENT-TRUTH multi-child to **PRODUCTION-VERIFIED** (docs PR).  
8. Cleanup VERIFY disposable athlete/enrollment per existing cleanup manifest when Mike authorizes deletes.

---

## Hard stops honored

No Season Simulation. No edits to automations **003 / 067 / 101 / 117 / SC-147**. No schema/Weeks changes. No broad email. No secrets, tokens, magic-link URLs, recipient addresses, or Airtable record IDs in this report. No `git clean` / `reset --hard`. No merge.
