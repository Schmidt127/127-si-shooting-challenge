# C-025 — Automation packages (Stage 17) — repo design only

**Status:** Design COMPLETE — **no Airtable paste / no deploy tonight**
**Date:** 2026-07-13
**Scope:** Repo design package only. No PROD, no OMNI, no Airtable writes, no XP Events, no emails, no Make/Vercel changes.
**Standard:** [`AUTOMATION_SCRIPT_STANDARD.md`](../../airtable/automations/AUTOMATION_SCRIPT_STANDARD.md) + `.cursor/rules/airtable-automation-scripts.mdc`
**Do not rebuild:** the seven Zoom Attendance credit formulas already applied in DEV — see [C-025-Zoom-Recording-Manual-Airtable-Repair.md](./C-025-Zoom-Recording-Manual-Airtable-Repair.md). These automations **consume** those formula outputs; they do not recompute them.

**Credit key (locked):** `ZOOM_CREDIT|{Enrollment RID}|{Zoom Meeting RID}`
**Exclusivity:** Live + Recording cannot both be Approved for the same Enrollment+Meeting pair — `Zoom Credit Conflict?` forces `Zoom Credit Approved?` to 0 for both rows when both exist. This is already true in the applied formula layer.
**XP:** at most one active XP Event per credit key, ever — verified by recheck-before-create.
**Email:** parent approval email only after Satisfactory, only when `Recording Approval Email Enabled?` resolves true; missing/unset config → **no send** (safe default, never assume enabled).

---

## 0. Automation numbering (checked against repo, 2026-07-13)

Existing production scripts in `airtable/automations/shooting-challenge/` run **001–116** (highest file on disk: `116-submission-assets-apply-asset-reuse-decision-consequences.js`; automation-index.md confirms **001–116** as the current allocated range). No numbers in the **117+** band are in use.

Proposed numbers: **117a–117f**, following the existing repo precedent of lettered sub-numbers for a tightly-coupled pipeline stage that shares one numeric slot family (see `070a` / `070b` / `070c` — homework asset payload / video asset payload / async upload verify, all under the "070" family). The six C-025 recording-credit automations are the same shape: one shared numeric family, six ordered stages.

| # | Proposed file | Proposed Airtable automation name |
|---|----------------|-----------------------------------|
| 1 | `117a-zoom-recording-normalize-recording-quiz-submission.js` | 117a - Zoom Recording Credit - Normalize Recording Quiz Submission |
| 2 | `117b-zoom-recording-coach-review-and-needs-correction-handling.js` | 117b - Zoom Recording Credit - Coach Review and Needs Correction Handling |
| 3 | `117c-zoom-recording-create-zoom-xp-event.js` | 117c - Zoom Recording Credit - Create Zoom XP Event |
| 4 | `117d-zoom-recording-apply-zoom-gate-credit.js` | 117d - Zoom Recording Credit - Apply Zoom Gate Credit |
| 5 | `117e-zoom-recording-apply-perfect-week-credit.js` | 117e - Zoom Recording Credit - Apply Perfect Week Credit |
| 6 | `117f-zoom-recording-send-approval-email.js` | 117f - Zoom Recording Credit - Send Approval Email |

Proposed folder: **`17 - Zoom Recording Credit`** (new folder; keeps the recording-credit pipeline distinct from `10 - Zoom Attendance XP` which stays owned by **101**). 101 continues to own live-attendee bulk awarding from the Zoom Meetings side; 117a–117f own the per-Zoom-Attendance-row recording-credit path. Neither script writes fields the other owns.

Common per-automation requirements (all six):

- GitHub header (skip when pasting to Airtable) + production docblock + `// @ts-nocheck`
- `SCRIPT` metadata block (scriptName, version, versionDate, originalWrittenDate, lastUpdated, folder, automationName) separate from `CONFIG` (tables/fields/statuses only — no script identity)
- `async function main()` wrapper, numbered `SECTION N:` blocks, `debugStep` updated + `setOutputSafe`-ed before every major step
- Required outputs: `statusOut` (`success | skipped | error`), `errorOut`, `debugStep`, `actionOut`, plus automation-specific IDs/counters
- Schema validated early (`requireField` / `requireWritableField`); never write formula/rollup/lookup/count fields
- Final `console.log(JSON.stringify({ automation, version, statusOut, actionOut, ... }))` on both success and error paths
- `recordId` input validated non-empty and `startsWith("rec")`

