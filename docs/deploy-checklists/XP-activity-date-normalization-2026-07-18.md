# XP Activity Date Normalization — Findings & Safe Repo Fixes

**Date:** 2026-07-18  
**Scope:** Repository-only · no Airtable backfill · no PROD paste  
**Timezone authority:** America/Denver · Sunday–Saturday week boundaries

---

## Summary

| Pipeline | Script | Finding | Action |
|----------|--------|---------|--------|
| Submission | 010 | Uses Submission `Activity Date` directly | No change |
| Homework | 065 | Prefers date-only then Submission Date | No change |
| Video | 114 | Canonical linked Submission `Activity Date` + optional XP Source Date | No change (do not invent legacy aliases) |
| Streak rebuild | 053 | **UTC ISO slice** + UTC week compare | **Fixed → Denver date keys (v5.2)** |
| Streak XP | 054 | **UTC ISO slice** into Source Key date | **Fixed → Denver date keys (v5.5)** |
| Zoom live | 101 | Meeting date resolved in Denver but **not written** to XP date fields | **Fixed → write Activity Date / XP Activity Date / XP Source Date when present (v5.5)** |
| Zoom recording | 117a | Already Denver-safe | No change |
| Perfect Week | 058 | Keyed by Week link, not activity date | No change |
| Shot Milestone | 066 | Already Denver helpers | No change |

---

## Clear defects fixed

### 1. Streak UTC slicing (053 / 054)

**Problem:** `toDateKey` used `date.toISOString().slice(0, 10)`, which can shift late-evening America/Denver dateTimes onto the next UTC calendar day. Streak day identity and `STREAK_XP|…|{endDate}` could disagree with Sunday–Saturday Weeks.

**Fix:** Prefer `YYYY-MM-DD` / `M/D/YYYY` text parse; otherwise format with `Intl` in `America/Denver`. Week membership compares Denver date keys as strings (`dateKey >= startKey && dateKey <= endKey`).

### 2. Missing Zoom activity dates (101)

**Problem:** 101 already computed `meetingDateKey` in Denver for eligibility but never wrote it onto XP Events.

**Fix:** When creating/updating XP Events, write noon-UTC date-only values into writable `Activity Date`, `XP Activity Date`, and/or `XP Source Date` if those fields exist. Does not change award eligibility or XP amounts.

---

## Explicit non-fixes (safe / out of scope)

| Item | Why not changed |
|------|-----------------|
| Video legacy source-date aliases | 114 already uses canonical Submission Activity Date; inventing aliases could mask missing links |
| Historical XP Event backfill | Requires Mike-approved write tools; this package is repo-only |
| Streak XP amount ladder | Amounts come from XP Reward Rules — do not hardcode; see `verify_xp_reward_rules.py` |
| Perfect Week date fields | Unlock keyed by Week ID |

---

## Sunday–Saturday boundary note

Official challenge weeks are Sunday start → Saturday end in America/Denver.  
Weekly email schedule keys (118/119) use **prior Saturday** as the completed week end.  
Streak week assignment must use the same Denver calendar day as submission Activity Date — UTC slicing violated that contract near midnight.

---

## Validation

- Offline: `node airtable/automations/shooting-challenge/lib/xp-date-normalization.test.js`
- Live DEV paste of 053/054/101 still requires Mike authorization
