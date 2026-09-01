# FUT-007 — AWS media filename naming specification

**Status:** Spec ready (Phase 2) — **do not implement** Lambda, Airtable formulas, or Production deploy from this document alone  
**Canonical ID:** **FUT-007**  
**Date:** 2026-09-01  
**Base SHA:** `7aa44416` (`origin/master`)  
**Branch:** `cursor/fut-007-aws-naming-spec-e772`  
**Related:** FUT-008 (Custom Video File Name field) · FUT-009 (bucket structure + corrected-video rename workflow — **brief ready:** [FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md](./FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md)) · FUT-040 (automatic S3 migration + headshots) · C-013 / C-023 · [upload-workflow-homework-video.md](../../upload-workflow-homework-video.md) · [lambda/upload-asset/README.md](../../../lambda/upload-asset/README.md) · [127-SI-MASTER-FUTURE-WORK-LIST.md](../../127-SI-MASTER-FUTURE-WORK-LIST.md) § FUT-007

---

## 1. Problem statement

Today’s upload Lambda builds the **filename segment** of the S3 object key as:

```text
{UTC}_{AssetSlot}_{SubmissionAssetRecordId}_{OriginalFileName}
```

Example (live builder in `lambda/upload-asset/upload_core/storage_key.py`):

```text
Schmidt_Xavier/Shooting_Challenge_2026-2027/2026-08-17/20260817T172732Z_HW1_recAqoUbBKfDNtTLt_Straughn_Stetson_316.jpg
```

**FUT-007** replaces only the **final filename segment** (the fourth path component) for **future uploads**. Folder prefixes stay under **FUT-009** review; this spec defines the **human-facing basename** and how it relates to the full **Storage Key**.

Goals:

- Parent- and coach-readable names without Airtable record IDs in the filename.
- One grammar for **HW**, **VIDEO**, and future **HEADSHOT** uploads.
- **Custom Video File Name** (FUT-008) drives the descriptive tail for video; homework and headshot have documented fallbacks.
- Record ID, content hash, and audit metadata remain **system fields** — not embedded in the basename.

**Non-goals for this spec:** S3 bucket layout redesign (FUT-009), post-upload rename on coach correction (FUT-009), automatic migration (FUT-040), Production Lambda deploy, retroactive rename of existing objects.

---

## 2. Canonical filename grammar

### 2.1 BNF

```bnf
<basename>     ::= <date> "_" <category> "_" <last> "_" <first> "_" <custom> [ <collision> ] <extension>
<date>         ::= DIGIT DIGIT DIGIT DIGIT DIGIT DIGIT DIGIT DIGIT
<category>     ::= "HW" | "VIDEO" | "HEADSHOT"
<last>         ::= <name_part>
<first>        ::= <name_part>
<custom>       ::= <name_part>
<name_part>    ::= 1*( UPPER | LOWER | DIGIT )   ; after sanitization — no underscores inside a part
<collision>    ::= "_" DIGIT+                     ; only when disambiguation required (§5)
<extension>    ::= "." 1*( LOWER | DIGIT )       ; lowercase; leading dot required in stored filename
```

**Separator:** underscore (`_`) between the six logical segments (date, category, last, first, custom). **No spaces.**

### 2.2 Segment table

| # | Segment | Source | Example |
|---|---------|--------|---------|
| 1 | `YYYYMMDD` | **Activity Date** on linked Submission, interpreted in **`America/Denver`** | `20260817` |
| 2 | Category | Route / asset purpose (§6) | `HW`, `VIDEO`, `HEADSHOT` |
| 3 | Last name | Enrollment → Athlete Last Name | `Boltz` |
| 4 | First name | Enrollment → Athlete First Name | `Drew` |
| 5 | Custom name | Category-specific (§7) | `OffTheDribble`, `ShotChallenge`, `Profile` |
| 6 | Extension | Original upload MIME / filename | `.jpg`, `.mp4`, `.pdf` |

