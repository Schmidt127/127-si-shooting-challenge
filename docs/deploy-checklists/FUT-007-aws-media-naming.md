# FUT-007 — AWS media naming (Lambda implementation)

**Backlog:** FUT-007 (P2)  
**Status:** **Phase 3 prep shipped** — Lambda code behind flag; **DEV deploy still gated**  
**Authority:** [FUT-007-AWS-MEDIA-NAMING-SPEC.md](../next-wave/aws-media/FUT-007-AWS-MEDIA-NAMING-SPEC.md)  
**Systems:** Upload Lambda (`lambda/upload-asset`), S3, Submission Assets, Video Feedback, Make 070a/070b  
**Related:** FUT-008 · FUT-009 · FUT-040 · C-013 · C-023 · FUT-010 (Storage Key verification unchanged)

---

## Summary

When Mike approves Phase 3, update the upload Lambda filename segment to the FUT-007 grammar:

```text
YYYYMMDD_{HW|VIDEO|HEADSHOT}_{LastName}_{FirstName}_{CustomName}.{ext}
```

Folder prefix (`{Athlete}/{ProgramInstance}/{YYYY-MM-DD}/`) remains as today unless FUT-009 changes it separately.

**Hard rules:**

- **Future uploads only** — do not rename existing S3 objects.
- **No `rec…` in basename** — record ID stays in Airtable + viewer URL path.
- Feature flag or version gate **default OFF** until DEV proof passes.
- **No Production deploy** without this checklist completed and Mike sign-off.

---

## Pre-flight (before code)

| Step | Done |
|------|------|
| Read spec §2–§7 | [ ] |
| Confirm FUT-008 **Custom Video File Name** populated on test VF rows | [ ] |
| Confirm Activity Date present on test Submissions | [ ] |
| Run offline tests: `cd web && npm test -- ../lib/aws-media-naming/naming.test.ts` | [ ] |
| Run Lambda suite: `cd lambda/upload-asset && python -m unittest discover -s tests -p "test_*.py" -v` | [ ] |
| DEV base identified (Schmidt / disposable assets only) | [ ] |

---

## Repository changes (Phase 3)

| Path | Change | Done |
|------|--------|------|
| `lambda/upload-asset/upload_core/fut007_basename.py` | FUT-007 basename grammar (sanitize, category, custom, collision) | [x] |
| `lambda/upload-asset/upload_core/storage_key.py` | FUT-007 builder + `USE_FUT007_BASENAME` flag (default off) | [x] |
| `lambda/upload-asset/tests/test_fut007_basename.py` | Spec acceptance matrix (pytest) | [x] |
| `lambda/upload-asset/tests/test_storage_key.py` | Legacy reuse tests preserved | [x] |
| `lib/aws-media-naming/index.ts` | Keep in sync with Python (contract tests) | [x] |
| `docs/next-wave/aws-media/FUT-007-AWS-MEDIA-NAMING-SPEC.md` | Update if implementation diverges (requires Mike) | [ ] |

Optional Airtable (coordinate with OMNI / PKG-004):

| Field | Change |
|-------|--------|
| **Formatted Upload Name** | Formula matches FUT-007 basename |
| **Upload Naming Status** | Fail closed when FUT-007 segments cannot be computed |

**Do not** paste automation changes to Production in the same session as first Lambda deploy.

---

## DEV deployment steps

1. Implement FUT-007 behind env flag (`USE_FUT007_BASENAME=1` in Lambda env — DEV only). **Repo prep shipped 2026-09-01; flag default off.**
2. Deploy Lambda to DEV/staging alias (CodeOnly per [lambda/upload-asset/DEPLOY.md](../../lambda/upload-asset/DEPLOY.md)).
3. Run Schmidt disposable tests:
   - HW route (`070a` / `homework_completion`) — one file
   - VIDEO route (`070b` / `video_feedback`) — Custom Video File Name set + fallback case
   - Collision case — two VIDEO uploads same day same custom name → `_2` suffix
   - Retry case — same Submission Asset → identical Storage Key
4. Verify **070c** writeback still passes (or homework equivalent verification).
5. Confirm **Reviewer File URL** works for new keys.
6. Confirm FUT-010 dry-run still accepts new key shape (`shooting-challenge/` prefix rule may need FUT-009 alignment — document if blocked).

---

## Production promotion (Mike approval required)

| Step | Owner | Done |
|------|-------|------|
| DEV evidence captured under `docs/testing/evidence/fut-007/` | Cursor | [ ] |
| Mike reviews basename samples (parent-facing readability) | Mike | [ ] |
| Lambda PROD deploy with flag **OFF** first | Mike / ops | [ ] |
| Enable flag on PROD after spot-check | Mike | [ ] |
| Airtable formula paste (if any) DEV → PROD | Mike | [ ] |
| `CHANGELOG.md` production entry | Cursor | [ ] |
| Mark FUT-007 **Complete** in Master Future Work List | Cursor | [ ] |

---

## Rollback

1. Set `USE_FUT007_BASENAME=0` (or remove) on Lambda env → redeploy config.
2. New uploads revert to legacy basename builder; existing FUT-007 keys remain valid.
3. Do **not** delete S3 objects created during testing unless disposable-data mode authorized.

---

## Verification commands

```bash
# Shared naming helpers (repo root)
cd web && npm test -- ../lib/aws-media-naming/naming.test.ts

# Lambda storage key suite
cd lambda/upload-asset && python3 -m pytest tests/test_fut007_basename.py tests/test_storage_key.py -q

# FUT-010 contract (Storage Key shape — may need prefix update when FUT-009 lands)
node lib/intake-attachment-cleanup/intake-attachment-cleanup.test.js
```

---

## Out of scope for this checklist

- FUT-009 bucket structure redesign
- FUT-009 post-review rename / replacement object workflow
- FUT-040 headshot automatic migration
- Retroactive rename of legacy test uploads
- Production attachment delete (FUT-010)

---

## Evidence to collect (DEV)

| Artifact | Content |
|----------|---------|
| `fut-007-hw-basename.json` | Storage Key + basename for HW upload |
| `fut-007-video-custom-name.json` | VIDEO with Custom Video File Name |
| `fut-007-video-fallback.json` | VIDEO without custom name |
| `fut-007-collision.json` | `_2` suffix proof |
| `fut-007-retry.json` | Same asset retry → unchanged key |
| `fut-007-viewer-smoke.txt` | Reviewer URL HTTP 302 proof |
