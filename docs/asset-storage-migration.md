# Asset storage migration — AWS + canonical URLs

**Status:** V2 architecture decision — **C-013 PROD video complete; DEV homework PASS; C-023 Stage 1 alignment in progress**. **Blocks:** reliable 2026–27 season without personal Google Drive dependency.
**Tracked as:** [close-out-considerations.md](./close-out-considerations.md) **C-013** (updated)  
**Execution checklist:** [deploy-checklists/C-013-wave7-asset-storage-checklist.md](./deploy-checklists/C-013-wave7-asset-storage-checklist.md)  
**DEV probe:** `tools/airtable/_probe_c013_asset_storage_fields.py`  
**Last updated:** 2026-07-12

---

## Why this exists

Two related problems from 2025–26:

1. **Airtable attachment limit** — files copied into Airtable (009, headshots, homework) filled storage; deleting early assets broke history.
2. **Google Drive dependency** — the Upload Asset Engine today writes to a personal/shared Drive folder. That access will **not** remain available after retirement (no free ongoing Drive folder).

**V2 target:** durable object storage the program owns, with **one canonical HTTPS URL per file** used everywhere — as if that URL *is* the asset.

---

## Two principles (non-negotiable)

### 1. Canonical object storage (AWS)

All long-lived binaries live in **program-owned cloud storage** — default **AWS S3** (see recommendation below). Not Airtable attachments. Not a personal Google Drive account.

**In scope:**

| Asset type | Examples |
|------------|----------|
| Homework files | PDFs, images from Fillout intake |
| Video uploads | Athlete submission videos |
| Headshots | Leaderboard, tutorials, public display |
| Coach feedback attachments | If stored as files (not only text) |
| HW17 / quiz exports | PDF path (see C-009) |

**Airtable holds:** metadata, status, record links, and **the canonical URL** — not the file bytes.

### 2. URL is the asset (single source of truth)

After upload completes, **every** consumer treats the stored **HTTPS URL** exactly as the asset itself:

- Coach views and filters
- Automations (020, 013, 070, 022, 071, 072, 074)
- Make scenarios (read URL for emails; do not re-fetch from attachments)
- Web app (`/shoot` leaderboard, tutorials, public display)
- Audits and backfills
- Parent-facing emails and links

**Rules:**

| Rule | Meaning |
|------|---------|
| **One URL field wins** | Provider-neutral name recommended: `Canonical File URL` (migrate from `Google Drive File URL`) |
| **No dual truth** | Do not gate on `Airtable Attachment` after upload; gate on `Canonical File URL` + `Upload Status = Uploaded` |
| **Clear attachments** | Deferred migration step after successful canonical writeback is proven; **not authorized by C-023 Stage 1** |
| **Same URL everywhere** | Email href, web `img src`, coach link, audit checks — identical string |
| **No Drive-specific logic in app layer** | Storage backend may change; URL contract does not |

---

## Recommended stack

| Piece | Choice | Notes |
|-------|--------|-------|
| **Object store** | **Amazon S3** | Standard, durable, low cost at youth-sports scale; Make has S3 modules |
| **Public reads (headshots)** | **CloudFront** in front of S3 | Stable CDN URLs; cache images for leaderboard |
| **Private reads (homework/video)** | S3 private bucket + **presigned URLs** OR CloudFront signed URLs | Coach/parent links expire; no public bucket listing |
| **Upload path** | Fillout → brief intake → **Make Upload Engine** → S3 | Replace Drive upload step in blueprint |
| **Metadata** | Airtable `Submission Assets`, `Enrollments`, etc. | URL + optional `Storage Key`, `Bucket`, `Uploaded At` |

**Alternatives considered:** Cloudflare R2 (S3-compatible, cheaper egress) is viable if AWS complexity is unwanted; same URL-canonical rules apply. **Default recommendation: S3** unless ops preference says otherwise.

---

## Current vs target flow

### Today (broken at scale)

```
Fillout → Submissions attachments          ← copy #1
    → 009 → Submission Assets attachment     ← copy #2
    → 070a/070b → Make → personal Google Drive
    → 022 writeback → Google Drive File URL (sometimes)
    → attachments often NOT cleared
    → web headshots still read Airtable Attachment field
```

### Target (2026–27)

```
Fillout → transient intake only (optional one-hop)
    → Make Upload Engine → S3 (canonical object)
    → writeback: Canonical File URL (+ storage key metadata)
    → clear all Airtable attachment fields on success
    → every gate, view, email, web read uses Canonical File URL only
```

---

## Upload completion response modes

The Make-to-Airtable handoff has two valid modes. Both end at the same canonical writeback contract, but only one requires 070c.

| Mode | Make response | Sender behavior | 070c |
|------|---------------|-----------------|------|
| **Synchronous completion** | Complete Lambda JSON after S3 + Airtable writeback | Validate final result; handle trigger as verified success | **Not required** |
| **Asynchronous handoff** | Plain-text `Accepted` while Lambda continues | Return pending; retain trigger; do not claim upload success | **Required** to verify final writeback |

**Current evidence:**

