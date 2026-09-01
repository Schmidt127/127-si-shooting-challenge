# FUT-009 — AWS Storage Structure and Corrected-Video Naming Workflow

**Status:** Brief ready (Phase 2) — **do not implement** bucket changes, Lambda deploy, S3 apply, schema paste, or rename automation from this document alone  
**Canonical ID:** **FUT-009**  
**Date:** 2026-09-01  
**Base SHA:** `c676ca99` (`origin/master`)  
**Branch:** `cursor/fut-009-aws-storage-brief-e772`  
**Related:** FUT-007 (basename grammar — spec ready) · FUT-008 (Custom Video File Name — COMPLETE) · FUT-010 (attachment cleanup worker — built) · FUT-040 (automatic S3 migration + headshots — brief ready) · SC-094 · SC-096 · SC-150 · C-013 · [FUT-007-AWS-MEDIA-NAMING-SPEC.md](./FUT-007-AWS-MEDIA-NAMING-SPEC.md) · [FUT-040-AUTOMATIC-S3-MIGRATION-BRIEF.md](../s3-migration/FUT-040-AUTOMATIC-S3-MIGRATION-BRIEF.md) · [upload-workflow-homework-video.md](../../upload-workflow-homework-video.md) · [lambda/upload-asset/README.md](../../../lambda/upload-asset/README.md) · [127-SI-MASTER-FUTURE-WORK-LIST.md](../../127-SI-MASTER-FUTURE-WORK-LIST.md) § FUT-009

---

## 1. Problem statement

Shooting Challenge stores homework, video feedback, and (future) registration headshots in a **private S3 bucket** (`shooting-challenge-assets`) with **Lambda-mediated upload and viewer access** (SC-094, SC-096, SC-150). Object keys and folder prefixes evolved across SDK proof, SC-009 live homework, and the current Lambda builder — while **FUT-010 verification** still expects a different prefix shape than **today's live Lambda output**.

**FUT-008** added **Custom Video File Name** on Video Feedback for parent/coach-readable labels. Coaches may set the name **before** upload (FUT-007 pre-upload gate) or **after** review during correction. **FUT-009** owns:

1. **Bucket / folder / key layout** — normalize prefix strategy, asset-type separation, legacy coexistence.  
2. **Post-review corrected-video rename** — when Mike sets Custom Video File Name after the file is already on S3, safely apply the FUT-007 basename to storage without breaking Reviewer URLs, XP, VF links, or parent emails.

**Hard rules (from Master Future Work List):**

- S3 bucket stays **private** — no public bucket policy, no anonymous reads.  
- **Lambda viewer architecture** preserved (`GET /file/{recordId}?token=` → presigned redirect).  
- **No duplicate XP**, duplicate Video Feedback rows, or broken parent links.  
- **Never delete S3 objects** as part of rename or cleanup (orphan old keys if copy-on-write).  
- **Never delete Airtable records**; rename updates metadata on existing Submission Asset (+ child writeback).

**Non-goals for this brief:** FUT-007 Lambda basename implementation, FUT-040 migration orchestration code, FUT-010 Production attachment delete, Google Drive retirement (SC-100), retroactive mass-rename of all legacy objects, Production deploy.

---

## 2. Current state inventory

### 2.1 AWS resources (live)

| Resource | Value | Notes |
|----------|-------|-------|
| **S3 bucket** | `shooting-challenge-assets` | Private; `us-east-2` |
| **Lambda function** | `127si-upload-asset` | Upload POST + viewer GET |
| **Function URL** | `https://qzfaiyaq7a2cugh6alpov7iyfu0nrwbf.lambda-url.us-east-2.on.aws/` | PROD viewer base |
| **Allowed upload routes** | `homework_completion`, `video_feedback` | `ALLOW_ROUTE_KEYS` env |
| **Headshot upload route** | **None today** | FUT-040 dependency |

### 2.2 Storage Key generations (coexist in Production)

