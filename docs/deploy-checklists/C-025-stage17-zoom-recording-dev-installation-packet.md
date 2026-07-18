# C-025 — Stage 17 Zoom Attendance recording credit — DEV installation packet

**Status:** Repository-ready for **Stage 17** · **Do not paste until Mike authorizes** · **Do not enable**  
**Base:** DEV only `appTetnuCZlCZdTCT`  
**PROD:** Forbidden  
**Architecture:** **Zoom Attendance** (Stage 17) — **not** Homework Completions (S16)  
**Supersedes for this base:** [C-025-117a-117b-dev-installation-packet.md](./C-025-117a-117b-dev-installation-packet.md) (S16 HC path)  
**Companion design:** recovery `C-025-automation-packages-stage17.md` · [C025_ARCHITECTURE_RECONCILIATION.md](../v2/C025_ARCHITECTURE_RECONCILIATION.md)  
**Offline tests:** `node airtable/automations/shooting-challenge/lib/c025-stage17-zoom-attendance.test.js`

---

## Hard stops

- DEV only. No PROD paste/enable.
- Do **not** create Homework Completions Zoom-recording fields.
- Do **not** paste superseded S16 scripts from `_superseded/`.
- Do **not** modify Make / send real emails / enable 118–119.
- Do **not** change XP Reward Rule amounts or Perfect Week rules.
- Leave all 117a–f **OFF** except controlled manual DEV runs, then disable again.
- Automations Meta API returns **403** — UI inspection required (see §7).

---

## 1. Exact DEV tables

| Table | Role |
|-------|------|
| **Zoom Attendance** | Primary recording-quiz credit row |
| **Zoom Meetings** | Meeting identity, `Attendees` roster, `Start Time`, Week |
| **Enrollments** | Athlete enrollment |
| **XP Events** | Append-only awards |
| **XP Reward Rules** | Live base amount (`ZOOM_ATTEND_BASE`) — recording amount via ZA formula |
| **Config** | Recording percent / gate / PW / email toggles (already on DEV) |

---

## 2. Exact fields (Stage 17 — verified present on DEV 2026-07-18)

### Zoom Attendance (writable + formula)

| Field | Type | Notes |
|-------|------|-------|
| `Attendance Method` | Single select | `Live` · `Recording Quiz` |
| `Enrollment` | Link | Required |
| `Zoom Meeting` | Link | Required |
| `Enrollment RID` | Lookup/formula | Credit key input |
| `Zoom Meeting RID` | Lookup | Credit key input |
| `Recording Quiz Review Status` | Single select | `Not Submitted` · `Needs Review` · `Satisfactory` · `Needs Correction` |
| `Recording Quiz Satisfactory?` | Checkbox | Synced by 117b |
| `Recording Quiz Submitted At` | DateTime | 117a stamp |
| `Recording Quiz Correction Count` | Number | 117b |
| `Recording Quiz Reviewed At` | DateTime | 117b |
| `Recording Quiz Needs Correction At` | DateTime | 117b |
| `Zoom Credit Key` | Formula | `ZOOM_CREDIT\|{Enrollment RID}\|{Zoom Meeting RID}` |
| `Zoom Credit Approved?` | Formula | Exclusivity gate |
| `Zoom Credit Conflict?` | Formula | Live + Recording conflict |
| `Zoom XP Amount` | Formula | Config % of live — **authoritative award amount** |
| `Zoom Credit Debug` | Formula | Feeds XP Reason Debug |
| `Zoom Gate Credit Earned?` | Formula | 117d gate |
| `Gate Credit Applied?` | Checkbox | 117d idempotency |
| `Perfect Week Credit Applied?` | Checkbox | 117e idempotency |
| `Effective Recording Counts for Perfect Week?` | Lookup | 117e |
| `Recording Approval Email Send Key` | Text | 117f |
| `Recording Approval Email Sent At` | DateTime | 117f |

### XP Events (canonical writes)

| Field | Value / rule |
|-------|----------------|
| `Source Key` | = `Zoom Credit Key` |
| `XP Bucket` | **`Zoom Attendance`** (exists) |
| `XP Source` | **`Zoom Meeting Recording Quiz`** — **must add this single-select option in DEV before paste** (smallest required addition) |
| `XP Activity Date` | Canonical date field (exists) — **not** `Activity Date` |
| `XP Reason Public` | `Zoom recording quiz credit` |
| `XP Reason Debug` | From `Zoom Credit Debug` / `C-025 v1.1.0 ZOOM_CREDIT|…` |
| `XP Points` | From `Zoom XP Amount` |
| `Enrollment` / `Zoom Meeting` / `Week` | Linked |
| `Active?` | Soft-void on conflict |

### Reward rule

| Rule Key | Amount (DEV) | Role |
|----------|--------------|------|
| `ZOOM_ATTEND_BASE` | **60** (active, unique) | Live base; recording amount = formula % of this |
| `ZOOM_ATTEND_RECORDING` | **absent** | Not required — Config percent + formula remain authoritative |

---

## 3. Scripts / versions

