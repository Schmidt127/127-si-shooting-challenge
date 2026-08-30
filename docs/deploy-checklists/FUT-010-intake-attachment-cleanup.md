# FUT-010 — Delete Airtable intake attachments after verified S3 upload

**Backlog:** FUT-010 (P1)  
**Status:** **Built in repository — Production apply pending Mike approval**  
**Systems:** Submission Assets, Homework Completions, Video Feedback, AWS S3, Lambda viewer  
**Related:** C-013 Wave 7 Slice 4 (H4 attachment clear), SC-095, SC-096, SC-099, SC-100 (deferred broader retirement)

---

## Summary

After a homework-route or video-route intake file is durably stored in S3 and writeback fields verify, remove **only** `Submission Assets.Airtable Attachment` contents. The Airtable record, Storage Key, Canonical File URL, Reviewer fields, child links, XP, and the S3 object remain intact.

**In scope:** `Submission Assets.Airtable Attachment` for rows with `Upload Destination = Homework Completions` (homework-route) or `Video Feedback` (video-route).

**Out of scope:** legacy `Homework Completions.Airtable Attachment` (direct HC-level attachment from v3.6 backfill era). HC rows read durable files via linked Submission Asset lookups after upload. A separate future item is required for HC-level attachment retirement.

This is **not** Google Drive cleanup. The intake attachment is transient; S3/Lambda is durable application storage.

---

## Architecture decision

| Option | Decision |
|--------|----------|
| Extend **070c** with destructive delete | **Rejected** — 070c is video-only trigger verification; mixing delete into upload hot path increases blast radius |
| New **070d** automation (immediate per-record) | **Deferred** — ship controlled worker first |
| **Separate worker** (CLI + extension script) | **Selected** — dry-run, reconciliation, batch limits, explicit Mike authorization |

Post-upload cleanup runs **after** successful upload verification. It cannot interfere with 070a/b/c or Lambda claim/writeback.

---

## Field contract (Submission Assets)

| Field | Role in FUT-010 |
|-------|-----------------|
| **Airtable Attachment** | **Delete target** — set to `[]` only after verification passes |
| **Upload Status** | Must be `Uploaded` |
| **Storage Key** | Required; must start with `shooting-challenge/` |
| **Canonical File URL** | Required HTTPS; private-bucket probe (403/401 expected) |
| **Writeback Complete?** | Must be checked (formula) |
| **File Content Hash** / **File Hash Algorithm** | Required (`SHA-256`) per 070c writeback contract |
| **Uploaded At** | Required |
| **Upload Error** | Must be blank |
| **Send to Make Trigger** | Must be **unchecked** (upload not in flight) |
| **Reviewer File URL** | **Video only** — must classify as `valid_lambda_viewer` |
| **Upload Destination** | `Homework Completions` or `Video Feedback` |

**Never modified:** record ID, Storage Key, Canonical File URL, Reviewer Access Token, child links, XP links, review status.

---

## Airtable write/delete operation

**Single permitted write per eligible record:**

```json
{
  "fields": {
    "Airtable Attachment": []
  }
}
```

- REST: `PATCH /v0/{baseId}/Submission%20Assets/{recordId}`
- Script API: `assetsTable.updateRecordAsync(recordId, { "Airtable Attachment": [] })`
- Empty array clears all attachment blobs; the row is preserved
- **No** `DELETE` on records; **no** S3 `DeleteObject`

---

## Repository artifacts

| Path | Purpose |
|------|---------|
| `lib/intake-attachment-cleanup/intake-attachment-cleanup.js` | Shared pure verification + decision helpers |
| `lib/intake-attachment-cleanup/intake-attachment-cleanup.test.js` | 15 offline contract tests |
| `tools/airtable/fut_010_intake_attachment_cleanup.py` | CLI: preflight, dry-run, reconcile, apply |
| `tools/airtable/tests/test_fut_010_intake_attachment_cleanup.py` | Python unit tests (no live AWS/Airtable) |
| `airtable/extension-scripts/safe-backfills/fut-010-clear-intake-attachments.js` | In-base extension batch (DRY_RUN default) |

