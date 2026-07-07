# Asset storage migration — AWS + canonical URLs

**Status:** V2 architecture decision (planning). **Blocks:** reliable 2026–27 season without personal Google Drive dependency.  
**Tracked as:** [close-out-considerations.md](./close-out-considerations.md) **C-013** (updated)  
**Last updated:** 2026-07-03

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
| **Clear attachments** | After successful upload, clear intake/submission/asset attachment fields (transient only) |
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

## Touchpoints (must all switch to URL)

| Area | Today | Target |
|------|-------|--------|
| **Make** | `upload-asset-engine-v1/v2` → Google Drive | S3 put + public or presigned URL writeback |
| **Airtable fields** | `Google Drive File URL`, `Airtable Attachment` gates | `Canonical File URL`; deprecate attachment gates |
| **009** | Copies file into attachment | Create asset row; optional temp URL only; no permanent attachment |
| **020, 013** | Require attachment not empty | Require intake complete OR temp URL; after upload require canonical URL |
| **070a, 070b** | Send to Make; duplicate check on Drive ID | Duplicate check on storage key / URL |
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
