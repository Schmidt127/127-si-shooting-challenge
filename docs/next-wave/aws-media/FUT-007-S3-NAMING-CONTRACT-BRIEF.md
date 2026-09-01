# FUT-007 — Official S3 Naming Contract (Phase 2 Implementation Brief)

**Status:** Contract defined (Phase 2) — **no Production changes, no Lambda deploy, no S3 apply**  
**Canonical ID:** **FUT-007** (contract) · **FUT-009** (post-review rename workflow)  
**Date:** 2026-09-01  
**Authority:** This brief is the **single contract document** for future S3 key shape, sanitization, collision, audit, and URL behavior. Grammar detail: [FUT-007-AWS-MEDIA-NAMING-SPEC.md](./FUT-007-AWS-MEDIA-NAMING-SPEC.md). Rename workflow: [FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md](./FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md).  
**Related:** FUT-008 · FUT-009 · FUT-010 · FUT-040 · C-013 · SC-150 · [`lambda/upload-asset/upload_core/storage_key.py`](../../../lambda/upload-asset/upload_core/storage_key.py) · [`lib/aws-media-naming/`](../../../lib/aws-media-naming/)

---

## Executive summary

Shooting Challenge media uses a **two-phase naming lifecycle**:

| Phase | When | S3 filename segment | Owner |
|-------|------|---------------------|-------|
| **Upload (immediate)** | Athlete submits; **070a/070b → Make → Lambda** runs | **Today (Gen B):** sanitized **Original File Name** embedded in legacy key. **Future (FUT-007 flag):** FUT-007 basename when Custom Video File Name (or HW fallback) is already known. | Upload Lambda |
| **Correction (deferred)** | Coach enters **Custom Video File Name** on Video Feedback after review | **FUT-007 basename** with coach custom name | **FUT-009** rename worker + **Automation 120** (repo built; Lambda deploy + paste pending) |

**End-state rule:** The **physical S3 object** should use the **Custom Video File Name** (sanitized into the FUT-007 basename) after the coach supplies it. Until FUT-009 rename completes and verifies, the **original upload key and URL remain authoritative**.

**Reviewer URLs are record/token-based** — they survive Storage Key changes on the same Submission Asset record.

---

## 1. Current behavior

### 1.1 Upload pipeline (Production — Generation B)

```
Fillout/API → 009 Submission Asset (attachment + Original File Name)
  → 070a (homework) or 070b (video) → Make → Lambda POST
  → resolve_storage_key() → Storage Key persisted → S3 PutObject
  → Airtable writeback (Canonical File URL, hash, Reviewer Access Token, Upload Status=Uploaded)
  → 022 child writeback (HC / VF Reviewer URL)
```

| Component | Current behavior |
|-----------|------------------|
| **Lambda builder** | `upload_core/storage_key.py` — legacy Gen B when `USE_FUT007_BASENAME` unset/off |
| **Storage Key shape** | `{Last}_{First}/{ProgramInstance}/{YYYY-MM-DD}/{UTC}_{Slot}_{recId}_{sanitized_original}` |
| **Date folder** | Asset **Created Time** UTC → `YYYY-MM-DD` (not Activity Date) |
| **Filename segment** | UTC stamp + Asset Slot + **Submission Asset record ID** + **Original File Name** (sanitized via `safe_filename()`) |
| **Immediate upload** | Yes — Lambda downloads Airtable attachment and **PutObject** before writeback completes |
| **Retry idempotency** | If **Storage Key** already reusable (`recId` in key OR FUT-007 basename regex match), key is **not recomputed** |
| **FUT-007 prep** | `fut007_basename.py` + flag path in `resolve_storage_key()` — **default off**; not deployed |

**Live example:**

```text
Schmidt_Xavier/Shooting_Challenge_2026-2027/2026-08-17/20260817T172732Z_HW1_recAqoUbBKfDNtTLt_Straughn_Stetson_316.jpg
```

### 1.2 Legacy Generation A (SDK / early proof)

Some rows use a `shooting-challenge/{season-slug}/…` prefix. **FUT-010 verification** expects `^shooting-challenge/`; **live Lambda (Gen B) does not** emit this prefix. Both coexist in Production.