Three shapes appear in repo evidence and live probes. **FUT-009 must define which are canonical going forward** and how verification tolerates legacy rows.

#### Generation A — SDK / early proof prefix

```text
shooting-challenge/{season-slug}/…/{filename}
```

Example from FUT-010 test fixtures:

```text
shooting-challenge/2026-2027/shooting-challenge/schmidt-testing/test.png
```

**FUT-010 contract** requires keys to match `^shooting-challenge/` ([`lib/intake-attachment-cleanup/intake-attachment-cleanup.js`](../../../lib/intake-attachment-cleanup/intake-attachment-cleanup.js)). Production dry-run (2026-08-30) blocked **20+ rows** whose keys **lack** this prefix.

#### Generation B — Current Lambda builder (SC-009 / SC-150 path)

Built by [`lambda/upload-asset/upload_core/storage_key.py`](../../../lambda/upload-asset/upload_core/storage_key.py):

```text
{LastName}_{FirstName}/{ProgramInstance}/{YYYY-MM-DD}/{UTC}_{AssetSlot}_{SubmissionAssetRecordId}_{OriginalFileName}
```

Example (live README):

```text
Schmidt_Xavier/Shooting_Challenge_2026-2027/2026-08-17/20260817T172732Z_HW1_recAqoUbBKfDNtTLt_Straughn_Stetson_316.jpg
```

| Segment | Source |
|---------|--------|
| Athlete folder | Enrollment → Athlete Last / First Name (`folder_person_name`) |
| Program folder | Program Instance `Name - Program Instance` (`folder_program_instance`) |
| Date folder | Asset **Created Time** UTC → `YYYY-MM-DD` |
| File segment | `{UTC}_{AssetSlot}_{recId}_{sanitized_original}` |

**No top-level `shooting-challenge/` prefix.** Embeds **record ID in filename** (conflicts with FUT-007 basename rule). Date folder uses **Created Time**, not Submission **Activity Date** (FUT-007 uses Activity Date / America/Denver).

#### Generation C — FUT-007 target (future uploads only)

From [FUT-007-AWS-MEDIA-NAMING-SPEC.md](./FUT-007-AWS-MEDIA-NAMING-SPEC.md):

```text
{AthleteFolder}/{ProgramInstanceFolder}/{ActivityDateFolder}/{YYYYMMDD}_{HW|VIDEO|HEADSHOT}_{Last}_{First}_{Custom}.{ext}
```

Example:

```text
Boltz_Drew/Shooting_Challenge_2026-2027/2026-08-17/20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4
```

Folder prefix **unchanged from Gen B** unless FUT-009 selects a different layout (§4). Basename segment only is FUT-007 scope.

### 2.3 Prefix / folder pattern summary

| Pattern element | Gen A | Gen B (live Lambda) | Gen C (FUT-007) |
|-----------------|-------|---------------------|-----------------|
| Top-level program prefix | `shooting-challenge/` | **None** | TBD (§4) |
| Athlete segment | varies | `{Last}_{First}` | same |
| Program segment | season slug | `{PI Name tokenized}` | same |
| Date segment | varies | Created Time UTC | Activity Date Denver |
| Filename | original / test | UTC+slot+recId+original | FUT-007 basename |
| Record ID in key | sometimes | **yes** (filename) | **no** (basename) |

### 2.4 Airtable fields (Submission Assets — durable storage metadata)

| Field | Role |
|-------|------|
| **Storage Key** | Full S3 object key — **authoritative for Lambda viewer presign** |
| **Canonical File URL** | Private HTTPS S3 URL — audit / HeadObject probe; **not** parent-facing |
| **Reviewer File URL** | Formula: `{VIEWER_BASE}/file/{Record Id}?token={Reviewer Access Token}` |
| **Reviewer Access Token** | Minted at upload; compared on viewer GET |
| **Upload Status** | Must be `Uploaded` for viewer |
| **Formatted Upload Name** | Human basename target (align with FUT-007 in Phase 3) |
| **Original File Name** | Client filename audit — **preserve on rename** |
| **File Content Hash** | SHA-256 — unchanged unless file bytes replaced |

