# C-023 — DEV OMNI Stage 1 instructions (Mike)

**Date:** 2026-07-12  
**Worker:** A · Overnight V2 Stage 1  
**Base:** DEV `appTetnuCZlCZdTCT` only — **no PROD**  
**Companion:** [C-023-schema-impact-stage1.md](./C-023-schema-impact-stage1.md)

**Hard rule:** Do **not** create new fields without a citation in policy §11, Stage 5 doc, or the DEV schema snapshot. If a field name is not listed below, stop and ask Lead.

---

## Before you start

1. Open **DEV** base `appTetnuCZlCZdTCT` (Shooting Challenge DEV).
2. Confirm you are **not** in Production (`appn84sqPw03zEbTT`).
3. Skim [C-023-production-duplicate-policy.md](./C-023-production-duplicate-policy.md) §12 — pending review does **not** block uploads or XP.
4. Reference snapshot (local, read-only): `airtable/schema/snapshots/c023-stage3-verify-dev/schema_doc_appTetnuCZlCZdTCT_20260710_052425.md`.

---

## Part A — Verify existing C-023 fields (read-only)

**Table:** Submission Assets

Spot-check that these fields exist (do **not** rename or recreate):

### Hash + upload (already on DEV)

- `File Content Hash` (single line text)
- `File Hash Algorithm` (single select — option `SHA-256`)
- `Canonical File URL` (URL)
- `Storage Key` (single line text)
- `Upload Status`, `Uploaded At`
- `Upload Claim Run ID`, `Processing Started At`

### Detection + review (Lambda-written)

- `Exact Hash Match Found?` (checkbox)
- `Same Enrollment Match Found?` (checkbox)
- `Potential Asset Reuse?` (checkbox) ← **queue driver**
- `Asset Reuse Review Primary Reason` (single select)
- `Asset Reuse Review Reasons` (multiple select)
- `Asset Reuse Review Summary` (long text)
- `Duplicate Match Record` (link → Submission Assets, single)
- `Duplicate Match Records (All)` (link → Submission Assets, multiple)
- `Duplicate Match Strength`, `Duplicate Match Notes`, `Duplicate Checked At`, `Duplicate Check Error`

### Mike + consequences

- `Asset Reuse Decision` (single select)
- `Asset Reuse Review Notes`, `Asset Reuse Reviewed At`, `Asset Reuse Reviewed By`
- `Duplicate Resolution Applied?`, `Duplicate Resolution Applied At`, `Duplicate Resolution Error`

**If any field is missing:** Stop — escalate to Lead (Worker A schema conflict). Do not invent replacements.

---

## Part B — Create prior-use lookup fields (OMNI)

**Purpose:** Side-by-side “current vs prior” review without opening two records.

**Table:** Submission Assets  
**Link source:** `Duplicate Match Record` (already exists)

Create **lookups** (not formulas) pulling from the linked prior asset. Suggested names (match policy §11.6):

| New lookup field name | Lookup through | Target field on prior asset |
|----------------------|----------------|----------------------------|
| `Prior Athlete Full Name` | `Duplicate Match Record` | `Athlete Full Name` |
| `Prior Asset Type` | `Duplicate Match Record` | `Asset Type` |
| `Prior Asset Purpose` | `Duplicate Match Record` | `Asset Purpose` |
| `Prior Week` | `Duplicate Match Record` | `Week` |
| `Prior Activity Date` | `Duplicate Match Record` | `Date` |
| `Prior Submission` | `Duplicate Match Record` | `Submission - Linked` |
| `Prior Homework Completion` | `Duplicate Match Record` | `Homework Completions` |
| `Prior Video Feedback` | `Duplicate Match Record` | `Video Feedback` |
| `Prior Original File Name` | `Duplicate Match Record` | `Original File Name` |
| `Prior Canonical File URL` | `Duplicate Match Record` | `Canonical File URL` |
| `Prior Uploaded At` | `Duplicate Match Record` | `Uploaded At` |

**OMNI steps (per field):**

1. Submission Assets → **+** new field → type **Lookup**.
2. Link field: `Duplicate Match Record`.
3. Field to look up: column from table above.
4. Save with exact name from table.

**Do not create** `Duplicate Match Records (All)` rollups in v1 unless you need a count — primary link is enough for Interface.

---

## Part C — Needs Review queue views

### View 1: `Asset Reuse — Pending Review`

1. Submission Assets → **Views** → **Create view** → Grid.
2. Name: `Asset Reuse — Pending Review` (exact).
3. **Filter** (add all conditions):

   ```
   Potential Asset Reuse?  is  checked

   AND

   OR(
     Asset Reuse Decision  is  Not Reviewed,
     Asset Reuse Decision  is empty
   )
   ```

   > **Why OR with empty:** Lambda may leave decision blank before first write; `Not Reviewed`-only filter hides rows (policy §19).

4. **Sort:** `Uploaded At` → newest first.
5. **Show fields** (hide clutter elsewhere):

   | Column | Purpose |
   |--------|---------|
   | `Submission Assets Full Name` | Row identity |
   | `Athlete Full Name` | Who |
   | `Asset Purpose` | HW1/HW2/VF |
   | `Week` | Program week |
   | `Asset Reuse Review Primary Reason` | Why flagged |
   | `Asset Reuse Review Summary` | Human summary |
   | `Duplicate Match Record` | Link to prior |
   | `Prior Athlete Full Name` (after Part B) | Quick prior context |
   | `Prior Week` | Comparison |
   | `Canonical File URL` | Current file |
   | `Prior Canonical File URL` | Prior file |
   | `Asset Reuse Decision` | Mike sets here |
   | `Uploaded At` | When uploaded |

