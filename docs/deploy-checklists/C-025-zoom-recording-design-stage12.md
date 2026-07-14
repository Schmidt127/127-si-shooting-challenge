# C-025 — Zoom recording-watch design (Stage 12)

**Status:** COMPLETE (repo design package)  
**Package:** `C-025-zoom-recording-design`  
**Stage:** S12  
**Base SHA:** `98c3df9`  
**Date:** 2026-07-13  
**Scope:** Repo design only — **no Airtable changes in this stage**

---

## 0. Approved owner rules (locked — do not reopen)

| Rule | Value |
|------|-------|
| Recording XP | **50%** of live Zoom attendance XP |
| Level-gate credit | **Full** gate credit (recording counts the same as live toward `Minimum Zoom Meetings`) |
| Exclusivity | Athlete **cannot** receive both live-attendance and recording-watch XP for the **same** Zoom meeting |

Canonical Source Key families (owner + C-024): `ZOOM_LIVE|…` and `ZOOM_RECORDING|…`.

---

## 1. Current dependency audit (repo)

| Component | Today | C-025 impact |
|-----------|-------|--------------|
| Automation **101** | Awards live `Attendees` only | Needs recording path + exclusivity checks |
| **101** base Source Key | `ZOOM_ATTEND_BASE\|{Zoom Meeting Key}\|{enrollmentId}` | **Mismatch** with C-024 / owner `ZOOM_LIVE\|{meetingId}\|{enrollmentId}` — migration required at implementation |
| **101** bonuses | `ZOOM_ATTEND_BONUS_2\|{enrollmentId}`, `ZOOM_ATTEND_BONUS_3\|{enrollmentId}` | One-time per enrollment; interactions with recording TBD (see §10) |
| Zoom Meetings | `Attendees`, `Create XP Events`, `XP Award Status`, `Zoom Meeting Key`, `Meeting Status` | Need recording attestation fields + separate recording-watcher link (proposed) |
| Enrollments | `Zoom Meetings` ↔ Attendees; `Total Zoom Attendances` feeds gate formulas | Must count recording watches for **full gate credit** |
| Level Gate Rules | `Minimum Zoom Meetings` | No value change required if attendance count includes recording |
| XP Reward Rules | `ZOOM_ATTEND_BASE` (+ bonuses) | Add `ZOOM_ATTEND_RECORDING` (or equivalent) at **50%** of live base |
| C-024 DK-08 | Offline conflict on `ZOOM_LIVE` ∩ `ZOOM_RECORDING` | Must also treat legacy `ZOOM_ATTEND_BASE` as live family |
| C-010 | `Progress Processing Enabled?` | Recording award must skip when progress disabled |
| Perfect Week (057/058) | Uses week Zoom attendance counts | Should treat recording as attendance once gate model includes it |
| Stage 7 audit | Documented gap; no recording workflow | This package designs the close-out |

**Gap today:** No parent/coach recording attestation; **101** “supplemental re-run” only adds more live `Attendees` and awards full live base XP.

---

## 2. Recording-watch behavior contract

### 2.1 Happy path

1. Zoom meeting completes; live attendees awarded via **101** (live path).
2. Recording URL published on the Zoom Meetings record (when available).
3. Athlete (via parent/coach path — §10) attests they watched the recording.
4. Staff/system marks attestation **Approved** (unless owner chooses auto-approve — §10).
5. Automation awards **one** active XP Event:
   - Source Key: `ZOOM_RECORDING|{meetingRecordId}|{enrollmentId}`
   - XP Points: **50%** of current active `ZOOM_ATTEND_BASE` rule amount (prefer config row, not hard-coded 50 in script)
   - Links: Enrollment, Week, Zoom Meeting, Weekly Athlete Summary (same pattern as live)
6. Enrollment gains **one** meeting credit toward `Total Zoom Attendances` / Perfect Week attendance (same meeting cannot double-count live + recording).

### 2.2 Exclusivity (mandatory)

Before creating `ZOOM_RECORDING|…`:

- Skip if active `ZOOM_LIVE|{meetingId}|{enrollmentId}` exists.
- Skip if active legacy `ZOOM_ATTEND_BASE|{anyMeetingKey}|{enrollmentId}` maps to the **same** Zoom Meetings record.
- Skip if active `ZOOM_RECORDING|{meetingId}|{enrollmentId}` already exists (idempotent).

Before creating/keeping live XP:

- Skip live create if active `ZOOM_RECORDING|…` already exists for same meeting + enrollment.
- Prefer **earliest valid award wins**; do not deactivate the first award to replace with the other mode unless owner later requests repair tooling.

### 2.3 Amounts and gates

