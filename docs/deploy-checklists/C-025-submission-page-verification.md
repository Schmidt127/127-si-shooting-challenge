# C-025 — Recording Quiz submission page verification

**Status:** Verification checklist (repo) — updated 2026-07-13 overnight Lead (Agent A)
**Scope:** Document expected Fillout/interface/automation behavior and the exact fields it must write. **Do not build interface automations here** — this is inspection + a checklist, not implementation.
**PROD:** untouched. **DEV schema changed by this document:** none (read-only Meta API `GET` only).

**Confirmed from repo research:** the Recording Quiz submission flow does **not exist yet** as a Next.js page, Airtable Interface definition, or automation script in this repo. `web/` only ships a **read-only** Zoom Meetings catalog (`/zoom-meetings`, `/zoom-meetings/[id]`) — no submission form, and `web/docs/project-roadmap.md` explicitly lists "writing submissions or homework from the website" as out of scope. The intended intake channel per [C-025-automation-packages-stage17.md](./C-025-automation-packages-stage17.md) is an **Airtable Interface or Fillout/Softr form** writing directly to a **Zoom Attendance** record, with normalize automations **117a–f** still only designed, not pasted (`airtable/automations/shooting-challenge/117*` does not exist). This checklist is written against that intended design plus the fields that already exist live in DEV.

---

## 1. Which table is authoritative — important correction

Live Meta API inspection (2026-07-13, read-only) found the quiz-content fields (`Recording Quiz Response`, `Recording Quiz Submitted At`, `Recording Quiz Review Status`, `Recording Quiz Satisfactory?`, `Recording Quiz Coach Feedback`, `Recording Quiz Attempt Number`, `Attendance Method`) duplicated on **both** tables:

| Table | Role | Use for submission? |
|---|---|---|
| **Zoom Attendance** | The per-Enrollment-per-Meeting junction row. Carries `Enrollment`, `Zoom Meeting`, `Enrollment RID`, `Zoom Meeting RID`, and all seven live credit formulas (`Zoom Credit Key`, `Zoom Credit Approved?`, etc. — see [Manual Repair doc](./C-025-Zoom-Recording-Manual-Airtable-Repair.md)). | **Yes — this is the record a submission must create/update.** Credit identity (`Enrollment RID + Zoom Meeting RID`) only exists here. |
| **Zoom Meetings** | Same-named fields exist here too (`Recording Quiz Response`, `Recording Quiz Deadline` (dateTime), `Recording XP Percentage` (number), `Zoom Credit Approved?` (formula), etc.), plus legacy `Attendees` link. | **No — flagged as likely dead/legacy** in [C-025-config-linkage-design.md](./C-025-config-linkage-design.md) §1.3. These fields predate the Zoom Attendance table split and are not referenced by the authoritative credit formulas. **Do not build the submission form to write to Zoom Meetings' copies of these fields** — confirm with owner before assuming they matter, and do not delete them (avoid deletes per overnight policy). |

Every requirement below is written for the **Zoom Attendance** row.

---

## 2. Expected defaults / guards on the created/updated Zoom Attendance row