**Critical viewer property:** Reviewer URL path uses **Submission Asset record ID**, not Storage Key. Updating **Storage Key** on the **same SA record** keeps **Reviewer File URL unchanged**; Lambda reads fresh **Storage Key** from Airtable on each GET → presigns new object. **No token rotation required for rename-only.**

### 2.5 Lambda paths

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/` (Function URL root) | Upload engine — PutObject + writeback |
| `GET` | `/file/{rec…}?token=` | Viewer — HeadObject via presigned redirect |

Upload flow: **070a/070b** → Make → Lambda POST → S3 PutObject → Airtable writeback (**Storage Key**, **Canonical File URL**, hash, token, **Upload Status=Uploaded**) → **022** child writeback to HC / VF.

### 2.6 Verification contract mismatch (blocker for FUT-010 / FUT-040)

| Consumer | Expected key shape |
|----------|-------------------|
| **FUT-010** / FUT-040 SA verify | `^shooting-challenge/` prefix |
| **Live Lambda** (Gen B) | No `shooting-challenge/` prefix |
| **`is_reusable_storage_key()`** | Requires `recordId` substring in key |

**FUT-009 resolution is prerequisite** for FUT-010 supervised apply on Gen B uploads and for FUT-040 orchestrator verification gates.

### 2.7 Asset-type separation today

| Asset type | S3 path today | Upload route | Viewer |
|------------|---------------|--------------|--------|
| Homework | Same bucket; Gen B folder tree | **070a** | Lambda viewer |
| Video feedback | Same bucket; same tree | **070b** | Lambda viewer |
| Registration headshot | **Not on S3** (Airtable attachment) | None | N/A — FUT-040 |

**No category prefix** (e.g. `homework/` vs `video/`) in live keys — separation is logical (Airtable **Upload Destination**) not physical.

---

## 3. Relationship to FUT-007 — basename vs full key

| Layer | Owner | FUT-009 role |
|-------|-------|--------------|
| **Basename** (4th path segment) | **FUT-007** | FUT-009 **consumes** FUT-007 grammar for corrected-video target name and future layout examples |
| **Folder prefix** (segments 1–3) | **FUT-009** | Mike selects layout option (§4); FUT-007 defers here |
| **Full Storage Key** | Joint | `{prefix}/{FUT007_basename}` — single write target per SA row |

**Corrected-video rename** builds new key as:

```text
{resolved_prefix}/{buildFut007Basename(VF.CustomVideoFileName, …)}.{ext}
```

Where `resolved_prefix` follows Mike's chosen layout (§4) and **Activity Date** drives date folder + `YYYYMMDD` token per FUT-007 §3.3.

**Idempotency:** If Custom Video File Name unchanged and Storage Key already matches computed FUT-007 basename → **skip** (no S3 copy).

**Legacy keys:** Gen A/B objects are **never auto-renamed**. Corrected-video workflow applies only when coach explicitly triggers rename (or sets name triggering gated automation) on an **Uploaded** asset.

---

## 4. Proposed bucket / folder layout options (Mike decision required)

**Do not implement until Mike selects one option.** All options keep **one private bucket** unless Mike explicitly approves bucket split (not recommended in this brief).

### Option A — Status quo + optional top-level prefix (recommended default)

Keep `{Athlete}/{ProgramInstance}/{YYYY-MM-DD}/` tree; add **single** top-level prefix for new uploads:

```text
shooting-challenge/{Athlete}/{ProgramInstance}/{YYYY-MM-DD}/{basename}
```

| Pros | Cons |
|------|------|
| Aligns FUT-010 verification with new uploads | Gen B keys remain without prefix until migrated or grandfathered |
| Minimal folder depth change | Dual-prefix coexistence during transition |
| FUT-007 basename drops in as 5th segment | Requires Lambda + verification contract update together |

**Legacy policy (brief recommendation):** Grandfather Gen A/B keys — update FUT-010 regex to accept **either** `^shooting-challenge/` **or** `^[\w.-]+/Shooting_Challenge` athlete-led keys until optional backfill.

### Option B — Asset-type roots under program prefix

```text
shooting-challenge/homework/{Athlete}/{ProgramInstance}/{YYYY-MM-DD}/{basename}
shooting-challenge/video/{Athlete}/{ProgramInstance}/{YYYY-MM-DD}/{basename}
shooting-challenge/headshots/{Athlete}/{ProgramInstance}/{YYYY-MM-DD}/{basename}
```

| Pros | Cons |
|------|------|
| Clear IAM/lifecycle separation by category | Longer keys; Lambda route must pass category segment |
| Easier ops reporting (list prefix per type) | Rename cannot change category — only basename |
| Headshot placeholder ready for FUT-040 | More Phase 3 surface area |

### Option C — Season-first hierarchy

```text
shooting-challenge/{SchoolYear}/{AssetCategory}/{Athlete}/{YYYY-MM-DD}/{basename}
```

Example: `shooting-challenge/2026-2027/video/Boltz_Drew/2026-08-17/20260817_VIDEO_….mp4`

| Pros | Cons |
|------|------|
| Matches early Gen A mental model | Program Instance name dropped from path — collision if two PIs same year |
| Season-scoped lifecycle rules trivial | Conflicts with enrollment-scoped PI isolation (SC-023) |

### Option D — Flat program prefix only (minimal change)

```text
shooting-challenge/{Athlete}/{ProgramInstance}/{YYYY-MM-DD}/{basename}
```

Same as Option A but **explicitly rejects** category subfolders. Simplest alignment with Gen B + one prefix insert.

### Comparison summary

| Criterion | A (+ grandfather) | B (type roots) | C (season-first) | D (prefix only) |
|-----------|-------------------|----------------|------------------|-----------------|
| FUT-010 alignment | **High** (new keys) | **High** | Medium | **High** |
| Headshot readiness | Medium | **High** | Medium | Medium |
| PI isolation | **High** | **High** | Low | **High** |
| Implementation cost | Low–medium | Medium | Medium–high | **Low** |
| Legacy coexistence | Grandfather regex | Grandfather + route | Harder | Grandfather regex |

**Brief recommendation (not a Mike decision):** **Option D** (or A equivalently) for Phase 3 v1 — prepend `shooting-challenge/` to current folder tree, add **grandfathered verification** for Gen B keys, defer **Option B** category roots until FUT-040 headshot route is scoped.

---

## 5. Corrected-video rename / replacement workflow

### 5.1 Trigger

Coach sets **Custom Video File Name** on linked **Video Feedback** during correction interface review **after** asset is `Upload Status = Uploaded`.

**Eligible when:**

- Submission Asset `Upload Destination = Video Feedback`
- `Upload Status = Uploaded`
- **Storage Key** + **Canonical File URL** populated
- Linked VF **Custom Video File Name** non-empty and differs from current basename (or coach explicit "Apply to S3" action)
- `Send to Make Trigger` unchecked
- Review / XP not blocked by in-flight upload

**Out of scope:** Homework rename (assignment title changes do not require S3 rename for parent UX today). Headshot rename → FUT-040.

### 5.2 Copy-on-write vs in-place

| Approach | S3 operation | Airtable | Old object | Reviewer URL |
|----------|--------------|----------|------------|--------------|
| **Copy-on-write (recommended)** | `CopyObject` source → new key | Update **Storage Key**, **Canonical File URL**, **Formatted Upload Name** | **Retained** (orphan) | **Unchanged** (same SA recId + token) |
| **In-place key change** | Not supported — S3 keys are immutable | N/A | N/A | N/A |
| **Same-key content replace** | `PutObject` overwrite same key | Hash + optional metadata | Replaced bytes | Unchanged | **Rejected** — breaks audit/hash; C-023 dedupe confusion |

**Brief recommendation:** **Copy-on-write only.** Never `DeleteObject` on old key. Orphan retention aligns with FUT-010 / FUT-040 hard rules.

### 5.3 Processing stages

```
┌─────────────────────────────────────────────────────────────────────────┐
│ FUT-009 RENAME WORKER (Phase 3 — not built)                             │
│                                                                         │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌───────┐ │
│  │ Validate │ → │ Compute  │ → │ S3 Copy  │ → │ Verify   │ → │Write- │ │
│  │ eligibility│  │ new key  │   │ Object   │   │ gates    │   │ back  │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └───┬───┘ │
│       │              │               │              │             │     │
│       │         FUT-007 basename  same bytes    HeadObject +    SA +  │
│       │         + FUT-009 prefix  new key only  viewer GET     022 VF│
└───────┼──────────────┼───────────────┼──────────────┼─────────────┼─────┘
        │              │               │              │             │
        │         Custom Video File Name on VF       │             │
        │         Activity Date on Submission        │             │
        └────────────────────────────────────────────┴─────────────┘
