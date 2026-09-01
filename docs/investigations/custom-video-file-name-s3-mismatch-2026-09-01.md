# Investigation: Custom Video File Name → AWS S3 object key mismatch

**Date:** 2026-09-01  
**Status:** Investigation complete — **no production changes made**  
**Repos inspected:** `127-si-shooting-challenge`, `communications` (email display only)  
**Authority:** FUT-007 spec · FUT-008 (field complete) · FUT-009 brief · Master Future Work List

---

## Executive summary

**Observed behavior is consistent with current production design, not a regression.**

When a coach sets **Custom Video File Name** on **Video Feedback**, the **physical S3 object key** still uses the **original client upload filename** because:

1. **Upload runs before the custom name is typically available** (070b → Make → Lambda while Custom is blank).
2. **Production Lambda uses the legacy key builder** (`Original File Name` + UTC + slot + record id) — **FUT-007 is prep code only** (`USE_FUT007_BASENAME` default **off**).
3. **No post-upload rename worker exists** (FUT-009 Phase 3 — brief only; no `CopyObject` in repo).
4. **No automation propagates Custom → S3, SA Storage Key, Video Asset File Name, or email payload** after coach correction.

**Design intent (requirements):** Custom Video File Name should drive **both** parent-facing display **and** the future physical S3 basename (FUT-007 + FUT-009). **Production has not implemented the physical rename path.**

**Issue type:** **True S3 object-key rewrite gap** for post-review custom names, **plus** display/payload wiring gaps in email (073/072) and Lambda viewer download filename. Website game log **already** prefers Custom for display.

---

## 1. Current behavior

| Stage | What happens today |
|-------|-------------------|
| Fillout intake | Video files uploaded with **browser/client original filename** in attachment metadata. **No Custom Video File Name field** on intake. |
| Submission Assets (009) | **Original File Name** ← attachment `filename`. Custom not written. |
| Video Feedback (112/013) | **Video Asset File Name** ← SA **Original File Name** (112). **Custom Video File Name** empty until coach enters it manually. |
| Make handoff (070b) | Minimal JSON: `submissionAssetRecordId`, `targetRecordId`, route metadata — **no filename fields**. |
| Lambda upload | **Storage Key** built from **Original File Name** (legacy). FUT-007 path disabled. |
| Airtable writeback | SA: **Storage Key**, **Canonical File URL**, hash. VF (022): **Video Asset File Name** ← **Original File Name**; Custom unchanged. |
| Coach correction | Mike sets **Custom Video File Name** on VF — **nothing renames S3 or updates Storage Key**. |
| Parent email (073) | Hub payload **`originalFileName`** ← VF **Video Asset File Name** (original upload name). **`customVideoFileName` not sent**. |
| Website game log | **`resolveVideoDisplayFileName()`** prefers **Custom Video File Name** → **Video Asset File Name** fallback. **Display only.** |
| Lambda viewer presign | **Content-Disposition** uses SA **Original File Name**, not Custom. |

**Field inventory (2026-08-31 snapshot):** **Custom Video File Name** on Video Feedback — 111 records, **0 populated** in inventory export (field exists; usage is manual/episodic). **Upload Naming Status** on Submission Assets — 65 records, **0 populated** — pre-upload naming gate not operational.

---

## 2. Expected behavior (project requirements)

From **FUT-008** (Master Future Work List) and **FUT-007 / FUT-009** specs:

| Surface | Expected |
|---------|----------|
| **S3 object key (future uploads)** | FUT-007 basename with **Custom Video File Name** as custom segment when present; extension from original upload. |
| **S3 object key (post-review correction)** | FUT-009 **CopyObject** to new FUT-007 key when coach sets/changes Custom **after** upload; old object retained as orphan. |
| **Airtable audit** | **Original File Name** preserved; **Storage Key** / **Canonical File URL** updated on rename. |
| **Reviewer URL** | Unchanged (`/file/{recId}?token=`) — not filename-based. |
| **Parent email / weekly summary** | Display **Custom Video File Name** first; Hub templates already implement `customVideoFileName` → `originalFileName` precedence. |
| **Website** | Custom preferred (already implemented). |

**Conclusion:** Requirements call for **physical S3 basename alignment**, not display-only Custom. Production is **partially implemented** (field + web display + prep code + briefs).

---

## 3. Complete field / payload flow

### Stage-by-stage trace