6. **Color** (optional): record color when `Asset Reuse Review Primary Reason` contains `Homework Used for Video Feedback` or `Video Feedback Used for Homework`.

### View 2: `Asset Reuse — Reviewed`

1. Duplicate view from Pending or create new Grid view.
2. Name: `Asset Reuse — Reviewed` (exact).
3. **Filter:**

   ```
   Potential Asset Reuse?  is  checked

   AND

   Asset Reuse Decision  is not empty

   AND

   Asset Reuse Decision  is not  Not Reviewed
   ```

4. **Sort:** `Asset Reuse Reviewed At` → newest first (blank last).
5. **Show fields:** Decision, Reviewed At, Reviewed By, Review Notes, Primary Reason, Summary, both canonical URLs, resolution fields (`Duplicate Resolution Applied?`).

### View 3 (optional ops): `Asset Reuse — Hash Matches (Informational)`

- Filter: `Exact Hash Match Found?` is checked.
- Use for cross-enrollment informational matches where `Potential Asset Reuse?` may be **unchecked**.

---

## Part D — Interface: `Asset Reuse Review` (OMNI)

Build after Parts B + C.

### Layout

| Zone | Content |
|------|---------|
| **Header** | `Asset Reuse Review Summary` (large text) |
| **Left — Current use** | Athlete Full Name, Asset Purpose, Asset Type, Week, Date, Submission - Linked, Homework Completions / Video Feedback, Original File Name, Canonical File URL, Uploaded At, File Content Hash (read-only) |
| **Right — Prior use** | All `Prior *` lookups from Part B + open `Duplicate Match Record` as linked record |
| **Footer — Mike actions** | `Asset Reuse Decision`, `Asset Reuse Review Notes`, `Asset Reuse Reviewed At`, `Asset Reuse Reviewed By` |
| **Read-only badges** | `Asset Reuse Review Reasons`, `Exact Hash Match Found?`, `Same Enrollment Match Found?`, `Duplicate Resolution Applied?` |

### Interface filter

Same as **Pending Review** view filter — Interface is for open decisions only.

### Buttons / links to include

- Open current Submission Asset record
- Open `Duplicate Match Record` (prior asset)
- Open linked Homework Completion or Video Feedback (current)
- Open `Prior Homework Completion` / `Prior Video Feedback` when populated
- Open `Canonical File URL` and `Prior Canonical File URL` in new tab

### Decision guidance (display text block for Mike)

Copy into Interface description:

> **Not Reviewed** — processing normally; no XP change.  
> **Allowed — Legitimate Reuse** / **Allowed — Correction/Resubmission** — clear queue; no 116 consequences.  
> **Confirmed Duplicate** — triggers automation **116** (0 XP consequences on linked HC/VF). Evidence retained.  
> **Unable to Determine** / **Resolved — Duplicate Record Error** — no consequences; may clear queue.

---

## Part E — Homework / Video display fields (if missing)

**Only if not already on DEV** per [C-023-dev-stage5-duplicate-consequences.md](./C-023-dev-stage5-duplicate-consequences.md):

### Homework Completions

1. Lookup `Linked Asset Reuse Decision` → through `Submission Assets` → field `Asset Reuse Decision`.
2. Formula `Activity XP Display Label` — show `Confirmed Duplicate — 0 XP` when lookup = `Confirmed Duplicate`; otherwise existing XP label logic.

### Video Feedback

1. Lookup `Linked Asset Reuse Decision` → through `Submission Asset` → `Asset Reuse Decision`.
2. Same `Activity XP Display Label` pattern.

**Do not** edit XP formulas or 065/114 triggers in this task.

---

## Part F — Smoke test (DEV, manual)

Use a known H3 matrix asset or fresh upload with duplicate bytes.

| Step | Expect |
|------|--------|
| 1 | Asset shows `Upload Status` = `Uploaded` |
| 2 | `File Content Hash` populated; `File Hash Algorithm` = `SHA-256` |
| 3 | If same-enrollment contextual match: `Potential Asset Reuse?` checked |
| 4 | Row appears in **Pending Review** view |
| 5 | Prior lookups populate when `Duplicate Match Record` set |
| 6 | Set `Asset Reuse Decision` = `Allowed — Legitimate Reuse` → row leaves Pending, appears in Reviewed |
| 7 | Set `Confirmed Duplicate` on test fixture only → 116 runs; check `Duplicate Resolution Applied?` |

**Do not** delete test assets or S3 objects.

---

## Part G — Explicitly out of scope (Mike / OMNI)

| Action | Why |
|--------|-----|
| Create new single-select reason codes | Must match Lambda code + DEV options exactly |
| Rename `Potential Asset Reuse?` or `Asset Reuse Decision` | Breaks Lambda, views, 116 |
| Add formula that blocks `Send to Make Trigger` on reuse | Forbidden — uploads must continue |
| Enable 070a on PROD | Lead approval only |
| Delete legacy `File is Duplicate?` column | Deprecate writer only; column may hold history |
| PROD schema changes | Stage 6 gate |

---

## Quick reference — queue filter formula

For custom extensions, canonical pending predicate:

```text
AND(
  {Potential Asset Reuse?},
  OR(
    {Asset Reuse Decision} = "Not Reviewed",
    {Asset Reuse Decision} = BLANK()
  )
)
```

---

## Related automations (do not edit triggers tonight)

| # | When | C-023 role |
|---|------|------------|
| **070a** | Homework send to Make | No reuse gate; Lambda writes review fields after upload |
| **022** | Child sync on Uploaded | Unaffected by reuse flags |
| **116** | `Asset Reuse Decision` changes | Consequences only after Mike confirms |

---

*Worker A · OMNI-ready steps · DEV only · cite schema before creating fields*
