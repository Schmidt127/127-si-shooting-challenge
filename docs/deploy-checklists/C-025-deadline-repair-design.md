# C-025 — Deadline repair design (true-date `Calculated Recording Quiz Deadline` + Past Deadline view)

**Status:** APPLIED IN DEV (2026-07-14) — see §8.
**Author:** Agent A (overnight Lead subagent), 2026-07-13; applied Cursor Lead 2026-07-14
**Base:** DEV `appTetnuCZlCZdTCT` only. PROD untouched.
**Depends on:** [C-025-config-linkage-design.md](./C-025-config-linkage-design.md) for the `Effective Recording Makeup Window Days` / `Effective Recording Deadline Mode` config-driven values this formula consumes.

---

## 1. Root cause (verified live, not guessed)

Fetched the live formula for `Calculated Recording Quiz Deadline` on Zoom Meetings (`fldbmg5yT9O2TSqwn`). Its declared **result type is `singleLineText`** — confirming the task's note that this field is "not a true date." The formula text is:

```text
IF({Recording Available At},
  SWITCH({Effective Recording Deadline Mode},
    "Days After Recording Available",
      IF(AND({Recording Available At}, {Effective Recording Makeup Window Days}),
        DATEADD({Recording Available At}, {Effective Recording Makeup Window Days}, 'days'),
        BLANK()
      ),
    "End of Program Week",
      IF({Week}, {Week}),
    "Later of Both",
      IF(AND({Week}, {Recording Available At}, {Effective Recording Makeup Window Days}),
        MAX(DATEADD({Recording Available At}, {Effective Recording Makeup Window Days}, 'days'), {Week}),
        IF({Recording Available At}, DATEADD({Recording Available At}, {Effective Recording Makeup Window Days}, 'days'), {Week})
      ),
    "Earlier of Both",
      IF(AND({Week}, {Recording Available At}, {Effective Recording Makeup Window Days}),
        MIN(DATEADD({Recording Available At}, {Effective Recording Makeup Window Days}, 'days'), {Week}),
        IF({Recording Available At}, DATEADD({Recording Available At}, {Effective Recording Makeup Window Days}, 'days'), {Week})
      ),
    BLANK()
  ),
  {Week}
)
```

**The bug:** every branch that should resolve to "end of program week" references `{Week}` directly. `Week` is the **link field** to the Weeks table (a list of linked-record objects), not a date. Airtable can't `MAX()`/`MIN()`/return a linked-record array as a date, so it silently coerces the whole formula's result to text. There is also **no `Week End Date` field on Zoom Meetings today** (confirmed absent from the live field list) — the formula was written as if one existed and then substituted the raw link when it didn't.

This is a self-contained fix: add the missing `Week End Date` field and swap the four `{Week}` references for it. No other field in this formula is wrong.

---

## 2. Inputs (live-verified names — do not substitute catalog aliases)

| Role | Live field | Table | Type | Status |
|---|---|---|---|---|
| Meeting availability date | `Recording Available At` | Zoom Meetings | dateTime | **Confirmed present** (`fld2AzW975HGKDsEG`) |
| Week end date | `Week End Date` | Zoom Meetings | Lookup (new) | **Does not exist yet — create** |
| ↳ sourced from | `End Date` | Weeks | dateTime | **Confirmed present**, via existing `Week` link (`fldOi0gQkrvoBiuHs`) |
| Window days | `Effective Recording Makeup Window Days` | Zoom Meetings | number | **Confirmed present** (`fldfDKHOn54ZbH7XL`) — becomes config-driven per [config-linkage-design](./C-025-config-linkage-design.md) §4.3, but this deadline formula only ever reads the `Effective *` field, so it is unaffected by whether that field is still manual or newly formula-driven |
| Deadline mode | `Effective Recording Deadline Mode` | Zoom Meetings | singleSelect | **Confirmed present** (`fldnwzUITHTzEeR5n`); live choices confirmed: `Days After Recording Available`, `End of Program Week`, `Later of Both`, `Earlier of Both` |
| Attendance method gate | `Attendance Method` | Zoom Attendance | singleSelect | Confirmed choices: `Live`, `Recording Quiz` |
| Approval gate for the view | `Zoom Credit Approved?` | Zoom Attendance | formula (checkbox result) | Confirmed present, already correct per Formula Repair doc |

