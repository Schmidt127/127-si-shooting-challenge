# C-025 — Stage 17 Zoom Attendance recording credit — DEV installation packet

**Status:** Repository-ready **v1.1.0 orchestrator** (Attendees-write removed) · **Do not paste until Mike authorizes** · **Do not enable**
**Base:** DEV only `appTetnuCZlCZdTCT`
**PROD:** Forbidden
**Architecture:** **Zoom Attendance** (Stage 17) — **not** Homework Completions (S16)
**Supersedes for this base:** [C-025-117a-117b-dev-installation-packet.md](./C-025-117a-117b-dev-installation-packet.md) (S16 HC path)
**Install results (preflight):** [C-025-stage17-dev-install-results-2026-07-18.md](./C-025-stage17-dev-install-results-2026-07-18.md)
**Offline tests:** `node airtable/automations/shooting-challenge/lib/c025-stage17-zoom-attendance.test.js`

---

## Hard stops

- DEV only. No PROD paste/enable.
- Do **not** create Homework Completions Zoom-recording fields.
- Do **not** paste superseded S16 scripts from `_superseded/`.
- Do **not** modify Make / send real emails / enable 118–119.
- Do **not** change XP Reward Rule amounts or Perfect Week rules.
- Do **not** modify Automation **101**.
- Do **not** write recording enrollments into **`Zoom Meetings → Attendees`** (live roster only — writing it can re-trigger 101 live XP).
- Leave **117 Orchestrator OFF** except controlled manual DEV runs, then disable again.
- Automations Meta API returns **403** — UI paste required.

---

## 0. Double-credit root cause (corrected)

Automation **101** awards live Zoom XP when `Zoom Meetings` has:

- `Create XP Events` checked
- `XP Award Status` ≠ `Awarded`
- `Attendees` not empty
- `Week` / `Zoom Meeting Key` not empty
- `Meeting Status` = `Completed`

Stage 17 Steps D/E previously **added recording enrollments to `Attendees`**, which can satisfy 101’s attendee prerequisite and award **live** `ZOOM_ATTEND_BASE|…` XP in addition to recording `ZOOM_CREDIT|…` XP.

**Correction:** recording credit creates XP Events directly and **never** mutates `Attendees`.

---

## 1. Exact DEV tables

| Table | Role |
|-------|------|
| **Zoom Attendance** | Primary recording-quiz credit row |
| **Zoom Meetings** | Meeting identity, live `Attendees` roster (101 only), `Start Time`, Week |
| **Enrollments** | Athlete enrollment |
| **XP Events** | Append-only awards |
| **XP Reward Rules** | Live base amount (`ZOOM_ATTEND_BASE`) — recording amount via ZA formula |
| **Config** | Recording percent / gate / PW / email toggles |

---

## 2. Exact fields (Stage 17)

### Zoom Attendance (writable + formula)

| Field | Type | Notes |
|-------|------|-------|
| `Attendance Method` | Single select | `Live` · `Recording Quiz` |
| `Enrollment` / `Zoom Meeting` | Link | Required |
| `Zoom Credit Key` | Formula | `ZOOM_CREDIT\|{Enrollment RID}\|{Zoom Meeting RID}` |
| `Zoom Credit Approved?` / `Zoom Credit Conflict?` | Formula | Exclusivity |
| `Zoom XP Amount` | Formula | Config % of live — **authoritative award amount** (expect **30** when base 60 × 50%) |
| `Zoom Gate Credit Earned?` | Formula | Recording gate eligibility |
| `Gate Credit Applied?` | Checkbox | Orchestrator marks **flag only** |
| `Effective Recording Counts for Perfect Week?` | Lookup | Recording PW eligibility |
| `Perfect Week Credit Applied?` | Checkbox | Orchestrator marks **flag only** |

### XP Events (canonical writes)

| Field | Value / rule |
|-------|----------------|
| `Source Key` | = `Zoom Credit Key` |
| `XP Bucket` | **`Zoom Attendance`** |
| `XP Source` | **`Zoom Meeting Recording Quiz`** (DEV option present) |
| `XP Activity Date` | Canonical date |
| `XP Reason Public` / `XP Reason Debug` | Public + debug |
| `Enrollment` / `Zoom Meeting` | Linked |
| `Zoom Attendance` | Link **if field exists** (DEV: **missing** — skip) |
| `Active?` | Soft-void on conflict |
| **Never** | `Zoom Meetings.Attendees` |

### Reward rule

| Rule Key | Amount (DEV) | Role |
|----------|--------------|------|
| `ZOOM_ATTEND_BASE` | **60** (active, unique) | Live base; recording = formula % |

---

## 3. Script / version (DEV slot limit → single orchestrator)

