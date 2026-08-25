# 022 / 072 / 073 — secure video URL paste package (Mike)

**Status:** Repository Ready for PROD Paste — **not** Installed / Live Tested / Complete for these versions until Mike pastes + controlled proof  
**Canonical checklist:** `docs/deploy-checklists/022-v2.2-secure-video-url-pipeline.md`  
**Do not** make S3 public. Parent links must be Lambda viewer URLs only.

## Versions

| Automation | Paste file | GitHub version | PROD before paste (CURRENT-TRUTH) |
|------------|------------|----------------|-----------------------------------|
| **022** | `docs/deploy-checklists/022-v2.2-PASTE.txt` | **v2.2** | **v2.1** |
| **072** | `docs/deploy-checklists/072-v4.8-PASTE.txt` | **v4.8** | **v4.7** (weekly E2E live-tested) |
| **073** | `docs/deploy-checklists/073-v4.4-PASTE.txt` | **v4.4** | **v4.3** |

## Paste order (literal)

1. Paste **022 v2.2** into existing Run script (skip GitHub header / use PASTE.txt).
2. Confirm input `recordId` = triggering **Submission Assets** record ID (dynamic).
3. Paste **072 v4.8** if weekly emails must omit unsafe video links immediately.
4. Paste **073 v4.4** before the next parent video-feedback send.
5. Do **not** touch queue proof `recoikFrli3m0xDRa` or historical WAS `reczxTIpVI8ZJLex0`.

## Pre-paste repair (if Reviewer URLs missing)

1. Extension `repair-missing-reviewer-access-tokens.js` with `DRY_RUN = true`.
2. Batched `CONFIRM_WRITE = true` until remaining = 0.
3. Re-trigger **022** on repaired assets.
4. CLI dry-run: `python tools/airtable/repair_missing_reviewer_tokens.py --dry-run`

## Controlled proof (after paste)

1. Test Mode on; Mike allowlist only; **disposable** Video Feedback only.
2. Confirm VF URL is Lambda viewer (not S3).
3. Run **073** → one Email Handoff Queue row → **079** → Hub → Resend.
4. Email contains working Lambda link; **no** direct S3 URL.
5. Replay → no duplicate.
6. Clean up only newly created disposable rows after evidence capture.

## Expected AWS behavior

| URL type | Expected |
|----------|----------|
| Lambda Reviewer URL | 302 → short-lived presigned S3 |
| Canonical direct S3 | **403 AccessDenied** (correct) |
| Missing Reviewer URL | 022 withholds; 072 omits; 073 blocks |

## Evidence fields before promoting status

| Field | Value |
|-------|-------|
| 022 / 072 / 073 paste dates | |
| Disposable VF ID | |
| Queue / Hub / Resend IDs | |
| Parent URL shape | Lambda only |
| Replay duplicate? | No |