### 1.3 Airtable fields (Submission Assets)

| Field | Role today |
|-------|------------|
| **Storage Key** | Full S3 object key — **authoritative for Lambda viewer presign** |
| **Canonical File URL** | Private HTTPS S3 URL (`https://{bucket}.s3.{region}.amazonaws.com/{encoded-key}`) — audit/probe only; **not parent-facing** |
| **Original File Name** | Client filename at intake — **preserved for audit**; used in Gen B filename segment |
| **Formatted Upload Name** | Human target basename (formula / future sync with FUT-007) |
| **Reviewer Access Token** | Minted at upload; compared on viewer GET |
| **Reviewer File URL** | Formula: `{VIEWER_BASE}/file/{Record Id}?token={Reviewer Access Token}` |
| **File Content Hash** | SHA-256 — C-023 dedupe; independent of basename |

### 1.4 Video Feedback fields

| Field | Role today |
|-------|------------|
| **Custom Video File Name** | FUT-008 — coach/parent-readable label (e.g. `OffTheDribble`); **not yet applied to S3 key in Production** |
| **Video Asset File Name** | Lookup of Submission Asset **Original File Name** — display/audit in emails (071/072/073) |
| **Video File - AWS** | Lookup of **Reviewer File URL** — parent/coach secure link |

### 1.5 Signed URLs, viewer, CloudFront

| Mechanism | Behavior |
|-----------|----------|
| **Reviewer File URL** | `GET /file/{rec…}?token=` on Lambda Function URL → validates token → reads **Storage Key** from Airtable → **302 presigned S3 GET** (TTL default 900s) |
| **Canonical File URL** | Direct S3 HTTPS URL — **private bucket**; anonymous GET returns AccessDenied |
| **CloudFront** | **Not in use** for homework/video today; canonical URL builder uses virtual-hosted S3 URL only |
| **Content-Disposition** | Presigned GET may set `inline; filename="{Original File Name}"` — label only; does not change S3 key |

### 1.6 Prep code inventory (repo — not Production)

| Path | Purpose |
|------|---------|
| `lambda/upload-asset/upload_core/storage_key.py` | `resolve_storage_key()`, legacy + FUT-007 branches |
| `lambda/upload-asset/upload_core/fut007_basename.py` | Python basename grammar (mirror of TS) |
| `lib/aws-media-naming/index.ts` | Shared pure helpers + vitest contract |
| `docs/next-wave/aws-media/FUT-007-AWS-MEDIA-NAMING-SPEC.md` | Detailed grammar spec |
| `docs/next-wave/aws-media/FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md` | Bucket layout + rename workflow |
| `docs/deploy-checklists/FUT-007-aws-media-naming.md` | Phase 3 promotion checklist |

### 1.7 Test / deployment documentation

| Artifact | Location |
|----------|----------|
| Vitest naming contract | `lib/aws-media-naming/naming.test.ts` (21 cases) |
| Lambda pytest | `lambda/upload-asset/tests/test_fut007_basename.py`, `test_storage_key.py`, `test_viewer.py` |
| Upload workflow | `docs/upload-workflow-homework-video.md` |
| Lambda README | `lambda/upload-asset/README.md` |
| Viewer deploy | `docs/deploy-checklists/SC-150-prod-reviewer-file-links.md` |
| C-013 writeback | `docs/deploy-checklists/C-013-make-s3-writeback-mapping.md` |

**Read-only scan (2026-09-01):** 21/21 vitest + 60/60 pytest (FUT-007 + storage_key + viewer) — **PASS**.

---

## 2. Official future S3 naming contract

### 2.1 Full Storage Key (target — new uploads + post-rename)

```text
{LayoutPrefix/}{AthleteFolder}/{ProgramInstanceFolder}/{ActivityDateFolder}/{Basename}
```

| Segment | Rule | Example |
|---------|------|---------|
| **LayoutPrefix** | Optional top-level prefix — **Mike decision (FUT-009 §4)**. Brief recommendation: `shooting-challenge/` for new keys (Option D). Legacy keys grandfathered. | `shooting-challenge/` |
| **AthleteFolder** | `{LastName}_{FirstName}` — enrollment names, `path_token()` / folder sanitizer | `Boltz_Drew` |
| **ProgramInstanceFolder** | Program Instance `Name - Program Instance` tokenized | `Shooting_Challenge_2026-2027` |
| **ActivityDateFolder** | `YYYY-MM-DD` from Submission **Activity Date** in **America/Denver** | `2026-08-17` |
| **Basename** | FUT-007 grammar (§2.2) | `20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4` |