| Award | Recording |
|-------|-----------|
| Base Zoom XP | 50% of live base rule |
| Level gate meeting credit | **Full** (1 meeting) |
| Live + recording same meeting | **Forbidden** (XP and meeting credit) |

### 2.4 Idempotency

- One recording XP Event per `(meeting, enrollment)`.
- Re-runs safe: find-by Source Key → skip if active exists.
- Backfills follow C-024 rerun standard (dry-run → find-by-key → skip/create).

---

## 3. Confirmation / approval options (design menu)

| Option | Who confirms | Automation trigger | Tradeoff |
|--------|--------------|--------------------|----------|
| **A. Coach-confirm** | Coach checks approve on claim | Approved → award | Highest trust; more staff load |
| **B. Parent self-attest + random audit** | Parent submits form; auto-award | Form create → award | Low friction; audit risk |
| **C. Hybrid (recommended default for DEV design)** | Parent attests; coach quick-approve | Approved → award | Balanced |

**Implementation must not guess.** DEV OMNI runbook assumes **Option C** until owner picks (§10).

---

## 4. Required field proposal (Airtable — proposal only)

### 4.1 Zoom Meetings (proposed)

| Field | Type | Purpose |
|-------|------|---------|
| `Recording URL` | URL | Parent-facing link (may already exist under another name — OMNI verify before create) |
| `Recording Available?` | Checkbox | Gate for attestation intake |
| `Recording Deadline` | Date | Optional hard stop (§10) |
| `Recording Attendees` | Link → Enrollments | Watchers who earned **recording** credit (do **not** reuse live `Attendees` without mode) |

### 4.2 New table (recommended): `Zoom Recording Claims`

| Field | Type | Purpose |
|-------|------|---------|
| `Claim Key` | Text (formula or script) | Stable idempotency: `ZRC\|{meetingId}\|{enrollmentId}` |
| `Zoom Meeting` | Link | Meeting watched |
| `Enrollment` | Link | Athlete enrollment |
| `Attested At` | DateTime | Parent/athlete attestation time |
| `Attested By` | Text/Email | Who attested |
| `Approval Status` | Single select | `Pending` / `Approved` / `Rejected` / `Withdrawn` |
| `Approved At` | DateTime | Coach approve time |
| `Approved By` | Text | Coach identity |
| `XP Award Status` | Single select | `Not Awarded` / `Awarded` / `Skipped` / `Error` |
| `Skip Reason` | Text | e.g. live already awarded |
| `Progress Gate OK?` | Checkbox/formula | Snapshot of C-010 gate at award time |

Avoid storing approval on the Enrollment or Meeting alone — claim rows give audit history and C-024-friendly keys.

### 4.3 XP Reward Rules (proposed row)

| Rule Key | XP Amount | Notes |
|----------|-----------|-------|
| `ZOOM_ATTEND_RECORDING` | `floor(ZOOM_ATTEND_BASE * 0.5)` or explicit number maintained at 50% | Prefer explicit number in Airtable; document “must stay 50% of live base” |

### 4.4 XP Events / Source Keys (target contract)

| Mode | Source Key |
|------|------------|
| Live | `ZOOM_LIVE\|{meetingRecordId}\|`{enrollmentId}` |
| Recording | `ZOOM_RECORDING\|{meetingRecordId}\|`{enrollmentId}` |

**Migration note:** Production **101** today writes `ZOOM_ATTEND_BASE|{Zoom Meeting Key}|{enrollmentId}`. Implementation package must:

1. Treat legacy keys as members of the **live** family for exclusivity, and
2. Either migrate writers to `ZOOM_LIVE|…` (preferred, matches C-024) or dual-write/dual-detect until backfill.

Meeting identity token = **Zoom Meetings record id** (`rec…`) for new keys (matches C-024 offline tests). Zoom Meeting Key remains display/ops identity.

### 4.5 Gate credit wiring (proposal)

Because Airtable links lack per-link attributes, **do not** overload live `Attendees` for recording.

Proposed gate model:

- Live credit: enrollment ∈ `Zoom Meetings.Attendees`
- Recording credit: enrollment ∈ `Zoom Meetings.Recording Attendees` **after** Approved claim awards XP
- `Total Zoom Attendances` (Enrollment) → count of **distinct** Zoom Meetings where live **or** recording link exists

Formula/rollup change is OMNI work after owner accepts this package — **not** done in S12.

---

## 5. Live-versus-recording conflict prevention

| Check ID | Rule | Enforcement |
|----------|------|-------------|
| ZX-01 | No dual active XP (live + recording) same meeting+enrollment | Award script + DK-08 audit |
| ZX-02 | Legacy `ZOOM_ATTEND_BASE` counts as live | Shared helper `isLiveZoomKey()` |
| ZX-03 | Meeting credit counted once | Distinct-meeting count across Attendees ∪ Recording Attendees |
| ZX-04 | Claim Approved but live already exists | Mark claim `Skipped` + reason; do not award recording |
| ZX-05 | Recording already awarded then live link added | Live award skips; leave recording XP |
| ZX-06 | Progress disabled (C-010) | Skip award; leave claim Pending/Skipped |

