# Phase C1 rollback — 020 + 063

**Date:** 2026-07-14  
**Purpose:** Pre-consolidation GitHub copies for safe restore.

## Files

| File | Restores |
|------|----------|
| `020-homework-link-or-create-homework-completion.js` | Separate 020 (v2.3, pre–Grade Band absorb) |
| `063-homework-review-and-xp-copy-enrollment-grade-band-to-homework-completion.js` | Separate 063 |

## Restore procedure (critical test failure)

1. Turn OFF combined 020.
2. Re-paste both scripts into restored **020** and **063** automations.
3. Restore 063 trigger: Homework Completions · Enrollment not empty · Grade Band empty.
4. Turn both ON.
5. Do **not** start C2. Do **not** touch 117 or Folder 07.

## After C1 PASS

Retire UI slot **063** only. Expected: **47 estimated / 3 free** (inventory math; no visible Airtable counter).
