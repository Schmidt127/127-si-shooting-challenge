# SC Completion Wave 2026-09-05 — Closeout

**Role:** Coordinator docs closeout  
**Date:** 2026-09-05  
**Starting SHA:** `ba287eef8be430d1606950c39f2cf5a2e3875d46`  
**Ending `origin/master`:** `bd0198a4df50d77664f766aa948beba2741bfd67` (verified)  
**Season Simulation:** not run · **FUT-029:** not implemented · **Game Manual:** unchanged

---

## Merged PRs (order)

| Order | PR | Scope | Merge SHA |
|------:|----|-------|-----------|
| 1 | [#435](https://github.com/Schmidt127/127-si-shooting-challenge/pull/435) | A1 truth + 058 v1.7 assertion | `7c63dd00` |
| 2 | [#440](https://github.com/Schmidt127/127-si-shooting-challenge/pull/440) | SC-161 leaderboard | `0eb1ed28` |
| 3 | [#438](https://github.com/Schmidt127/127-si-shooting-challenge/pull/438) | SC-163 Goal Met Date (repo) | `43d353a4` |
| 4 | [#437](https://github.com/Schmidt127/127-si-shooting-challenge/pull/437) | SC-162 homework | `f8a1c9ee` |
| 5 | [#439](https://github.com/Schmidt127/127-si-shooting-challenge/pull/439) | SC-164/165 nav/levels/messaging | `9869a2eb` |
| 6 | [#436](https://github.com/Schmidt127/127-si-shooting-challenge/pull/436) | SC-166 coach queues docs | `bd0198a4` |
| 7 | [#444](https://github.com/Schmidt127/127-si-shooting-challenge/pull/444) | SC-163 066 v4.1 timezone + live closeout | *(merge SHA on land)* |

---

## Status board (authoritative)

| ID | Status | Evidence / next |
|----|--------|-----------------|
| **SC-161** | **COMPLETE / Live Tested** | Production `/shoot/leaderboard` loads **3 athletes** after duplicate `Active?` heal + code skip/dedupe. [`SC-161-LEADERBOARD-REPAIR-20260905.md`](./SC-161-LEADERBOARD-REPAIR-20260905.md) |
| **SC-162** | **COMPLETE / Live Tested** | Production `/shoot/homework` — 18 published; compact rows + **View assignment** → `/homework/[id]`. [`SC-162-HOMEWORK-COMPACT-DURABLE-LINKS.md`](./SC-162-HOMEWORK-COMPACT-DURABLE-LINKS.md) |
| **SC-163** | **COMPLETE / Live Tested** | Live **066 v4.1** = GitHub; Goal Met Date date-only; Athlete1 **8/30/2026** stamp + retry; no duplicate milestones; 066 may remain ON. [`SC-163-LIVE-VERIFICATION-CLOSEOUT-20260905.md`](./SC-163-LIVE-VERIFICATION-CLOSEOUT-20260905.md) |
| **SC-164** | **COMPLETE / Live Tested** | Production `/shoot/levels` — single **Your Level Progress** section; on-card gates. [`SC-164-LEVELS-PROGRESS-UX-20260905.md`](./SC-164-LEVELS-PROGRESS-UX-20260905.md) |
| **SC-165** | **COMPLETE / Live Tested** | Overview shows awards (Amazon gift via Award Recipients) + coaching messaging. [`SC-165-AWARDS-COACHING-MESSAGING-20260905.md`](./SC-165-AWARDS-COACHING-MESSAGING-20260905.md) |
| **SC-166** | **PARTIALLY COMPLETE — MIKE UI ACTION REQUIRED** | Rules + Interface filter checklist only. **Not live-complete.** [`../deploy-checklists/SC-166-coach-work-queue-filters.md`](../deploy-checklists/SC-166-coach-work-queue-filters.md) |
| **SC-149 residual** | **COMPLETE** (with SC-164/165) | Family Dashboard under More. [`SC-149-MORE-FAMILY-DASHBOARD-20260905.md`](./SC-149-MORE-FAMILY-DASHBOARD-20260905.md) |
| **SC-160** | **COMPLETE / Live Tested** (pre-wave) | Unchanged this wave |
| **FUT-002 Batch 2** | **COMPLETE** (pre-wave) | Unchanged this wave |
| **FUT-029** | **Deferred — DO NOT IMPLEMENT** | Unchanged |
| **Game Manual / SC-109** | **Preserved / unchanged** | No wave edits |

---

## Open Mike UI actions (do not claim complete)

### SC-166 — Coach work queues

1. Apply **Active** OR-group filters on Homework Grading Queue Interface.  
2. Apply **Completed/History** filters (composite rules — do not rely on VF Workflow Status alone).  
3. Mirror on Video Feedback Grading Interface.  
4. Re-verify Active excludes finished work; History holds completed rows.  

Checklist: [`../deploy-checklists/SC-166-coach-work-queue-filters.md`](../deploy-checklists/SC-166-coach-work-queue-filters.md)

---

## 30-point summary skeleton

1. Wave started at `ba287eef`; tip verified `bd0198a4`; SC-163 closeout via PR **#444**.  
2. Six wave PRs merged: #435 → #440 → #438 → #437 → #439 → #436; plus #444 SC-163 live closeout.  
3. A1 registered SC-161…SC-166 + SC-149 residual; fixed 058 contract assertion v1.7.  
4. SC-161: leaderboard was fail-closed on duplicate Active identity.  
5. SC-161: data heal cleared lower-XP duplicate `Active?`.  
6. SC-161: code skips/dedupes duplicates instead of blanking board.  
7. SC-161 live: **3 players**, `2026-2027 Season`, anonymous OK.  
8. SC-162: compact homework list shipped (not FUT-029).  
9. SC-162: durable attachment/link delivery via app proxy routes.  
10. SC-162 live: **18 published**; **View assignment** links work.  
11. SC-163: root cause = Goal Met Date was Award Recipients lookup; later v4.0 TZ double-shift.  
12. SC-163: ownership on **066**; Automation **122** SUPERSEDED.  
13. SC-163: **COMPLETE / Live Tested** — **066 v4.1**, date-only field, Athlete1 **8/30/2026**.  
14. SC-164: Levels UX collapsed to **Your Level Progress**.  
15. SC-164: removed repeated full-gate CTAs; on-card gates kept.  
16. SC-164 live: Levels page shows simplified orientation.  
17. SC-165: Overview + What’s Included awards/coaching copy.  
18. SC-165: FAQ gift-card (FUT-027) not reopened as primary.  
19. SC-165 live: Amazon gift + Award Recipients + coaching copy present.  
20. SC-149 residual: Family Dashboard added under More menu.  
21. SC-149 residual closed with A5 merge (#439).  
22. SC-166: coach Active vs Completed/History rules documented.  
23. SC-166: Interface filters are **UI-only** (MCP cannot set them).  
24. SC-166: **not** live-complete until Mike applies filters.  
25. FUT-029 remains **Deferred — DO NOT IMPLEMENT**.  
26. SC-160 + FUT-002 Batch 2 remain **COMPLETE**.  
27. Game Manual / SC-109 untouched this wave.  
28. Season Sim not authorized / not run.  
29. Live **066 v4.1** paste + proof by Mike; agents did not paste.  
30. Docs reconciled; remaining Mike UI = **SC-166** only.

---

## Explicit non-claims

- Do **not** claim SC-166 live-complete.  
- Do **not** paste Automation 122 from agents.  
- Do **not** implement FUT-029.