Pseudo-helpers (offline tests encode these):

```text
live_family(key) := ZOOM_LIVE|* OR ZOOM_ATTEND_BASE|*
recording_family(key) := ZOOM_RECORDING|*
conflict(meetingId, enrollmentId) :=
  active live family for meeting ∧ active recording family for meeting
```

Legacy live keys use Zoom Meeting Key, not record id — resolution table `meetingKey → meetingRecordId` required inside automation.

---

## 6. Deadline and completion-state design

| State | Meaning |
|-------|---------|
| `Recording Available?` = false | No claims accepted |
| Claim `Pending` | Attested; waiting approve (if hybrid/coach) |
| Claim `Approved` | Eligible for XP + recording attendees link |
| Claim `Awarded` (via XP Award Status) | XP Event exists; recording attendee linked |
| Claim `Skipped` | Valid process outcome (e.g. live already won) |
| Claim `Rejected` / `Withdrawn` | No XP |
| Past `Recording Deadline` | New attestations rejected; pending claims may be auto-rejected (owner §10) |

**Suggested default for runbook (not owner-locked):** deadline = end of the meeting’s linked Week end date (America/Denver). Owner may choose fixed N days instead (§10).

---

## 7. Parent communication behavior

| Moment | Notify? | Channel | Notes |
|--------|---------|---------|-------|
| Recording available | Optional | Parent email | Helpful; not required for MVP |
| Claim received | Optional | Coach surface / view | Operational, not athlete XP mail |
| Recording XP awarded | **No new daily-style athlete ping** | — | Aligns with C-027 major-events-only; recording XP is ordinary progress |
| Claim skipped (live already counted) | Optional coach-only | — | Reduce parent confusion |

Do **not** invent SMS for C-025. Do **not** alter **071** homework / video feedback automations.

---

## 8. Automation shape (implementation later — not this stage)

**Recommended:** sibling automation **101r** (or extend **101** with a clear mode branch) triggered when Recording Claim becomes `Approved`.

Required behaviors:

1. Validate claim key, meeting, enrollment, C-010 progress gate.
2. Exclusivity checks (§5).
3. Create XP Event with `ZOOM_RECORDING|…` and recording rule amount.
4. Link enrollment onto `Recording Attendees`.
5. Set claim XP Award Status.
6. Idempotent outputs: `created` / `skipped_*` / `error`.

**Do not paste or edit Airtable automations in S12.**

---

## 9. Offline test coverage (this stage)

`tools/airtable/tests/test_c025_recording_watch_contract.py` encodes:

- 50% XP calculation (integer floor policy)
- Source Key builders for live/recording
- Exclusivity including legacy `ZOOM_ATTEND_BASE`
- Distinct meeting credit (live ∪ recording)
- Idempotent recording award
- Progress-disabled skip

---

## 10. Owner decisions — unresolved operational only

Locked rules are **not** listed here.

| ID | Question | Why unresolved | Suggested default if Mike wants speed |
|----|----------|----------------|----------------------------------------|
| OD-1 | Attestation mode: coach-only / parent self-attest / hybrid? | Trust vs workload | Hybrid (parent attest + coach approve) |
| OD-2 | Recording deadline: week end vs N days vs season end? | Ops preference | Week end date of linked Week |
| OD-3 | Do recording-only meetings count toward bonus #2/#3 live bonuses? | Bonuses are live-era rules | **No** — bonuses remain live-attendance milestones only |
| OD-4 | Does recording count for Perfect Week Zoom attendance? | Fairness vs “show up live” culture | **Yes** — aligned with full gate credit |
| OD-5 | Migrate **101** writers to `ZOOM_LIVE|recId|enroll` now, or dual-detect first? | Migration risk | Dual-detect first; migrate writers in same implementation PR as 101r |
| OD-6 | Parent email when recording becomes available? | Comms load | Defer to C-027 / ops; not required for MVP award path |

---

## 11. Definition of done for this design package

- [x] Dependency audit vs **101** / gates / C-024
- [x] Behavior contract with locked owner rules
- [x] Field + Source Key proposal (no Airtable writes)
- [x] Conflict prevention design
- [x] Deadline / completion states
- [x] Parent communication bounds
- [x] DEV OMNI runbook
- [x] Offline tests
- [x] Owner list limited to operational choices

**Next after owner picks OD-1…OD-6:** separate implementation package (Airtable fields + automation) — still DEV-first; not authorized unattended.
