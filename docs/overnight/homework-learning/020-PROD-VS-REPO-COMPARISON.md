# Automation 020 — PROD vs prior GitHub comparison

Date: 2026-07-24  
Compared:

| Copy | Path / source |
|---|---|
| **PROD (newly copied)** | Unsaved→saved editor paste into `airtable/automations/shooting-challenge/020-homework-link-or-create-homework-completion.js`; archived as `docs/overnight/homework-learning/020-PROD-v3.0.0-as-copied.js` |
| **Prior GitHub** | `git HEAD` / prior committed `020-homework-link-or-create-homework-completion.js` (`v2.3`) |
| **Deleted 063 (reference)** | Repo `063-homework-review-and-xp-copy-enrollment-grade-band-to-homework-completion.js` (`v2.0`) |

Schema facts used (PROD, as provided):

- `Submissions` has **no** `Grade Band` field.
- `Enrollments.Grade Band` is a **linked-record** field.
- `Homework Completions.Grade Band` is a **linked-record** field.

Scripts were **not** edited for this comparison (beyond preserving the PROD paste already present in the working tree).

---

## 1. Exact version number and date

| | PROD (new) | Prior GitHub |
|---|---|---|
| Version | **v3.0.0** | **v2.3** |
| Date Written | 2026-05-20 | 2026-05-20 |
| Last Updated | **2026-07-14** | **2026-06-28** |
| Extra header | None (production docblock only) | GitHub SoT header: Last Synced From Airtable 2026-06-21; Last GitHub Update 2026-06-28 |
| Docblock note | `Supersedes: separate 063 (copy Enrollment Grade Band → HC)` | No 063 supersession note |

---

## 2. Does PROD read Grade Band from…?

| Source | PROD reads Grade Band? | Notes |
|---|---|---|
| **Homework Completion** | **Yes (read)** | Reads existing HC `Grade Band` to decide blank-repair vs skip (`already_has_grade_band`). |
| **Submission** | **Configured / attempted — field does not exist** | `CONFIG.submissions.gradeBand = "Grade Band"`. `resolveGradeBandIds` prefers `linkedIds(submission, …)` first. `safeFields` omits nonexistent fields from the Submission query, so this path always yields `[]` on current PROD schema. |
| **Enrollment** | **Yes** | Loads `Enrollments` table; `loadEnrollmentGradeBandIds` / blank-repair path copy linked Enrollment → HC. |
| **Weekly Athlete Summary** | **No** | Only copies Submission → `Weekly Athlete Summary Link` onto HC. Does **not** read WAS Grade Band. |

---

## 3. Does PROD repair an existing HC whose Grade Band is blank?

**Yes.**

Paths:

1. **Already linked** asset early-return → `repairHomeworkGradeBandIfBlank(...)` (Enrollment only).
2. **Link existing** match → if HC Grade Band blank, `resolveGradeBandIds` then `setLink` on update.
3. Create path is assignment, not “repair,” but also sets Grade Band when resolvable.

Repair is **blank-only** (does not overwrite a non-empty HC Grade Band).

---

## 4. Does it only assign Grade Band when creating a new HC?

**No.**

PROD assigns/repairs Grade Band on:

- create
- link-existing (blank only)
- already-linked early path (blank only)

Prior GitHub **v2.3** only attempted Grade Band on **create**, and only from `Submissions.Grade Band`.

---

## 5. Does it follow `Submission → Enrollment → Enrollment.Grade Band → HC.Grade Band`?

**Partially / not strictly.**

Intended PROD resolver (`resolveGradeBandIds`):

1. Prefer **Submission.Grade Band** (nonexistent on PROD → always empty)
2. Else **Enrollment.Grade Band**
3. Write to **HC.Grade Band**

Effective runtime path on current PROD schema for create/link:

`Submission Asset → Enrollment (from asset / HC) → Enrollment.Grade Band → HC.Grade Band`

Already-linked repair path skips Submission entirely and uses Enrollment only.

Canonical chain requested (`Submission → Enrollment → Enrollment.Grade Band → HC`) is **not** how the code is written: it never walks Submission→Enrollment for Grade Band; it reads Enrollment from the asset / HC link after a dead Submission Grade Band prefer.

---

## 6. Does it reference nonexistent `Submissions.Grade Band`?

**Yes.**

Evidence in PROD:

- `CONFIG.submissions.gradeBand: "Grade Band"`
- `resolveGradeBandIds({ submissionGradeBandIds: linkedIds(submission, CONFIG.submissions.gradeBand), ... })` on create and link-existing

Mitigation: `safeFields` prevents selecting a missing field; `cell`/`linkedIds` soft-fail to `[]`. So it should **not crash**, but the preference order is wrong for current schema and documents a false dependency.

Prior GitHub **v2.3** also references `CONFIG.submissions.gradeBand` and, on create only, writes `linkedIds(submission, CONFIG.submissions.gradeBand)` with **no Enrollment fallback** — so prior repo create path could leave HC Grade Band blank on PROD.

---

## 7. Does PROD fully replace deleted Automation 063?

### What 063 did (repo `v2.0`)

