# C-024 — Dedupe field + automation dependency inventory (Stage 2)

**Date:** 2026-07-12  
**Worker:** A · Overnight V2 Stage 2  
**Branch:** `overnight/v2-run/worker-a-s2-c024-inventory`  
**Base SHA:** `c59dca8` (from `f437d4d` Stage 1 integration)  
**Environment:** Repo documentation only — **no PROD**, **no Airtable API**, **no automations edited**

**Backlog:** C-024 (rock-solid dedupe keys + safe backfill reruns)  
**Sibling layer:** C-023 file-byte hash (`File Content Hash`) — see [C-023-production-duplicate-policy.md](./C-023-production-duplicate-policy.md)

**Authoritative schema sources (read + cite):**

- [airtable/schema/current/field-map.md](../../airtable/schema/current/field-map.md)
- [airtable/schema/current/table-map.md](../../airtable/schema/current/table-map.md)
- [airtable/schema/current/automation-trigger-map.md](../../airtable/schema/current/automation-trigger-map.md)
- [airtable/schema/current/schema-notes.md](../../airtable/schema/current/schema-notes.md)
- Prod snapshot (formula detail): `airtable/schema/snapshots/schema_doc_appn84sqPw03zEbTT_20260629_045741.md`
- Engine principles: [docs/v2-change-backlog.md](../v2-change-backlog.md) § Engine principles
- Homework model: [docs/upload-workflow-homework-video.md](../upload-workflow-homework-video.md) §020 dedupe key

---

## Executive summary

C-024 documents **record-identity** dedupe — Source Key / formula keys — distinct from C-023 **file-byte** dedupe (`File Content Hash`, `Exact Hash Match Found?`). Tonight's inventory covers five tables and thirteen automation writers assigned to Worker A.

**Locked finding:** XP Event writers (**010**, **054**, **059**, **065**, **101**, **114**) all implement **find-by-Source-Key → repair or skip → create** patterns. Unlock writers (**058**, **066**) guard on **Source Key** / **Milestone Source Key**. Intake writers (**007**, **009**) guard on formula keys / `Source Attachment ID`. Upload handoff (**070a/b/c**) blocks legacy Drive URL duplicates but does **not** replace byte-hash or Source Key layers.

**Stage 3 handoff:** Gaps flagged in §6 for Worker D contract + planned `audit-dedupe-key-coverage.js`.

---

## Layer model — C-023 vs C-024

| Layer | Mechanism | Primary fields | Writers |
|-------|-----------|----------------|---------|
| **File bytes (C-023)** | SHA-256 content hash | `File Content Hash`, `File Hash Algorithm`, `Exact Hash Match Found?`, `Potential Asset Reuse?` | Lambda, **116** (consequences only) |
| **Record identity (C-024)** | Source Key / formula dedupe keys | `Source Key`, `XP Dedupe Key`, `Duplicate Key`, `Homework Completion Key`, `Milestone Source Key` | **007–010**, **054–066**, **101**, **114**, **116** (lookup) |
| **Upload transport** | Drive URL / trigger retention | `Google Drive File URL`, `Send to Make Trigger`, `Writeback Complete?` | **070a**, **070b**, **070c** |

Per [schema-notes.md](../../airtable/schema/current/schema-notes.md): *"Idempotent automations — Scripts and Make scenarios must tolerate retries without double-awarding XP."*

---

## 1. Submissions — field inventory

**Table role:** [table-map.md](../../airtable/schema/current/table-map.md) — shooting stats source; triggers XP and duplicate review.

| Field | Type | Writer(s) | Reader(s) | Dedupe role | Citation |
|-------|------|-----------|-----------|-------------|----------|
| `Duplicate Key` | formula | — (computed) | **007** | Stat duplicate identity: Enrollment + Activity Date + Submission Stat Mode + shot columns | Snapshot L1593–1598; **007** docblock L34–48 |
| `Duplicate Review Status` | singleSelect | **007** | `Count This Submission?` formula | Human/automation gate: `Needs Review` / `Count It` / `Exclude It` | Snapshot L1599–1604; **007** docblock L43–48 |
| `Count This Submission?` | formula | — | **010** trigger | Blocks XP when `Needs Review` or `Exclude It` | Snapshot L1611–1616; **010** docblock L68–70 |
| `Submission Key` | singleLineText (if present) | intake | **010** | Legacy XP match fallback alongside `SUBMISSION_XP\|` prefix | **010** CONFIG + legacy match L1107–1112 |
| `XP Events` | link | **010** | audits | Back-link to awarded XP row | [automation-trigger-map.md](../../airtable/schema/current/automation-trigger-map.md) L31 |
| `XP Award Status` | singleSelect | **010** | — | Award state; script allows repair rerun when already Awarded | **010** docblock L94–95 |

