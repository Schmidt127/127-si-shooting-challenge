# SC Wave 2026-09-05 — Duplicates / Superseded / Stale Claims

**Purpose:** Prevent agents from reopening completed work or treating historical statuses as current blockers.  
**Wave base:** `ba287eef8be430d1606950c39f2cf5a2e3875d46`

---

## Not duplicates (intentional reopen / follow-on)

| New ID | Might look like | Why distinct |
|---|---|---|
| **SC-161** | SC-103 Leaderboard Live Tested; PKG-040 | SC-103 was historical Schmidt visibility / hygiene. SC-161 is **Production functional repair** of the live-proof gap called out in Completion Master / PKG-040. |
| **SC-162** | FUT-014 homework catalog COMPLETE; **FUT-029** | Compact list + durable assignment links on existing `/homework` — **not** grade-band player / intake adapter. |
| **SC-164** | FUT-015 Levels | UX simplification only; **no** XP/gate logic change. |
| **SC-165** | FUT-027 / MRW-G13 FAQ gift-card | FAQ gift-card already **COMPLETE** — do not reopen FAQ as primary. SC-165 = Overview / What's Included awards + coaching messaging. |
| **SC-149 residual** | SC-149 COMPLETE (branding + Family Dashboard nav) | Branding + header/footer/parent CTAs remain COMPLETE. Residual = **More menu** (`MORE_NAV_HREFS`) missing Family Dashboard. |

---

## Confirmed complete — do not reopen as wave blockers

| Claim | Status | Do not |
|---|---|---|
| SC-160 asset intake / HW timing | COMPLETE / Live Tested | Re-paste 009/020/065/057 for this wave |
| FUT-002 Batch 2 | COMPLETE | Re-delete Batch 2 stubs |
| FUT-029 | Deferred — DO NOT IMPLEMENT | Implement under SC-162 or any wave agent |
| SC-149 Fairfield branding | COMPLETE / Live Tested | Treat branding env as open |
| SC-149 Family Dashboard header/footer CTAs | COMPLETE / Live Tested | Treat as unfinished except More-menu residual |
| FUT-027 / MRW-G13 FAQ gift-card | COMPLETE | Primary FAQ gift-card reopen for SC-165 |
| SC-109 Game Manual | COMPLETE / Live Tested | Edit Game Manual route/page this wave |
| SC-147 / 101 v6.8 | COMPLETE | Reopen Zoom half-XP |

---

## Stale documentation claims (note only; full CURRENT-TRUTH SHA refresh = closeout)

| Location | Stale claim | Current preflight truth |
|---|---|---|
| `docs/CURRENT-TRUTH.md` §2 Git identity | HEAD tip recorded as `5dcb8449…` (SC-156 era) | Wave start / `origin/master` = **`ba287eef…`** (includes SC-160 + FUT-002 Batch 2 + FUT-029 plan) |
| `docs/PROJECT_STATE.md` header | Last updated 2026-09-04; tip `5dcb8449` | Same — tip advanced; overlays for SC-160 / FUT-002 Batch 2 already present lower in file |
| `MASTER_REMAINING_WORK_LIST.md` MRW-H01 (pre-A1) | Batch 1 COMPLETE only | Batch 2 also COMPLETE (updated this preflight) |
| Completion Master § older SC-149 / SC-103 rows | “Built” / early Live Tested language mixed with later attestations | Prefer CURRENT-TRUTH + dated audits over §4 historical Built rows |
| Automation contract `sc-057-058-…` (pre-fix) | Asserted 058 **v1.6** | Repo + live = **v1.7**; assertion fixed in-repo only |
| automation-index older prose | Occasional “paste with 058 v1.5” historical phrasing | Index table row for 058 correctly says **v1.7** |

---

## Superseded briefs

| Doc | Status |
|---|---|
| `docs/next-wave/homework-pipeline/FUT-029-HYBRID-FILLOUT-HOMEWORK-BRIEF.md` | **Historical** — superseded by grade-band platform plan |
| `FUT-029-GRADE-BAND-HOMEWORK-PLATFORM-PLAN.md` | Authoritative for FUT-029; **documentation only** until Mike authorizes |

---

## Conflict watch (merge order)

Per ownership ledger: A1 → A2 → A4 → A3 → A5 → A6 → integration → A1 docs closeout.  
Shared nav/footer = **Agent 5 only**. Agents 2/3 must not patch chrome. Game Manual untouched.