### 2.3 Approved examples (from backlog)

| Category | Full basename (no extension) | With extension |
|----------|----------------------------|----------------|
| HW | `20260817_HW_Boltz_Drew_ShotChallenge` | `20260817_HW_Boltz_Drew_ShotChallenge.jpg` |
| VIDEO | `20260817_VIDEO_Boltz_Drew_OffTheDribble` | `20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4` |
| HEADSHOT | `20260817_HEADSHOT_Boltz_Drew_Profile` | `20260817_HEADSHOT_Boltz_Drew_Profile.jpg` |

---

## 3. Full S3 Storage Key relationship

### 3.1 Key shape (unchanged folder prefix; new filename segment)

```text
{AthleteFolder}/{ProgramInstanceFolder}/{ActivityDateFolder}/{FUT007_Basename}
```

| Path segment | Rule | Example |
|--------------|------|---------|
| `AthleteFolder` | `{LastName}_{FirstName}` — same sanitization as today’s `folder_person_name()` | `Boltz_Drew` |
| `ProgramInstanceFolder` | Program Instance `Name - Program Instance` tokenized | `Shooting_Challenge_2026-2027` |
| `ActivityDateFolder` | `YYYY-MM-DD` from Activity Date (**America/Denver**) | `2026-08-17` |
| `FUT007_Basename` | This spec (§2) | `20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4` |

**Full Storage Key example:**

```text
Boltz_Drew/Shooting_Challenge_2026-2027/2026-08-17/20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4
```

### 3.2 What does **not** go in the filename

| Data | Where it lives |
|------|----------------|
| Submission Asset record ID (`rec…`) | Airtable primary key; **Storage Key** field stores full key; Lambda viewer URL uses record ID in **path**, not filename |
| File content hash (SHA-256) | `Submission Assets.File Content Hash`, `File Hash Algorithm` |
| Upload claim / run ID | `Upload Claim Run ID`, `Processing Started At` |
| Reviewer access token | `Reviewer Access Token` (viewer query param) |
| Original client filename | `Original File Name` (audit) |
| UTC upload timestamp | `Uploaded At` |
| Asset slot / sequence | `Asset Slot`, `Asset Sequence` — used for collision only (§5), not filename prefix |

**Explicit rule:** Never embed `rec…` in the FUT-007 basename. Retry/idempotency continues to reuse the persisted **Storage Key** (existing Lambda behavior).

### 3.3 Date field authority

| Field | Use |
|-------|-----|
| **Activity Date** (Submission) | **`YYYYMMDD`** prefix and `{YYYY-MM-DD}` folder — parent-facing “when they did the work” |
| **Created Time** (Submission Asset) | Audit only under FUT-007; **not** the basename date |
| Missing Activity Date | Fail closed at naming gate (upload must not proceed until date present) — same fail-closed posture as season resolution |

Timezone: **America/Denver** for calendar date extraction (aligns with Weeks / Activity Date conventions in automations **005** / **034**).

---

## 4. Sanitization rules

Shared rules for **last**, **first**, and **custom** name parts (implementation reference: `lib/aws-media-naming/`).

### 4.1 Unicode and ASCII

1. Normalize to **NFKD**.
2. Strip combining marks; transliterate to **ASCII** (non-ASCII dropped, not replaced with `?`).
3. Examples: `José` → `Jose`, `O'Brien` → `OBrien` (apostrophe removed).

### 4.2 Allowed characters (name parts)

After sanitization, each name part contains **only** `[A-Za-z0-9]`.  
**No** underscores, spaces, hyphens, or punctuation inside a part — segments are joined with `_` at build time.

| Input | Sanitized part |
|-------|----------------|
| `Off The Dribble` | `OffTheDribble` |
| `Free-Throws` | `FreeThrows` |
| `ShootingInTheRain` | `ShootingInTheRain` |
| ` (empty) ` | fallback (§7) |

