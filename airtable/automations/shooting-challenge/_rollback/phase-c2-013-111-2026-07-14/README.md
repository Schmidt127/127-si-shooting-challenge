# Phase C2 rollback — 013 + 111

**Date:** 2026-07-14  
**Package:** `phase-c2-111-into-013`

## Contents

| File | Role |
|------|------|
| `013-submission-intake-create-or-link-video-feedback.js` | Pre-C2 v2.0 (overwrite GB on mismatch) |
| `111-video-review-and-xp-copy-enrollment-grade-band-to-video-feedback.js` | Pre-C2 production copy |

## Restore (critical fail)

1. Paste rollback **013** into DEV automation 013 (skip any GitHub header).
2. Paste rollback **111** into DEV automation 111 if stubbed incorrectly, or re-create 111 from this copy.
3. Leave both ON until verified.
4. **Stop** — do not proceed to Phase D.

## Do not

- Touch 117, Folder 07 OFF, or PROD.