---

## Production authorization (Mike-only)

Destructive cleanup is **blocked by default** at three layers:

1. **CLI:** `apply` refuses without `--confirm-delete`; `apply` uses reconcile filter unless `--record-id` is supplied; non-404 AWS HeadObject errors skip per record
2. **Extension:** `DRY_RUN=true`, `CONFIRM_DELETE=false`, `VERIFY_S3_OBJECT_EXISTS=false` by default — `VERIFY_S3_OBJECT_EXISTS=false` cannot delete
3. **Shared contract:** `s3ObjectExists === true` and `canonicalUrlReachable === true` required (undefined fails closed)
4. **Human gate:** Mike must approve dry-run report and sign formula attestation before any apply

**No agent may run `apply` or set `CONFIRM_DELETE=true` on Production without Mike's explicit approval for that run.**

---

## Mike-only production checklist

### Phase 0 — Prerequisites (before any delete)

- [ ] C-013 upload path live for homework (**070a**) and video (**070b** + **070c**)
- [ ] Run `python fut_010_intake_attachment_cleanup.py preflight` and review `formulaPipelineSafety` output
- [ ] **Mike attestation (required):** sign off that Production formulas/views/interfaces do not require `Submission Assets.Airtable Attachment` on `Uploaded` rows — or formulas are patched first
- [ ] AWS credentials available for `s3:HeadObject` on `shooting-challenge-assets` (read-only)

### Phase 1 — Dry-run (required first)

```bash
cd tools/airtable
python fut_010_intake_attachment_cleanup.py preflight
python fut_010_intake_attachment_cleanup.py dry-run --limit 50 --output _preview/fut-010-dry-run.json
python fut_010_intake_attachment_cleanup.py reconcile --limit 100 --output _preview/fut-010-reconcile.json
```

- [ ] Mike reviews JSON report: eligible, skipped, verification failures
- [ ] Spot-check 2 homework + 2 video rows: S3 object exists, Reviewer URL works, attachment still present
- [ ] **Mike signs off on dry-run report** (date + record count)

### Phase 2 — Pilot apply (single record)

```bash
python fut_010_intake_attachment_cleanup.py apply \
  --confirm-delete \
  --record-id recXXXXXXXXXXXXXX \
  --output _preview/fut-010-pilot-apply.json
```

- [ ] Attachment cleared on pilot record only
- [ ] Storage Key, Canonical URL, Reviewer URL unchanged
- [ ] S3 object still present (`aws s3api head-object --bucket shooting-challenge-assets --key "<Storage Key>"`)
- [ ] Parent/coach link still works (video: Lambda viewer; homework: reviewer or asset lookup path)
- [ ] Re-run dry-run on same record → `skipped_already_empty`

### Phase 3 — Batch apply

```bash
python fut_010_intake_attachment_cleanup.py apply --confirm-delete --limit 25
```

- [ ] Repeat in batches until reconcile report shows zero eligible rows
- [ ] Optional: extension script for stragglers (`fut-010-clear-intake-attachments.js`) with `VERIFY_S3_OBJECT_EXISTS=true`

### Phase 4 — Closeout

- [ ] Update `CHANGELOG.md` under `### Airtable`
- [ ] Mark FUT-010 **Complete** in `docs/127-SI-MASTER-FUTURE-WORK-LIST.md`
- [ ] Archive apply JSON under `tools/airtable/_preview/`

---

## Rollback guidance

**Attachment bytes cannot be restored from Airtable after delete.**

| Situation | Action |
|-----------|--------|
| Deleted too early (S3 missing) | Restore from backup upload; do **not** re-trigger 070a/b without duplicate guards |
| Deleted correctly | No rollback needed — S3 + metadata are source of truth |
| Wrong record | S3 object intact; re-link or re-import file only if business requires intake copy |

---

## Test commands (offline — safe in CI)