**Full example (Option D + FUT-007 basename):**

```text
shooting-challenge/Boltz_Drew/Shooting_Challenge_2026-2027/2026-08-17/20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4
```

**Without layout prefix (Gen B-compatible tree — valid until Mike selects prefix):**

```text
Boltz_Drew/Shooting_Challenge_2026-2027/2026-08-17/20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4
```

### 2.2 Basename grammar (official)

```bnf
<basename>  ::= <date> "_" <category> "_" <last> "_" <first> "_" <custom> [ <collision> ] <extension>
<date>      ::= YYYYMMDD          ; Activity Date, America/Denver
<category>  ::= "HW" | "VIDEO" | "HEADSHOT"
<last>      ::= sanitized name part (§3)
<first>     ::= sanitized name part (§3)
<custom>    ::= sanitized name part (§3); VIDEO → Custom Video File Name when set
<collision> ::= "_" positive_integer   ; only when disambiguation required (§5)
<extension> ::= "." [a-z0-9]{1,11}     ; lowercase (§4)
```

**Approved examples:**

| Category | Basename |
|----------|----------|
| HW | `20260817_HW_Boltz_Drew_ShotChallenge.jpg` |
| VIDEO | `20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4` |
| HEADSHOT | `20260817_HEADSHOT_Boltz_Drew_Profile.jpg` |

### 2.3 Stable identification (what goes where)

| Identifier | Location | **Not** in basename |
|------------|----------|---------------------|
| Athlete (last/first) | Folder segment + basename name parts | — |
| Enrollment | Airtable link on Submission / SA | ✓ |
| Submission Asset record ID | Airtable PK; **Reviewer URL path** | ✓ **Never in basename** |
| Asset slot / sequence | Airtable **Asset Sequence**; collision fallback only | ✓ (not as slot token like `HW1`) |
| Content hash | **File Content Hash** | ✓ |
| Original client filename | **Original File Name** (audit field) | ✓ (after rename) |
| Custom coach name | Basename `<custom>` segment (VIDEO) | — |

### 2.4 Lifecycle contract (Mike-approved workflow)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────────┐
│ Athlete upload  │ ──► │ Immediate S3 put │ ──► │ Coach reviews (viewer)  │
│ (original name) │     │ Gen B or FUT-007 │     │ Custom Video File Name  │
└─────────────────┘     └──────────────────┘     └───────────┬─────────────┘
                                                             │
                                                             ▼
                                              ┌──────────────────────────────┐
                                              │ FUT-009: CopyObject → new key  │
                                              │ Verify → update Storage Key    │
                                              │ Old object retained            │
                                              └──────────────────────────────┘