**007 key pattern:** Reads `Duplicate Key` (formula); finds other Submissions with same key; writes `Duplicate Review Status`. Does **not** write `Duplicate Key`. Respects `Exclude It` unless `overwriteExcludeIt` debug flag (**007** CONFIG L105–107).

**Gap (C-024 target):** Stat-key duplicates do not consider file hash — cross-check when attachments present ([v2-change-backlog.md](../v2-change-backlog.md) § Engine principles).

---

## 2. Submission Assets — field inventory

**Table role:** [field-map.md](../../airtable/schema/current/field-map.md) § Submission Assets — intake copy + upload/hash + C-023 review.

### 2.1 Intake identity (C-024)

| Field | Type | Writer | Dedupe role | Citation |
|-------|------|--------|-------------|----------|
| `Source Attachment ID` | singleLineText | **009** | Per-submission attachment dedupe — skip create if same ID already on linked Submission | **009** L264–334; field-map L41 |
| `Submission - Linked` | link | **009** | Scopes **009** dedupe set to current submission | **009** CONFIG L76 |
| `Airtable Attachment` | attachment | **009** | Transient intake; not a stable byte key | field-map L43 |

**009 key pattern:** `sourceAttachmentId` from Airtable attachment metadata → `existingAssetKeys` Set per submission → skip if present (**009** L271–334). **No recheck query** — single pass before create batch.

**Gap:** Re-upload same bytes with new attachment ID bypasses **009** guard. C-023 `File Content Hash` is the target layer ([v2-change-backlog.md](../v2-change-backlog.md)).

### 2.2 File-byte layer (C-023 — cross-reference)