| # | Stage | Source field | Destination | Custom preserved? | Notes |
|---|-------|--------------|-------------|-------------------|-------|
| 1 | **Fillout** | Browser file metadata | Submissions **Video Upload** attachment | N/A | No custom name collected at intake. |
| 2 | **009 intake** | Attachment `filename` | SA **Original File Name** | **No** — field not in scope | First persistence of client filename. |
| 3 | **112 VF create** | SA **Original File Name** | VF **Video Asset File Name** | **No** | Custom VF field not set. |
| 4 | **070b webhook** | — | Make JSON (ids only) | **No** | Make fetches SA via Airtable API. |
| 5 | **Make blueprint** | SA **Original File Name** | Lambda POST body | **No** | Blueprint maps **Original File Name** only (no Custom). |
| 6 | **Lambda `resolve_storage_key()`** | SA **Original File Name** | S3 **Storage Key** tail | **No** (prod) | Legacy: `{UTC}_{Slot}_{recId}_{OriginalFileName}`. FUT-007 off. |
| 6b | **Lambda FUT-007 (prep, off)** | VF lookup **Custom Video File Name (from Video Feedback)** *if present* | Basename custom segment | **Maybe** | Lookup field **not in 2026-08-31 schema snapshot**; Custom usually blank at upload time anyway. |
| 7 | **Lambda writeback** | Computed key | SA **Storage Key**, **Canonical File URL** | N/A | Stores full HTTPS URL + key string. |
| 8 | **022 child sync** | SA **Original File Name** | VF **Video Asset File Name** | **No** | Does not read or write **Custom Video File Name**. |
| 9 | **Coach UI** | Manual entry | VF **Custom Video File Name** | **Yes** | After upload/review; no downstream automation today. |
| 10 | **073 email** | VF **Video Asset File Name** | Hub `originalFileName` | **No** | `customVideoFileName` **absent** from payload. |
| 11 | **Comms template** | `customVideoFileName` → `originalFileName` | Email display | **Ready** | Template precedence exists; payload not wired. |
| 12 | **Web game log** | VF **Custom Video File Name** | UI label | **Yes** | `xp-activity-loader.ts` |
| 13 | **Viewer presign** | SA **Original File Name** | Content-Disposition filename | **No** | Download name = original upload. |
| 14 | **FUT-009 rename (not built)** | VF **Custom Video File Name** | New **Storage Key** via CopyObject | **Would yes** | Spec only. |

### Sanitization and extension

| Question | Answer |
|----------|--------|
| Custom sanitized? | **FUT-007 prep:** `sanitize_name_part()` strips unsafe chars; trailing extension stripped from custom segment; **extension always from Original File Name**. |
| Custom includes extension? | Coach may paste with or without; FUT-007 strips trailing extension from custom segment. |
| S3 key timing vs custom | Key computed **at upload**; Custom typically set **after** upload during review → upload cannot see final custom name without reordering workflow or post-upload rename. |
| Duplicate custom names | FUT-007 collision suffix `_2`, `_3` on basename stem. |
| Stable uniqueness | Legacy keys include **record id** in filename segment; FUT-007 **omits** record id from basename (collision suffix instead). |

---

## 4. First point of loss / ignore

Depends on layer:

| Layer | First loss point | File / function |
|-------|------------------|-----------------|
| **Physical S3 key (production)** | Lambda key resolution | `lambda/upload-asset/upload_core/storage_key.py` → `resolve_storage_key()` lines 313–326 — uses **`FIELD_ORIGINAL_FILE_NAME`** when FUT-007 disabled. |
| **Physical S3 key (even if FUT-007 on at upload)** | Upload timing + missing SA lookup | Custom blank at upload; lookup **Custom Video File Name (from Video Feedback)** not confirmed in Production schema. |
| **After coach sets Custom** | No rename step | **Missing automation/worker** — FUT-009 not implemented. |
| **Email display** | Hub handoff payload | `073-...-send-video-feedback-parent-email-webhook.js` → `originalFileName` from **Video Asset File Name** only (lines 596–619). |
| **VF display field sync** | Child writeback | `022-...-sync-child-upload-writeback-from-submission-asset.js` → `buildVideoUploadSyncFields()` copies **Original File Name** to **Video Asset File Name**; never Custom. |
| **Viewer download name** | Presign | `lambda/upload-asset/upload_core/viewer.py` line 193 — **`FIELD_ORIGINAL_FILE_NAME`**. |

**Website is not a loss point** — Custom is read when present.

---

## 5. Display-only vs true S3 rewrite

| | Display-only today | Physical S3 rewrite required |
|--|-------------------|------------------------------|
| **Custom on VF after review** | Web game log | **Yes** — FUT-009 CopyObject + SA writeback |
| **S3 key at initial upload** | N/A (uses original) | **Yes when FUT-007 enabled** — basename uses custom if available at upload time |
| **Email filename label** | Would be display if 073 wired | Label only; **Reviewer File URL** is access path |
| **Storage Key / Canonical URL** | Immutable after upload today | **Must update** on FUT-009 rename |