---

## Package map

| # | Automation | Purpose |
|---|-------------|---------|
| 1 | Normalize recording quiz submission | Ensure exactly one Zoom Attendance row exists per Enrollment+Meeting for a quiz submission, in a safe review-pending state |
| 2 | Coach review and Needs Correction handling | Process a coach's review decision on that row; support resubmission without creating a second credit identity |
| 3 | Create Zoom XP Event | Turn an Approved, non-conflicting, positive-amount Zoom Attendance row into exactly one XP Event; deactivate XP if a later conflict zeroes approval |
| 4 | Apply Zoom gate credit | Make an approved recording credit count toward Level Gate Rules `Minimum Zoom Meetings`, same as live |
| 5 | Apply Perfect Week credit | Make an approved recording credit count toward the 057/058 Perfect Week Zoom requirement, same as live |
| 6 | Send approval email | Parent notification once, only after Satisfactory, only when Config allows it |

---

## 1. Normalize recording quiz submission (117a)

| Item | Spec |
|------|------|
| **Version / dates** | `v1.0.0` · versionDate `2026-07-13` · originalWrittenDate `2026-07-13` · lastUpdated `2026-07-13` |
| **PURPOSE** | Find-or-create the one Zoom Attendance row identified by (Enrollment, Zoom Meeting) when an athlete submits recording-quiz proof, and put it into a safe review-pending state. Never creates a second row for a pair that already has one. |
| **SCHEMA DECISION (flag for Mike / Agent A before DEV build)** | Two intake shapes are possible and must be confirmed before implementation: **(A, preferred)** the quiz proof is captured directly on the Zoom Attendance record via an Airtable interface/form (matches the live DEV field set: `Recording Quiz Review Status`, `Recording Quiz Satisfactory?` already exist on Zoom Attendance) — this script only normalizes and dedupes that row. **(B)** proof is captured in a separate intake table (067-style, mirroring `Final Reflection Quiz Submissions` → `Homework Completions`) and this script links/creates the Zoom Attendance row from it. This package designs for **(A)** because it requires zero new tables and the required review-state fields already exist in DEV; **(B)** is documented as a fallback in §1a if Mike wants a raw-answers audit trail separate from the credit row. |
| **TRIGGER** | Zoom Attendance · When record matches conditions: `Attendance Method = Recording Quiz` AND `Recording Quiz Review Status` is empty (first submission) OR meeting's recording quiz identity fields just populated |
| **RECOMMENDED CONDITIONS** | `Enrollment` not empty; `Zoom Meeting` not empty; `Attendance Method = Recording Quiz` |
| **DO NOT USE** | Do not trigger on `Live` attendance rows — this automation only touches `Recording Quiz` rows |
| **INPUT** | `recordId` = Zoom Attendance record id |
| **OUTPUTS** | `statusOut` success\|skipped\|error; `actionOut` = `normalized` \| `skipped_duplicate_pair` \| `skipped_not_recording_quiz` \| `skipped_missing_links` \| `error`; `debugStep`; `zoomAttendanceId`; `enrollmentRid`; `zoomMeetingRid` |
| **DEBUG OUTPUTS** | `debugStep` values: `1 - Validate recordId`, `2 - Load schema`, `3 - Load Zoom Attendance row`, `4 - Resolve Enrollment + Zoom Meeting RID`, `5 - Query sibling rows for pair`, `6 - Normalize review state`, `7 - Write + outputs` |
| **DEPENDENCIES** | Zoom Attendance (self), Zoom Meetings, Enrollments; reads `Enrollment RID` / `Zoom Meeting RID` lookups (already present — do not recreate) |
| **NUMBERED SECTIONS** | 1 Config/CONFIG · 2 Helpers · 3 `assertRequiredSchema()` · 4 `main()`: (a) validate input, (b) load Zoom Attendance row, (c) require Enrollment + Zoom Meeting RID present else `skipped_missing_links`, (d) query all Zoom Attendance rows for the same pair (`Enrollment RID` + `Zoom Meeting RID`), (e) if this row is a **second** row for a pair that already has an older non-blank-review row, mark `skipped_duplicate_pair` and leave the older row as the row of record (do not silently delete — flag for coach), (f) if `Recording Quiz Review Status` blank, set to `Needs Review`; stamp `Recording Quiz Submitted At` (new field, if present) · 5 Outputs/log |
| **IDEMPOTENCY** | Identity = (Enrollment RID, Zoom Meeting RID). Re-running on the same row when already normalized is a no-op (`skipped_already_normalized` variant of `normalized` with no field changes). A true resubmission after Needs Correction updates the **same** row (handled by 117b, not by re-creating here). |
| **ERROR HANDLING** | Missing Enrollment or Zoom Meeting → error (broken data, not a normal skip). Two independent rows already exist for the same pair with conflicting review states → error requesting manual coach merge (never auto-delete a row). |
| **ROLLBACK** | DEV only: delete the mistakenly created test Zoom Attendance row. No XP, no email, no PROD exposure — nothing to roll back downstream. |
| **TEST CASES** | (1) first submission creates Needs Review state; (2) re-run on an already-normalized row is a no-op; (3) second row for an already-open pair is flagged `skipped_duplicate_pair`, not silently merged; (4) missing Zoom Meeting link → error. |