| Field | Type | Writer | C-024 interaction |
|-------|------|--------|-------------------|
| `File Content Hash` | singleLineText | Lambda / Make | Byte identity; not used by **009**/**070a** create guards |
| `Exact Hash Match Found?` | checkbox | Lambda | Global byte match flag |
| `Potential Asset Reuse?` | checkbox | Lambda | Same-enrollment contextual warning → manual review |
| `Asset Reuse Decision` | singleSelect | Mike / OMNI | Triggers **116** — not a create dedupe key |

### 2.3 Upload transport dedupe (**070a/b/c**)

| Field | Type | Writer | Dedupe role | Citation |
|-------|------|--------|-------------|----------|
| `Google Drive File URL` | singleLineText | Make (legacy) | **070a/b** block send if URL or File ID already set | **070a** docblock L77; **070b** docblock L68 |
| `Google Drive File ID` | singleLineText | Make | Same as URL guard | **070a** L734–735 |
| `Send to Make Trigger` | checkbox | **070a/b** set; **070c** clear | Retained on failure for safe retry | **070c** docblock L46–50 |
| `Canonical File URL` | url | Lambda writeback | **070c** verifies; idempotent if already complete | field-map L38; **070c** L47–49 |

**070a/b key pattern:** Not Source Key — **URL/File ID presence check** before webhook. Lambda JSON path: `skipped_already_uploaded` (**070a** CHANGELOG L69).

**070c recheck:** Writeback verification independent of trigger state; clears trigger only when writeback passes (**070c** docblock L46–49).

---

## 3. Homework Completions — field inventory

**Table role:** One completion per enrollment + assignment + week (not per file).

| Field | Type | Writer | Dedupe role | Citation |
|-------|------|--------|-------------|----------|
| `Homework Completion Key` | formula | — | Canonical: `Enrollment \| Week \| Homework` | Snapshot L5002–5007; [upload-workflow-homework-video.md](../upload-workflow-homework-video.md) L59 |
| `Enrollment` | link | **020** create | Key component | Snapshot L5013–5018 |
| `Week` | link | **020** create | Key component | automation-trigger-map L47 |
| `Homework` | link | **020** create | Key component (from Submission HW1/HW2 slot) | **020** docblock L35–36 |
| `Submissions - Linked` | link | **020** | **020** match dimension (not in formula key) | **020** findHomeworkCompletionMatch L354–361 |
| `Asset Slot` | singleSelect | **020** | HW1/HW2 slot in **020** match | **020** L360 |
| `XP Events` | link | **065** | One XP per completion via `HOMEWORK_XP\|` | **065** docblock L41–42 |

**020 match pattern (runtime):** `submissionId + homeworkId + slot` with **recheck before create** (**020** docblock L45–46, L650–677). Differs from formula `Homework Completion Key` when multiple submissions same week — **gap** for C-024 canonical key enforcement.

**Gap (C-004 / C-024):** Partial keys / parallel **009** assets can race; **020** recheck mitigates but formula key not written by script. Target: one completion key per enrollment + assignment + week ([v2-change-backlog.md](../v2-change-backlog.md)).

---

## 4. XP Events — field inventory

**Table role:** [table-map.md](../../airtable/schema/current/table-map.md) — append-only ledger; one logical award per business event.

| Field | Type | Writer(s) | Dedupe role | Citation |
|-------|------|-----------|-------------|----------|
| `Source Key` | singleLineText | **010**, **054**, **059**, **065**, **101**, **114** | **Primary automation write key** — scripts query before create | Snapshot L2505–2509; field-map L54 |
| `XP Dedupe Key` | formula | — | `LOWER(enrollmentId \| eventIdentity \| xpSource)` | Snapshot L2521–2527 |
| `XP Dedupe Key Normalized` | formula | — | Normalized `Source Key` or legacy fallbacks | Snapshot L2587+ |
| `Event Identity ID` | formula | — | Derives from Source Key / Submission / Streak / Week links | Snapshot dependency L6944 |
| `Active?` | checkbox | **116** | Deactivate on Confirmed Duplicate; reactivate on reversal | **116** docblock L41–42 |
| `Homework Completion` | link | **065** | Secondary match for homework XP | automation-trigger-map L50 |
| `Video Feedback` | link | **114** | Primary match for video XP | **114** docblock L54 |
| `Achievement Unlock` | link | **059** | Secondary match alongside Source Key | **059** docblock L44 |
| `Streak Occurrence` | link | **054** | Secondary match alongside Source Key | **054** docblock L43 |

[field-map.md](../../airtable/schema/current/field-map.md) documents `Dedupe Key` as `{athleteId}-{source}-{rule}` — live base uses **`Source Key`** + formula **`XP Dedupe Key`** (snapshot is authoritative for prod field names).

---

## 5. Athlete Achievement Unlocks — field inventory

| Field | Type | Writer | Dedupe role | Citation |
|-------|------|--------|-------------|----------|
| `Source Key` | singleLineText | **058** | `PERFECT_WEEK\|{enrollmentId}\|{weekId}` | **058** L264; snapshot (writable on unlocks) |
| `Milestone Source Key` | singleLineText | **066** | `SHOT_MILESTONE\|{enrollmentId}\|{shotMilestoneId}` | **066** docblock L52; snapshot L2964–2968 |
| `Unlock Key` | formula | — (computed) | Composite: Enrollment + Achievement + Week + Shot Milestone + Streak Start Date | Snapshot L2848–2853; **066** L54 do-not-write |
| `XP Events` | link | **059** | One XP per unlock | **059** docblock L44 |
| `XP Award Status` | singleSelect | **058**, **066**, **059** | Pending → Awarded chain | automation-trigger-map L89–90 |

**066 idempotency:** `existingUnlockBySourceKey` Map from query; skip create if `Milestone Source Key` exists (**066** L862–973). Multiple milestones same week = **valid** (distinct keys).

**058 recheck:** Source Key query + composite Enrollment+Week+Achievement fallback (**058** L272–303).

---

## 6. Automation writer matrix

| # | Trigger table | Output table | Source Key / dedupe pattern | Recheck-before-create evidence | Docblock cite |
|---|---------------|--------------|----------------------------|-------------------------------|---------------|
| **007** | Submissions | Submissions | Read `Duplicate Key` formula; write `Duplicate Review Status` | Respects existing `Exclude It` (no overwrite unless debug) | `007-...-duplicate-checker-for-submissions.js` L32–48 |
| **009** | Submissions | Submission Assets | `Source Attachment ID` per linked Submission | Single-pass `existingAssetKeys` Set | `009-...-create-submission-assets.js` L264–334 |
| **010** | Submissions | XP Events | `SUBMISSION_XP\|{submissionId}` (+ legacy `Submission Key`) | Full XP table scan; match Source Key, submission link, XP Dedupe Key | `010-...-create-xp-event.js` L39–41, L187, L560, L1064–1129 |
| **054** | Streak Occurrences | XP Events | `STREAK_XP\|{enrollmentId}\|{achievementId}\|{streakEndDate}` | Match Source Key OR Streak Occurrence link | `054-...-create-or-repair-streak-xp-event.js` L41–42, L397, L720–727 |
| **058** | Weekly Athlete Summary | Athlete Achievement Unlocks | `PERFECT_WEEK\|{enrollmentId}\|{weekId}` | Query unlocks by Source Key; composite Enrollment+Week+Achievement fallback | `058-...-create-perfect-week-unlock.js` L261–303 |
| **059** | Athlete Achievement Unlocks | XP Events | Perfect Week: `PERFECT_WEEK\|{e}\|{w}`; Shot: `SHOT_MILESTONE\|{e}\|{milestoneId}` | Step 10: scan XP by Source Key OR Achievement Unlock link | `059-...-create-xp-event-from-achievement-unlock.js` L44, L549–556, L1224–1254 |
| **065** | Homework Completions | XP Events | `HOMEWORK_XP\|{homeworkCompletionId}` | Linked XP check; then `existingXpEventBySourceKey` query | `065-...-create-homework-xp-event.js` L42, L164, L492, L842–892 |
| **066** | Enrollments | Athlete Achievement Unlocks | `SHOT_MILESTONE\|{enrollmentId}\|{shotMilestoneId}` | `existingUnlockBySourceKey` Map before batch create | `066-...-create-shot-milestone-unlocks.js` L47, L52, L521, L862–973 |
| **101** | Zoom Meetings | XP Events | `ZOOM_ATTEND_BASE\|{zoomMeetingKey}\|{enrollmentId}`; bonus: `ZOOM_ATTEND_BONUS_2\|{enrollmentId}`, `ZOOM_ATTEND_BONUS_3\|{enrollmentId}` | `sourceKeyIndex` Map; supplemental rerun skips attendees with base key | `101-...-award-meeting-xp.js` L34–41, L177–181, L767–815, L806–818 |
| **114** | Video Feedback | XP Events | `VIDEO_SUBMISSION\|{videoFeedbackId}` | `findExistingXpEventOrThrow`; **Step 10a last-chance recheck** before create | `114-...-create-or-update-video-xp-event.js` L49–51, L1193, L893, L1506–1516 |
| **116** | Submission Assets | XP Events (deactivate/restore) | Lookup `VIDEO_SUBMISSION\|{vfId}` or `HOMEWORK_XP\|{hwId}` | Idempotent re-select same decision; reactivate same row on reversal | `116-...-apply-asset-reuse-decision-consequences.js` L41–48, L106–109, L333–346 |
| **070a** | Submission Assets | Make webhook | Drive URL / File ID presence (not Source Key) | Block if URL/ID exists; retain trigger on failure | `070a-...-send-homework-asset-payload-to-make.js` L77, L734 |
| **070b** | Submission Assets | Make webhook | Same as **070a** | Same | `070b-...-send-video-asset-payload-to-make.js` L68, L725 |
| **070c** | Submission Assets | Submission Assets | Writeback field verification | Idempotent success if already verified | `070c-...-verify-async-video-asset-upload.js` L46–49 |

[automation-trigger-map.md](../../airtable/schema/current/automation-trigger-map.md) § Idempotency keys (L154–161) aligns: XP Events use Source Key per **010**, **054**, **059**, **065**, **114**.

---

## 7. Source Key canonical registry (XP + unlocks)

| Prefix / pattern | Writer | Source record | Notes |
|------------------|--------|---------------|-------|
| `SUBMISSION_XP\|{submissionId}` | **010** | Submissions | Legacy `Submission Key` accepted on repair |
| `HOMEWORK_XP\|{homeworkCompletionId}` | **065**, **116** lookup | Homework Completions | One completion → one XP |
| `VIDEO_SUBMISSION\|{videoFeedbackId}` | **114**, **116** lookup | Video Feedback | Never dedupe by enrollment alone (**114** L49–50) |
| `STREAK_XP\|{e}\|{a}\|{streakEndDate}` | **054** | Streak Occurrences | End date in key |
| `PERFECT_WEEK\|{e}\|{w}` | **058**, **059** | Weekly Athlete Summary → Unlock | **058** creates unlock; **059** creates XP |
| `SHOT_MILESTONE\|{e}\|{milestoneId}` | **066**, **059** | Enrollment + Shot Milestone | Multiple per week valid |
| `ZOOM_ATTEND_BASE\|{meetingKey}\|{e}` | **101** | Zoom Meetings + Enrollment | Supplemental attendee add safe |
| `ZOOM_ATTEND_BONUS_2\|{e}` | **101** | Enrollment | One-time bonus |
| `ZOOM_ATTEND_BONUS_3\|{e}` | **101** | Enrollment | One-time bonus |

**C-025 future gap:** Recording attendance needs distinct key from live (`ZOOM_LIVE` vs `ZOOM_RECORDING`) — [v2-change-backlog.md](../v2-change-backlog.md) L248–249.

---

## 8. Gaps flagged for Stage 3 (`audit-dedupe-key-coverage.js`)

| # | Gap | Tables | Suggested audit check | Owner |
|---|-----|--------|----------------------|-------|
| G1 | **009** skips only `Source Attachment ID`, not byte hash | Submission Assets | Rows with same `File Content Hash` + different attachment IDs | Worker D contract |
| G2 | **020** match uses Submission+Homework+Slot; formula `Homework Completion Key` is Enrollment+Week+Homework | Homework Completions | Duplicate completions with same formula key, different submission links | Worker D contract |
| G3 | **007** stat key ignores attachments | Submissions | Submissions with same `Duplicate Key` but different asset hashes | C-023 + C-024 cross-layer |
| G4 | **065** trigger requires empty `XP Events`; repair path relies on Source Key scan — no last-chance recheck before create (unlike **114**) | Homework Completions / XP Events | Pending HW with zero link but existing `HOMEWORK_XP\|` row | Worker C tests |
| G5 | **010** allows rerun when `XP Award Status = Awarded` — verify no duplicate rows if Source Key drift | Submissions / XP Events | Multiple active XP with `SUBMISSION_XP\|` prefix same submission | Audit script |
| G6 | **070a/b** Drive URL guard ≠ S3 `Canonical File URL` guard | Submission Assets | Re-send with Canonical URL set but Drive empty | Worker B retry audit |
| G7 | Unlock `Unlock Key` formula vs writable `Milestone Source Key` / `Source Key` — scripts must not write formula | Athlete Achievement Unlocks | Rows where writable key ≠ formula expectation | Audit script |
| G8 | **101** bonus keys lack meeting dimension — intentional one-time per enrollment | XP Events | Duplicate `ZOOM_ATTEND_BONUS_2\|` rows | Audit script |

---

## 9. Related automations (out of matrix scope, documented for Lead)

| # | Role | Dedupe note |
|---|------|-------------|
| **020** | Homework Completion linker | Recheck-before-create; not in Worker A matrix but feeds **065** / **070a** |
| **053** | Streak Occurrence rebuild | Feeds **054** Source Key inputs |
| **057** | Perfect week eligibility | Feeds **058** trigger |

---

## 10. Acceptance checklist (Worker A)

- [x] Table-per-table field inventory (§1–5)
- [x] Writer matrix with Source Key pattern + recheck evidence (§6)
- [x] Citations to `airtable/schema/current/**` and automation docblocks
- [x] Gaps flagged for Stage 3 audit script (§8)
- [x] C-023 byte layer cross-referenced, not conflated (§Layer model)
- [x] No invented field names without schema citation

---

*Worker A · Overnight V2 Stage 2 C-024 · `overnight/v2-run/worker-a-s2-c024-inventory`*