```

| Stage | Fail-closed behavior |
|-------|------------------------|
| Validate | Skip if not Uploaded, missing VF link, blank custom name, or upload in flight |
| Compute | Fail if FUT-007 sanitizer rejects input; collision → `_2` suffix per FUT-007 §5 |
| S3 Copy | Fail if source missing, access denied, or destination exists (unexpected — log) |
| Verify | HeadObject on new key; optional GET viewer smoke with stored token |
| Writeback | Update SA fields; trigger **022** for VF **Video URL or Drive Link** (Reviewer URL unchanged) |

### 5.4 Fields written (Submission Assets)

| Field | On rename |
|-------|-----------|
| **Storage Key** | **Update** → new key |
| **Canonical File URL** | **Update** → new HTTPS URL |
| **Formatted Upload Name** | **Update** → FUT-007 basename |
| **Reviewer File URL** | **Unchanged** (formula on record id + token) |
| **Reviewer Access Token** | **Preserve** unless security incident |
| **Original File Name** | **Preserve** (audit) |
| **File Content Hash** | **Unchanged** (same bytes) |
| **Upload Status** | **Uploaded** (unchanged) |
| **Upload Error** | Clear rename errors on success |

Optional audit fields (PKG-004 — §12):

| Proposed field | Purpose |
|----------------|---------|
| **Previous Storage Key** | Orphan trace |
| **Renamed At** | Audit timestamp |
| **Rename Source** | `coach_correction` \| `manual_cli` |

### 5.5 Duplicate / link safety

| Risk | Guard |
|------|-------|
| Duplicate VF row | Rename touches **existing SA only** — no **013** re-run |
| Duplicate XP | **113/114** keyed on VF id — no new VF |
| Broken parent link | **022** re-sync VF URL; **073** uses Reviewer URL classifier — unchanged if formula intact |
| Duplicate S3 object same basename | FUT-007 collision suffix before copy |
| Re-trigger **070b** upload | Gate: skip if `Upload Status=Uploaded` + rename flag or explicit worker only |
| FUT-010 accidental delete | Rename worker **never** clears attachments |

### 5.6 URL regeneration scenarios

| Scenario | Reviewer URL | Action |
|----------|--------------|--------|
| Rename only (copy-on-write) | **Same formula value** | None — Lambda reads new Storage Key |
| Missing token repair | Formula empty / 403 | Run existing token repair extension; **not** part of rename v1 |
| SA record replaced (rejected) | New recId | **Out of scope** — would break idempotency |

### 5.7 Delivery mechanisms (Phase 3 — Mike picks one primary)

| # | Mechanism | Pros | Cons |
|---|-----------|------|------|
| 1 | **Extension script** (safe-backfills pattern) | DRY_RUN default; operator control | Manual batch |
| 2 | **CLI** (`tools/airtable/fut_009_video_rename.py`) | CI testable; JSON logs | Requires AWS creds |
| 3 | **Automation on VF field change** | Coach seamless UX | Risk of accidental renames; needs debounce + confirm |
| 4 | **Correction interface button** | Explicit intent | Requires Interface action + script |

**Brief recommendation:** Ship **1 + 2** first (mirror FUT-010); add **4** after DEV proof; defer **3** until rename volume understood.

---

## 6. Headshot path placeholder (FUT-040 dependency)

Headshots are **not on S3 today**. FUT-040 brief defines migration orchestration; **FUT-009** defines **where** headshot objects live once copied.

### 6.1 Proposed key shape (when FUT-040 + FUT-007 active)

Under **Option B**:

```text
shooting-challenge/headshots/{Athlete}/{ProgramInstance}/{YYYY-MM-DD}/{YYYYMMDD_HEADSHOT_{Last}_{First}_Profile}.{ext}
```

Under **Option D** (recommended v1):

```text
shooting-challenge/{Athlete}/{ProgramInstance}/{YYYY-MM-DD}/{YYYYMMDD_HEADSHOT_{Last}_{First}_Profile}.{ext}
```

Basename grammar: FUT-007 §6 **HEADSHOT** category.

### 6.2 Display URL vs viewer

| Concern | Owner |
|---------|-------|
| S3 key layout | **FUT-009** |
| Copy + verify + Enrollment writeback | **FUT-040** |
| Public leaderboard URL (CloudFront vs Lambda vs web proxy) | **FUT-040 §9** — Mike decision |

**FUT-009 does not block FUT-040 SA homework/video migration** — headshot prefix can land in FUT-040 slice **3e** after Mike confirms Option B vs D.

### 6.3 Cross-reference

See [FUT-040-AUTOMATIC-S3-MIGRATION-BRIEF.md](../s3-migration/FUT-040-AUTOMATIC-S3-MIGRATION-BRIEF.md) §9 (Lambda viewer applicability) and §6 (Enrollment headshot fields).

---

## 7. Retention and lifecycle notes

| Policy | Rule |
|--------|------|
| **Object delete** | **Prohibited** in application workflows (FUT-010, FUT-040, FUT-009 rename) |
| **Orphan keys** | After copy-on-write rename, old key remains until manual lifecycle policy (if ever) |
| **Intake attachments** | FUT-010 deletes **Airtable attachment only** after verify — not S3 |
| **Bucket privacy** | Block public ACLs; canonical URL probe expects 403/401 |
| **Presigned TTL** | Default 900s — unchanged by rename |
| **Season rollover** | Keys include PI + date — no automatic archival in Phase 3 |
| **Test data** | Mike-authorized disposable deletes **before 2027 challenge** — separate from prod retention |

**Optional future (not Phase 3):** S3 Lifecycle rule transitioning `shooting-challenge/orphans/` after N days — requires orphan prefix convention and Mike approval.

---

## 8. Phase 3 implementation slices (ordered)

**Prerequisites:** Mike decisions §11; FUT-007 Phase 3 flag available (or shared `lib/aws-media-naming/` for rename compute); PKG-004 audit fields if §5.4 optional fields added; verification regex update coordinated with FUT-010.

| Slice | Scope | Deliverables |
|-------|-------|--------------|
| **9a — Contract + verification alignment** | `lib/s3-storage/` helpers; dual-prefix regex; update FUT-010 tests | Unit tests; discovery doc for Gen A/B/C |
| **9b — Layout flag in Lambda** | Prepend `shooting-challenge/` (Mike's option) for **new uploads only** | DEV Lambda deploy; no retroactive copy |
| **9c — Rename worker core** | CopyObject + writeback + 022 trigger | CLI + extension; DRY_RUN default |
| **9d — FUT-007 coordination** | Rename uses same basename builder as upload | Shared contract tests Python + TS |
| **9e — Coach UX** | Interface button or documented OMNI runbook | Operator checklist |
| **9f — Headshot prefix stub** | Document final prefix in FUT-040 promotion doc | No headshot copy until FUT-040 **3e** |
| **9g — Promotion** | `docs/deploy-checklists/FUT-009-*` | DEV proof; Mike → PROD; CHANGELOG |

**Order:** **9a → 9b** (layout) can parallel **9c → 9d** (rename) after 9a contract frozen. **9f** follows FUT-040 headshot Mike decisions.

**Dependency graph:**

```
FUT-007 basename helpers ──► 9d rename compute
FUT-009 layout decision ──► 9b Lambda prefix + 9c target key
9a verification regex ──► FUT-010 supervised apply unblocked
FUT-040 headshot URL decision ──► 9f prefix finalization
```

---

## 9. Test matrix (DEV / disposable records)

Run on **DEV** with disposable video Submission Assets per high-autonomy disposable-data mode. **No Production S3 writes from agents.**

### 9.1 Fixtures

| Fixture ID | Setup |
|------------|-------|
| **VID-REN-01** | Uploaded VF + SA; Custom Video File Name set post-upload; Gen B Storage Key |
| **VID-REN-02** | Same as 01 but Gen A `shooting-challenge/…` key |
| **VID-REN-03** | Custom name set **before** upload (FUT-007 path) — rename worker should **skip** |
| **VID-REN-04** | Collision — two VFs same athlete/date/custom name |

### 9.2 Cases

| # | Scenario | Expected |
|---|----------|----------|
| T1 | Happy path rename Gen B → FUT-007 key | New S3 object; SA Storage Key updated; old object exists; Reviewer URL unchanged; viewer GET serves new file |
| T2 | Happy path rename Gen A key | Same as T1 |
| T3 | Custom name unchanged / already matches | `skipped_already_named` |
| T4 | VF blank Custom Video File Name | `skipped_missing_custom_name` |
| T5 | Upload Status ≠ Uploaded | Fail-closed skip |
| T6 | S3 CopyObject failure | SA unchanged; error logged |
| T7 | HeadObject 404 on new key | Fail-closed; SA retains old key |
| T8 | Viewer GET after rename | 302 presigned; same token |
| T9 | **022** VF writeback | **Video URL or Drive Link** = Reviewer URL; no Canonical leak |
| T10 | Re-run rename idempotent | Second run skip |
| T11 | **113/114** XP unchanged | No new XP Events |
| T12 | **073** email payload | `valid_lambda_viewer` still passes |
| T13 | Collision suffix | `_2` appended per FUT-007 |
| T14 | FUT-010 verify after rename | New key passes updated regex + HeadObject |

### 9.3 Regression guards

- **070b** `skipped_already_uploaded` — rename must not re-upload from Make.  
- **C-023** hash — unchanged across copy-on-write rename.  
- **FUT-010** — attachment delete independent; rename does not clear attachments.

---

## 10. Promotion requirements

| Artifact | Path (provisional) |
|----------|-------------------|
| Operator checklist | `docs/deploy-checklists/FUT-009-aws-storage-rename.md` |
| Layout decision record | Mike sign-off in checklist §1 |
| DEV evidence | `docs/testing/evidence/fut-009/` |
| Lambda deploy | Coordinate with FUT-007 if same release |
| FUT-010 regex update | Same PR or preceding PR — document in both checklists |
| CHANGELOG | `### Docs` + `### Airtable` if automation pasted |