### 4.3 Extension rules

1. Take final path segment of original filename; extract extension.
2. Lowercase; allow `[a-z0-9]` only after the dot.
3. Default if missing/invalid: `.bin`
4. Max extension length: **12** characters (including dot) — matches current Lambda `safe_filename()`.

### 4.4 Max lengths

| Component | Max runes (after sanitization) |
|-----------|-------------------------------|
| Each name part (`last`, `first`, `custom`) | **40** |
| Full basename (excluding extension) | **180** |
| Full Storage Key | **900** bytes (below S3 1024 limit with folder prefix) |

If truncation is required, truncate **custom** first, then **first**, then **last** (never truncate `YYYYMMDD` or category).

### 4.5 Path safety

- Reject `..`, `/`, `\`, `\0` in inputs.
- Basename must not be `.` or `..`.
- Implementation must not allow path traversal in the composed key.

---

## 5. Collision handling

**Collision** = same athlete folder + same activity date folder + identical FUT-007 basename (before extension) for a **new** upload.

| Situation | Behavior |
|-----------|----------|
| Same content hash (C-023) | Duplicate-content review path — **unchanged**; not a naming collision |
| Same basename, different files (e.g. two videos same day same custom name) | Append `_2`, `_3`, … before extension: `…_OffTheDribble_2.mp4` |
| Same basename, retry of **same** Submission Asset | Reuse persisted **Storage Key** — **no** suffix (existing idempotent retry) |
| HW multi-file same assignment same day | Prefer **`Asset Sequence`** as custom fallback before collision suffix (§7) |

**Scope of uniqueness check:** objects under `{AthleteFolder}/{ProgramInstanceFolder}/{ActivityDateFolder}/` with the same basename prefix. Lambda may list prefix or maintain an in-memory set during batch; exact mechanism is Phase 3.

**Collision suffix grammar:**

```text
<basename> "_" <positive_integer> <extension>
```

---

## 6. Category prefix rules (`HW` | `VIDEO` | `HEADSHOT`)

| Category | When | Upload route | Primary Airtable signals |
|----------|------|--------------|---------------------------|
| **HW** | Homework file upload | `070a` · `routeKey=homework_completion` | `Upload Destination = Homework Completions` |
| **VIDEO** | Video feedback upload | `070b` · `routeKey=video_feedback` | `Upload Destination = Video Feedback` |
| **HEADSHOT** | Registration / profile photo | Future route (FUT-040) | `Asset Purpose = Registration Headshot` or dedicated headshot intake — **not live today** |

**Rules:**

1. Category token is **uppercase** literal `HW`, `VIDEO`, or `HEADSHOT` — not `HW1`, `VIDEO-1`, or slot tokens.
2. Do **not** derive category from file extension alone.
3. If signals conflict, fail closed and surface `Upload Error` — do not guess.
4. **HEADSHOT** objects use the same folder prefix pattern; public delivery may differ (CloudFront) per FUT-009/FUT-040 — naming grammar is identical.

---

## 7. Custom name and missing-field fallbacks

### 7.1 VIDEO — `Custom Video File Name`

**Primary source:** linked **Video Feedback → Custom Video File Name** (FUT-008).

| Condition | Custom segment |
|-----------|----------------|
| Custom Video File Name present | Sanitized value (strip extension if coach pasted one) |
| Blank at upload time | Sanitized **Video Feedback Focus** from Submission / VF |
| Focus also blank | `Video` + `Asset Sequence` → e.g. `Video1`, `Video2` |
| All missing | `VideoUpload` |

Coach may set Custom Video File Name **before** upload (pre-upload naming gate) or **after** review (FUT-009 rename workflow — out of scope here).

### 7.2 HW — homework descriptive name

**Custom Video File Name** applies to Video Feedback only. For homework, use:

| Priority | Source |
|----------|--------|
| 1 | Public **Assignment Name** on linked Homework Completion / PHA (presentation field when present) |
| 2 | Linked **Program Homework Assignments** title |
| 3 | `Asset Sequence` → `Hw1`, `Hw2`, `Hw3` |
| 4 | `HomeworkUpload` |

Example backlog mapping: assignment “Shot Challenge” → custom segment `ShotChallenge`.

### 7.3 HEADSHOT

| Priority | Source |
|----------|--------|
| 1 | Coach/admin supplied label (future field — TBD in FUT-040) |
| 2 | Literal **`Profile`** (backlog example) |

### 7.4 Missing athlete name

| Missing | Fallback |
|---------|----------|
| Last name only | `{UnknownLast}_{First}` |
| First name only | `{Last}_{UnknownFirst}` |
| Both | `UnknownAthlete` for **both** segments → basename contains `UnknownAthlete_UnknownAthlete` **or** single folder `Unknown_Athlete` with basename `…_UnknownAthlete_UnknownAthlete_…` — implementers should use **`UnknownAthlete`** per part (see test matrix) |

Upload should **fail closed** if Enrollment / athlete link is missing (same as current Lambda season/athlete resolution).

---

## 8. Backward compatibility

| Rule | Detail |
|------|--------|
| Existing objects | **Never** renamed automatically |
| Legacy key formats | `shooting-challenge/…` and pre-FUT-007 `{UTC}_{Slot}_{recId}_{Original}` keys remain valid; `is_reusable_storage_key()` behavior preserved |
| New uploads only | Feature flag or Lambda version gate in Phase 3 — default **off** until Mike approves DEV proof |
| Test data | Owner-approved deletion of pre-season test uploads before 2027 challenge — no migration script required for FUT-007 alone |
| Display | Web/emails show **Custom Video File Name** / assignment title for humans; **Storage Key** is ops/audit |

---

## 9. Integration points

### 9.1 Upload Lambda (`lambda/upload-asset`)

| Touchpoint | Change (Phase 3) |
|------------|-------------------|
| `upload_core/storage_key.py` | Add FUT-007 builder behind flag; call shared sanitizer/collision helpers |
| `resolve_storage_key()` | If `Storage Key` already reusable → unchanged; else build FUT-007 segment |
| Writeback | `Storage Key`, `Canonical File URL`, hashes — unchanged contract |
| Viewer GET | Uses record ID in URL path + token — **not** filename |

### 9.2 Airtable — Submission Assets

| Field | Role |
|-------|------|
| **Storage Key** | Full S3 key after upload |
| **Formatted Upload Name** | Should match FUT-007 basename (formula or script sync in Phase 3) |
| **Upload Naming Status** | Gate **070a** / **070b** — require FUT-007 segments computable |
| **Original File Name** | Preserved audit |
| **File Content Hash** | C-023 dedupe — independent of basename |

### 9.3 Automations

| Script | Role |
|--------|------|
| **070a** | Homework payload to Make → Lambda; no record ID in proposed basename |
| **070b** | Video payload; ensure VF Custom Video File Name available or fallback documented |
| **070c** | Verifies writeback — no naming logic |
| **022** | Child URL writeback — unchanged |
| **073** / **071** | Email display uses Custom Video File Name / assignment title — not Storage Key |

### 9.4 Web (`web/`)

| Area | Role |
|------|------|
| `xp-activity-loader.ts` | Already reads **Custom Video File Name** for display |
| Homework cards | **Assignment Name** / public assignment resolver (FUT-045) |
| Leaderboard headshots | Future URL field (FUT-040) — basename not shown |

### 9.5 Parent emails

Use presentation fields (**Custom Video File Name**, coach titles, assignment names). Filenames in links are **labels only**; **Reviewer File URL** remains authoritative for access.

---

## 10. Acceptance criteria

1. Future HW upload produces basename matching `YYYYMMDD_HW_{Last}_{First}_{Custom}.{ext}` with no `rec…` in the basename.
2. Future VIDEO upload uses **Custom Video File Name** when set; otherwise documented fallbacks.
3. HEADSHOT category is representable in grammar and tests even before route is live.
4. Sanitization rejects path traversal and normalizes unicode consistently.
5. Collision suffix `_2`, `_3` applies only to **new** distinct uploads; retries reuse Storage Key.
6. Activity Date (**America/Denver**) drives `YYYYMMDD` and date folder — not UTC Created Time.
7. Existing Storage Keys continue to pass FUT-010 verification and viewer access without modification.
8. Shared pure helpers in `lib/aws-media-naming/` match this spec (offline tests pass).

---

## 11. Test matrix (unit-testable)

| # | Input summary | Expected basename (no path) |
|---|---------------|----------------------------|
| T1 | VIDEO · Boltz/Drew · 2026-08-17 · Custom=`OffTheDribble` · `.mp4` | `20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4` |
| T2 | HW · Boltz/Drew · 2026-08-17 · assignment=`Shot Challenge` · `.jpg` | `20260817_HW_Boltz_Drew_ShotChallenge.jpg` |
| T3 | HEADSHOT · Boltz/Drew · 2026-08-17 · no label · `.jpg` | `20260817_HEADSHOT_Boltz_Drew_Profile.jpg` |
| T4 | VIDEO · Custom=`Free-Throws` | `…_FreeThrows.…` |
| T5 | VIDEO · Custom=`  ` · Focus=`Form` · seq=2 | `…_Form2.…` or `…_Video2.…` (Focus `Form` → `Form` + seq `2` = `Form2`) |
| T6 | Last=`O'Brien` · First=`José` | `…_OBrien_Jose_…` |
| T7 | Custom=`../../etc/passwd` | sanitized safe token; no `..` |
| T8 | Collision: same T1 basename exists | `20260817_VIDEO_Boltz_Drew_OffTheDribble_2.mp4` |
| T9 | Retry: Storage Key already set for record | reuse exact key — no `_2` |
| T10 | Missing both names | `…_UnknownAthlete_UnknownAthlete_…` |
| T11 | Basename length overflow | custom truncated first per §4.4 |
| T12 | Category HW from `Upload Destination=Homework Completions` | category token `HW` |

