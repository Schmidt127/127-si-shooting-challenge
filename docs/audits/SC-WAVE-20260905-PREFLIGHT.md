# SC Completion Wave 2026-09-05 — Agent 1 Preflight Packet

**Branch:** `wave/a1-truth-preflight-20260905`  
**Base SHA:** `ba287eef8be430d1606950c39f2cf5a2e3875d46` (`origin/master` at wave start)  
**Production deploy at start:** `dpl_77Pb8YJT8NXEX9yjWeTTpxJZ1ccc` READY @ same SHA  
**Owner:** Agent 1 — Current Truth / Integration Control  
**Authority:** [`SC-WAVE-20260905-OWNERSHIP-LEDGER.md`](./SC-WAVE-20260905-OWNERSHIP-LEDGER.md)

---

## Task Classification (Agent 1)

| Field | Value |
|---|---|
| Type | Truth preflight + backlog ID registration + stale contract fix |
| Phase | 3 Implementation (docs + repo assertion only) |
| Correct tool | Cursor |
| Repo | `127-si-shooting-challenge` |
| Backlog IDs | SC-161…SC-166, SC-149 residual; confirm SC-160 / FUT-002 Batch 2 |
| Out of scope | FUT-029 implementation; live automations; web UI owned by Agents 2–6 |

---

## Confirmed complete (pre-wave)

| ID | Status | Evidence |
|---|---|---|
| **SC-160** | **COMPLETE / Live Tested** (2026-09-05) | Live **009 v1.3 / 020 v4.1 / 065 v10.7 / 057 2.5** · [`SC-160-STAGE6-FINAL-CLOSEOUT-20260905.md`](./SC-160-STAGE6-FINAL-CLOSEOUT-20260905.md) |
| **FUT-002 Batch 2** | **COMPLETE** (2026-09-05) | Five Batch 2 IDs absent; Meta **1375** fields / **35** tables · [`FUT-002-BATCH2-POST-DELETE-CLOSEOUT-20260905.md`](./FUT-002-BATCH2-POST-DELETE-CLOSEOUT-20260905.md) |
| **FUT-029** | **Deferred — DO NOT IMPLEMENT** | Plan only · [`FUT-029-GRADE-BAND-HOMEWORK-PLATFORM-PLAN.md`](../next-wave/homework-pipeline/FUT-029-GRADE-BAND-HOMEWORK-PLATFORM-PLAN.md). **Not** SC-162. |

---

## Backlog confirmation (this wave)

| ID | Scope | Owner | Future Work List | Notes |
|---|---|---|---|---|
| SC-161 | Leaderboard Production functional repair | Agent 2 | Added (Planned) | Not a duplicate of SC-103 hygiene; PKG-040 live-proof gap |
| SC-162 | Homework compact list + durable links | Agent 3 | Added (Planned) | Follow-on FUT-014; **NOT FUT-029** |
| SC-163 | Goal Met Date reliability + backfill | Agent 4 | Added (Planned) | Weeks excluded |
| SC-164 | Levels progress UX simplification | Agent 5 | Added (Planned) | Follow-on FUT-015; no XP/gate logic |
| SC-165 | Awards + coaching messaging | Agent 5 | Added (Planned) | Do not reopen FAQ gift-card (FUT-027/MRW-G13 COMPLETE) |
| SC-166 | Coach HW + Video Feedback queues | Agent 6 | Added (Planned) | Interface/filter likely UI-only |
| SC-149 residual | Family Dashboard in More menu | Agent 5 | Added (Planned) | Footer has FD; `MORE_NAV_HREFS` lacks it |

Canonical ownership: [`SC-WAVE-20260905-OWNERSHIP-LEDGER.md`](./SC-WAVE-20260905-OWNERSHIP-LEDGER.md).

---

## Production routes (repo-confirmed)

| Surface | App path (after `basePath`) | Public URL pattern |
|---|---|---|
| **basePath** | `/shoot` | `web/next.config.ts` default `NEXT_PUBLIC_BASE_PATH` → `/shoot` |
| Family Dashboard sign-in | `/dashboard/sign-in` | `/shoot/dashboard/sign-in` |
| Leaderboard | `/leaderboard` | `/shoot/leaderboard` |
| Homework | `/homework` | `/shoot/homework` (+ detail `/homework/[id]`) |
| Levels | `/levels` | `/shoot/levels` |
| Game Manual | `/game-manual` | `/shoot/game-manual` (**do not change** this wave) |

Pages present under `web/app/(program)/` for all rows above. Family Dashboard public link constant: `FAMILY_DASHBOARD_APP_HREF = "/dashboard/sign-in"`. More menu gap: `MORE_NAV_HREFS = ["/game-manual", "/faq", "/achievements"]` — no FD (SC-149 residual).

---

## Automation contracts

Command: `node --test tests/automation-contracts/*.js`

| Result | Detail |
|---|---|
| **Pre-fix** | 13 pass / **1 fail** — `sc-057-058-workflow-reliability-attestation.test.js` asserted `Version: 1.6` |
| **Root cause** | Stale repo assertion; GitHub + live Automation **058** are **v1.7** (SC-153 Coach Note hotfix) |
| **Fix** | Repo assertion only → expect `Version: 1.7` |
| **Not done** | No live Automation 058 paste/edit |
| **Post-fix** | See [`SC-WAVE-20260905-CONTRACTS.md`](./SC-WAVE-20260905-CONTRACTS.md) |

---

## Explicitly out of scope (do not implement)

FUT-029, Season Sim, broad Airtable cleanup, Automation 021/013/067 pastes, restore 006/043/075/077/111/112/115, XP amount changes, Perfect Week rule changes, FUT-003 activation, Fillout reopen, Game Manual changes.

---

## Related packets

- [`SC-WAVE-20260905-STALE-CLAIMS.md`](./SC-WAVE-20260905-STALE-CLAIMS.md) — duplicates / superseded / stale claims  
- [`SC-WAVE-20260905-CONTRACTS.md`](./SC-WAVE-20260905-CONTRACTS.md) — contract run evidence  
- [`SC-WAVE-20260905-OWNERSHIP-LEDGER.md`](./SC-WAVE-20260905-OWNERSHIP-LEDGER.md) — exclusive paths + merge order  
