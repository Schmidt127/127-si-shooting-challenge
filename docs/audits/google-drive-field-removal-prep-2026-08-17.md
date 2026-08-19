# Google Drive field removal — audit + prep (2026-08-17)

**Base:** Production `appn84sqPw03zEbTT` (live MCP schema)  
**Repo work:** Drive dependencies removed from active automation path (GitHub).  
**Hard stop:** Mike performs final Airtable field deletion after reviewing this report. Agents do not delete fields.

## Controlling rules (verified)

| Rule | Status |
|------|--------|
| No Google Drive fields for current Video Feedback parent emails | **073 v4.1** — only `Video URL or Drive Link` |
| No Google Drive fields for current Homework parent emails | **071 v4.1** — only `Reviewer File URL` |
| No Make/Gmail workflow may send email | Hub path (071/073/074/079/117) |
| Asset upload may use Make only if no Drive | Lambda Make template has **no** Drive modules |
| Intended path: Asset → AWS/Lambda/S3 → writeback → HW/VF → Hub email | Live Writeback formulas already Canonical/S3-based |

---

## A. Exact Airtable field deletion list (Mike)

Delete **after** completing §B pre-delete formula retargets and pasting updated automations.

### Submission Assets (`tblhMLKxQK77agtME`)

| Field | Field ID | Type | Proof / notes |
|-------|----------|------|---------------|
| Google Drive File URL | `fldITNuxNt9xphk7j` | url | Removed from 070a/070b/020/022/071/112; Lambda never writes it |
| Google Drive File ID | `fldhx4nDKuzuWQna6` | singleLineText | **BLOCKED until Asset Key formula retargeted** (§B.1) |
| Google Drive Folder ID | `fldqd2ALDtGS6gMqs` | singleLineText | Unused by Lambda / Hub; only legacy Make Drive engine |
| Google Drive Folder URL | `fldxx1m0zTsMfEHfj` | url | Same |
| Google Drive Folder Name | `fldv4Mhw3w84dXdxx` | formula | Name-only; used by legacy Make Drive folder search |
| Create Google Drive File Name | `fldV5480sMm40q0QX` | formula | Name-only; used by legacy Make Drive upload title |

### Homework Completions (`tblv58ppTFDBXb3nv`)

| Field | Field ID | Type | Proof / notes |
|-------|----------|------|---------------|
| Google Drive File ID | `fldwtZbTk3M73OmZx` | singleLineText | 020/022 no longer write |
| Google Drive File URL | `fldGeqboEr8Ihwvjk` | url | Same |
| Google Drive View URL | `fld8Lb7HmxR5MKcIc` | lookup → SA Drive File URL | Delete after SA Drive File URL gone (or retarget first) |
| Google Drive Download URL | `fldH3XEkc4WQrn5Dp` | url | No active writer |
| Google Drive Folder ID | `fldR0yfOU8pCaDMBO` | singleLineText | 020/022 no longer write |
| Google Drive Folder URL | `fldvkVGoJVGTj3AEw` | url | Same |
| Submission Asset: Google Drive File URL (lookup) | `fld6NBbAwicqJ1nhf` | lookup | **Retarget or delete with §B.2** |
| Submission Asset: Google Drive File ID (lookup) | `fldKw0Gj4Hf8qhnGR` | lookup | Same |
| Submitted Asset File Links | `fld71v6s6wYaJ2Umk` | lookup → SA Drive File URL | **Retarget to Reviewer File URL** (§B.2) |
| Submitted Asset File IDs | `fldgGoh56Ck4fTQIE` | lookup → SA Drive File ID | Delete or retarget to Storage Key |

### Video Feedback (`tblOV6pJDxQFBSQ3q`)

| Field | Field ID | Type | Proof / notes |
|-------|----------|------|---------------|
| Google Drive File ID | `fldLRbcq68yn7aTp1` | singleLineText | 022 no longer mirrors; Writeback Complete? already Drive-free |
| Google Drive View URL | `fldw6PfS3oJ9ztRU0` | url | Unused by 073 |
| Google Drive Download URL | `fldBj4pvJj2nZQs0c` | url | Unused by 073 |
| Google Drive Folder ID | `fldJDWXsPcQaH2pA2` | singleLineText | Unused by 073 |
| Google Drive Folder URL | `fldnDfkcdMyZ0ychG` | url | Unused by 073 |

**Not present on live VF:** `Google Drive File URL` (listed in older docs; does not exist in PROD today).

### Config (`tblRB6sh77NxjS568`)

| Field | Field ID | Type | Proof / notes |
|-------|----------|------|---------------|
| Root Google Drive Folder ID | `fldvG7kDIreffetRt` | singleLineText | Legacy Make Drive root only |
| Root Google Drive Folder Link | `fldwRqavjwXbCHzar` | url | Same |

---

## B. Do **not** delete yet — keep / rename / retarget

### Keep (not Drive storage)