Implementation tests: `lib/aws-media-naming/naming.test.ts` (vitest via `web/npm test`).

---

## 12. Phase 3 implementation slices (not this task)

1. Port helpers to `upload_core/storage_key.py` (or shared JSON contract tests both languages).
2. DEV Lambda deploy + Schmidt test assets.
3. Airtable **Formatted Upload Name** formula alignment.
4. Promotion checklist: [`docs/deploy-checklists/FUT-007-aws-media-naming.md`](../../deploy-checklists/FUT-007-aws-media-naming.md).
5. FUT-009: coach correction rename workflow (may supersede pre-upload custom name).

---

## 13. Open decisions (for FUT-009 / Mike)

**Resolved in FUT-009 brief (Phase 2):** post-review rename → **copy-on-write** (new key, preserve old object, Reviewer URL unchanged on same SA record). Remaining Mike decisions: [FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md](./FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md) §11 (12 items).

| Topic | Default in this spec |
|-------|------------------------|
| Post-review rename to Custom Video File Name | **FUT-009 brief** — copy-on-write; see §5 |
| HEADSHOT upload route table/field | FUT-040 |
| Public headshot CDN path vs private homework/video | **FUT-009 brief** §4 / §6 — basename grammar shared |

---

## 14. References

- Current Lambda key builder: `lambda/upload-asset/upload_core/storage_key.py`
- Upload workflow: `docs/upload-workflow-homework-video.md`
- FUT-010 Storage Key verification: `lib/intake-attachment-cleanup/`
- Pure JS/TS helpers: `lib/aws-media-naming/index.ts`
