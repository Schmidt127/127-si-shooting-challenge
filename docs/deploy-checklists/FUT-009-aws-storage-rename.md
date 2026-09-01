# FUT-009 — Safe post-feedback S3 video rename

**Backlog:** FUT-009 (P2) · **FUT-007** (basename contract)  
**Status:** **Built in repository — DEV proof and Production apply pending Mike approval**  
**Systems:** Video Feedback, Submission Assets, AWS S3, Lambda viewer  
**Related:** [FUT-007-S3-NAMING-CONTRACT-BRIEF.md](../next-wave/aws-media/FUT-007-S3-NAMING-CONTRACT-BRIEF.md) · [FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md](../next-wave/aws-media/FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md) · FUT-010 (dual-prefix verify alignment)

---

## Summary

When a coach enters **Custom Video File Name** on Video Feedback and **confirms** the rename, the FUT-009 worker:

1. Validates eligibility (Uploaded video-route Submission Asset)
2. Computes Option D destination key: `shooting-challenge/{Athlete}/{Program}/{ActivityDate}/{FUT-007 basename}`
3. **CopyObject** source → destination (same bytes; extension unchanged)
4. **HeadObject** verify on destination
5. Patches **Storage Key**, **Canonical File URL**, **Formatted Upload Name**
6. **Retains** the original S3 object (no DeleteObject)

**Reviewer File URL** is unchanged (record ID + token formula). Lambda viewer reads updated Storage Key on next GET.

**Out of scope v1:** Homework rename, headshot rename, mass legacy migration, Automation 147, Production schema paste without Mike approval.

---

## Mike-approved decisions (2026-09-01)

| Decision | Value |
|----------|-------|
| Folder layout | **Option D** — `shooting-challenge/` prefix |
| Activity Date timezone | **America/Denver** |
| Rename scope | **VIDEO only** |
| Legacy Gen B keys | **Grandfathered** — rename copies to Option D; no forced migration |
| Coach confirmation | **Required** — `Confirm S3 Video Rename` on VF and/or CLI `--confirm-rename` |
| Old S3 object | **Retained** indefinitely |
| Audit fields | **Previous Storage Key**, **Renamed At** — PKG-004; optional via `--include-audit-fields` |

---

## Coach confirmation (required before activation)

### Proposed Airtable field (PKG-004 — Mike must create in DEV first)

| Table | Field | Type | Purpose |
|-------|-------|------|---------|
| **Video Feedback** | **Confirm S3 Video Rename** | Checkbox | Coach explicit intent after entering Custom Video File Name |

**Workflow:**

1. Coach reviews video via Reviewer File URL
2. Coach enters **Custom Video File Name**
3. Coach checks **Confirm S3 Video Rename**
4. Operator runs CLI `apply --confirm-rename` (or future Interface button calling Lambda worker)

**Do not** auto-rename on Custom Video File Name field change alone.

---

## Repository artifacts

| Path | Purpose |
|------|---------|
| `lambda/upload-asset/upload_core/fut009_rename.py` | Core rename sequence (validate → copy → verify → writeback) |
| `lambda/upload-asset/upload_core/s3_storage_key_format.py` | Dual-prefix Storage Key validation |
| `lambda/upload-asset/upload_core/fut007_basename.py` | `build_fut009_destination_key()` |
| `lib/fut009-video-rename/index.js` | Pure JS decision helpers + tests |
| `lib/s3-storage/storage-key-format.js` | Dual-prefix regex (FUT-010 alignment) |
| `lib/aws-media-naming/index.ts` + `index.js` | Shared FUT-007 + Option D destination builder |
| `tools/airtable/fut_009_video_rename.py` | CLI: preflight, dry-run, apply |
| `airtable/extension-scripts/safe-backfills/fut-009-video-rename.js` | Extension eligibility report (apply via CLI) |
| `lambda/upload-asset/tests/test_fut009_rename.py` | Python unit tests |
| `lib/fut009-video-rename/fut009-video-rename.test.js` | JS contract tests |

---

## Fields written (Submission Assets)

| Field | On successful rename |
|-------|---------------------|
| **Storage Key** | Updated → Option D + FUT-007 key |
| **Canonical File URL** | Updated → HTTPS URL for new key |
| **Formatted Upload Name** | Updated → FUT-007 basename |
| **Upload Error** | Cleared on success |
| **Original File Name** | **Never overwritten** |
| **Reviewer File URL** | **Unchanged** (formula) |
| **Reviewer Access Token** | **Preserved** |
| **File Content Hash** | **Unchanged** |

Optional (PKG-004, `--include-audit-fields`):

| Field | Value |
|-------|-------|
| **Previous Storage Key** | Source key before rename |
| **Renamed At** | ISO timestamp America/Denver |

---

## CLI usage

```bash
cd tools/airtable

# Preflight (no credentials write)
python fut_009_video_rename.py preflight

# Dry-run single record (no S3/Airtable writes)
python fut_009_video_rename.py dry-run --record-id recXXXXXXXXXXXXXX

# Apply (requires AWS creds + --confirm-rename)
python fut_009_video_rename.py apply --confirm-rename --record-id recXXXXXXXXXXXXXX

# With audit fields when PKG-004 schema exists
python fut_009_video_rename.py apply --confirm-rename --include-audit-fields --record-id rec…
```

**Environment:** `AIRTABLE_API_TOKEN` in `tools/airtable/.env` or `web/.env.local`; AWS credentials for S3 CopyObject/HeadObject.

---

## Failure recovery

| State | Recovery |
|-------|----------|
| CopyObject failed | Airtable unchanged; fix AWS error and retry |
| Verify failed after copy | Airtable unchanged; investigate destination; manual reconcile |
| Copy succeeded, Airtable patch failed | **Retry apply** — worker detects destination exists → `airtable_only_recovery` (no second copy) |
| Idempotent re-run after success | `skipped_already_named` |

---

## DEV proof checklist (Mike)

- [ ] Add **Confirm S3 Video Rename** checkbox on Video Feedback (DEV base)
- [ ] Disposable video Submission Asset with Gen B Storage Key
- [ ] Set Custom Video File Name + confirm checkbox
- [ ] `dry-run` shows expected destination key
- [ ] `apply --confirm-rename` on DEV — verify S3 object at new key
- [ ] Verify old S3 object still exists
- [ ] Verify Reviewer File URL unchanged; viewer GET serves new file
- [ ] Re-run apply → `skipped_already_named`
- [ ] Evidence in `docs/testing/evidence/fut-009/`

---

## Production promotion (Mike approval required)

1. Merge PR to `master`
2. PKG-004: add **Confirm S3 Video Rename** on Production Video Feedback (if not already)
3. Optional: add **Previous Storage Key** + **Renamed At** on Submission Assets
4. DEV proof complete with evidence
5. Supervised single-record Production `apply --confirm-rename`
6. Update `CHANGELOG.md`
7. **Do not** enable field-change automation without explicit confirm gate

---

## Example destination key

```text
shooting-challenge/Boltz_Drew/Shooting_Challenge_2026-2027/2026-08-17/20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4
```

---

## Tests (offline)

```bash
node lib/s3-storage/storage-key-format.test.js
node lib/fut009-video-rename/fut009-video-rename.test.js
node lib/intake-attachment-cleanup/intake-attachment-cleanup.test.js
cd lambda/upload-asset && python -m pytest tests/test_fut009_rename.py tests/test_fut007_basename.py tests/test_storage_key.py -q
cd web && npm test -- ../lib/aws-media-naming/naming.test.ts
```

---

*No Production S3, Airtable, or automation changes are performed by merging this documentation alone.*
