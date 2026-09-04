# FUT-009 — Safe post-feedback S3 video rename (automatic)

**Backlog:** FUT-009 (P2) · **FUT-007** (basename contract) · **Automation 120**  
**Status:** **COMPLETE / Live Tested (2026-09-04)** — Lambda route live; Automation 120 Live; disposable rename proof passed — [`../audits/FUT-009-LAMBDA-STATUS-20260904.md`](../audits/FUT-009-LAMBDA-STATUS-20260904.md)  
**Systems:** Video Feedback, Submission Assets, AWS S3, Lambda `127si-upload-asset`, Automation **120**  
**Related:** [FUT-007-S3-NAMING-CONTRACT-BRIEF.md](../next-wave/aws-media/FUT-007-S3-NAMING-CONTRACT-BRIEF.md) · [FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md](../next-wave/aws-media/FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md) · [120-v1.0-fut009-s3-video-rename-paste-packet.md](./120-v1.0-fut009-s3-video-rename-paste-packet.md)

---

## Summary

When a coach enters **Custom Video File Name** on Video Feedback and checks **Confirm S3 Video Rename**, **Automation 120** automatically calls the FUT-009 Lambda worker. The worker:

1. Validates eligibility (Uploaded video-route Submission Asset)
2. Computes Option D destination key: `shooting-challenge/{Athlete}/{Program}/{ActivityDate}/{FUT-007 basename}`
3. **CopyObject** source → destination (same bytes; extension unchanged)
4. **HeadObject** verify on destination
5. Patches **Storage Key**, **Canonical File URL**, **Formatted Upload Name**
6. **Retains** the original S3 object (no DeleteObject)

**Reviewer File URL** is unchanged (record ID + token formula). Lambda viewer reads updated Storage Key on next GET.

**Normal workflow is automatic.** The CLI (`tools/airtable/fut_009_video_rename.py`) remains for recovery, dry-run, backfill, and supervised emergency apply only.