- DEV homework PASS: 070a → DEV Make → DEV Lambda → S3 → Airtable, with synchronous Lambda JSON from Make Module 16 (`{{14.data}}`). **070c was not required.**
- PROD video PASS: 070b received async `Accepted`; 070c v1.1 verified writeback idempotently.

For async homework in the future, 070c (or an approved destination-neutral successor) must not be filtered to Video Feedback only. For synchronous homework, adding 070c is unnecessary and must not be treated as a completion gate.

The final writeback contract in either mode is: Upload Status, Canonical File URL, Storage Key, File Content Hash, File Hash Algorithm (`SHA-256`), and Uploaded At.

---

## C-023 content-hash review contract

SHA-256 is computed in Lambda after download and before S3 PutObject. Filename, title, URL, or Storage Key is not a content-identity key.

- A hash match may create a Needs Review signal for same-enrollment contextual reuse.
- The valid upload continues.
- Every successful new asset receives a new S3 object, Storage Key, and Canonical File URL.
- The system does not automatically reuse or delete objects.
- Mike/OMNI makes the final review decision.
- Attachment clearing and Drive retirement are separate, deferred migration work.

Implementation and rollback detail: [C-023 Stage 1 guide](./deploy-checklists/C-023-implementation-guide-stage1.md).

---

## Touchpoints (must all switch to URL)

| Area | Today | Target |
|------|-------|--------|
| **Make** | `upload-asset-engine-v1/v2` → Google Drive | S3 put + public or presigned URL writeback |
| **Airtable fields** | `Google Drive File URL`, `Airtable Attachment` gates | `Canonical File URL`; deprecate attachment gates |
| **009** | Copies file into attachment | Create asset row; optional temp URL only; no permanent attachment |
| **020, 013** | Require attachment not empty | Require intake complete OR temp URL; after upload require canonical URL |
| **070a, 070b** | Send to Make; legacy duplicate assumptions | Lambda SHA-256 detection + contextual Needs Review; sender does not compute hash |
| **070c** | Async writeback verifier for proven video path | Required only after async `Accepted`; destination-neutral if used for homework |
| **022** | Sync Drive writeback | Sync canonical URL fields |
| **Formulas** | `Upload Ready?` uses attachment | `Upload Ready?` uses URL + status |
| **Enrollment headshot** | `Athlete Headshot` attachment | `Athlete Headshot URL` (or canonical URL on Athletes) |
| **Web** | `mapAttachments(Athlete Headshot)` | Read URL field directly (`leaderboard.ts`, `tutorials.ts`) |
| **Audits** | May assume attachment present | Assert URL + Uploaded status |
| **C-009 HW17** | Quiz path skips file pipeline | PDF → same S3 pipeline as other homework |

Detail: [make/documentation/upload-asset-engine.md](../make/documentation/upload-asset-engine.md) · [homework-flow.md](./data-flow/homework-flow.md) · [upload-workflow-homework-video.md](./upload-workflow-homework-video.md)

---

## Pre-upload naming (video — accepted 2026-07-06)

Before **070b** sends to Make, each video **Submission Asset** must have a **Formatted Upload Name** (today: **Create Google Drive File Name** formula) built from:

- Athlete name
- Activity date
- Submission-level **Video Feedback Focus**
- **Asset Sequence** (1–3)

**Upload Naming Status** (formula on asset) gates **Ready to Send to Make?** for video — coach does **not** need to watch first to name. **Coach Video Title** on **Video Feedback** is optional post-review display (C-022).

Homework naming continues to use assignment + slot + sequence in the existing formula path.

---

## Implementation phases (before May 2027)

| Step | Work |
|------|------|
| 1 | AWS account, bucket(s), IAM, CloudFront (public headshots path) |
| 2 | Document field rename / add (`Canonical File URL`, headshot URL on Enrollment) |
| 3 | Rewrite Make Upload Engine: S3 upload + URL writeback |
| 4 | Update automations 009, 020, 013, 022, 070a/b — gates and post-upload attachment clear |
| 5 | Update formulas and coach views |
| 6 | Web: headshot from URL field |
| 7 | Migration: existing Drive URLs → copy to S3 or redirect policy for 2025–26 archive base only |
| 8 | Audits: `audit-stuck-upload-processing`, field coverage — URL-based |

**Nothing in production Airtable until explicitly approved** (same as other V2 phases).

**Stage 1 safety:** No attachment, Airtable record, or S3 object deletion; no automatic S3 reuse; no upload blocking.

---

## Relation to four-layer architecture

| Layer | Role |
|-------|------|
| **Engine** | Upload status ladder, one asset row per file, URL writeback contract ([03-business-rules.md](./v2/03-business-rules.md)) |
| **Configuration** | Bucket names, path prefixes per season/program (not in engine doc) |
| **Content** | The files themselves in S3 |
| **Presentation** | Web and emails **display** using canonical URLs |

---

## Related items

| ID | Topic |
|----|--------|
| **C-013** | Parent tracking row — updated for AWS |
| **C-009** | HW17 must join file/URL pipeline |
| **C-012** | Stage K — field ownership for URL vs attachment fields |
| Master direction **Phase 6** | Scalability — asset storage |