```

| Guarantee | Rule |
|-----------|------|
| **Initial upload immediate** | Unchanged — Lambda PutObject on first successful run |
| **Original URL until verified rename** | **Storage Key** and **Canonical File URL** stay on upload key until FUT-009 verify passes; then atomically updated |
| **Reviewer URL stable** | Formula uses **record ID + token** only — unchanged across rename |
| **S3 rename mechanism** | **CopyObject** source → computed target key; **HeadObject** verify on destination |
| **Old object retention** | **No DeleteObject** before or after successful copy; orphan old key indefinitely |

### 2.5 Upload-time vs post-review paths

| Path | When Custom Video File Name is set | S3 key at upload | Post-review action |
|------|-----------------------------------|------------------|-------------------|
| **A — Legacy (today)** | Blank or ignored for key | Gen B with original filename | **FUT-009 rename** when coach sets name |
| **B — FUT-007 flag on** | Set before **070b** | FUT-007 basename at upload | **Skip rename** if basename already matches |
| **C — FUT-007 flag on** | Blank at upload | FUT-007 fallback (`Focus`, `Video1`, …) | **FUT-009 rename** when coach sets final custom name |

**Physical object end-state:** For path A and C, coach correction triggers FUT-009 so the **stored object key** reflects **Custom Video File Name**. Path B achieves the same at upload time.

---

## 3. Sanitization rules

Applied to **last**, **first**, and **custom** name parts. Implementation: `sanitize_name_part()` / `sanitizeNamePart()`.

| Step | Rule |
|------|------|
| Unicode | Normalize **NFKD**; strip combining marks; transliterate to ASCII (non-ASCII dropped) |
| Allowed chars | `[A-Za-z0-9]` only in each part — **no spaces, underscores, hyphens, punctuation inside a part** |
| Spaces / punctuation | Collapsed away: `Off The Dribble` → `OffTheDribble`; `Free-Throws` → `FreeThrows`; `O'Brien` → `OBrien` |
| Path safety | Reject / strip `..`, `/`, `\`, `\0`; basename must not be `.` or `..` |
| Max length | **40** chars per name part; **180** chars basename stem (excluding extension) |
| Truncation order | **custom** → **first** → **last** (never truncate date or category) |
| Full key max | **900** bytes total (below S3 1024 limit with prefix) |

**Coach input examples:**

| Custom Video File Name (input) | `<custom>` segment |
|-------------------------------|-------------------|
| `OffTheDribble` | `OffTheDribble` |
| `Off The Dribble` | `OffTheDribble` |
| `Free-Throws` | `FreeThrows` |
| `ShootingInTheRain` | `ShootingInTheRain` |
| `../../etc/passwd` | `etcpasswd` (safe token) |
| ` (blank) ` | Fallback per §7 |

---

## 4. Extension rules

| Rule | Detail |
|------|--------|
| Source | Final segment of **Original File Name** at upload; **unchanged on rename** (copy preserves bytes + extension) |
| Format | Lowercase; `[a-z0-9]` after dot; leading dot required in stored basename |
| Max length | **12** characters including dot |
| Missing / invalid | Default **`.bin`** |
| Custom name with extension | If coach pastes `OffTheDribble.mp4` into Custom Video File Name, **strip trailing extension** before sanitizing `<custom>` |
| Rename | **Do not** change extension on copy-on-write rename — extension comes from original upload |

---

## 5. Collision rules

**Collision scope:** Same `{AthleteFolder}/{ProgramInstanceFolder}/{ActivityDateFolder}/` prefix + identical basename stem (case-insensitive compare).

| Situation | Behavior |
|-----------|----------|
| Same content hash (C-023) | Duplicate-content review — **not** a naming collision |
| Same basename, **new distinct upload** | Append `_2`, `_3`, … **before extension**: `…_OffTheDribble_2.mp4` |
| **Retry** of same Submission Asset | Reuse persisted **Storage Key** — **no** suffix |
| HW multi-file same day | Prefer **Asset Sequence** in custom fallback before collision suffix |
| FUT-009 rename target exists | Apply collision suffix **before CopyObject**; fail-closed if unexpected destination occupied |

**Suffix grammar:** `{stem}_{N}{ext}` where `N` is integer ≥ 2.

---

## 6. Repeat-rename rules

| Scenario | Behavior |
|----------|----------|
| Coach changes Custom Video File Name again | FUT-009 worker recomputes target basename; **new CopyObject** to new key; **previous renamed key becomes orphan** (not deleted) |
| Custom name changes but sanitizes to same segment | **Skip** — no S3 copy |
| Storage Key already matches computed basename | **Skip** (`skipped_already_named`) |
| Upload in flight (`Processing`) | **Fail-closed skip** — do not rename |
| Re-run same rename job | **Idempotent skip** if Storage Key already matches |
| Token rotation | **Not required** for rename-only — same SA record |
| Hash | **Unchanged** across copy-on-write (same bytes) |

**Audit recommendation:** Log `{recordId, oldKey, newKey, customName, outcome}`; optional Airtable **Previous Storage Key** / **Renamed At** (PKG-004 — Mike decision).

---

## 7. Original filename / audit rules

| Field | On upload | On FUT-009 rename | Purpose |
|-------|-----------|-------------------|---------|
| **Original File Name** | Set from attachment | **Never overwrite** | Client filename audit |
| **Storage Key** | Gen B or FUT-007 key | **Update** to new key after verified copy |
| **Canonical File URL** | S3 HTTPS URL for key | **Update** to match new key |
| **Formatted Upload Name** | Optional formula | **Update** to FUT-007 basename |
| **File Content Hash** | SHA-256 of bytes | **Unchanged** (same object bytes) |
| **Uploaded At** | Upload timestamp | **Unchanged** |
| **Video Asset File Name** (VF lookup) | Original File Name | **Unchanged** — still shows original client name for audit |
| **Custom Video File Name** (VF) | Coach entry | Source of `<custom>` segment for rename |

**Display rule:** Parent/coach-facing copy uses **Custom Video File Name** (or assignment title for HW). **Original File Name** is ops/debug only after rename.

---

## 8. URL implications

| URL type | Tied to | On rename |
|----------|---------|-----------|
| **Reviewer File URL** | SA record ID + token (formula) | **Unchanged** |
| **Canonical File URL** | Storage Key (direct S3) | **Updated** to new key URL |
| **Presigned GET** (viewer) | Current Storage Key at request time | Automatically serves **new** object after writeback |
| **Old Canonical URL** | Previous Storage Key | **Still valid** for old orphan object until lifecycle policy (if ever) — not linked from Airtable after writeback |
| **CloudFront** | N/A today | Future headshots (FUT-040) may add CDN — basename grammar unchanged |

**Canonical URL builder:** `https://{bucket}.s3.{region}.amazonaws.com/{percent-encoded-key}` — no CloudFront in current Lambda.