```bash
node lib/intake-attachment-cleanup/intake-attachment-cleanup.test.js
cd tools/airtable && python -m unittest tests.test_fut_010_intake_attachment_cleanup
node airtable/automations/shooting-challenge/lib/upload-make-lambda-response.test.js
```

---

## Formula and pipeline safety (offline analysis + Mike attestation)

`preflight` emits `formulaPipelineSafety` documenting expected post-clear behavior. This cannot be fully proven offline against live Production formulas.

| Field | Depends on attachment? | Expected after clear | Re-upload / duplicate risk |
|-------|------------------------|--------------------|---------------------------|
| **Upload Ready?** | Yes | `0` | **Low** — 070a/b use `alreadyUploadedCanonical` (Canonical URL or Uploaded+Storage Key), not Upload Ready? |
| **Ready to Send to Make?** | Yes | `"Missing: Airtable Attachment"` | **Low** — FUT-010 requires trigger unchecked; 070a/b duplicate guard blocks re-upload |
| **Why Not Ready for Make?** | Yes | missing-attachment message if trigger rechecked | **Low** — informational only |
| **Workflow Next Step** | Yes | `"Missing Airtable Attachment"` | **Low** — informational formula |
| **Upload Status** | No | unchanged | **None** |
| **Writeback Complete?** | No | unchanged when S3 fields populated | **None** |
| **Canonical File URL** | No | unchanged | **None** |
| **Storage Key** | No | unchanged | **None** |
| **Reviewer File URL** | No | unchanged (token formula) | **None** |

**Reprocessing guards (confirmed in repo):**

- **070a/070b:** `alreadyUploadedCanonical` → `skipped_already_uploaded` when Canonical URL or Uploaded+Storage Key present
- **070c:** writeback verification only; no upload or delete
- **022:** triggers on Upload Status change, not attachment presence
- **020/013:** child creation is pre-link; FUT-010 runs only on Uploaded + writeback complete rows

**Mike attestation (copy into promotion record):**

> I confirm Production formulas/views/interfaces do not require Submission Assets.Airtable Attachment on Uploaded rows for operational workflows, or I have patched those formulas first.

---

## Formula dependency warning

Several Submission Assets formulas still reference `Airtable Attachment` (e.g. `Ready to Send to Make?`, `Upload Ready?`). **Do not run Production cleanup until Mike confirms formulas tolerate empty attachment on `Uploaded` rows**, or patches those formulas first. See C-013 Wave 7 Slice 4 (H4).

---

## Dry-run executed 2026-08-30

**Agent run (MRW-C10):** Production read-only preflight + dry-run + reconcile. **No apply, no `--confirm-delete`.**

| Artifact | Path |
|----------|------|
| Evidence report | [`docs/testing/evidence/FUT-010-DRY-RUN-2026-08-30.md`](../testing/evidence/FUT-010-DRY-RUN-2026-08-30.md) |
| Preflight JSON | [`tools/airtable/_preview/fut-010-preflight-2026-08-30.json`](../../tools/airtable/_preview/fut-010-preflight-2026-08-30.json) |
| Dry-run JSON (limit 50) | [`tools/airtable/_preview/fut-010-dry-run-2026-08-30.json`](../../tools/airtable/_preview/fut-010-dry-run-2026-08-30.json) |
| Reconcile JSON (limit 100) | [`tools/airtable/_preview/fut-010-reconcile-2026-08-30.json`](../../tools/airtable/_preview/fut-010-reconcile-2026-08-30.json) |

**Results summary:** 0 eligible rows; 27 verification failures + 23 ineligible (dry-run); 24 reconcile candidates all failed Storage Key format check. AWS credentials were not present in the agent environment — S3 HeadObject was not reached. Mike attestation and AWS creds required before pilot apply.

---

## DEV / agent restrictions

- **Do not** run `apply --confirm-delete` against Production from agent work
- **Do not** delete live attachments during development
- Use offline tests and mocked HeadObject probes only
