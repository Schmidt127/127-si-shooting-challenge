# Phase A rollback — 006 + 021

**Date:** 2026-07-14  
**Purpose:** Complete pre-consolidation GitHub copies for safe restore.

## Files

| File | Restores |
|------|----------|
| `006-submission-intake-and-asset-creation-set-video-count.js` | Separate automation 006 |
| `021-submission-intake-and-asset-creation-set-attachment-upload-status.js` | Separate automation 021 (pre-combine) |

## Restore procedure

1. Turn OFF combined automation (021 slot).
2. Re-paste 006 script into a new or restored **006** automation; restore prior trigger (`Video Upload` not empty AND `Video Count` empty).
3. Re-paste this folder's 021 script into the 021 automation; restore prior trigger (status empty OR No Files).
4. Turn both ON; delete combined script from active slot if different.
5. Do **not** delete 117 unless Mike approves (separate rollback).

Commit tip at capture: see git log for `phase-a` rollback add.