**Verdict:** User-observed mismatch is a **true S3 object-key rewrite gap** for the common path (custom set during/after coach review). It is **not** merely a display bug — though email/viewer also need display wiring independent of S3.

---

## 6. Security and URL implications

| Concern | Impact of S3 rename (FUT-009 design) |
|---------|--------------------------------------|
| **S3 in-place rename** | **Not supported** — keys are immutable. Correct pattern: **CopyObject** → new key; optionally retain old object. |
| **Reviewer File URL** | **Safe** — URL is `…/file/{SubmissionAssetRecordId}?token={Reviewer Access Token}` (formula on SA). Rename does not change record id or token. |
| **Parent email video link** | **Safe** — 073 uses **Video URL or Drive Link** (Reviewer URL from VF), not S3 key or filename. |
| **Signed/presigned URLs** | Presign uses **current Storage Key** from SA at request time. After writeback updates Storage Key, presign follows new object. Old presigned URLs for old key expire naturally. |
| **Lambda processing / XP / VF links** | **Safe** if rename updates SA only and triggers 022 — no new VF record, no duplicate XP (FUT-009 guardrails). |
| **Canonical File URL** | **Must update** to match new key — ops/audit only; not parent-facing. |
| **FUT-010 attachment cleanup** | Uses **Storage Key** for HeadObject — Gen B keys without `shooting-challenge/` prefix already fail verification; FUT-009 prefix decision affects this. |
| **Audit trail** | **Original File Name** preserved on SA; old S3 object retained as orphan per FUT-009 — no silent delete. |

**Intentional immutability today:** Production treats **Storage Key as write-once at upload** (reuse on retry via `is_reusable_storage_key()`). Post-review rename is a **new capability**, not a bug in immutability logic.

---

## 7. Recommended implementation approach

### Phase A — Low risk, no S3 changes (FUT-008 wiring)

1. **073:** Add `customVideoFileName` from VF **Custom Video File Name** to Hub payload (Hub templates ready).
2. **072:** Include Custom in weekly video list entries.
3. **022 (optional):** When VF **Custom Video File Name** is set and differs from **Video Asset File Name**, sync display field or teach downstream to prefer Custom (avoid overwriting Custom with original on every 022 run).
4. **Viewer (optional):** Content-Disposition from Custom when present on linked VF.

### Phase B — FUT-007 enable (new uploads only)

1. Add SA lookup **Custom Video File Name (from Video Feedback)** if not in Production (schema change — Mike approval).
2. Enable `USE_FUT007_BASENAME=1` in DEV Lambda; run checklist `docs/deploy-checklists/FUT-007-aws-media-naming.md`.
3. Align **Formatted Upload Name** formula (when field exists) with FUT-007 basename.
4. **Pre-upload custom:** Only helps if coach sets Custom **before** 070b fires — uncommon with current correction UI timing.

### Phase C — FUT-009 rename worker (post-review physical rename)

1. Build rename worker per `docs/next-wave/aws-media/FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md` §5.
2. Trigger when VF **Custom Video File Name** set/changed, SA **Uploaded**, custom basename ≠ current Storage Key tail.
3. **CopyObject** → update SA **Storage Key** + **Canonical File URL** → trigger **022**.
4. DRY_RUN default; no **DeleteObject** on old key.

**Sequencing:** A (immediate value) → B DEV proof → C Production rename.

---

## 8. Recommended fallback behavior

| Condition | Fallback (per FUT-007 §7.1) |
|-----------|----------------------------|
| Custom blank at upload | **Video Feedback Focus** + **Asset Sequence** (e.g. `FormShooting1`) |
| Focus blank | `Video{sequence}` or `VideoUpload` |
| Custom has unsafe chars | Sanitize; reject empty → fallback chain |
| Custom duplicates same day | `_2`, `_3` collision suffix |
| Rename worker: custom blank | Skip (`skipped_missing_custom_name`) |
| Rename worker: key already matches | Skip (idempotent) |
| Email: custom blank | **Video Asset File Name** → **Original File Name** (current 073 behavior) |

---

## 9. Required tests