### 1a. Fallback intake shape (Option B, not built unless Mike requests)

If Mike wants raw quiz answers preserved in their own auditable rows (separate from the Zoom Attendance credit row), add a `Zoom Recording Quiz Submissions` table (mirrors `Final Reflection Quiz Submissions` → 067 pattern: Enrollment, Zoom Meeting, Submitted At, raw answer text fields, Processing Status). 117a would then read that table, find-or-create the Zoom Attendance row by (Enrollment, Zoom Meeting), and link both directions — exactly like 067 links `Final Reflection Quiz Submissions` ↔ `Homework Completions`. This is **not** built tonight; it is a schema-approval decision for Mike, not a guess.

---

## 2. Coach review and Needs Correction handling (117b)

| Item | Spec |
|------|------|
| **Version / dates** | `v1.0.0` · versionDate `2026-07-13` · originalWrittenDate `2026-07-13` · lastUpdated `2026-07-13` |
| **PURPOSE** | Process a coach's `Recording Quiz Review Status` decision on a Zoom Attendance row. On **Satisfactory**: set `Recording Quiz Satisfactory?` = true (feeds the already-applied `Zoom Credit Approved?` formula). On **Needs Correction**: clear `Satisfactory?`, stamp correction metadata, and leave the row open for resubmission **without** changing its credit identity (`Zoom Credit Key` is unaffected by review state — it only depends on the two RIDs). |
| **TRIGGER** | Zoom Attendance · When record matches conditions: `Attendance Method = Recording Quiz` AND `Recording Quiz Review Status` changed |
| **RECOMMENDED CONDITIONS** | `Recording Quiz Review Status` is one of `Satisfactory`, `Needs Correction`, `Needs Review` |
| **DO NOT USE** | Do not fire for `Live` rows; do not fire purely on `Satisfactory?` checkbox edits made by this automation itself (guard against retrigger loops by skipping when target value already matches) |
| **INPUT** | `recordId` = Zoom Attendance record id |
| **OUTPUTS** | `statusOut`; `actionOut` = `marked_satisfactory` \| `marked_needs_correction` \| `skipped_unchanged` \| `skipped_not_recording_quiz` \| `error`; `debugStep`; `correctionCount` |
| **DEBUG OUTPUTS** | `debugStep`: `1 - Validate input`, `2 - Load row`, `3 - Read Review Status`, `4 - Compare to current Satisfactory?`, `5 - Branch Satisfactory/Needs Correction`, `6 - Write + notify 117c of drop (implicit via formula)`, `7 - Outputs` |
| **DEPENDENCIES** | `Recording Quiz Review Status`, `Recording Quiz Satisfactory?`, `Coach Feedback` (if present), `Zoom Credit Approved?` / `Zoom Credit Key` (read-only, formula) |
| **NUMBERED SECTIONS** | 1 Config · 2 Helpers · 3 Schema validation · 4 `main()`: (a) validate input, (b) load row + current `Satisfactory?`, (c) skip if `Attendance Method != Recording Quiz`, (d) if `Review Status = Satisfactory` and `Satisfactory? != true` → set true, stamp `Reviewed At` / `Reviewed By` if fields exist, (e) if `Review Status = Needs Correction` and `Satisfactory? != false` → set false, increment `Correction Count` (new field, if present), stamp `Needs Correction At`, (f) no-op if already matching (`skipped_unchanged`) · 5 Outputs/log |
| **IDEMPOTENCY** | Rewrites only when the mapped `Satisfactory?` value would actually change (mirrors 063 "skip if already matches" pattern). Resubmission after correction re-enters this same automation on the next status change — same row, same `Zoom Credit Key`, no duplicate credit identity ever created. |
| **ERROR HANDLING** | Unknown/blank `Review Status` value with no mapped action → skip (not an error) with `skipped_unchanged`. Write failure on an existing, schema-validated field → error. |
| **ROLLBACK** | Coach manually reverts `Review Status` in Airtable; automation re-runs and re-syncs `Satisfactory?` to match. No cascading writes to undo (117c reacts to the formula output on its own trigger). |
| **TEST CASES** | (1) `Satisfactory` sets checkbox true once; (2) `Needs Correction` sets checkbox false and increments correction count; (3) resubmission (Needs Correction → Satisfactory again) reuses the same `Zoom Credit Key` — never creates a second Zoom Attendance row; (4) re-running with no status change is `skipped_unchanged`. |

