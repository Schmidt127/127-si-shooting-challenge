# Secure Video URL Pipeline — QA Report (2026-08-24)

**Status:** Repository implementation complete — **Production Airtable paste pending (022 v2.2)**

## Root cause

022 v2.1 wrote `Video URL or Drive Link` from `Reviewer File URL`, but **fell back to `Canonical File URL`** when the reviewer formula was blank. Canonical URLs are **private direct S3 object URLs**. Parents received **AccessDenied XML**.

## Automation versions (GitHub)

| Script | Version | Changed |
|--------|---------|---------|
| 022 | **v2.2** | Yes — primary fix |
| 072 | **v4.8** | Yes — weekly email video list |
| 073 | **v4.4** | Yes — parent handoff gate |

## Tests passed (repo)

```text
node lib/secure-video-url.test.js                                    — 13 PASS
node airtable/.../lib/022-child-upload-writeback.test.js             — 9 PASS
node tests/video-feedback/secure-video-url-pipeline.test.js          — 7 PASS
node tests/video-feedback/video-feedback-writeback-complete-contract.test.js — 7 PASS
node tests/email/automation-071-073-source-safety.test.js            — 22 PASS
node tests/was-email-contracts/weekly-summary-email-content.test.js  — PASS
node tests/was-email-contracts/weekly-summary-072-v47-regression.test.js — PASS
lambda/upload-asset: pytest tests/test_viewer.py tests/test_token.py — 18 PASS
```

## AWS / live verification

| Check | Result |
|-------|--------|
| Repair tool dry-run (`repair_missing_reviewer_tokens.py`) | **0 candidates** (no missing tokens in scoped query) |
| Anonymous probe script (`verify-secure-video-url-aws.mjs`) | **Blocked** — Airtable API 403 with current token scope (Mike-authorized prod read required) |
| Historical evidence SC-150 / SC-008 | Prior proof: reviewer URL **302**, canonical S3 anonymous **403** on `recaXBfjeeu3bcm0t` |

## Controlled email verification

**Not run in this session** — requires Mike to paste **022 v2.2** into Production first, then disposable VF + Test Mode + allowlist per deploy checklist.

## Paste bundles

- [`docs/deploy-checklists/022-v2.2-PASTE.txt`](../deploy-checklists/022-v2.2-PASTE.txt)
- [`docs/deploy-checklists/072-v4.8-PASTE.txt`](../deploy-checklists/072-v4.8-PASTE.txt)
- [`docs/deploy-checklists/073-v4.4-PASTE.txt`](../deploy-checklists/073-v4.4-PASTE.txt)

## Remaining work

1. Mike pastes **022 v2.2** → verify input mapping → controlled disposable VF email test.
2. Optional paste **072 v4.8** / **073 v4.4** before next parent-facing sends.
3. Run repair backfill only on assets confirmed missing `Reviewer Access Token` (dry-run first).
4. Old emails may contain obsolete S3 links — controlled resend after repair + 022 writeback.

## Protected records (do not modify)

- Queue proof `recoikFrli3m0xDRa`
- WAS `reczxTIpVI8ZJLex0`
- Existing production delivery evidence