- Trigger table: **Homework Completions**
- Conditions: Enrollment not empty; Grade Band empty (optional Satisfactory unchecked)
- Action: Enrollment.Grade Band → HC.Grade Band (linked IDs)
- Also wrote Enrollment GB when HC already had a **non-matching** Grade Band (overwrite-if-different)
- Input: `recordId` of HC

### What PROD 020 covers of that job

| 063 capability | PROD 020 |
|---|---|
| Copy Enrollment GB → blank HC | **Yes** (create / link / already-linked) |
| Trigger on any HC matching conditions | **No** — only when a **Submission Asset** runs 020 |
| Overwrite mismatched non-blank HC GB | **No** — blank-only |
| Standalone review-folder automation | **No** — folded into intake script |

---

## 8. Behavior in PROD but missing from prior GitHub `v2.3`

1. Declares supersession of 063; Grade Band purpose/rules in docblock.
2. Loads **Enrollments** table (`CONFIG.tables.enrollments`).
3. Helpers: `loadEnrollmentGradeBandIds`, `resolveGradeBandIds`, `repairHomeworkGradeBandIfBlank`.
4. Blank Grade Band **repair** on already-linked assets.
5. Blank Grade Band **repair** while linking an existing HC.
6. Create-time Grade Band via resolver with **Enrollment fallback** (not Submission-only).
7. New output `gradeBandActionOut` (`copied_grade_band` \| `already_has_grade_band` \| `skipped_no_enrollment_grade_band` \| `skipped_no_enrollment`).
8. New `actionOut` value `repaired_grade_band` (used in code; not listed in the `actionOut` docblock line).
9. Soft-skip when Enrollment has no Grade Band (does not invent).
10. Docblock lists Enrollments among primary tables; writebacks include HC Grade Band create + blank repair.

Shared core otherwise unchanged: asset validation, HW1/HW2 infer, find/create HC, race recheck, multi-candidate preference, Pending Link / Send to Make, upload writeback sync.

---

## 9. Behavior in prior GitHub `v2.3` but absent from PROD

1. GitHub Source-of-Truth header block (sync dates / status).
2. Create path that **unconditionally** `setLink`s HC Grade Band from Submission Grade Band only (no Enrollment fallback) — effectively a weaker / schema-broken create path on PROD.
3. Already-linked / link-existing paths that **never** attempt Grade Band repair (063 remained necessary for blanks).
4. No `gradeBandActionOut` / no Enrollments table usage.

No desirable unique homework-linking behavior was found in `v2.3` that PROD removed (aside from the GitHub header wrapper).

---

## 10. Required Airtable inputs, triggers, field names

### Shared (PROD and prior GitHub)

**Required input variable**

- `recordId` — triggering **Submission Assets** record (`rec…`)

**Recommended trigger table / conditions** (from both docblocks)

- Table: Submission Assets
- Upload Destination is Homework Completions
- Asset Purpose is Homework 1 or Homework 2
- Airtable Attachment is not empty
- Submission - Linked is not empty
- Enrollment - Linked is not empty

**Core field names used for linking (both)**

- Submission Assets: `Submission - Linked`, `Enrollment - Linked`, `Asset Label`, `Upload Destination`, `Asset Purpose`, `Airtable Attachment`, `Homework Completions`, `Original File Name`, `Asset Type`, `Upload Status`, `Upload Error`, `Uploaded At`, `Asset Slot`, Google Drive URL/ID/folder fields, `Send to Make Trigger`
- Submissions: `Enrollment`, `Week`, `Activity Date`, `Weekly Athlete Summary`, `Homework Name 1`, `Homework Name 2` (+ configured `Grade Band` — see below)
- Homework Completions: `Homework`, `Submissions - Linked`, `Upload Status`, `Submission Assets`, `Enrollment`, `Week`, `Grade Band`, `Weekly Athlete Summary Link`, `Submission Date`, `Completion Status`, asset/upload writeback fields, `Item Type` / `Item Slot`, `Review Status`, `Writeback Complete?`

### PROD-only additions

- Table: **Enrollments**
- Field: **Enrollments → `Grade Band`** (linked)
- Output mapping: **`gradeBandActionOut`** (should be mapped in the Airtable script action if operators rely on it)
- `actionOut` may be `repaired_grade_band`

### Schema mismatch to fix in a follow-up (not edited here)

- Remove or stop preferring `CONFIG.submissions.gradeBand` / `Submissions.Grade Band` — field does not exist on PROD.

### Former 063 (deleted) vs PROD trigger gap

- 063 required HC `recordId` and HC trigger conditions (Enrollment present, Grade Band empty).
- PROD does **not** restore that HC-triggered surface; historical blank HCs only get repaired when an asset re-enters 020.

---

## Should the newly copied PROD file replace the old repository file?

**Yes.**

Prior GitHub `v2.3` is stale relative to installed PROD `v3.0.0`, lacks Enrollment Grade Band fallback/repair, and cannot correctly populate HC Grade Band on create under current PROD schema. The preserved PROD paste should become the repository automation source (re-add a GitHub SoT header on a later standards pass; optionally delete `CONFIG.submissions.gradeBand` prefer-path in a dedicated fix).

Preserved archive copy: `docs/overnight/homework-learning/020-PROD-v3.0.0-as-copied.js`  
Working-tree automation path also updated to the same PROD body for source-of-truth alignment.

---

## Classification

`PARTIALLY REPLACES 063`