No hardcoded season dates appear anywhere in this design — the formula only ever computes relative to `Recording Available At` (per-meeting) and `Week End Date` (per-meeting, via the season's actual Weeks data), never a literal `2026-...` date string.

---

## 3. Step 1 — add `Week End Date` (Zoom Meetings)

1. Table: **Zoom Meetings**.
2. New field: **`Week End Date`**.
3. Type: **Lookup**.
4. Linked-record field: **`Week`**.
5. Source field: Weeks → **`End Date`**.
6. Save. (Purely additive — zero risk, no existing field touched.)

If Meta API schema-write is authorized at implementation time, this is a straightforward `POST` of a `multipleLookupValues` field and is lower-risk than the Config-linkage rollups in the companion design (single hop, no aggregation ambiguity). Still gated by `C-025-dev-omni-implementation` (`auth: explicit_mike`) — **not created here.**

---

## 4. Step 2 — fix the formula (same field, same field ID)

Edit the **existing** `Calculated Recording Quiz Deadline` field's formula text (do not recreate the field — keep `fldbmg5yT9O2TSqwn` so the Zoom Attendance lookup of this field keeps working with no changes on that side):

```airtable
IF(
  OR(
    {Recording Available At} = BLANK(),
    {Attendance Method} != "Recording Quiz"
  ),
  BLANK(),
  SWITCH(
    IF({Effective Recording Deadline Mode} = BLANK(), "Later of Both", {Effective Recording Deadline Mode}),
    "Days After Recording Available",
      DATEADD(
        {Recording Available At},
        IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}),
        'days'
      ),
    "End of Program Week",
      {Week End Date},
    "Earlier of Both",
      IF(
        OR({Week End Date} = BLANK(), {Recording Available At} = BLANK()),
        IF({Week End Date} = BLANK(),
          DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'),
          {Week End Date}
        ),
        MIN(
          DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'),
          {Week End Date}
        )
      ),
    /* Later of Both (default) */
      IF(
        OR({Week End Date} = BLANK(), {Recording Available At} = BLANK()),
        IF({Week End Date} = BLANK(),
          DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'),
          {Week End Date}
        ),
        MAX(
          DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'),
          {Week End Date}
        )
      )
  )
)
```

**Important addition vs. the field's current formula:** the live formula had **no guard** for `Attendance Method != "Recording Quiz"` and no blank-safe default when `Effective Recording Deadline Mode` itself is blank (it fell through `SWITCH(...)` to a bare `BLANK()`, which is fine, but the mode-blank case should resolve to the documented fallback **Later of Both**, not to "no deadline at all" for a Recording Quiz row with a valid `Recording Available At`). Both are fixed above and match the approved fallback: **days → 7, mode → Later of Both**.

### 4.1 After pasting — fix the result type

This is very likely the actual root cause of the "wrong type" bug (in addition to the `{Week}` mix-up): Airtable infers a formula's result type from the branches it can statically analyze, and a formula that ever returns a bare `BLANK()` alongside `DATEADD()`/date values can sometimes get inferred as generic/text rather than Date. After pasting the corrected formula:

1. Open the field editor for `Calculated Recording Quiz Deadline`.
2. Confirm **Formatting** shows **Date** (with **Include a time field** checked, since `Recording Available At` and `Week End Date` are both dateTime) — not "Formula" generic/text.
3. If Airtable does not auto-offer Date formatting, manually set it. This is a UI-only step (Meta API field `options.result` is read-only/derived, not settable directly) — confirm in DEV with a real record before relying on it in the view filter (§5).

### 4.2 Required Airtable adaptations discovered at apply time (2026-07-14)

The §4 formula preserves modes and defaults, but as written it **does not evaluate** against a `multipleLookupValues` `Week End Date`:

| Probe | Result |
|---|---|
| Bare `{Week End Date}` return | API returns an **array**, not a scalar date |
| `MAX`/`MIN` of `DATEADD(...)` and `{Week End Date}` | Evaluates to **blank** |
| `MAX({Week End Date})` alone | Still **blank** |
| `Days After` only (no week-end) | Works; ISO date returned |

**Installed adaptation (logic-equivalent):**

1. Scalarize week end: `DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')`
2. Replace `MAX`/`MIN` with `DATETIME_DIFF(..., 'seconds')` pick (Later ≥ 0 → available+days; Earlier ≤ 0 → available+days)

After that patch, Meta reports formula result type **`date`** (`M/D/YYYY`), and Zoom Attendance lookup `Calculated Recording Quiz Deadline` also reports **`date`**.

**Attendance Method gate note:** the formula lives on **Zoom Meetings** and therefore reads **Zoom Meetings → `Attendance Method`**, not the Zoom Attendance row's method. Deadline values only compute when the **meeting** method is `Recording Quiz` (plus `Recording Available At` set).

Exact installed formula (field names):

```airtable
IF(
  OR(
    {Recording Available At} = BLANK(),
    {Attendance Method} != "Recording Quiz"
  ),
  BLANK(),
  SWITCH(
    IF({Effective Recording Deadline Mode} = BLANK(), "Later of Both", {Effective Recording Deadline Mode}),
    "Days After Recording Available",
      DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'),
    "End of Program Week",
      IF({Week End Date} = BLANK(), BLANK(), DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')),
    "Earlier of Both",
      IF(
        OR({Week End Date} = BLANK(), {Recording Available At} = BLANK()),
        IF({Week End Date} = BLANK(), DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'), DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')),
        IF(
          DATETIME_DIFF(DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'), DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD'), 'seconds') <= 0,
          DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'),
          DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')
        )
      ),
      IF(
        OR({Week End Date} = BLANK(), {Recording Available At} = BLANK()),
        IF({Week End Date} = BLANK(), DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'), DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')),
        IF(
          DATETIME_DIFF(DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'), DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD'), 'seconds') >= 0,
          DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'),
          DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')
        )
      )
  )
)
```

---

## 5. Step 3 — view `Zoom Recording Quiz - Past Deadline` (normal hyphen)

**Naming correction:** prior checklists ([Manual Repair](./C-025-Zoom-Recording-Manual-Airtable-Repair.md) Step D, [Formula Repair](./C-025-Zoom-Recording-Formula-Repair.md) §6) used an em dash: `Zoom Recording Quiz — Past Deadline`. **This design uses a normal hyphen per this task's explicit instruction: `Zoom Recording Quiz - Past Deadline`.** If a view was already created in DEV with the em-dash name, rename it to the hyphen form rather than creating a duplicate — do not leave both.

Table: **Zoom Attendance**
View name: **`Zoom Recording Quiz - Past Deadline`**

Filters (all three, AND):

1. `Attendance Method` **is** `Recording Quiz`
2. `Calculated Recording Quiz Deadline` (true date, post-fix) **is before** `TODAY()`
3. `Zoom Credit Approved?` **is empty** — Airtable checkbox-formula fields render as blank when the formula evaluates to `0`/false, so "is empty" and "is not checked" are the same filter here; use "is empty" for compatibility with the field's formula result type.

Sort (optional): `Calculated Recording Quiz Deadline` ascending.

### 5.1 If the view API is unavailable (confirmed 422 last session) — exact UI steps

1. Open **Zoom Attendance** table in DEV.
2. Click **+** next to the views list (left sidebar) → **Grid view**.
3. Rename the new view to **`Zoom Recording Quiz - Past Deadline`** (normal hyphen — type it directly, don't copy from a doc that may have an em dash).
4. Click **Filter** → **Add condition** three times, matching §5's three filters exactly (field, operator, value as listed).
5. Optional: click **Sort** → add `Calculated Recording Quiz Deadline`, ascending.
6. Confirm the view shows 0 rows if there are currently no past-deadline unapproved Recording Quiz rows in DEV — that is a pass, not a bug (verify with a deliberately backdated fixture row before trusting an empty view).

### 5.2 Leftover artifact found live (report, not deleted)

A field literally named `Zoom Recording Quiz — Past Deadline (view marker)` already exists on Zoom Attendance (`fldr1qhbdGPM4Qct9`, formula, number result 0/1), with formula:

```airtable
AND(
  {Attendance Method} = 'Recording Quiz',
  {Calculated Recording Quiz Deadline} < TODAY(),
  NOT({Zoom Credit Approved?})
)
```

This appears to be a stand-in created during the prior session when the real view's Meta API `POST` returned 422 — it mirrors the intended filter logic as a boolean field instead. Two issues: (1) its name contains a mangled character (likely an em-dash encoding artifact) and doesn't match the required normal-hyphen view name; (2) it currently compares `{Calculated Recording Quiz Deadline} < TODAY()` against a **text-typed** field (see §1), so its `< TODAY()` comparison is unreliable until the date-type fix in §4 lands. **Recommendation (not executed here — avoid deletes per overnight policy):** once the real view exists and the date fix is applied, either delete this marker field or repurpose it as a single-condition filter (`this field = 1`) for the view instead of three separate filter conditions. Leave as-is for now; flag to Mike.

---

## 6. Validation checklist (DEV, after implementation)

- [x] `Week End Date` lookup created, shows the correct `Weeks.End Date` for a sample meeting.
- [x] `Calculated Recording Quiz Deadline` result type is **Date**, not text (Meta `result.type = date`).
- [x] Mode = `Days After Recording Available`, days = 7 → deadline = `Recording Available At` + 7 days exactly.
- [x] Mode = `End of Program Week` → deadline = that meeting's `Week End Date` exactly (not the stringified link).
- [x] Mode = `Later of Both` (default, including blank mode) → deadline = later of available+days vs week end.
- [x] Mode = `Earlier of Both` → deadline = earlier of available+days vs week end.
- [x] Blank `Effective Recording Makeup Window Days` → formula uses 7, not blank/error.
- [x] Blank `Effective Recording Deadline Mode` → formula behaves as `Later of Both`, not blank.
- [ ] Live attendance rows (`Attendance Method` = `Live`) always return blank deadline (guard clause holds) — **meeting**-level Live blanks deadline (verified by formula gate).
- [x] View `Zoom Recording Quiz - Past Deadline` (normal hyphen) **exists** (`viwO4iOrQtWXpAnQY`). Meta API cannot read/set filters — Mike should confirm the three AND filters + sort in UI.
- [ ] `Zoom Credit Debug` shows a real date string post-fix (not re-checked this slice).
- [x] No PROD changes.

---

## 7. Summary of what this document does and does not authorize

- **Does:** Pin down the exact root cause (raw link used instead of an End Date lookup) with the field's live formula text and field IDs; provide a corrected formula that keeps the same field ID; specify the view with the corrected normal-hyphen name and UI fallback steps; flag the leftover marker field.
- **Does not (original design):** Create `Week End Date`, edit the live formula, or create/rename the view. That was gated behind Mike authorization.
- **Live schema changed by the original design document:** none.

---

## 8. Applied state — DEV 2026-07-14

| Item | Value |
|---|---|
| Base | DEV `appTetnuCZlCZdTCT` only |
| `Week End Date` | **Created** `fldmeNbIm6UVQZI9Y` — Lookup `Week` → Weeks.`End Date` |
| `Calculated Recording Quiz Deadline` | **Patched** same ID `fldbmg5yT9O2TSqwn` — formula §4.2; Meta result **`date`** |
| ZA lookup `Calculated Recording Quiz Deadline` | **Unchanged field** `fldJnSfq7APTY3JD5` — now returns **`date`** values |
| View | **Exists** `viwO4iOrQtWXpAnQY` — name `Zoom Recording Quiz - Past Deadline` (hyphen). Filters/sort: confirm in UI |
| Probe field `C025 Schema Write Probe` | **Absent** (Mike deleted) |
| Mode matrix (fixture `reczeUT0AJUWMmEOb`, Available At `2026-07-01`, days 7, Week End `2026-05-31`) | Later → `2026-07-08`; Earlier → `2026-05-31`; End week → `2026-05-31`; Days After → `2026-07-08`; Blank mode → `2026-07-08` |
| Schmidt credit checks | **4/4** (`tools/airtable/_preview/c025_deadline_verify.json`) |
| Fixtures created this slice | Meeting `rech5YbJNUzBRY6LQ` + Live ZA `recRIu3ld00t9AKKR` (live-only credit; no XP Events written by us) |
| Untouched | PROD, XP Event creates, emails, Make, Vercel, AWS, Config linkage, automations 117a–f, Meeting Effective* conversion |
| Apply helpers | `tools/airtable/_c025_deadline_repair_apply.py`, `_c025_deadline_verify.py` |

**Next recommended task:** DEV Config field create + Config→Meeting Effective linkage per [C-025-config-linkage-design.md](./C-025-config-linkage-design.md). Do **not** paste 117a–f until Config linkage lands.
