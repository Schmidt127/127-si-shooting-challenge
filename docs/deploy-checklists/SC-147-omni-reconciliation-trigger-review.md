# SC-147 — OMNI reconciliation trigger review

**Backlog:** SC-147 / MRW-H10  
**Date:** 2026-09-02  
**Environment:** Production only (`appn84sqPw03zEbTT`) — **no DEV base** (retired 2026-08-19)  
**Automation:** 101 v6.7 (GitHub merged; Production paste pending Mike)  
**Status:** **Resolved in repository (2026-09-02)** — exact formula fix documented; **NOT applied to Production**. See [`SC-147-reconciliation-trigger-formula-fix.md`](./SC-147-reconciliation-trigger-formula-fix.md).

---

## OMNI review question (paste exactly)

```text
Review whether Zoom XP Reconciliation Needed? becomes 1 when an approved recording-credit Zoom Attendance record is added or updated, even when the athlete is not on Zoom Meetings.Attendees and Create XP Events is unchecked.

The desired result is that Automation 101 v6.7 can process the meeting and award approved recording half-XP without requiring an unrelated meeting update.

Do not create a new automation.
Do not add the athlete to Zoom Meetings.Attendees.
Preserve live attendance behavior.
Document:
Which existing formula or dependency currently flips the flag.
Whether recording-only attendance reliably triggers it.
Any missing dependency.
The smallest safe Production configuration change, if one is needed.
Confirmation that no new automation slot is required.
```

---

## Repository finding (2026-09-02)

### How `Zoom XP Reconciliation Needed?` works today

Authority: [`docs/pkg-034-zoom-reconciliation-fields.md`](../pkg-034-zoom-reconciliation-fields.md)

```text
Zoom XP Reconciliation Needed? =
  IF(
    AND(
      {Zoom XP Current Signature},
      {Zoom XP Current Signature} != {Last Zoom XP Reconciled Signature}
    ),
    1,
    0
  )
```

`Zoom XP Current Signature` (Zoom Meetings formula) currently includes:

| Term | Source |
|------|--------|
| `STATUS` | Meeting Status |
| `KEY` | Zoom Meeting Key |
| `CREATE` | Create XP Events checkbox |
| `ATTENDEES` | Attendees link |
| `WEEK` | Week link |
| `ENR_SIG` | Lookup via **Attendees** → Enrollment signature |
| `WEEK_SIG` | Lookup via Week → Week signature |
| `EVENT_SIG` | Lookup via XP Events → Event signature |

Automation **101** trigger: Zoom Meetings when `Zoom XP Reconciliation Needed? = 1`.

### Recording-only path — what changes on approval?

When a **recording-only** athlete is approved on **Zoom Attendance** (`Recording Quiz Satisfactory?` checked):

| Field / state | Changes? |
|---------------|----------|
| Zoom Meetings.Attendees | **No** (must not change — SC-147 rule) |
| Create XP Events | **No** (typically unchecked for recording-only) |
| Meeting Status / Week / Key | **No** (unless separately edited) |
| XP Events (before award) | **No** (recording XP not created yet) |
| Zoom XP Current Signature | **Likely unchanged** |

**Conclusion:** An approved recording-only Zoom Attendance update **does not reliably flip** `Zoom XP Reconciliation Needed?` under the current PKG-034 signature formula. Automation 101 v6.7 will **not run** until some other meeting-level change alters `Zoom XP Current Signature` (e.g. Attendees, Create XP Events, XP Event backlink, Meeting Status).

### What 101 v6.7 does when it *does* run

When 101 fires on a meeting, v6.7:

1. Runs the existing **live** reconciliation loop (unchanged).
2. Scans linked **Zoom Attendance** rows for the meeting.
3. Awards half-XP when `Recording Quiz Satisfactory?` is checked and exclusivity gates pass.

The script is ready; the **trigger gap** is upstream in the reconciliation formula.

---

## Smallest safe configuration change (proposal for OMNI — not implemented)

**Superseded by:** [`SC-147-reconciliation-trigger-formula-fix.md`](./SC-147-reconciliation-trigger-formula-fix.md) (2026-09-02) — copy-ready Production formulas using real field names.

**Goal:** Wake meeting reconciliation when pending approved recording credit exists, without Attendees writes and without a new automation.

**Candidate approach (OMNI to validate):**

1. Add a **lookup or rollup on Zoom Meetings** from linked **Zoom Attendance** rows that encodes recording-credit pending state, e.g.:
   - enrollment id + satisfactory flag + conflict rollup + “not yet credited” signal
2. Append that token to **`Zoom XP Current Signature`**, e.g. `|REC_PENDING=` term.
3. Re-verify live paths still settle `Reconciliation Needed?` to `0` after 101 acknowledgement.

**Do not implement without Mike approval.** Cursor must not change Production formulas.

---

## Related automations (unchanged)

| Automation | Role |
|------------|------|
| **101 v6.7** | Live + recording half-XP writer (paste pending) |
| **117 v2.1** | Email only — Email Handoff Queue |
| **121** | **Not created** — design artifact only |

---

## After OMNI review

1. Document OMNI answer in this file (append dated section).
2. If formula change approved, add steps to [`101-v6.7-sc-147-operator-packet.md`](./101-v6.7-sc-147-operator-packet.md) **before** Mike pastes 101 v6.7.
3. Include reconciliation wake verification in disposable Production proof matrix.
