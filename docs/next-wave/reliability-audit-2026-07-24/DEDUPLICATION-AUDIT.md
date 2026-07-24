# Deduplication audit — Shooting Challenge

**Date:** 2026-07-24  
**Registry:** [`../automation-ownership/xp-source-key-registry.json`](../automation-ownership/xp-source-key-registry.json)

Formula-only (never write): `XP Dedupe Key`, `XP Dedupe Key Normalized`, `Summary Key`, `Unlock Key`.

| Domain | Key | Writer | Rerun-safe? | Notes |
|--------|-----|--------|-------------|-------|
| Submission XP | `SUBMISSION_XP\|{sub}` | 010 | Yes | |
| Homework XP | `HOMEWORK_XP\|{hc}` | 065 | Medium | Legacy `HOMEWORK_COMPLETION\|` dual-mint risk |
| Video XP | `VIDEO_SUBMISSION\|{vf}` | 114 | Yes | Refuse steal |
| Streak XP | `STREAK_XP\|…` | 054 | Yes | Denver date |
| Shot milestone | `SHOT_MILESTONE\|…` | 066→059 | Yes | |
| Perfect Week | `PERFECT_WEEK\|…` | 058→059 | Yes | |
| Zoom live | `ZOOM_ATTEND_*` | 101 | Yes | |
| Zoom recording | `ZOOM_CREDIT\|…` | 117 XOR 117c | High if both ON | |
| VF row | `VIDEO_FEEDBACK\|{asset}` | 013 | High if 112 ON | |
| WAS | Summary Key Enr+Week | 031 (+101/118) | Race | No unique index |
| Weekly email | `WEEKLY_EMAIL\|…` + Sent? | 074 / Make | Yes if Sent? held | Test skips writeback |
| Weekly Threshold | unknown | **Missing** | N/A | |

Team Shot Tracker inactivity keys: **out of scope**.
