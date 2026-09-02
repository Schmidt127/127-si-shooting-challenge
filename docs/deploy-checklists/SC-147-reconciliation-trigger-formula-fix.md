# SC-147 — Reconciliation trigger formula fix (Production)

**Backlog:** SC-147 / MRW-H10  
**Date:** 2026-09-02  
**Base:** `appn84sqPw03zEbTT` (`127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026`)  
**Environment:** **Production only** — no DEV base (retired 2026-08-19)  
**Automation:** 101 v6.7 (GitHub merged PR #338; **Production paste pending Mike**)  
**Status:** **Formula fix designed in repository — NOT applied to Production**

> **Do not paste Automation 101 today.** Apply this formula package first (Mike/OMNI), verify scenario 0, then paste 101 v6.7 tomorrow.

---

## Summary

Approved recording-only Zoom Attendance does **not** change `Zoom XP Current Signature` today because PKG-034 signature terms come from **Zoom Meetings** links (`Attendees`, `Create XP Events`, `XP Events`) — not from linked **Zoom Attendance** recording approval state.

**Smallest safe fix:** add three lookups + one formula on **Zoom Attendance**, one rollup on **Zoom Meetings**, and append one term to the existing **`Zoom XP Current Signature`** formula. **No new automation.** **No Attendees writes.** **No schema table changes.**

---

## Current exact Production formulas

Authority: [`docs/pkg-034-zoom-reconciliation-fields.md`](../pkg-034-zoom-reconciliation-fields.md) + schema snapshot `airtable/schema/snapshots/prod-20260831-fut002-batch1/` (field IDs match Production Meta export 2026-08-31).

### Table: Zoom Meetings

| Field | Type | Production field ID |
|-------|------|---------------------|
| `Zoom XP Current Signature` | formula | `fldR6F73pNOboBQSL` |
| `Last Zoom XP Reconciled Signature` | single line text | `fldN8ObYVWOwptoIF` |
| `Zoom XP Reconciliation Needed?` | formula (number) | `fldxpTxg5IJsfGzHU` |
| `Attendees` | link → Enrollments | `fldbkE5FL3vz8bM7H` |
| `Create XP Events` | checkbox | `fldAgk3A2TuUzPiIH` |
| `Zoom Attendance` | link → Zoom Attendance | `fldoS4n9QlLaSQQTc` |
| `XP Events` | link → XP Events | `fld1pUDdnK1wWRfyg` |
| `Zoom XP Enrollment Signature - Lkp` | lookup via Attendees | `fldttxtBTbGOfAUIB` |
| `Zoom XP Week Signature - Lkp` | lookup via Week | `fldCSb6OtPz0prBmK` |
| `Zoom XP Event Signature - Lkp` | lookup via XP Events | `fldxDQKJySP95xU1N` |
| `Week` | link → Weeks | `fldOi0gQkrvoBiuHs` |
| `Start Time` | date/time | `fld1VGAi6PUxMv6aH` |
| `Meeting Status` | single select | `fldacwAjVOVvf6GL3` |
| `Zoom Meeting Key` | formula (= `RECORD_ID()`) | `fldPM4rI6gDjYsTnB` |

#### `Zoom XP Current Signature` (current — do not replace)

```text
RECORD_ID() & "|STATUS=" & {Meeting Status} & "|KEY=" & {Zoom Meeting Key} & "|CREATE=" & IF({Create XP Events},1,0) & "|ATTENDEES=" & ARRAYJOIN({Attendees}) & "|WEEK=" & ARRAYJOIN({Week}) & "|ENR_SIG=" & ARRAYJOIN({Zoom XP Enrollment Signature - Lkp}) & "|WEEK_SIG=" & ARRAYJOIN({Zoom XP Week Signature - Lkp}) & "|EVENT_SIG=" & ARRAYJOIN({Zoom XP Event Signature - Lkp})
```

#### `Zoom XP Reconciliation Needed?` (current — unchanged)

Production includes readiness guards (Week, Start Time, Meeting Status must be non-blank):

```text
IF(
  AND(
    {Week} != BLANK(),
    {Start Time} != BLANK(),
    {Meeting Status} != BLANK(),
    {Zoom XP Current Signature} != BLANK(),
    {Zoom XP Current Signature} != {Last Zoom XP Reconciled Signature}
  ),
  1,
  0
)
```

> PKG-034 doc shows a shorter variant without readiness guards. **Production uses the guarded formula above** (schema snapshot 2026-08-31).

### Table: Zoom Attendance

| Field | Role in SC-147 |
|-------|----------------|
| `Enrollment` | link → Enrollments (`fldWejgvFdZBXjx9c`) |
| `Zoom Meeting` | link → Zoom Meetings (`fldH7CLQYdwFOduuk`) |
| `Attendance Method` | `Live` or `Recording Quiz` (`fldVLhbecKJEVuK69`) |
| `Recording Quiz Satisfactory?` | checkbox — **101 v6.7 gate** (`fld7pi4lBq4TZ7XRd`) |
| `Recording Quiz Review Status` | single select (`fldubXT8wpBSO4HrP`) |
| `Zoom Credit Conflict?` | formula 0/1 — **101 v6.7 gate** (`flduFM1TcM8HSLI7f`) |
| `Zoom Credit Approved?` | formula 0/1 (display/gate credit; 101 uses Satisfactory?) (`fldKqYetPbSwuPQLl`) |
| `Enrollment RID` | lookup via Enrollment → Enrollments.Record Id (`fldRgjQoEpwJZe48B`) |
| `Zoom Meeting RID` | lookup via Zoom Meeting → Zoom Meetings.RecordId (`fldqwFOPxPxJFYRdD`) |
| `Preconflict Pair Tag` | formula `{Enrollment RID}|LIVE` or `|REC` (`fldHGN2ILdr8JUI6H`) |

**Zoom Attendance has no direct link to XP Events.** Pending-vs-credited state must use a **lookup through Zoom Meeting → XP Events → Source Key**.

### Duplicate prevention (101 v6.7 — already in GitHub)

| Mechanism | Value |
|-----------|--------|
| Recording Source Key | `ZOOM_RECORDING_CREDIT\|{EnrollmentId}\|{ZoomMeetingId}` |
| Live Source Key | `ZOOM_ATTEND_BASE\|{Zoom Meeting Key}\|{Enrollment RID}` (Meeting Key = meeting `RECORD_ID()`) |
| Live canonical family | `ZOOM_LIVE\|{ZoomMeetingId}\|{EnrollmentId}` |
| Idempotency | Active XP Event with matching Source Key → skip |
| Live vs recording | Active live key for same meeting+enrollment → skip recording |
| Attendees | Recording viewers must **not** be added to `Attendees` |
| Perfect Week | Recording credit excluded (057 reads live Attendees; `Effective Recording Counts for Perfect Week?` = 0 on meetings) |
| Level/gate | Recording XP Event links Enrollment + Meeting (101 v6.7) |

---

## Current failure mode

When **only** a recording-only Zoom Attendance row changes (e.g. `Recording Quiz Satisfactory?` checked):

| Field / state | Changes? |
|---------------|----------|
| `Zoom Meetings.Attendees` | **No** (by design) |
| `Create XP Events` | **No** (typically unchecked) |
| `Meeting Status` / `Week` / `Key` | **No** |
| `XP Events` on meeting (before award) | **No** |
| `Zoom XP Current Signature` | **No** |
| `Zoom XP Reconciliation Needed?` | **Stays 0** |
| Automation 101 | **Does not run** |

After 101 **does** run and creates a recording XP Event, `EVENT_SIG` changes and reconciliation can settle — but recording-only approval never reaches that path today.

---

## Recommended fix (smallest safe package)

### Design principles

1. **Preserve** the entire existing PKG-034 signature — append one term only.
2. **Token clears** after 101 creates `ZOOM_RECORDING_CREDIT|…` XP Event (lookup sees Source Key → token blank → signature stable).
3. **Token excludes** athletes on `Attendees` (live roster path; no Attendees writes).
4. **Token excludes** rows with conflict rollup, missing RIDs, or existing live/recording XP keys.
5. **No permanent pending** — token is empty when credited or ineligible.

### New fields (create in this order)

#### Step 1 — Zoom Attendance lookups (3 fields)

| # | Field name | Type | Configuration |
|---|------------|------|----------------|
| 1 | `Meeting XP Source Keys - Lkp` | Lookup | Link field: **Zoom Meeting** → Lookup field: **XP Events** → **Source Key** |
| 2 | `Meeting Attendee Enrollment RIDs - Lkp` | Lookup | Link field: **Zoom Meeting** → Lookup field: **Attendees** → **Record Id** |
| 3 | `Meeting Zoom Meeting Key - Lkp` | Lookup | Link field: **Zoom Meeting** → Lookup field: **Zoom Meeting Key** |

#### Step 2 — Zoom Attendance formula (1 field)

| # | Field name | Type |
|---|------------|------|
| 4 | `Recording Pending Reconcile Token` | Formula (single line text) |

**Copy-ready formula:**

```text
IF(
  AND(
    {Attendance Method} = "Recording Quiz",
    {Recording Quiz Satisfactory?},
    {Zoom Credit Conflict?} != 1,
    {Enrollment RID},
    {Zoom Meeting RID},
    OR(
      {Meeting Attendee Enrollment RIDs - Lkp} = BLANK(),
      FIND(
        {Enrollment RID},
        ARRAYJOIN({Meeting Attendee Enrollment RIDs - Lkp}) & ""
      ) = 0
    ),
    FIND(
      "ZOOM_RECORDING_CREDIT|" & {Enrollment RID} & "|" & {Zoom Meeting RID},
      ARRAYJOIN({Meeting XP Source Keys - Lkp}) & ""
    ) = 0,
    FIND(
      "ZOOM_LIVE|" & {Zoom Meeting RID} & "|" & {Enrollment RID},
      ARRAYJOIN({Meeting XP Source Keys - Lkp}) & ""
    ) = 0,
    OR(
      {Meeting Zoom Meeting Key - Lkp} = BLANK(),
      FIND(
        "ZOOM_ATTEND_BASE|" & ARRAYJOIN({Meeting Zoom Meeting Key - Lkp}) & "|" & {Enrollment RID},
        ARRAYJOIN({Meeting XP Source Keys - Lkp}) & ""
      ) = 0
    )
  ),
  {Enrollment RID} & "|" & {Zoom Meeting RID} & "|REC",
  ""
)
```

**Alignment with 101 v6.7 gates:**

| Gate | Formula coverage |
|------|------------------|
| `Recording Quiz Satisfactory?` | Yes |
| `Zoom Credit Conflict?` != 1 | Yes |
| Not on `Attendees` | Yes (lookup) |
| No active `ZOOM_RECORDING_CREDIT` key | Yes (lookup) |
| No active live key (`ZOOM_LIVE` / `ZOOM_ATTEND_BASE`) | Yes (lookup) |
| `Progress Processing Enabled?` | No (101 skips at runtime; rare false wake acceptable) |

#### Step 3 — Zoom Meetings rollup (1 field)

| # | Field name | Type | Configuration |
|---|------------|------|----------------|
| 5 | `Recording Pending Reconcile Tokens` | Rollup | Link field: **Zoom Attendance** → Field: **Recording Pending Reconcile Token** → Aggregation: **ARRAYJOIN(values)** |

Pattern matches existing `Approved Preconflict Pair Tags` rollup (`Zoom Attendance` → `Preconflict Pair Tag`).

#### Step 4 — Edit `Zoom XP Current Signature` on Zoom Meetings

**Append** to the existing formula (do not remove any existing terms):

```text
& "|REC_PENDING=" & IF({Recording Pending Reconcile Tokens}, {Recording Pending Reconcile Tokens}, "")
```

**Complete copy-ready `Zoom XP Current Signature` after edit:**

```text
RECORD_ID() & "|STATUS=" & {Meeting Status} & "|KEY=" & {Zoom Meeting Key} & "|CREATE=" & IF({Create XP Events},1,0) & "|ATTENDEES=" & ARRAYJOIN({Attendees}) & "|WEEK=" & ARRAYJOIN({Week}) & "|ENR_SIG=" & ARRAYJOIN({Zoom XP Enrollment Signature - Lkp}) & "|WEEK_SIG=" & ARRAYJOIN({Zoom XP Week Signature - Lkp}) & "|EVENT_SIG=" & ARRAYJOIN({Zoom XP Event Signature - Lkp}) & "|REC_PENDING=" & IF({Recording Pending Reconcile Tokens}, {Recording Pending Reconcile Tokens}, "")
```

**Do not edit** `Zoom XP Reconciliation Needed?` or `Last Zoom XP Reconciled Signature`.

---

## Why the change is safe

### Wakes recording-only approval

Linked Zoom Attendance update → `Recording Pending Reconcile Token` populated → meeting rollup changes → `Zoom XP Current Signature` changes → `Zoom XP Reconciliation Needed?` = 1 (when Week/Start Time/Status populated and Last differs).

### Resets after 101 reconciles

1. 101 creates XP Event with Source Key `ZOOM_RECORDING_CREDIT|{Enrollment}|{Meeting}` linked to meeting.
2. `Meeting XP Source Keys - Lkp` on Zoom Attendance sees the new key.
3. `Recording Pending Reconcile Token` becomes `""`.
4. `Recording Pending Reconcile Tokens` rollup clears.
5. `EVENT_SIG` also updates (existing PKG-034 path).
6. 101 writes `Last Zoom XP Reconciled Signature` = fresh `Zoom XP Current Signature`.
7. `Zoom XP Reconciliation Needed?` → **0**.

### Does not permanently pend

Token requires **absence** of recording Source Key in meeting XP Events. After credit, token is blank.

### Live behavior unchanged

Live reconciliation still driven by `Attendees`, `Create XP Events`, and `EVENT_SIG`. New term is empty for live-only meetings with no pending recording tokens.

### Perfect Week / level gates unchanged

This package only changes **when 101 runs**. It does not modify Perfect Week formulas, gate rollups, or XP Event write logic.

### No new automation

Existing Automation **101** trigger unchanged: `Zoom XP Reconciliation Needed? = 1`.

---

## Exact Airtable UI steps (Mike / OMNI)

**Preconditions:** Automation **101 OFF** (or approved controlled-test procedure). **Do not paste 101 v6.7 until after formula verification.**

1. Open Production base `appn84sqPw03zEbTT`.
2. **Zoom Attendance** table → create lookups (Step 1 above).
3. **Zoom Attendance** → create formula `Recording Pending Reconcile Token` (Step 2).
4. Wait for formula to settle on existing rows (refresh view).
5. **Zoom Meetings** → create rollup `Recording Pending Reconcile Tokens` (Step 3).
6. **Zoom Meetings** → edit formula `Zoom XP Current Signature` — append `REC_PENDING` term only (Step 4).
7. **Do not** create Automation 121.
8. **Do not** add recording athletes to `Attendees`.
9. Run disposable Production test (below) before pasting 101 v6.7.

---

## Before-and-after example

**Setup (disposable VERIFY/Schmidt):**

- Zoom Meeting `recMEET…` — Week + Start Time + Meeting Status = Completed populated; athlete **not** on `Attendees`; `Create XP Events` unchecked.
- Zoom Attendance `recZA…` — Method = Recording Quiz; linked to meeting + enrollment; `Recording Quiz Satisfactory?` unchecked.

**Before approval:**

| Field | Value |
|-------|-------|
| `Recording Pending Reconcile Token` (ZA) | *(blank)* |
| `Recording Pending Reconcile Tokens` (Meeting) | *(blank)* |
| `Zoom XP Current Signature` | `…\|EVENT_SIG=…` *(no REC_PENDING)* |
| `Zoom XP Reconciliation Needed?` | **0** |

**After check `Recording Quiz Satisfactory?` (no other meeting edits):**

| Field | Value |
|-------|-------|
| `Recording Pending Reconcile Token` (ZA) | `recENR…\|recMEET…\|REC` |
| `Recording Pending Reconcile Tokens` (Meeting) | `recENR…\|recMEET…\|REC` |
| `Zoom XP Current Signature` | `…\|REC_PENDING=recENR…\|recMEET…\|REC` |
| `Zoom XP Reconciliation Needed?` | **1** |

**After 101 v6.7 runs (tomorrow, post-paste):**

| Field | Value |
|-------|-------|
| XP Event Source Key | `ZOOM_RECORDING_CREDIT\|recENR…\|recMEET…` |
| `Recording Pending Reconcile Token` (ZA) | *(blank)* |
| `Zoom XP Reconciliation Needed?` | **0** |
| `Last Zoom XP Reconciled Signature` | equals current signature |

---

## Disposable Production test procedure (run before 101 paste — NOT now)

**Environment:** Production base only. Disposable VERIFY/Schmidt records. **No family-facing email.** **Weeks/schema protected records untouched.**

| Step | Action | Expected |
|------|--------|----------|
| 0 | Apply formula package (101 **OFF**) | Fields exist; formulas valid |
| 1 | Create/find disposable meeting + recording ZA row (athlete **not** on Attendees) | Rows linked |
| 2 | Record baseline: Current Signature, Needed?, token fields | Needed? = 0; token blank |
| 3 | Check `Recording Quiz Satisfactory?` on ZA | Token = `{Enrollment RID}\|{Meeting RID}\|REC` |
| 4 | Refresh meeting | Current Signature includes `\|REC_PENDING=` |
| 5 | Verify meeting | `Zoom XP Reconciliation Needed?` = **1** |
| 6 | **Stop** — do not paste 101 today | — |
| 7 | *(Tomorrow after 101 paste)* Let 101 run on meeting | Half XP Event created; Needed? → 0 |
| 8 | Re-check same ZA row | Token blank; no duplicate XP on re-run |
| 9 | Re-prove live attendee path on separate disposable meeting | Full live XP unchanged |
| 10 | Confirm Perfect Week counts unchanged for recording credit | PW exclusion intact |

**Rollback if test fails:** see below. Do not paste 101 v6.7 until step 5 passes.

---

## Rollback

1. Turn Automation 101 **OFF** (if on).
2. **Zoom Meetings** → restore `Zoom XP Current Signature` to the **pre-edit** formula (remove `REC_PENDING` term only).
3. Delete (only if Mike approves schema removal):
   - `Recording Pending Reconcile Tokens` (Zoom Meetings rollup)
   - `Recording Pending Reconcile Token` (Zoom Attendance formula)
   - Three Zoom Attendance lookups created for this fix
4. **Preserve** `Last Zoom XP Reconciled Signature` values and XP Events — do not delete XP as rollback.
5. Document rollback in `CHANGELOG.md` under `### Airtable` when executed.

**Pre-edit `Zoom XP Current Signature` (rollback target):**

```text
RECORD_ID() & "|STATUS=" & {Meeting Status} & "|KEY=" & {Zoom Meeting Key} & "|CREATE=" & IF({Create XP Events},1,0) & "|ATTENDEES=" & ARRAYJOIN({Attendees}) & "|WEEK=" & ARRAYJOIN({Week}) & "|ENR_SIG=" & ARRAYJOIN({Zoom XP Enrollment Signature - Lkp}) & "|WEEK_SIG=" & ARRAYJOIN({Zoom XP Week Signature - Lkp}) & "|EVENT_SIG=" & ARRAYJOIN({Zoom XP Event Signature - Lkp})
```

---

## Impact analysis

| Area | Impact |
|------|--------|
| Live Zoom XP | **None** — existing signature terms unchanged; live path still Attendees/Create XP Events/EVENT_SIG |
| Recording half-XP | **Enables trigger** — 101 can run when recording approved without Attendees edit |
| Perfect Week | **None** — no formula changes to PW counts or Attendees semantics |
| Level/gates | **None** — gate fields unchanged; 101 still writes XP Events same as v6.7 design |
| Automation 117 | **None** — email-only |
| Automation 121 | **Not created** |
| Duplicate XP | **Prevented** — token clears when Source Key exists; 101 idempotent |
| Unnecessary reruns | **Bounded** — token empty when credited or ineligible; 101 settles Last signature |

---

## Missing-field analysis

**Can this be built with current Production fields?** **Yes**, using existing links:

- Zoom Meetings ↔ Zoom Attendance (`Zoom Attendance` / `Zoom Meeting`)
- Zoom Meetings ↔ XP Events (`XP Events` / `Zoom Meeting`)
- Zoom Meetings ↔ Enrollments (`Attendees`)

**No new tables.** **Five new fields** (3 lookups + 1 formula + 1 rollup) + **one formula edit**.

If Mike prefers zero new fields: **not safely possible** — `Approved Preconflict Pair Tags` alone stays non-blank after credit and would cause permanent `Needed? = 1`.

---

## Mike tomorrow (ordered)

1. **Apply this formula package** in Production (101 OFF).
2. **Run disposable test** steps 1–5 above; capture evidence.
3. **Optional:** add `ZOOM_RECORDING` row in XP Reward Rules.
4. **Paste Automation 101 v6.7** per [`101-v6.7-sc-147-operator-packet.md`](./101-v6.7-sc-147-operator-packet.md).
5. **Run proof matrix** steps 7–10; re-prove live Zoom XP.
6. **Do not** create Automation 121.

**SC-147 is not Production-complete** until formula fix verified **and** 101 paste **and** controlled proof pass.

---

## Related documents

- [`SC-147-omni-reconciliation-trigger-review.md`](./SC-147-omni-reconciliation-trigger-review.md) — original gap analysis
- [`101-v6.7-sc-147-operator-packet.md`](./101-v6.7-sc-147-operator-packet.md) — 101 paste steps
- [`docs/pkg-034-zoom-reconciliation-fields.md`](../pkg-034-zoom-reconciliation-fields.md) — PKG-034 authority
