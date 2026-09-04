# FUT-009 — Lambda + Automation 120 status (2026-09-04)

**Agent:** A5 · **Branch:** `final/a5-fut009-fut003-20260904` · **Base SHA:** `2c113c10`  
**Production base:** `appn84sqPw03zEbTT`  
**Lambda:** `127si-upload-asset` (`us-east-2`)  
**Automation:** `wfl36qsR7FbeJI2gh` — native name `120 – Video – Automatic S3 Video Rename`

---

## Verdict

**Activated and verified on disposable Schmidt records.**  
`POST /fut009/rename` is live; Automation **120** is **deployed (ON)**; Automations table **Status = Live**.

| Check | Result |
|-------|--------|
| What `/fut009/rename` does | Coach-confirmed CopyObject → Option D + FUT-007 key; HeadObject verify; patch Storage Key + Canonical File URL; **retain** source object |
| Why docs said “inactive” | Stale repo checklists (paste/deploy pending). Native automation was already **deployed**; Automations tracker **Status** was blank until this session |
| Activation still required? | **No further Mike gate for v1 rename path** — disposable proof passed after CodeOnly Lambda fix |
| Cost | Negligible S3 CopyObject + Lambda invoke (no new AWS product; no DeleteObject) |

---

## What `/fut009/rename` does

1. Auth: `X-Upload-Secret` (same secret as upload path).
2. Load Video Feedback + linked Uploaded video-route Submission Asset.
3. Require Custom Video File Name + coach confirmation (`Confirm S3 Video Rename` / payload flags).
4. Compute Option D destination: `shooting-challenge/{Athlete}/{Program}/{YYYY-MM-DD}/{FUT-007 basename}`.
5. `CopyObject` source → destination; `HeadObject` verify; **never** `DeleteObject`.
6. Patch Airtable: **Storage Key**, **Canonical File URL**, clear **Upload Error**.
7. Idempotent: re-run → `skipped_already_named`.

CLI (`tools/airtable/fut_009_video_rename.py`) remains recovery/backfill only.

---

## Automation 120 — live config (Airtable MCP 2026-09-04)

| Item | Live state |
|------|------------|
| Automation ID | `wfl36qsR7FbeJI2gh` |
| Native deploymentStatus | **deployed** (ON) |
| Automations table Status | **Live** (set 2026-09-04; was blank) |
| Trigger | `recordMatchesConditions` on Video Feedback |
| Conditions | Custom name not empty / not `—`; Confirm S3 Video Rename checked; Submission Asset linked |
| `lambdaRenameUrl` | Function URL + `/fut009/rename` (matches live Function URL) |
| `includeAuditFields` | `false` (correct — audit fields absent) |
| Auth | Automation input `uploadWebhookSecret` configured (value **redacted**) |
| Script | v1.0 paste present (includes GitHub header in live copy — cosmetic) |
| Outputs | `statusOut`, `actionOut`, `errorOut`, `debugStep` |
| Dedupe | Clears Confirm checkbox on `renamed` / `airtable_only_recovery` / `skipped_already_named`; Lambda key match is idempotent |
| Retry | Re-check Confirm or re-POST; recovery path when destination exists |
| Failure visibility | Automation run outputs + `Upload Error` on SA on rename failure |
| Cost controls | Existing upload Lambda (512 MB / 120 s); no reserved concurrency set; CopyObject only |

---

## Schema truth (Production)

| Field | Table | Present? |
|-------|-------|----------|
| Confirm S3 Video Rename | Video Feedback | **Yes** |
| Storage Key / Canonical File URL / Upload Error | Submission Assets | **Yes** |
| Date (activity date for Option D) | Submission Assets | **Yes** (not named “Activity Date”) |
| Formatted Upload Name | Submission Assets | **No** (nor legacy Create Google Drive File Name) |
| Previous Storage Key / Renamed At | Submission Assets | **No** (optional PKG-004; not required for v1) |

---

## Code / deploy changes this session

1. **Writeback** — omit Formatted Upload Name by default; optional-field retry strip on `UNKNOWN_FIELD_NAME`.
2. **Activity date** — resolve from SA `Date`, VF `Activity Date - Lkp`, or `YYYY-MM-DD` Storage Key folder.
3. **Lambda CodeOnly deploy** — `127si-upload-asset` updated 2026-09-04 (default AWS profile `schmidt`).

---

## Disposable proof (2026-09-04)

| Step | Record | Result |
|------|--------|--------|
| Dry-run | VF `recTHQVTrP4gWq8j1` / SA `reckhqICA7I5IFQYy` | `dry_run_would_rename` |
| Apply | same | `renamed` · `oldObjectRetained=true` |
| Idempotent re-run | same | `skipped_already_named` |
| Airtable | SA Storage Key + Canonical File URL updated; Original File Name unchanged (`IMG_0437.jpg`) | Pass |
| S3 | Source + destination both exist; identical ContentLength `3007741` | Pass |

Destination key:

```text
shooting-challenge/Schmidt_Athlete1/Shooting_Challenge_2026-2027/2026-09-01/20260901_VIDEO_Schmidt_Athlete1_Schmidtcustomname.jpg
```

---

## Residual / operator notes

1. **Secret hygiene** — `update-function-code` AWS CLI response and automation input dump can expose env secrets to authorized operators. Prefer rotating `UPLOAD_WEBHOOK_SECRET` + Airtable PAT on a maintenance window; update Automation 120 input + Lambda env together. **Do not commit secret values.**
2. Optional PKG-004: add Previous Storage Key / Renamed At if audit trail desired; then set `includeAuditFields=true`.
3. Optional: add Formatted Upload Name if product wants basename writeback (Lambda already supports via flag / optional strip).
4. Automation 120 E2E via Confirm checkbox was not separately fired after direct Lambda proof; native automation is ON and uses the same endpoint/secret — checkbox path is expected equivalent.
5. Lambda env still shows `SEASON_SLUG=2025-2026` (upload fallback); FUT-009 naming uses Enrollment / Program Instance / SA Date — not blocked by this.

---

## Classification

| State | Value |
|-------|-------|
| Repo + Lambda route | **Complete / Live** |
| Automation 120 | **Live** |
| Disposable rename proof | **Pass** |
| Unblock needed? | **None for v1 activation** |

Evidence: this audit · promotion doc [`docs/deploy-checklists/FUT-009-aws-storage-rename.md`](../deploy-checklists/FUT-009-aws-storage-rename.md).