| # | File | Version | Automation name |
|---|------|---------|-----------------|
| **117** | `117-zoom-recording-credit-orchestrator.js` | **v1.1.0** | **117 - Zoom Recording Credit - Orchestrator** |

Modular 117a–f remain in repo as reference / future split. **DEV paste = orchestrator only** (slot limit).
**117d/117e v1.1.0** no longer write `Attendees` (flag-only + documented gaps).

Paste from production docblock through end — **skip** GitHub header.

Keep automation **OFF**.

---

## 4. Trigger / conditions / inputs (corrected)

**Replace incorrect trigger:** `Recording Quiz Submitted At is one week from now`

| Item | Value |
|------|--------|
| Table | **Zoom Attendance** |
| Conditions | `Attendance Method` is `Recording Quiz`; `Enrollment` not empty; `Zoom Meeting` not empty |
| Input | `recordId` = Airtable record ID of trigger record |
| Optional input | `webhookUrl` — **leave blank** (email send stays disabled) |

---

## 5. Source Key / exclusivity / 101 safety

| Concern | Rule |
|---------|------|
| Recording Source Key | `ZOOM_CREDIT\|{Enrollment RID}\|{Zoom Meeting RID}` |
| Live Source Key (101) | `ZOOM_ATTEND_BASE\|{Zoom Meeting Key}\|{enrollmentId}` |
| Exclusivity | Formula `Zoom Credit Conflict?` / `Zoom Credit Approved?` |
| Dedupe | Recheck XP Events by Source Key; rerun → `skipped_exists` |
| Conflict | Soft-void `Active? = false` (`deactivated_on_conflict`) |
| **Attendees** | **Never written** by 117 |
| **101** | Trigger prerequisites must remain unchanged |

---

## 6. Perfect Week & level-gate downstream status (gaps)

| Concern | Recording layer | Downstream consumer today | Status |
|---------|-----------------|---------------------------|--------|
| Perfect Week | `Effective Recording Counts for Perfect Week?` + `Perfect Week Credit Applied?` | **057** counts `Zoom Meetings.Attendees` only | **GAP** — flag marked; PW not satisfied via recording until 057 (or formula) unions recording credits |
| Level gate | `Zoom Gate Credit Earned?` + `Gate Credit Applied?` | **042** reads `Enrollments.Total Zoom Attendances` (count of live `Zoom Meetings` / Attendees inverse) | **GAP** — flag marked; gate total does not include recording-only credit |
| Bypass forbidden | — | Writing `Attendees` to impersonate live | **Not allowed** (101 double-credit) |

---

## 7. Exact DEV replacement steps (when Mike authorizes paste)

1. Open DEV Automations → **117 - Zoom Recording Credit - Orchestrator** (keep **OFF**).
2. Fix trigger to Zoom Attendance + conditions in §4 (remove “one week from now”).
3. Replace script body with repo `117-zoom-recording-credit-orchestrator.js` **v1.1.0** (skip GitHub header).
4. Map input `recordId` only; leave `webhookUrl` blank / unset.
5. Confirm no action writes `Zoom Meetings.Attendees`; no Make/email action enabled.
6. Leave **OFF**. Do not enable 101 changes. Do not PROD paste.
7. Record automation ID in install-results doc after paste.

---

## 8. Test scenarios (after paste — still OFF unless manual)

| ID | Setup | Expected |
|----|-------|----------|
| T1 | Recording Quiz · Approved · amount > 0 | XP `created` · bucket/source/key/date correct · **Attendees unchanged** |
| T2 | Rerun | `skipped_exists` |
| T3 | Live sibling conflict | soft-void / skip · live XP untouched |
| T4–T5 | Missing Enrollment/Meeting | error |
| T6 | Gate earned | `Gate Credit Applied?` true · **Attendees unchanged** · gap documented |
| T7 | PW flag | `Perfect Week Credit Applied?` true · **Attendees unchanged** · gap documented |
| T8 | Email | blank webhook → no send |

---

## 9. Rollback

1. Keep **117 OFF**.
2. Soft-void bad XP (`Active?=false` on `ZOOM_CREDIT|…`) — do not delete ledger.
3. Clear applied flags if needed.
4. **Do not** remove live attendees that were never added by this package.

---

## Status

| State | Value |
|-------|-------|
| Orchestrator in repository | **Yes — v1.1.0** (no Attendees writes) |
| XP Source option in DEV | **Added** — `Zoom Meeting Recording Quiz` |
| Read-only preflight | **PASS** (2026-07-18) |
| Ready for DEV paste | **After** Mike UI inventory + trigger fix |
| Installed / verified in DEV | **No** |
| Ready for PROD | **No** |
| Automation 101 | **Unchanged** |
| PROD | **Untouched** |