**Paste order:** Verification regex (9a) → DEV rename dry-run → single-record apply → batch → optional Lambda prefix (9b) → Production.

---

## 11. Open decisions for Mike

1. **Folder layout:** Option A / B / C / D (§4)?  
2. **Legacy key grandfathering:** Accept Gen B keys in FUT-010 verify without prefix, or require prefix backfill first?  
3. **Date folder authority:** Switch Lambda new uploads to **Activity Date** (FUT-007) vs keep **Created Time** for folder segment?  
4. **Rename trigger:** Extension/CLI first vs Interface button vs VF field automation (§5.7)?  
5. **Coach confirmation:** Require explicit confirm before S3 copy when Custom Video File Name changes?  
6. **Audit fields:** Add **Previous Storage Key** / **Renamed At** (PKG-004)?  
7. **Orphan handling:** Document-only vs future lifecycle rule vs dedicated `orphans/` prefix?  
8. **Homework rename:** In scope for v1 or video-only?  
9. **FUT-007 sequencing:** Implement layout prefix (9b) before or after FUT-007 basename deploy?  
10. **Headshot prefix:** Option B category root vs Option D shared tree (§6)?  
11. **FUT-040 coordination:** Unblock FUT-010 apply before or after FUT-009 layout decision?  
12. **PKG-004 priority:** Approve optional rename audit fields before DEV paste?