**Parent email / web links:** Must continue to use **Reviewer File URL** or classified secure viewer URLs — **never** Canonical File URL (AccessDenied risk documented in SC-150 QA).

---

## 9. Reviewer URL safety

| Property | Detail |
|----------|--------|
| URL shape | `{VIEWER_BASE}/file/{SubmissionAssetRecordId}?token={ReviewerAccessToken}` |
| Filename independence | Path uses **record ID**, not Storage Key or basename |
| Token | Minted once at upload; preserved across rename |
| Viewer logic | `viewer.py` loads SA by record ID → validates token → presigns **current** Storage Key |
| After rename | Same URL → Lambda reads updated Storage Key → presigns new object → **302** |
| Regression risk | **022** must not write Canonical URL to VF/HC child URL fields — Reviewer URL only |
| Missing token repair | Existing extension script — separate from rename |

**Confirmed:** Reviewer URLs **remain valid** through FUT-009 copy-on-write rename because they are **record/token-based**, not filename-based.

---

## 10. Recommended FUT-009 implementation

FUT-009 is **brief-ready**; implementation **not started**. Recommended order:

| Slice | Deliverable |
|-------|-------------|
| **9a — Contract alignment** | Dual-prefix verification regex (Gen A + Gen B + new prefix); unblock FUT-010 |
| **9b — Layout prefix** | Optional `shooting-challenge/` on **new uploads only** (Mike Option D) |
| **9c — Rename worker** | Extension script + CLI; DRY_RUN default; CopyObject + verify + SA writeback |
| **9d — FUT-007 shared compute** | Rename uses `lib/aws-media-naming/` + `fut007_basename.py` — same builder as upload flag |
| **9e — Coach UX** | Interface button or documented OMNI runbook (defer field-change automation) |
| **9g — Promotion** | `docs/deploy-checklists/FUT-009-aws-storage-rename.md` + DEV evidence |

**Rename worker stages:**

1. **Validate** — Uploaded, VF linked, Custom Video File Name non-empty, differs from current basename  
2. **Compute** — FUT-007 basename + FUT-009 layout prefix + collision suffix  
3. **CopyObject** — source = current Storage Key; destination = computed key  
4. **Verify** — HeadObject on destination (size, etag); optional viewer GET smoke  
5. **Writeback** — Update Storage Key, Canonical File URL, Formatted Upload Name; trigger **022**; **do not** delete source object  

**Delivery mechanism (recommended):** Extension script + CLI first (mirror FUT-010); Interface button after DEV proof.

**Explicit non-goals for FUT-009 v1:** Homework rename, mass legacy migration, Automation 147, schema paste without PKG-004 approval.

---

## 11. Required tests