| Field | Table | Why |
|-------|-------|-----|
| **Video URL or Drive Link** | Video Feedback | Parent-facing URL written by 022 from Reviewer → Canonical. Name contains “Drive” but it is the live video link field. Rename optional later. |
| **Canonical File URL** | Submission Assets | Private S3 URL; Lambda writeback + Writeback Complete? gate |
| **Reviewer File URL** | Submission Assets | Formula (tokenized Lambda viewer); **071** parent homework links |
| **Storage Key**, hash fields, Uploaded At | Submission Assets | Upload claim / dedupe / writeback |
| **Submission Asset: Reviewer File URL (lookup)** | Homework Completions | Coach/UI friendly; preferred replacement for Drive lookups |

### B.1 Pre-delete: Submission Assets → Asset Key

**Live formula (blocks deleting Google Drive File ID):**

```text
ARRAYJOIN({Submission - Linked}) & "|" & {Google Drive File ID}
```

Field: `fldy8UuxWmHT7WFFJ`

**Recommended replacement (Mike):**

```airtable
ARRAYJOIN({Submission - Linked}) & "|" & RECORD_ID()
```

or (if Storage Key preferred once populated):

```airtable
ARRAYJOIN({Submission - Linked}) & "|" & {Storage Key}
```

No automation script currently keys off Asset Key format (repo grep: schema/docs only).

### B.2 Pre-delete: Homework Completions coach summaries

| Field | Current dependency | Recommended retarget |
|-------|--------------------|----------------------|
| Submission Asset Review Summary (formula) `fldHchlovIaPlGKLk` | Original File Name + **Drive File URL lookup** | Original File Name + **Reviewer File URL lookup** (`fldmPeEfBGiTKjbJq`) |
| Submitted Asset File Links | lookup of SA Google Drive File URL | lookup of SA **Reviewer File URL** |
| Submitted Asset File IDs | lookup of SA Google Drive File ID | delete or Storage Key lookup |

### Already safe (no Drive in live formula)

| Field | Live gate |
|-------|-----------|
| Submission Assets **Writeback Complete?** | Uploaded + Canonical + Storage Key + hash + Uploaded At |
| Video Feedback **Writeback Complete?** | Uploaded + Video Asset Uploaded At |

---

## C. Repo inventory by system

### Active automations — cleaned this session

| Script | Change |
|--------|--------|
| **070a** | Dedupe on Canonical/Storage Key only; Drive skip removed |
| **070b** | Canonical/Storage Key dedupe added (parity with 070a); Drive skip removed |
| **020** | No longer copies Drive fields onto Homework Completions |
| **022 v2.1** | No Drive mirrors to HW or VF; Video URL = Reviewer → Canonical |
| **071 v4.1** | Parent asset URL = Reviewer File URL only |
| **112** | Seeds VF Video URL from Reviewer → Canonical (not Drive File URL) |
| **073** | Already clean (VF Video URL only) |
| **070c / 117 / 079** | No Drive usage |

### Already clean

| Area | Finding |
|------|---------|
| **Lambda** (`lambda/upload-asset/`) | No Google Drive field names; writes Canonical / Storage Key / Reviewer token |
| **Make Lambda upload template** (`upload-asset-engine-lambda-prod-v1.template.json`) | No Drive modules |
| **Web app** | No Drive references |
| **Communications Hub payloads (071/073)** | No Drive fields |

### Legacy / historical (do not block field delete after §B; leave as archive)

| Area | Finding |
|------|---------|
| Make Drive blueprints (`upload-asset-engine-v1.json`, `…-fresh-airtable-v2-base.json`, `…-v2-with-file-hash…`) | Still map Drive fields — **do not use for new uploads**; retire scenarios in Make UI |
| Safe-backfills / old repair scripts | Historical Drive writebacks — one-time archives |
| Schema snapshots under `airtable/schema/snapshots/**` | Historical; do not edit |
| Overnight copies / deploy paste text with Drive | Historical |

---

## D. Mike paste / cutover order

1. Paste **070a / 070b** (Canonical-only dedupe).  
2. Paste **020**, **022 v2.1**, **112**.  
3. Paste **071 v4.1** (if not already live Hub version).  
4. Confirm **073 v4.1** + **079** ON for Hub email.  
5. In Airtable UI: retarget formulas/lookups in §B.  
6. Confirm Make upload scenario is **Lambda-only** (no Google Drive modules; no Gmail).  
7. Smoke: one homework + one video upload → Canonical + Reviewer populated → 022 writeback → Hub handoff.  
8. Delete fields in §A (Drive File ID last, after Asset Key retarget).

---

## E. Validation run (repo)

```text
PASS tests/email/automation-071-073-source-safety.test.js
PASS tests/homework/automation-071-reviewer-file-url.test.js
PASS tests/video-feedback/video-feedback-writeback-complete-contract.test.js
PASS airtable/.../lib/022-child-upload-writeback.test.js
```

---

## F. Explicit non-deletes (prove unused ≠ name contains Drive)

| Candidate | Verdict |
|-----------|---------|
| Video URL or Drive Link | **KEEP** — active parent video URL |
| Reviewer File URL | **KEEP** — active homework parent URL |
| Canonical File URL | **KEEP** — S3 private URL + writeback gate |
| Create Google Drive File Name | **DELETE after** Make Drive retirement (formula does not reference Drive ID/URL fields; only naming) |
