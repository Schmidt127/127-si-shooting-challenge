# REPORT — Overnight Agent 2 (Config / XP / Levels / Achievements)

**Date:** 2026-07-24  
**Branch:** `master`  
**PROD base:** `appn84sqPw03zEbTT`  
**Scope:** SC-021–034, SC-070–083, SC-096 (config-related), SC-124 (config portions), SC-140 (config portions), SC-146 (config-related)

---

## Executive result

| Field | Value |
|---|---|
| Overall status | **Substantial progress** — audits complete, offline tests green, safe repo hardenings landed, Submission Base XP + level baseline re-verified live; live streak/milestone/Perfect Week/gate-cross still require Mike-supervised construction |
| Major accomplishments | Full config-xp audit pack; 054/066 hardenings; shared XP-rule / Grade-Band / unlock-integrity helpers; 90+ overnight tests passing; live Schmidt Submission Base XP = 20 confirmed |
| Major defects | Config table 4-way conflict; Video XP 1 vs rule 25 + blank date; Lifetime XP excludes Zoom quiz (decision); XP Date Resolved SWITCH typo; 053 backdated double-award hazard (policy-bound) |
| Major blockers | Airtable UI pastes (054/066/057); product decisions (streak repeat, gate tuning, Config collapse); live boundary tests not safely reversible unattended |

---

## Configuration findings

- **Hardcodes:** Catalogued in `CONFIG-HARDCODE-AUDIT.md` / `config-hardcode-audit.json`. Stable constants (source-key prefixes, Sun–Sat day count) kept; Perfect Week video min=3 is a config candidate; 066 string band match **fixed in repo** (v3.3).
- **Missing config:** No `ZOOM_RECORDING_*` or `MANUAL_BONUS` XP Reward Rules (acceptable if intentional).
- **Duplicate config:** **Config table has 4 conflicting records** (Max Videos 4/6/4/5) — highest operational risk for 042 flag reads.
- **Stale config:** Historical streak XP amounts (35/60/90/140); docs saying 043 is required; inactive mojibake Grade Bands.
- **Dangerous string dependencies:** 066 label matching (repo-fixed, paste pending); XP Date Resolved case `"Submission Base"`.

---

## XP findings

- **Rule coverage:** 31 active rules, zero duplicate active Rule Keys (re-verified 2026-07-24).
- **Source coverage:** Submission Base, Homework, Video, Zoom Attend (+bonuses), Streak ladder 3–60, Perfect Week, Weekly Threshold ×5 bands. Shot Milestone points from milestone records via 059.
- **Missing rules:** Zoom Recording Quiz / Manual Bonus (decision).
- **Duplicate rules:** None active in PROD.
- **Date-source issues:** Video event blank date; XP Date Resolved SWITCH typo; 057 UTC-slice latent.
- **Dedupe issues:** Submission Base healthy; 054 hardened for duplicate rules in repo; 053 backdated merge can create second keys (policy-bound).

**Live Submission Base proof:** Submission `recuuTBgstSTGg2E3` → XP Event `recOodD23MQrP1O9F`, 20 XP, Source Key `SUBMISSION_XP|recuuTBgstSTGg2E3`, Denver-midnight activity date. Exactly one event for that submission.

---

## Level and gate findings

- **041:** Sets Level Recalc Needed?; no infinite loop found with 042.
- **042:** Sole owner of Current Level / Next Level / Level Gate Rule / Level Status. Schmidt: Beginner → Rookie Shooter, Gate Rule = Level 2 Gate, Status = Assigned, Lifetime XP 61. Matches offline engine.
- **043:** **Deleted / superseded — do not restore.** Confirmed in completion master + baseline.
- **Blocked/cleared gate tests:** Offline suite covers unmet / exact / exceeded / rollback / Zoom-homework-video-streak flips (`overnight-level-gate-boundaries.test.js`, 23 tests). Live gate-cross not fabricated (cleanup risk).
- **Configuration concerns:** Early gates (L7+) may be hard for Q1 — decision SC-082 only; Config-record ambiguity feeds Zoom credit flags into 042.

---

## Achievement findings

- **Streaks:** Rules + Achievements aligned; empty Streak Occurrences; offline block/unlock/dedupe tests pass; repeat-after-break = Mike decision.
- **Milestones:** 40 active across 5 bands; 066 v3.3 ID matching in repo; Schmidt at 75/500 K-2 — no live crossing.
- **Perfect Week:** Offline matrix complete; no live Perfect Week (needs full week).
- **Unlock dedupe:** Empty unlock table audited clean; helpers + live auditor added.
- **XP linkage:** 059 remains XP writer for unlocks; no orphan unlocks present.

---

## PROD activity

| Action | Detail |
|---|---|
| Records read | Config tables (XP Rules, Levels, Gates, Achievements, Milestones, Grade Bands, Config, Weeks); Schmidt enrollment/submission/scenario; all XP Events (5); Achievements Unlocks (0); Streak Occurrences (0); WAS rows |
| Records created | **0** |
| Records modified | **0** |
| Records deleted | **0** |
| Controlled tests | Read-only re-verification of Submission Base XP + level baseline (2026-07-24) |
| Cleanup | None required (no writes) |

---

## Completion-master updates

| SC | Old | New | Evidence | Reason |
|---|---|---|---|---|
| SC-021 | Planned | Built in Repository | `CONFIG-HARDCODE-AUDIT.md`, helpers, 054/066 fixes | Full hardcode audit + safe migrations started |
| SC-022 | Planned | Built in Repository | `XP-RULES-AUDIT.md`, live rule inventory, 054 v5.6 | Rules audited; Submission Base live-proven under SC-070 |
| SC-023 | Planned | Built in Repository | 066 v3.3, `GRADE-BAND-AUDIT.md`, normalize helpers | Link-ID matching in repo; paste still needed |
| SC-029 | Planned | Built in Repository | `STREAK-SYSTEM-AUDIT.md`, streak tests | Config amounts authoritative; behavior decision open |
| SC-034 | Planned | Built in Repository | 054/066 hardenings + audit | Partial modernization wave; not all 001–119 |
| SC-070 | Installed in PROD | Live Tested in PROD | XP Event `recOodD23MQrP1O9F` on `recuuTBgstSTGg2E3` | Exactly one 20-XP Submission Base event |
| SC-078 | Installed in PROD | Live Tested in PROD | Schmidt enrollment level fields + offline match | Baseline assignment verified (not full level-up) |

Statuses intentionally **not** raised to Complete: PROD pastes still pending for 054/066; gate-block/streak/milestone/Perfect Week live crossings not constructed.

---

## Git activity

Populated in `RESULTS.json` after commits land. Working tree expected clean after push.