### 11.1 Contract tests (existing — run before any deploy)

```bash
cd web && npm test -- ../lib/aws-media-naming/naming.test.ts
cd lambda/upload-asset && python -m pytest tests/test_fut007_basename.py tests/test_storage_key.py tests/test_viewer.py -q
```

### 11.2 Pre-deploy additions (Phase 3)

| Suite | Cases |
|-------|-------|
| **FUT-007 upload flag** | HW + VIDEO with custom name; fallback; collision `_2`; retry same key; Activity Date folder |
| **FUT-009 rename** | T1–T14 in [FUT-009 brief §9](./FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md#9-test-matrix-dev--disposable-records) |
| **Viewer regression** | GET after rename → 302; token unchanged |
| **022 writeback** | VF **Video URL or Drive Link** = Reviewer URL |
| **XP safety** | 113/114 no duplicate events |
| **FUT-010 regex** | New + grandfathered key shapes pass verify |
| **Email contracts** | 071/073/072 display Custom Video File Name; secure URL classifier |

### 11.3 DEV evidence artifacts

| File | Content |
|------|---------|
| `docs/testing/evidence/fut-007/` | Upload-flag basename proofs |
| `docs/testing/evidence/fut-009/` | Rename copy-on-write proofs |

---

## 12. Unresolved Mike decisions

Consolidated from FUT-007 + FUT-009 briefs. **FUT-009 implementation is blocked on §12.1–§12.3**; FUT-007 upload flag can proceed in DEV independently with Gen B-compatible folder tree.

| # | Decision | Brief recommendation |
|---|----------|---------------------|
| 1 | **Folder layout** (FUT-009 §4 Options A–D) | **Option D** — prepend `shooting-challenge/` to current tree |
| 2 | **Legacy grandfathering** for FUT-010 verify | Accept Gen B keys **or** `shooting-challenge/` prefix — dual regex |
| 3 | **Date folder authority** on new uploads | **Activity Date** (America/Denver) per FUT-007 — switch with FUT-007 flag |
| 4 | **Rename trigger** | Extension/CLI first; Interface button after DEV proof |
| 5 | **Coach confirmation** before S3 copy | Recommend **explicit confirm** on first production season |
| 6 | **Audit fields** (Previous Storage Key, Renamed At) | Defer to PKG-004; CLI logs suffice for v1 |
| 7 | **Orphan old keys** | Document-only retention; no DeleteObject |
| 8 | **Homework rename in v1** | **Out of scope** — video-only |
| 9 | **FUT-007 vs FUT-009 sequencing** | 9a contract → parallel 9c rename + FUT-007 DEV flag |
| 10 | **Headshot prefix** | Defer to FUT-040; use same basename grammar |
| 11 | **FUT-010 apply vs layout decision** | Resolve layout/regex (9a) before supervised FUT-010 apply |
| 12 | **Upload path default for 2027 season** | Gen B until FUT-007 flag approved **or** require custom name pre-upload |

---

## Appendix A — Field compatibility matrix

| Field | Compatible with contract | Notes |
|-------|-------------------------|-------|
| **Storage Key** | ✓ Primary write target | Updated on upload and rename |
| **Canonical File URL** | ✓ | Derived from Storage Key |
| **Original File Name** | ✓ | Immutable audit |
| **Formatted Upload Name** | ✓ | Should match basename post-sync |
| **Custom Video File Name** | ✓ | Drives `<custom>` segment |
| **Video Asset File Name** | ✓ | Lookup of Original File Name — unchanged |
| **Reviewer File URL** | ✓ | Formula — no change on rename |
| **Reviewer Access Token** | ✓ | Preserve across rename |

---

## Appendix B — References

- Grammar spec: [FUT-007-AWS-MEDIA-NAMING-SPEC.md](./FUT-007-AWS-MEDIA-NAMING-SPEC.md)  
- Rename / layout: [FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md](./FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md)  
- Promotion: [FUT-007-aws-media-naming.md](../../deploy-checklists/FUT-007-aws-media-naming.md)  
- Upload workflow: [upload-workflow-homework-video.md](../../upload-workflow-homework-video.md)  
- Lambda README: [lambda/upload-asset/README.md](../../../lambda/upload-asset/README.md)