| # | Requirement | Expected | Live field (Zoom Attendance, verified) | Status |
|---|---|---|---|---|
| 1 | Attendance Method | Auto-set `Recording Quiz` (never left to the athlete to pick, never blank) | `Attendance Method` (singleSelect: `Live` / `Recording Quiz`) | **VERIFY in DEV once intake exists** — no writer path in repo yet |
| 2 | Review Status | Auto-set to the "not yet reviewed" option on submit | `Recording Quiz Review Status` (singleSelect — confirm exact "Needs Review" option spelling before automations reference it in a formula; Formula Repair doc's `Zoom Credit Pre-Approved?` formula compares against the literal string `"Satisfactory"`, so the not-yet-reviewed option string is not currently load-bearing for credit, only for coach queueing) | **VERIFY exact option name in DEV** |
| 3 | Submitted At | Populated at submit time, not blank, not editable after the fact by the athlete | `Recording Quiz Submitted At` (dateTime) | **VERIFY writer path** (no automation exists yet) |
| 4 | Enrollment linked | Exactly one, session-bound, cannot be edited to point at a different athlete | `Enrollment` (link → Enrollments) | **VERIFY** — depends entirely on how the Interface/Fillout session locks the athlete field |
| 5 | Zoom Meeting linked | Exactly one, must be a meeting with `Recording Quiz Available?` / `Recording Available At` populated | `Zoom Meeting` (link → Zoom Meetings) | **VERIFY** |
| 6 | Athlete isolation | Athlete cannot select another athlete's enrollment or view another athlete's Zoom Attendance rows | No live mechanism confirmed — this is an Interface/Fillout configuration concern (locked field, filtered record picker, or session-token-scoped view), not a formula. Comparable pattern: `C-010`/Stage 8 Schmidt-exclusion guard for communications, but that's a *different* isolation concern (test-enrollment exclusion from real-family email, not athlete-to-athlete isolation) | **VERIFY intake tool config when built — not a schema field to check** |
| 7 | Recording availability enforced | Cannot submit before the meeting's recording is available | Zoom Meetings.`Recording Available At` (dateTime, confirmed present) / `Recording Quiz Available?` (checkbox, confirmed present) — guard belongs in the intake form/automation, not a Zoom Attendance formula | **VERIFY** |
| 8 | Deadline shown or enforced | Display the deadline; optionally soft/hard-block after it | Use the **true-date** `Calculated Recording Quiz Deadline` **after** the fix in [C-025-deadline-repair-design.md](./C-025-deadline-repair-design.md) — today it is `singleLineText`, not a comparable date, so any "block after deadline" logic built against it today would be unreliable | **BLOCKED until deadline-repair design is implemented** (design doc exists; implementation still gated `explicit_mike`) |
| 9 | Duplicate open submissions prevented | At most one **open** (not-yet-Satisfactory) Recording Quiz row per Enrollment+Meeting pair; resubmission updates the same row rather than creating a second | No live uniqueness constraint exists in Airtable schema (Airtable has no native unique-index enforcement) — must be enforced by the intake automation checking for an existing Zoom Attendance row for that `Enrollment`+`Zoom Meeting` pair before creating a new one, or by having the Interface open/edit the existing row instead of always inserting | **DESIGN belongs in `117a` normalize automation** (see automation-packages-stage17 doc) — not built here |
| 10 | Resubmission history preserved | Prior attempt content is not silently lost | `Recording Quiz Attempt Number` (number, confirmed present) increments; consider whether resubmission should overwrite `Recording Quiz Response` in place (losing prior text) or whether a separate history/log is needed — **current schema only has one `Recording Quiz Response` field per Zoom Attendance row, so "history" today means the attempt counter, not full response history** | **VERIFY intended behavior with owner before automations are built — schema as-is does not retain full text history** |
| 11 | One credit key → one XP Event | `ZOOM_CREDIT\|{Enrollment RID}\|{Zoom Meeting RID}` maps to at most one active XP Event, regardless of how many times the quiz is resubmitted or reviewed | Formula layer already enforces exclusivity at the *credit-eligibility* level (`Zoom Credit Key`, `Zoom Credit Conflict?`, `Zoom Credit Approved?` — see Formula Repair doc). **XP Event creation itself is a separate, not-yet-built award automation** — the offline contract for this already exists in `tools/airtable/tests/test_c025_recording_watch_contract.py` (`can_award_recording_credit`, `active_zoom_pairs`) and should be reused, not reinvented, when that automation is built | **Formulas: done. Award automation: DESIGN in automation-packages-stage17, not pasted** |

---

## 3. Live field anchors (verified, read-only Meta API GET, 2026-07-13)

**Zoom Attendance** (`tblfwbt6aCDCM5gUz`) — the authoritative submission target:
`Enrollment`, `Zoom Meeting`, `Enrollment RID`, `Zoom Meeting RID`, `Attendance Method`, `Live Attendance Confirmed?`, `Recording Quiz Response`, `Recording Quiz Submitted At`, `Recording Quiz Review Status`, `Recording Quiz Satisfactory?`, `Recording Quiz Coach Feedback`, `Recording Quiz Attempt Number`, `Normal Live Zoom XP`, plus the seven credit formulas and the nine `Effective *` lookups.

**Zoom Meetings** (`tblWcSHEm8vNNIxyB`) — availability/deadline source, not the submission target:
`Recording Available At`, `Recording Quiz Available?`, `Recording Quiz Deadline` (legacy dateTime, likely unused — see §1), `Calculated Recording Quiz Deadline` (formula, currently wrong type — see deadline-repair design), `Attendees` (legacy link, live-attendance path per automation `101`, not the Recording Quiz path).

---

## 4. Manual DEV test script (run once intake exists — not run tonight, no intake exists yet)

1. Schmidt DEV enrollment + an eligible Zoom Meeting with `Recording Available At` populated.
2. Submit quiz → expect on the **Zoom Attendance** row: `Attendance Method` = `Recording Quiz`, review status = not-yet-reviewed option, `Recording Quiz Submitted At` set, `Enrollment` + `Zoom Meeting` both linked, `Zoom Credit Key` non-blank.
3. Attempt a second open submission for the same Enrollment+Meeting pair → confirm it updates the existing row (or is blocked), not a second row with a duplicate credit key.
4. Coach marks review status other than Satisfactory → resubmit → confirm `Recording Quiz Attempt Number` increments and `Zoom Credit Pre-Approved?` stays 0 until Satisfactory.
5. Coach marks Satisfactory → confirm `Zoom Credit Pre-Approved?` = 1, `Zoom Credit Approved?` = 1 (assuming no conflict), `Zoom XP Amount` computed per `Effective Recording XP Percentage` — still **no XP Event** created (that automation doesn't exist yet).
6. Confirm the intake tool does not allow selecting a different athlete's enrollment mid-session (manual UX check, not a formula check).
7. Confirm submitting for a meeting where `Recording Available At` is blank or in the future is blocked or clearly disabled in the intake UI (manual UX check).

---

## 5. Out of scope here (unchanged from prior stage)

- Building Softr/Fillout/Airtable Interface changes.
- Pasting `117a`–`117f` normalize/review/award automations.
- PROD.
- Award automation / XP Event creation.

See [C-025-automation-packages-stage17.md](./C-025-automation-packages-stage17.md) for the normalize + review automation design this checklist assumes.