**Count: 12 open decisions.**

---

## 12. PKG gate notes

### 12.1 PKG-004 (blocked — required before schema)

Same gate as FUT-038 / FUT-040. Before Production schema for optional §5.4 audit fields:

1. Field ownership matrix — rename worker vs Lambda upload (single **Storage Key** writer per transition).  
2. No conflict with **Formatted Upload Name** formula ownership.  
3. DEV disposable proof before Mike Production paste.

**FUT-009 can proceed Phase 3a–c without new schema** if audit fields deferred — CLI logs suffice for v1.

### 12.2 PKG coordination with FUT-007 / FUT-010 / FUT-040

| Package | FUT-009 dependency |
|---------|-------------------|
| **FUT-007** | Basename builder shared for rename compute |
| **FUT-010** | Verification regex must accept canonical key set Mike selects |
| **FUT-040** | Headshot prefix + migration verify uses same layout decision |

### 12.3 Promotion doc gate

Official Production promotion requires checklist in `docs/deploy-checklists/` per [doc 04 § Official promotion documentation](../../v2/04-ai-development-standards.md#official-promotion-documentation-required).

---

## 13. References

- FUT-007 spec: [FUT-007-AWS-MEDIA-NAMING-SPEC.md](./FUT-007-AWS-MEDIA-NAMING-SPEC.md)  
- FUT-040 brief: [FUT-040-AUTOMATIC-S3-MIGRATION-BRIEF.md](../s3-migration/FUT-040-AUTOMATIC-S3-MIGRATION-BRIEF.md)  
- Lambda storage key builder: [`lambda/upload-asset/upload_core/storage_key.py`](../../../lambda/upload-asset/upload_core/storage_key.py)  
- Lambda viewer: [`lambda/upload-asset/upload_core/viewer.py`](../../../lambda/upload-asset/upload_core/viewer.py)  
- FUT-010 verification: [`lib/intake-attachment-cleanup/intake-attachment-cleanup.js`](../../../lib/intake-attachment-cleanup/intake-attachment-cleanup.js)  
- FUT-010 dry-run evidence: [FUT-010-DRY-RUN-2026-08-30-R3.md](../../testing/evidence/FUT-010-DRY-RUN-2026-08-30-R3.md)  
- Upload workflow: [upload-workflow-homework-video.md](../../upload-workflow-homework-video.md)  
- 022 writeback: [`airtable/automations/shooting-challenge/lib/022-child-upload-writeback.js`](../../../airtable/automations/shooting-challenge/lib/022-child-upload-writeback.js)  
- SC-150 viewer deploy: [SC-150-prod-reviewer-file-links.md](../../deploy-checklists/SC-150-prod-reviewer-file-links.md)  
- Basename helpers: [`lib/aws-media-naming/index.ts`](../../../lib/aws-media-naming/index.ts)  

---

*End of FUT-009 Phase 2 architecture brief.*