| ID | Test |
|----|------|
| T-1 | Unit: FUT-007 basename uses Custom when present (`test_fut007_basename.py` — exists). |
| T-2 | Unit: `resolve_storage_key()` legacy path uses Original only when flag off. |
| T-3 | Contract: 073 payload includes `customVideoFileName` when VF Custom set (new). |
| T-4 | Contract: Hub `resolveVideoFileName()` precedence (Comms tests — exists). |
| T-5 | Integration DEV: upload with Custom on VF **before** 070b → FUT-007 key contains custom segment. |
| T-6 | Integration DEV: upload without Custom → fallback focus/sequence in key. |
| T-7 | FUT-009 DRY_RUN: CopyObject planned key; SA writeback diff; Reviewer URL unchanged. |
| T-8 | FUT-009: HeadObject verify new key; viewer GET smoke. |
| T-9 | Regression: 022 does not clear Custom when syncing from SA. |
| T-10 | Web: game log still shows Custom when S3 key unchanged (display independent). |

**No production S3 or Airtable mutation tests** without Mike approval and disposable assets.

---

## 10. Backlog placement

| Item | Role |
|------|------|
| **FUT-008** | Field complete; **display wiring incomplete** (073/072/viewer) — extend with Phase A above or new **FUT-008b** wiring slice. |
| **FUT-007** | **New upload S3 basename** — enable after DEV proof; does not fix post-review rename alone. |
| **FUT-009** | **Post-review physical S3 rename** — primary fix for observed mismatch when Custom set after upload. |
| **FUT-010** | Attachment cleanup only — unrelated to naming; blocked on prefix verification. |
| **New item?** | Optional **FUT-008b — Video filename payload wiring** if Mike wants 073/072/viewer split from FUT-009 schedule. |

**Recommendation:** Do **not** open a unrelated new ID for the core S3 rename — it belongs under **FUT-009 Phase 3**. Add **FUT-008b** (or FUT-008 follow-up) for email/viewer payload wiring only.

---

## 11. Required Mike decisions before implementation

1. **Confirm intent:** Physical S3 rename on coach correction is required (vs display-only everywhere except S3 console).
2. **Pre-upload custom:** Should athletes/coaches set Custom **before** upload (Fillout or pre-070b UI), or is post-review rename sufficient?
3. **SA lookup field:** Authorize **Custom Video File Name (from Video Feedback)** on Submission Assets for Lambda FUT-007 path?
4. **FUT-007 Production enable:** Approve DEV proof → Production `USE_FUT007_BASENAME=1` (affects **new** uploads only).
5. **FUT-009 orphan policy:** Confirm old S3 objects retained indefinitely (brief default).
6. **Formatted Upload Name / Upload Naming Status:** Revive C-013 naming formulas or defer to FUT-007 basename only?
7. **073/072 wiring:** Approve automation paste for `customVideoFileName` without waiting for FUT-009?
8. **Rename confirmation:** Require explicit coach “Apply to S3” action vs automatic on Custom field change?

---

## Appendix A — Key file references

| Area | Path |
|------|------|
| SA intake | `airtable/automations/shooting-challenge/009-submission-intake-create-submission-assets.js` |
| VF from asset | `airtable/automations/shooting-challenge/112-video-review-and-xp-create-video-feedback-from-submission-asset.js` |
| Make handoff | `airtable/automations/shooting-challenge/070b-email-notifications-and-external-handoffs-send-video-asset-payload-to-make.js` |
| Child writeback | `airtable/automations/shooting-challenge/022-submission-intake-sync-child-upload-writeback-from-submission-asset.js` |
| Video email | `airtable/automations/shooting-challenge/073-email-notifications-and-external-handoffs-send-video-feedback-parent-email-webhook.js` |
| S3 key legacy | `lambda/upload-asset/upload_core/storage_key.py` → `build_storage_key()`, `resolve_storage_key()` |
| S3 key FUT-007 | `lambda/upload-asset/upload_core/fut007_basename.py` |
| Upload processor | `lambda/upload-asset/upload_core/processor.py` |
| Viewer | `lambda/upload-asset/upload_core/viewer.py` |
| Web display | `web/lib/data/xp-activity-loader.ts` → `resolveVideoDisplayFileName()` |
| Email formatter | `communications/emails/lib/formatters.js` → `resolveVideoFileName()` |
| FUT-007 spec | `docs/next-wave/aws-media/FUT-007-AWS-MEDIA-NAMING-SPEC.md` |
| FUT-009 brief | `docs/next-wave/aws-media/FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md` |
| Make blueprint | `make/blueprints/upload-asset-engine-v2-with-file-hash-duplicate-check.json` |

---

## Appendix B — Production data safety

- **No investigation actions modified** Production S3, Airtable, Make, Lambda, or automations.
- **Existing uploaded videos are safe** — Storage Key immutability is intentional; mismatch is naming expectation vs implementation, not data corruption.
- **Reviewer links remain valid** regardless of filename label mismatch.

---

*End of investigation report.*
