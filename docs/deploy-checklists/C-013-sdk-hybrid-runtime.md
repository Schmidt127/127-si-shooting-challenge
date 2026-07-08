# C-013 — SDK / hybrid upload runtime (DEV interim)

**Decision date:** 2026-07-08 (Mike)  
**Backlog:** C-013, C-023, C-020 (H2)  
**Environment:** DEV `appTetnuCZlCZdTCT` only  
**Parent:** [C-013-wave7-asset-storage-checklist.md](./C-013-wave7-asset-storage-checklist.md)

---

## Runtime decision (locked)

| Option | Status |
|--------|--------|
| **1 — Fix Make AWS S3 Upload** | **PARKED** — module times out; **no more time** this slice |
| **2 — Lambda (production target)** | **Deferred** — likely longer-term prod runtime; **not required** before next DEV harness proof |
| **3 — SDK / hybrid interim** | **SELECTED** — proceed |

**Rule:** Upload + hash + Airtable writeback run on the **proven SDK path** ([`c013_dev_s3_upload_proof.py`](../../tools/airtable/c013_dev_s3_upload_proof.py)). **Make** may remain **webhook/orchestration only** (receive **070b**-shaped payload → forward to SDK handler). **Do not** use Make **Amazon S3 Upload** for this slice.

---

## Architecture (interim)

```text
C-020 H2 (115 harness)
  → 009 / 013 (intake — unchanged)
  → Submission Asset: Pending Link + attachment
  → [NOT 070b yet] SDK handler processes asset
       OR (later) 070b → Make Custom Webhook → HTTP → SDK handler
  → SDK: download attachment → SHA-256 → S3 PutObject → Airtable writeback
  → Optional C-023: duplicate hash lookup before/after upload (flag policy TBD)
```

| Layer | Role |
|-------|------|
| **Airtable 115 / 009 / 013** | Fillout-shaped intake — unchanged |
| **070a / 070b** | **OFF** until H2 gate passes; then **070b** POSTs v4.1 webhook only |
| **Make (optional)** | Thin scenario: Custom Webhook → HTTP call to SDK endpoint/runner — **no S3 module** |
| **SDK runner** | `c013_dev_s3_upload_proof.py` (extend) or small HTTP wrapper — **authoritative upload runtime** |
| **S3** | `shooting-challenge-assets` (us-east-2) via **boto3** |
| **Airtable writeback** | Submission Assets success contract (§6) |

**Proven baseline:** Manual SDK run on `recBBi80bYuxXifVj` — [proof](../../tools/airtable/_preview/c013-dev-s3-sdk-proof-recBBi80bYuxXifVj.json) · [verify](../../tools/airtable/_preview/c013-dev-s3-sdk-proof-recBBi80bYuxXifVj-verify.json) (`allPass=true`).

---

## Next build target: C-020 **H2** (video harness)

**Order:** **H2 before H1** (homework).

| Test | Pattern | Intake source |
|------|---------|---------------|
| **H2** | Video **1-file** | Clone C-020 Test **F** style; new activity date; **115** v1.3 Video scenario |
| **H1** | Homework 1-file | After H2 gate + **070b** prep — deferred |

**H2 pass criteria (upload slice):**

1. **115** creates Submission + **013** Video Feedback + Submission Asset(s) — same as Wave 6 functional video test.
2. SDK runtime processes **at least one** harness-created video asset (not only manual `recBBi80bYuxXifVj`).
3. Writeback verifier `allPass=true` on that asset:
   - Upload Status = `Uploaded`
   - Canonical File URL, Storage Key, File Content Hash, File Hash Algorithm = `SHA-256`, Uploaded At
   - Upload Error blank
   - Attachment retained
4. **C-023** duplicate lookup **tested** on SDK path (re-upload same bytes → duplicate flags per policy).
5. **009 / 013** behavior unchanged from Wave 6.

---

## Gate — required before enabling DEV **070b**

All must pass on a **harness-origin** video asset (H2), not manual-only proof:

| # | Gate | Status |
|---|------|--------|
| 1 | SDK runtime processes video asset from harness path | **PENDING** |
| 2 | Full writeback contract (canonical, key, hash, algorithm, uploaded at, status, error clear) | **PENDING** (manual SDK PASS only) |
| 3 | C-023 duplicate lookup behavior tested | **PENDING** |
| 4 | Airtable Attachment **not** cleared | **Enforced** |
| 5 | Production **not** touched | **Enforced** |
| 6 | No formula/view/script cutover to Canonical File URL | **Enforced** |
| 7 | **070a / 070b** remain **OFF** until rows 1–3 pass | **Enforced** |

**After gate:** Prep **070b** `makeWebhookUrl` → **hybrid** webhook (Make orchestration → SDK), **DEV URL only**. Then re-run H2 with **070b** ON if desired. **H1** homework after video path stable.

---

## Engineering build sequence (Slice 2b)

| Step | Task | Owner |
|------|------|-------|
| **1** | Extend SDK script: C-023 duplicate lookup (Airtable GET `File Content Hash` match, enrollment scope TBD) | Cursor / Mike |
| **2** | SDK HTTP wrapper or documented Make **Webhook → HTTP** → trigger script (no S3 in Make) | Mike / ops |
| **3** | Run **H2**: new Testing Scenarios Video 1-file row → **115** → SDK on resulting asset | Mike |
| **4** | Save `_preview/c013-dev-h2-sdk-proof-<assetId>.json` + probe verify | Cursor |
| **5** | Document gate PASS; **then** prep **070b** webhook URL (still no Production) | Mike |

**Parked (do not work):** Make **Amazon S3 Upload** module troubleshooting.

---

## Hard stops (unchanged)

- No Production base, scenario, webhook, or automation paste.
- No clearing **Airtable Attachment** after upload.
- No removing **Google Drive** fields.
- No repointing formulas, views, **022**, emails, or web to **Canonical File URL**.
- No secrets in GitHub (AWS creds, PAT, webhook URLs → env / Make only).

---

## Related

| Doc | Topic |
|-----|--------|
| [C-013-wave7-asset-storage-checklist.md](./C-013-wave7-asset-storage-checklist.md) | Wave 7 slices |
| [C-020-testing-scenarios-script-checklist.md](./C-020-testing-scenarios-script-checklist.md) | H2 harness |
| [C-013-make-s3-dev-build-packet.md](./C-013-make-s3-dev-build-packet.md) | Writeback contract |
| [C-013-make-s3-writeback-mapping.md](./C-013-make-s3-writeback-mapping.md) | Field map |