---

## 3. Create Zoom XP Event (117c)

| Item | Spec |
|------|------|
| **Version / dates** | `v1.0.0` · versionDate `2026-07-13` · originalWrittenDate `2026-07-13` · lastUpdated `2026-07-13` |
| **PURPOSE** | Create (or, on a later conflict, deactivate) exactly one XP Event per Zoom Attendance credit identity, reading the already-applied formula outputs (`Zoom Credit Approved?`, `Zoom XP Amount`, `Zoom Credit Key`) — never recomputing percent/conflict/approval logic itself. |
| **TRIGGER** | Zoom Attendance · When record matches conditions: `Zoom Credit Approved? = 1` AND `Zoom XP Amount > 0` |
| **RECOMMENDED CONDITIONS** | `Zoom Credit Key` is not empty; `Zoom Credit Conflict? != 1` |
| **DO NOT USE** | Do not also trigger from Zoom Meetings — this automation is row-scoped (one Zoom Attendance record), unlike **101** which is meeting-scoped (loops all Attendees). The two must never both write the same XP Event; they use disjoint Source Key families (101 keeps `ZOOM_ATTEND_BASE\|...` legacy live keys already awarded historically; 117c only owns rows created after C-025 recording-credit goes live, keyed by `Zoom Credit Key`). |
| **INPUT** | `recordId` = Zoom Attendance record id |
| **SOURCE KEY (locked)** | `ZOOM_CREDIT\|{Enrollment RID}\|{Zoom Meeting RID}` — read directly from Zoom Attendance's own `Zoom Credit Key` field, never rebuilt from raw text. One key per pair regardless of Live vs Recording Quiz, because the conflict formula already guarantees at most one row per pair can show `Approved? = 1` at any moment. |
| **OUTPUTS** | `statusOut`; `actionOut` = `created` \| `updated` \| `deactivated_on_conflict` \| `skipped_exists` \| `skipped_not_approved` \| `skipped_zero_amount` \| `error`; `debugStep`; `xpEventId`; `xpPoints` |
| **DEBUG OUTPUTS** | `debugStep`: `1 - Validate input`, `2 - Load schema`, `3 - Load Zoom Attendance row + credit fields`, `4 - Query existing XP Events by Source Key`, `5 - Branch approved/not-approved`, `6 - Recheck before create`, `7 - Create or deactivate`, `8 - Outputs` |
| **DEPENDENCIES** | XP Events, Enrollments, Zoom Meetings, Zoom Attendance (`Zoom Credit Approved?`, `Zoom XP Amount`, `Zoom Credit Key`, `Zoom Credit Debug`, `Attendance Method`) |
| **NUMBERED SECTIONS** | 1 Config · 2 Helpers (source key, XP Event index by Source Key) · 3 Schema validation · 4 `main()`: (a) validate input, (b) load row, read `Zoom Credit Key` / `Zoom Credit Approved?` / `Zoom XP Amount` / `Zoom Credit Conflict?`, (c) blank key → error (broken RIDs upstream), (d) not approved or amount ≤ 0 → if an active XP Event already exists for this key (approval flipped off after a later conflict), set `Active? = false` on it and return `deactivated_on_conflict`; else `skipped_not_approved` / `skipped_zero_amount`, (e) approved with amount > 0 → **recheck** existing XP Event by Source Key immediately before create (114 pattern), (f) exists and matches → `skipped_exists`; exists but points stale → `updated`; missing → `created` with `XP Reason Public` / `XP Reason Debug` referencing `Zoom Credit Debug`, (g) link `Weekly Athlete Summary` via Enrollment+Week like 101 · 5 Outputs/log |
| **IDEMPOTENCY** | Recheck-before-create; Source Key is the single dedupe identity; never "steal" an XP Event created by another automation (114-style no-stealing guard: if a matching XP Event exists with a **different** source automation stamped in `Awarded By`, do not overwrite silently — error for manual review). |
| **ERROR HANDLING** | Blank `Zoom Credit Key` with a truthy Approved flag (should never happen if formulas are intact) → error, do not create XP off a blank key. Write failure → error, do not clear any trigger flag. |
| **ROLLBACK** | DEV: set the created XP Event `Active? = false` (soft-void); do not delete (append-only ledger rule). No cascading writes — Weekly Athlete Summary totals are formula/rollup, not directly written by this script beyond the standard link. |
| **TEST CASES** | (1) first award creates one XP Event; (2) second run on the same row is `skipped_exists`, no duplicate; (3) conflict (Approved flips to 0 after a sibling row appears) → previously created XP Event is deactivated, not left orphaned; (4) resubmission through 117b that re-reaches Satisfactory reuses the same key — never a second XP Event; (5) zero/blank XP Amount → `skipped_zero_amount`, no XP Event. |