| # | File | Version | Automation name |
|---|------|---------|-----------------|
| 117a | `117a-zoom-recording-normalize-recording-quiz-submission.js` | **v1.1.0** | 117a - Zoom Recording Credit - Normalize Recording Quiz Submission |
| 117b | `117b-zoom-recording-coach-review-and-needs-correction-handling.js` | **v1.1.0** | 117b - Zoom Recording Credit - Coach Review and Needs Correction Handling |
| 117c | `117c-zoom-recording-create-zoom-xp-event.js` | **v1.1.0** | 117c - Zoom Recording Credit - Create Zoom XP Event |
| 117d | `117d-zoom-recording-apply-zoom-gate-credit.js` | **v1.1.0** | 117d - Zoom Recording Credit - Apply Zoom Gate Credit |
| 117e | `117e-zoom-recording-apply-perfect-week-credit.js` | **v1.1.0** | 117e - Zoom Recording Credit - Apply Perfect Week Credit |
| 117f | `117f-zoom-recording-send-approval-email.js` | **v1.1.0** | 117f - Zoom Recording Credit - Send Approval Email |

Paste from production docblock through end — **skip** GitHub header.

---

## 4. Triggers / conditions / inputs

| Auto | Trigger table | Conditions (recommended) | Inputs |
|------|---------------|--------------------------|--------|
| **117a** | Zoom Attendance | Method = Recording Quiz; Enrollment + Meeting not empty | `recordId` |
| **117b** | Zoom Attendance | Method = Recording Quiz; Review Status changed | `recordId` |
| **117c** | Zoom Attendance | `Zoom Credit Approved?` · `Zoom XP Amount` > 0 · key not empty | `recordId` |
| **117d** | Zoom Attendance | Method = Recording Quiz · `Zoom Gate Credit Earned?` | `recordId` |
| **117e** | Zoom Attendance | Method = Recording Quiz · Approved · Effective PW flag | `recordId` |
| **117f** | Zoom Attendance | Method = Recording Quiz · Satisfactory | `recordId` · `webhookUrl` (DEV secret) — **leave OFF** |

---

## 5. Source Key / exclusivity / dedupe

| Concern | Rule |
|---------|------|
| Recording Source Key | `ZOOM_CREDIT\|{Enrollment RID}\|{Zoom Meeting RID}` (from formula field) |
| Live Source Key (101) | `ZOOM_ATTEND_BASE\|{Zoom Meeting Key}\|{enrollmentId}` |
| Exclusivity | Formula `Zoom Credit Conflict?` / `Zoom Credit Approved?` — at most one Approved credit per Enrollment+Meeting |
| Dedupe | Recheck XP Events by Source Key before create; rerun → `skipped_exists` |
| Conflict after award | 117c sets `Active? = false` (`deactivated_on_conflict`) |
| Gate / PW | 117d/117e add Enrollment to `Zoom Meetings.Attendees` idempotently (separate applied flags) |

---

## 6. Test scenarios (DEV only — after paste, still OFF unless manual run)

| ID | Setup | Expected |
|----|-------|----------|
| T1 | Recording Quiz ZA · Satisfactory · Approved · amount > 0 | 117c `created` · one XP Event |
| T2 | Same row rerun | `skipped_exists` · no duplicate |
| T3 | Live sibling causes Conflict | `deactivated_on_conflict` or `skipped_not_approved` |
| T4 | Missing Enrollment | error |
| T5 | Missing Zoom Meeting | error |
| T6 | Amount 0 / not approved | skip |
| T7 | Needs Correction | 117b clears Satisfactory · no new credit identity |
| T8 | Edge-of-day `Start Time` | `XP Activity Date` Denver calendar day |
| T9 | Gate earned | Enrollment on meeting `Attendees` once |
| T10 | 117f | **Do not send** — Config disabled / no webhook / leave OFF |

Label created rows as DEV test. Prefer Schmidt / explicit test enrollments.

---

## 7. Automation UI inspection (API cannot list — 403)

In Airtable DEV → Automations, Mike should record for each of 117a–f (or similarly named):

1. Exact automation name  
2. Enabled? (should be **OFF**)  
3. Trigger type + table  
4. Conditions  
5. Input variable names  
6. Script version string visible in script body (`v1.1.0`)  

**Do not claim absent** solely because Meta API failed.

---

## 8. Smallest schema addition required before paste

| Item | Action |
|------|--------|
| XP Events → `XP Source` option **`Zoom Meeting Recording Quiz`** | **Create in DEV UI** (only missing Stage 17-unique source) |

Everything else required for Stage 17 was present on DEV preflight 2026-07-18.

---

## 9. Rollback

1. Turn **117a–f OFF**.  
2. Soft-void bad XP by `Active?=false` on `ZOOM_CREDIT|…` keys — do not delete ledger rows.  
3. Remove mistaken `Attendees` links only if this package added them (check Gate/PW applied flags).  
4. Do not delete formula fields.

---

## 10. Final disabled state

After any DEV verification: **all of 117a–f OFF**. 118/119 remain absent or OFF. PROD untouched.

---

## Status

| State | Value |
|-------|-------|
| Implemented in repository | **Yes** (Stage 17 117a–f v1.1.0) |
| S16 HC packet | **Superseded for this base** (historical) |
| Ready for DEV paste | **After** XP Source option added |
| Installed / verified in DEV | **No** |
| Ready for PROD | **No** |