**FUT-008 display wiring (PR #336) is independent:** emails and website resolve display filenames from **Custom Video File Name → Video Asset File Name → "Video submission"** immediately when the coach enters the custom name. Physical S3 rename (this workflow) may complete later; display must not wait for CopyObject.

**There is no separate Airtable DEV environment.** Controlled Production tests use disposable records only.

**Out of scope v1:** Homework rename, headshot rename, mass legacy migration, Automation 147.

---

## Mike-approved decisions (2026-09-01)

| Decision | Value |
|----------|-------|
| Folder layout | **Option D** — `shooting-challenge/` prefix |
| Activity Date timezone | **America/Denver** |
| Rename scope | **VIDEO only** |
| Legacy Gen B keys | **Grandfathered** — rename copies to Option D; no forced migration |
| Coach confirmation | **Required** — `Confirm S3 Video Rename` checkbox triggers Automation 120 |
| Old S3 object | **Retained** indefinitely |
| Audit fields | **Previous Storage Key**, **Renamed At** — PKG-004 optional on Submission Assets |

---

## Automatic trigger (Automation 120)

| Item | Value |
|------|-------|
| **Automation number** | **120** (new slot — first use in repo) |
| **Table** | Video Feedback |
| **Trigger** | When record updated |
| **Conditions** | Confirm S3 Video Rename **checked** · Custom Video File Name **not empty** · Custom Video File Name **is not** — · Submission Asset **not empty** |
| **Worker** | Lambda `POST /fut009/rename` with `X-Upload-Secret` |
| **Post-success** | Clears Confirm S3 Video Rename (prevents duplicate automation runs) |

**Coach workflow:**

1. Coach reviews video via Reviewer File URL
2. Coach enters **Custom Video File Name**
3. Coach checks **Confirm S3 Video Rename**
4. Automation 120 runs automatically → Lambda CopyObject + Airtable writeback
5. Confirm checkbox clears on success or idempotent `skipped_already_named`

**Why confirmation checkbox is required:** Custom Video File Name alone is display metadata used immediately by emails/website (FUT-008). The checkbox is explicit coach intent before irreversible S3 CopyObject.

---

## Required Airtable fields (PKG-004 — Mike must create before enabling Automation 120)

| Table | Field | Type | Required | Purpose |
|-------|-------|------|----------|---------|
| **Video Feedback** | **Confirm S3 Video Rename** | Checkbox | **Yes** | Trigger + coach confirmation |
| **Submission Assets** | **Previous Storage Key** | Single line text | Optional | Audit — source key before rename |
| **Submission Assets** | **Renamed At** | Date/time | Optional | Audit — America/Denver timestamp |

**Not required for v1:** S3 Rename Status / S3 Rename Error on Video Feedback — failures surface via automation run outputs and **Upload Error** on Submission Asset.

**Existing fields used (no schema change):** Custom Video File Name, Submission Asset link, Storage Key, Canonical File URL, Original File Name, Reviewer File URL, Reviewer Access Token, Upload Error, Submission Assets **Date** (activity-date source). **Formatted Upload Name is not present in Production** — Lambda writeback omits it by default (2026-09-04).

---

## Repository artifacts

| Path | Purpose |
|------|---------|
| `lambda/upload-asset/upload_core/fut009_rename.py` | Core rename sequence (validate → copy → verify → writeback) |
| `lambda/upload-asset/upload_core/fut009_service.py` | Lambda HTTP handler for `/fut009/rename` |
| `lambda/upload-asset/upload_core/s3_storage_key_format.py` | Dual-prefix Storage Key validation |
| `lambda/upload-asset/upload_core/fut007_basename.py` | `build_fut009_destination_key()` |
| `lib/fut009-video-rename/index.js` | Pure JS decision helpers + tests |
| `tools/airtable/fut_009_video_rename.py` | CLI recovery/backfill (not normal workflow) |
| `airtable/automations/shooting-challenge/120-…-apply-fut009-s3-video-rename.js` | **Automation 120** — automatic trigger |
| `airtable/automations/shooting-challenge/lib/fut009-rename-handoff.js` | Trigger pre-check helpers + tests |
| `airtable/extension-scripts/safe-backfills/fut-009-video-rename.js` | Extension eligibility report (no S3 apply) |

---

## Lambda endpoint

```http
POST https://{function-url}/fut009/rename
X-Upload-Secret: {UPLOAD_WEBHOOK_SECRET}
Content-Type: application/json

{
  "videoFeedbackRecordId": "rec…",
  "coachConfirmed": true,
  "includeAuditFields": true
}
```

**Response `actionOut` values:** `renamed` · `airtable_only_recovery` · `skipped_already_named` · `skipped_*` · `error_*`

---

## Fields written (Submission Assets)

| Field | On successful rename |
|-------|---------------------|
| **Storage Key** | Updated → Option D + FUT-007 key |
| **Canonical File URL** | Updated → HTTPS URL for new key |
| **Formatted Upload Name** | Updated → FUT-007 basename |
| **Upload Error** | Cleared on success; set on rename failure |
| **Original File Name** | **Never overwritten** |
| **Reviewer File URL** | **Unchanged** (formula) |
| **Reviewer Access Token** | **Preserved** |
| **File Content Hash** | **Unchanged** |

Optional (PKG-004, `includeAuditFields: true`):

| Field | Value |
|-------|-------|
| **Previous Storage Key** | Source key before rename |
| **Renamed At** | ISO timestamp America/Denver |

---

## CLI usage (recovery / backfill only)

```bash
cd tools/airtable

# Preflight
python fut_009_video_rename.py preflight

# Dry-run (no writes)
python fut_009_video_rename.py dry-run --record-id recXXXXXXXXXXXXXX

# Recovery apply (requires AWS creds + --confirm-rename)
python fut_009_video_rename.py apply --confirm-rename --record-id recXXXXXXXXXXXXXX
```

---

## Failure recovery

| State | Recovery |
|-------|----------|
| CopyObject failed | Airtable unchanged; fix AWS error; re-check Confirm and retry |
| Verify failed after copy | Airtable unchanged; investigate destination |
| Copy succeeded, Airtable patch failed | Re-check Confirm → Automation 120 or CLI `apply` → `airtable_only_recovery` |
| Idempotent re-run after success | `skipped_already_named`; Confirm clears |
| Automation fires twice | Idempotent — no second copy when destination exists or key already matches |

---

## Production activation checklist (Mike)

### Phase A — Schema (Production Airtable UI)

- [ ] Add **Confirm S3 Video Rename** checkbox on **Video Feedback**
- [ ] Optional: add **Previous Storage Key** + **Renamed At** on **Submission Assets**

### Phase B — Lambda deploy

- [ ] Merge PR to `master`
- [ ] Deploy `127si-upload-asset` with `fut009_service.py` + handler route
- [ ] Confirm Function URL serves `POST /fut009/rename` (same `UPLOAD_WEBHOOK_SECRET` as upload)

### Phase C — Automation 120

- [ ] Create automation **120 - Video Review and XP - Apply FUT-009 S3 Video Rename**
- [ ] Trigger: Video Feedback · Confirm S3 Video Rename checked · Custom name valid · Submission Asset linked
- [ ] Paste script from [`120-v1.0-fut009-s3-video-rename-paste-packet.md`](./120-v1.0-fut009-s3-video-rename-paste-packet.md)
- [ ] Input variables: `recordId`, `lambdaRenameUrl`, `uploadWebhookSecret`, optional `includeAuditFields`
- [ ] Leave automation **OFF** until disposable test passes

### Phase D — Controlled Production test (disposable record)

- [ ] Identify disposable video Submission Asset + linked Video Feedback (test enrollment only)
- [ ] Set Custom Video File Name + check Confirm S3 Video Rename
- [ ] Enable Automation 120; verify run → `actionOut=renamed`
- [ ] S3: destination object exists at Option D key; **old object still exists**
- [ ] Airtable: Storage Key + Canonical File URL updated; Original File Name unchanged
- [ ] Reviewer File URL unchanged; viewer GET serves new file
- [ ] Re-check Confirm → `skipped_already_named`; Confirm clears
- [ ] Evidence in `docs/testing/evidence/fut-009/`

### Phase E — Verification (display paths)

- [ ] **Before rename:** Custom Video File Name appears in website game log and email payloads (FUT-008 / 072 v4.9.1 / 073 v4.5 / 074 v3.5 + Communications Hub PR #47)
- [ ] **After rename:** Display unchanged; Storage Key + Canonical File URL updated
- [ ] Reviewer File URL unchanged; viewer GET serves renamed object
- [ ] Re-check Confirm → `skipped_already_named`; Confirm clears

### Rollback / recovery

- [ ] Disable Automation 120
- [ ] Old S3 object retained — manual revert: patch Storage Key back to **Previous Storage Key** if audit field populated
- [ ] CLI `apply --confirm-rename` for single-record recovery

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
node airtable/automations/shooting-challenge/lib/fut009-rename-handoff.test.js
cd lambda/upload-asset && python -m pytest tests/test_fut009_rename.py tests/test_fut009_handler.py tests/test_fut007_basename.py -q
```

---

*No Production S3, Airtable, Lambda deploy, or automation enable is performed by merging this documentation alone.*