---

## 4. Apply Zoom gate credit (117d)

| Item | Spec |
|------|------|
| **Version / dates** | `v1.0.0` · versionDate `2026-07-13` · originalWrittenDate `2026-07-13` · lastUpdated `2026-07-13` |
| **PURPOSE** | Make an approved **Recording Quiz** credit count toward `Level Gate Rules.Minimum Zoom Meetings` (via `Enrollments.Total Zoom Attendances`), the same way live attendance already does, **only** when the already-applied formula `Zoom Gate Credit Earned?` is checked for that row. Live rows need no action here — coaches already add live attendees to `Zoom Meetings.Attendees` directly, which is what `Total Zoom Attendances` counts today (per **042**). |
| **TRIGGER** | Zoom Attendance · When record matches conditions: `Attendance Method = Recording Quiz` AND `Zoom Gate Credit Earned? = 1` |
| **RECOMMENDED CONDITIONS** | `Zoom Credit Conflict? != 1`; linked `Zoom Meeting` and `Enrollment` both present |
| **DO NOT USE** | Do not run for `Live` rows — gate credit for live attendance already flows through the existing `Zoom Meetings.Attendees` roster with no automation needed. |
| **INPUT** | `recordId` = Zoom Attendance record id |
| **SCHEMA GAP (blocker — confirm before DEV build)** | `Total Zoom Attendances` on Enrollments is read by **042** but its exact source (rollup off `Zoom Meetings.Attendees`, or a different count) is not confirmed in this design pass — **no guessed writable field**. Proposed mechanism, pending Agent A / Mike confirmation: add the recording-credited Enrollment to the linked Zoom Meeting's `Attendees` link field (idempotent add — skip if already present) so the existing (unmodified) `Total Zoom Attendances` counting mechanism picks it up automatically, exactly like a live attendee. This keeps 042/043 untouched. A new tracking checkbox `Gate Credit Applied?` + `Gate Credit Applied At` on Zoom Attendance (proposed, not yet created) records that this script performed the add, so it never double-adds. |
| **OUTPUTS** | `statusOut`; `actionOut` = `linked_attendee_for_gate` \| `skipped_already_applied` \| `skipped_no_gate_credit` \| `skipped_conflict` \| `error`; `debugStep` |
| **DEBUG OUTPUTS** | `debugStep`: `1 - Validate input`, `2 - Load schema`, `3 - Load row + Zoom Gate Credit Earned?`, `4 - Check Gate Credit Applied? flag`, `5 - Load Zoom Meeting Attendees`, `6 - Idempotent add`, `7 - Outputs` |
| **DEPENDENCIES** | Zoom Meetings.`Attendees`, Zoom Attendance.`Zoom Gate Credit Earned?` (formula, read-only), Enrollments |
| **NUMBERED SECTIONS** | 1 Config · 2 Helpers · 3 Schema validation (including the proposed `Gate Credit Applied?` field, guarded with `fieldExists`) · 4 `main()`: (a) validate input, (b) load row, confirm `Attendance Method = Recording Quiz` and `Zoom Gate Credit Earned? = 1`, (c) skip if `Gate Credit Applied?` already true, (d) load linked Zoom Meeting's `Attendees`, (e) if Enrollment already present → mark `Gate Credit Applied? = true` with no roster change (`skipped_already_applied` variant) else add and mark applied · 5 Outputs/log |
| **IDEMPOTENCY** | `Gate Credit Applied?` flag makes the add-once semantics explicit and auditable; the roster add itself is also naturally idempotent (dedupe by record id before writing the link array). |
| **ERROR HANDLING** | Conflict (`Zoom Credit Conflict? = 1`) → skip, never add to roster. Missing Zoom Meeting link → error. |
| **ROLLBACK** | DEV: remove the added Enrollment id from `Zoom Meetings.Attendees` and uncheck `Gate Credit Applied?`. No XP/email side effects from this automation. |
| **TEST CASES** | (1) `Zoom Gate Credit Earned? = 1` on first run adds attendee and sets applied flag; (2) second run is `skipped_already_applied`, no duplicate roster entry; (3) `Zoom Gate Credit Earned? = 0` (Config toggle off) → `skipped_no_gate_credit`, roster untouched; (4) conflict row → `skipped_conflict`. |

