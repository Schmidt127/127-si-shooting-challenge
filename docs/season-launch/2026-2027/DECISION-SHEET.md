# Mike decision sheet — 2026–2027 launch

**Date:** 2026-08-10  
**Package:** Worker 2 season closeout

Each item needs your explicit choice before production launch. Recommended defaults avoid silent assumptions.

---

## D1 — Early Bird vs Week 0 (SC-066)

| | |
|---|---|
| **Question** | Keep **Early Bird** as the pre-challenge week label, or rename to **Week 0**? |
| **Current PROD** | Label **Early Bird** (`recWeVrSabnsYaHc2`); Aug 2026 test dates |
| **Canonical generator** | Label **Early Bird** / week_0 type; Apr 25–May 1 **2027** |
| **Recommended default** | **Keep "Early Bird"** label for parent-facing copy; align **dates** to canonical Apr–May 2027 window before launch |
| **If wrong** | 005 maps by date only, but parent comms and PHA slot labels drift from Game Manual |

---

## D2 — Numbered week count (9 vs 10)

| | |
|---|---|
| **Question** | How many regular challenge weeks for 2026–27? |
| **Current PROD** | **10** numbered weeks (Week 1–10) |
| **Canonical / 2025–26 Config** | **9** + truncated final week ending Jun 30 |
| **Recommended default** | **9 regular weeks** per May 1–Jun 30 contract — **deactivate or merge Week 10** if it duplicates Post-Challenge boundary |
| **If wrong** | Weekly email 118/119 targets wrong Week End Key; PHA Week 9 HW17/HW18 may not match final week |

---

## D3 — Intake-open dates

| | |
|---|---|
| **Question** | When does Fillout enrollment open/close? |
| **Current** | **Not set in repo** — `MIKE_DECISION_REQUIRED` |
| **Recommended default** | Open **≥2 weeks before** canonical Early Bird start; close **day before Week 1** (2027-05-01) unless late enrollment policy applies |
| **If wrong** | Enrollments accepted outside intended window; 001 still works but ops calendar wrong |

---

## D4 — Level Gate Rules for 2026–2027

| | |
|---|---|
| **Question** | Load new **2026–2027** Level Gate Rules row set? |
| **Current PROD snapshot** | **0** gates for 2026–27; **12** for 2025–26 only |
| **Recommended default** | **Yes** — clone structure with **spread early gates** (C-014: e.g. 1 HW past level 1); fill `docs/v2/level-gate-rules-config-template.csv` then import |
| **If wrong** | 043 may apply prior-year thresholds; repeat 2025–26 cliff at Deadeye |

---

## D5 — Video XP amount (SC-022)

| | |
|---|---|
| **Question** | Confirm **VIDEO_SUBMISSION = 25 XP** for 2026–27? |
| **Current snapshot** | **25 XP** on rule set Shooting Challenge 2026–2027 |
| **Conflict** | Completion master notes historical 1-vs-25 audit |
| **Recommended default** | **Keep 25 XP** — matches 2025–26 player expectations and snapshot |
| **If wrong** | Parent emails and Game Manual numbers disagree with XP Events |

---

## D6 — Streak reward after break (053)

| | |
|---|---|
| **Question** | Change 053 so **continued** streaks outrank repeated 7-day blocks after breaks? |
| **Current behavior** | 3×7-day blocks (135 XP) can beat one 20-day streak (125 XP) |
| **Recommended default** | **Defer to post-season** — document in launch notes; no 053 paste before launch unless Mike orders change |
| **If wrong** | Mid-season XP economy shift without comms |

---

## D7 — Live Zoom vs recording credit

| | |
|---|---|
| **Question** | Copy 2025–26 Zoom/recording Config fields onto `rechc1f9f4kVM1tHP`? |
| **Current** | 2026–27 row **sparse**; 2025–26 has 50% recording XP, approval email ON |
| **Recommended default** | **Yes** — copy from `recq14M5hEv3TIGEj` with season-appropriate meeting links |
| **If wrong** | Recording path disabled or approval emails never fire |

---

## D8 — Schmidt email exclusion (072/118/119)

| | |
|---|---|
| **Question** | Remove hard-coded Schmidt exclude from weekly email for controlled tests? |
| **Conflict** | Schmidt contract expects Active?=true; 118/119 exclude Schmidt enrollment |
| **Recommended default** | **Temporary test override** only — use manual 072 build for Schmidt WAS; do not mass-change excludes before launch |
| **If wrong** | Real families could receive test traffic OR Schmidt never gets weekly proof |

---

## D9 — Welcome email for new year

| | |
|---|---|
| **Question** | Approve Hub **WELCOME** template copy for 2026–27 before participant sends? |
| **Current** | Controlled 079 path **proven**; subject still referenced as 2025–26 in ops notes |
| **Recommended default** | Update Hub template + one Schmidt controlled send before Fillout reopen |
| **If wrong** | Parents receive wrong year branding on first touch |

---

## D10 — Public Game Manual PDF

| | |
|---|---|
| **Question** | Set `NEXT_PUBLIC_GAME_MANUAL_URL` on Vercel for 2026–27 manual? |
| **Current** | Route works; env URL **empty** (SC-109) |
| **Recommended default** | Publish 2026–27 PDF to Adobe Document Cloud; set env on next web deploy |
| **If wrong** | `/shoot/game-manual` shows placeholder only |

---

## Sign-off block (Mike)

| Decision | Choice | Date |
|----------|--------|------|
| D1 Early Bird | ☐ | |
| D2 Week count | ☐ | |
| D3 Intake dates | ☐ | |
| D4 Level gates | ☐ | |
| D5 Video XP | ☐ | |
| D6 Streak 053 | ☐ | |
| D7 Zoom config copy | ☐ | |
| D8 Schmidt email | ☐ | |
| D9 Welcome copy | ☐ | |
| D10 Game Manual URL | ☐ | |
