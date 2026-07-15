# S25 Phase C2 — Migration record (111 → 013)

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Package | `phase-c2-111-into-013` |
| DEV base | `appTetnuCZlCZdTCT` |
| Lead SHA (auth) | `650ed6e17f8e55b2594b48ead5fd566461903ad2` |

## Decision

| Absorb | Into | Slot delta |
|--------|------|------------|
| **111** Copy Enrollment Grade Band → Video Feedback | **013** Create/Link Video Feedback | **+1** after 111 delete |

## Behavior change (binding)

| Topic | Pre-C2 | C2 combined 013 v3.0.0 |
|-------|--------|-------------------------|
| Create VF | 013 set Enrollment GB on create | Same (set when Enrollment GB present) |
| Link / repair | 013 could **overwrite** GB when mismatched; 111 also wrote on blank VF | **Blank-only** repair — never overwrite existing valid GB |
| Missing Enrollment GB | 111 threw | Soft-skip (`skipped_no_enrollment_grade_band`) |
| Dedupe | Find by asset link / Video Feedback Key | Preserved + **recheck-before-create** |

## Rollback

`airtable/automations/shooting-challenge/_rollback/phase-c2-013-111-2026-07-14/`

Critical fail → restore both scripts and **stop** (do not start Phase D).

## Evidence paths

| Artifact | Path |
|----------|------|
| Combined SoT | `airtable/automations/shooting-challenge/013-submission-intake-create-or-link-video-feedback.js` |
| 111 stub | `airtable/automations/shooting-challenge/111-video-review-and-xp-copy-enrollment-grade-band-to-video-feedback.js` |
| Offline tests | `tools/airtable/tests/test_phase_c2_013_combined.py` |
| Pre-paste smoke | `tools/airtable/phase_c2_013_live_smoke_suite.py` |
| Post-paste smoke | `tools/airtable/phase_c2_013_post_paste_smoke.py` |
| Mike UI | `docs/deploy-checklists/PHASE-C2-111-013-mike-ui-actions.md` |

## Status (post-paste)

- GitHub prep + offline + pre-paste smoke PASS
- Mike pasted combined **013 v3.0.0**
- Post-paste live smoke **CRITICAL PASS** (`phase-c2-013-post-paste-smoke-2026-07-14.json`)
- 111 **not** deleted yet — Mike retires next
- Occupancy remains **47 estimated / 3 free** until 111 retire → **46 / 4**

## Out of scope

Phase D, 117, Folder 07 OFF, PROD.