---

## 5. Apply Perfect Week credit (117e)

| Item | Spec |
|------|------|
| **Version / dates** | `v1.0.0` · versionDate `2026-07-13` · originalWrittenDate `2026-07-13` · lastUpdated `2026-07-13` |
| **PURPOSE** | Make an approved **Recording Quiz** credit count toward the existing **057** Perfect Week Zoom requirement (`Perfect Week Zoom Attendance Count`, which counts `Zoom Meetings.Attendees` containing the Enrollment for meetings linked to the Week), **only** when Config `Recording Makeup Counts for Perfect Week?` resolves true for that row (already exposed as the applied lookup `Effective Recording Counts for Perfect Week?`). |
| **TRIGGER** | Zoom Attendance · When record matches conditions: `Attendance Method = Recording Quiz` AND `Zoom Credit Approved? = 1` AND `Effective Recording Counts for Perfect Week? = 1` |
| **RECOMMENDED CONDITIONS** | `Zoom Credit Conflict? != 1` |
| **DO NOT USE** | Do not create or touch `Athlete Achievement Unlocks` — that stays owned by **058**. This automation only ensures the underlying `Zoom Meetings.Attendees` roster (057's data source) reflects the recording credit; 057/058 run unmodified afterward. |
| **INPUT** | `recordId` = Zoom Attendance record id |
| **OUTPUTS** | `statusOut`; `actionOut` = `linked_attendee_for_perfect_week` \| `skipped_already_applied` \| `skipped_flag_off` \| `skipped_conflict` \| `error`; `debugStep` |
| **DEBUG OUTPUTS** | `debugStep`: `1 - Validate input`, `2 - Load schema`, `3 - Load row + Effective Recording Counts for Perfect Week?`, `4 - Check Perfect Week Credit Applied? flag`, `5 - Load Zoom Meeting Attendees`, `6 - Idempotent add`, `7 - Outputs` |
| **DEPENDENCIES** | Zoom Meetings.`Attendees`, Zoom Attendance.`Effective Recording Counts for Perfect Week?` (lookup, read-only), **057** (`Perfect Week Zoom Attendance Count`), **058** (unlock creation) — both consumed unmodified |
| **NUMBERED SECTIONS** | 1 Config · 2 Helpers (shared "ensure enrollment in Zoom Meeting Attendees" helper — same shape as 117d, independently flagged) · 3 Schema validation · 4 `main()`: (a) validate input, (b) load row, confirm method/approved/flag, (c) skip if `Perfect Week Credit Applied?` already true, (d) idempotent add to `Zoom Meetings.Attendees` if not already present (may already be true if 117d ran first — that is fine, both flags can independently be true against the same roster add), (e) mark `Perfect Week Credit Applied? = true` · 5 Outputs/log |
| **IDEMPOTENCY** | Independent `Perfect Week Credit Applied?` tracking flag (proposed, separate from 117d's `Gate Credit Applied?`) so the two toggles (`Recording Gives Full Zoom Gate Credit?` vs `Recording Makeup Counts for Perfect Week?`) can be enabled/disabled independently without cross-contaminating each other's audit trail. Adding to `Attendees` twice from two automations is harmless because the add itself is dedupe-by-id, but each automation only ever writes once per its own flag. |
| **ERROR HANDLING** | Conflict → skip. `Effective Recording Counts for Perfect Week?` blank/false → `skipped_flag_off` (Config default is checked, per catalog, so this is the explicit-opt-out path only). |
| **ROLLBACK** | DEV: remove Enrollment from `Zoom Meetings.Attendees` (only if 117d did not also add it for gate credit — check both flags before removing), uncheck `Perfect Week Credit Applied?`. No unlock changes to undo — 058 handles its own idempotency by `Source Key = PERFECT_WEEK|{enrollmentId}|{weekId}`. |
| **TEST CASES** | (1) flag true + approved → attendee added, applied flag set; (2) flag false → `skipped_flag_off`, no roster change, athlete not counted for Perfect Week from recording; (3) already applied → `skipped_already_applied`; (4) conflict → `skipped_conflict`; (5) does not create a duplicate `Athlete Achievement Unlocks` row — that remains 058's job untouched. |

---

## 6. Send approval email (117f)

| Item | Spec |
|------|------|
| **Version / dates** | `v1.0.0` · versionDate `2026-07-13` · originalWrittenDate `2026-07-13` · lastUpdated `2026-07-13` |
| **PURPOSE** | Send the parent "recording quiz approved" notification exactly once per credit identity, only after Satisfactory, only when Config allows it end to end (enabled, timing, template key). Follows the build-then-send + fetch-with-error-body pattern from 072/074/070a. |
| **TRIGGER** | Zoom Attendance · When record matches conditions: `Attendance Method = Recording Quiz` AND `Recording Quiz Satisfactory? = 1` (i.e. after 117b marks it) |
| **RECOMMENDED CONDITIONS** | `Zoom Credit Approved? = 1`; `Zoom Credit Conflict? != 1` |
| **DO NOT USE** | Do not trigger on quiz submission (`Needs Review`) — email is Satisfactory-only per locked rule. Does not alter **071** / video feedback email. |
| **INPUT** | `recordId` = Zoom Attendance record id; `webhookUrl` (Make webhook, from automation input — never hardcoded, per standard) |
| **SAFE DEFAULT (locked)** | If `Recording Approval Email Enabled?` cannot be resolved (Config row missing the field, or field blank) → **do not send**. This is the one place the catalog explicitly departs from "blank defaults to checked" — missing here means **no send**, to avoid ever spamming a parent by accident. |
| **OUTPUTS** | `statusOut`; `actionOut` = `sent` \| `skipped_disabled` \| `skipped_config_missing` \| `skipped_not_satisfactory` \| `skipped_missing_template_key` \| `skipped_already_sent` \| `error`; `debugStep`; `sendKey` |
| **DEBUG OUTPUTS** | `debugStep`: `1 - Validate input`, `2 - Load schema`, `3 - Load row + Config`, `4 - Evaluate send decision`, `5 - Build email package`, `6 - Check prior send key`, `7 - POST to Make webhook`, `8 - Stamp sent + outputs` |
| **DEPENDENCIES** | Config (`Recording Approval Email Enabled?`, `Recording Approval Email Timing`, `Recording Approval Email Template Key`), Enrollments (parent email fields, same as 072/074/076), Make webhook |
| **SEND KEY (locked pattern)** | `ZOOM_REC_EMAIL\|{Enrollment RID}\|{Zoom Meeting RID}` — stored on a new `Recording Approval Email Sent At` / `Recording Approval Email Send Key` field pair on Zoom Attendance (proposed) and rechecked before every send, mirroring 074's idempotent-send pattern. |
| **NUMBERED SECTIONS** | 1 Config · 2 Helpers (send-key builder, safe-default resolver) · 3 Schema validation · 4 `main()`: (a) validate input, (b) load row + active Config row, (c) resolve enabled/timing/template with the safe-default rule, (d) not satisfactory yet → `skipped_not_satisfactory`, (e) already sent (send key present) → `skipped_already_sent`, (f) build package (parent email, athlete name, meeting name, template key) — build step separate from send step per standard, (g) `fetch` webhook with timeout, throw with status + body on failure, **do not clear/stamp sent on failure** (leaves it retryable, 074 pattern), (h) on success stamp `Recording Approval Email Sent At` + send key · 5 Outputs/log |
| **IDEMPOTENCY** | Send key checked before every send; sent timestamp only written after webhook success; retry-safe on failure (nothing is marked sent). |
| **ERROR HANDLING** | Missing parent email on Enrollment → error (broken data, coach must fix Enrollment). Webhook non-2xx → error with response body captured, trigger left in a retryable state. |
| **ROLLBACK** | DEV: no real send target (Make webhook stays DEV/test only per hard rules). To "rollback" a stamped test send, clear `Recording Approval Email Sent At` / send key so it is eligible to resend once the underlying issue is fixed. |
| **TEST CASES** | (1) enabled + satisfactory + template present → sends once; (2) missing enabled config → `skipped_config_missing`, no send; (3) disabled → `skipped_disabled`; (4) not yet satisfactory → `skipped_not_satisfactory`; (5) already sent (duplicate trigger) → `skipped_already_sent`; (6) blank template key → `skipped_missing_template_key`. |

---

## Implementation order (later DEV — not tonight)

1. **117a** normalize (foundation — everything else reads its output state)
2. **117b** coach review / Needs Correction (depends on 117a's row existing)
3. **117c** XP (depends on the already-applied formulas + 117b's Satisfactory write — formulas are **done**, this is the remaining piece)
4. **117d** gate credit (depends on the `Total Zoom Attendances` mechanism confirmation — **blocked pending Agent A / Mike schema confirmation**)
5. **117e** Perfect Week credit (same roster mechanism as 117d, independent Config flag)
6. **117f** email (depends on 117b's Satisfactory write; last because it is parent-facing)

**Tonight:** design + offline contracts only. See `tools/airtable/tests/test_c025_automation_contracts.py` (extends `test_c025_recording_watch_contract.py` and `test_c025_zoom_attendance_formula_repair.py` — no duplicate coverage, each file owns a distinct layer: formula repair → config-driven business rules → automation orchestration).
