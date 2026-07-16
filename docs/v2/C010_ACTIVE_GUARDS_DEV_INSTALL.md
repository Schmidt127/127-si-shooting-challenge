# C-010 — Active? / Progress Guards — DEV Installation Packet

**Status:** Repository package **ready for DEV installation** — **not pasted / not verified** in live Airtable by this commit  
**Base:** DEV only `appTetnuCZlCZdTCT`  
**PROD:** Do not paste until DEV evidence + Mike approval  
**Backlog:** C-010 · Wave 5  
**Authority:** Completed Airtable readiness audit · Stage-4 two-field contract · Stage-5 post-OMNI checklist  
**Scripts in scope:** **010**, **031**, **053**, **065**, **072**  
**Hard stops:** No PROD · No schema without Mike · Schmidt pipeline must keep running

---

## 0. Design authority (do not collapse to one checkbox)

Backlog title says “Active? safeguards.” Owner-approved Stage-4 model is **two fields**:

| Field | Controls | Used by this packet |
|-------|----------|---------------------|
| **`Active?`** | Web visibility + **comms** (weekly/daily parent email) | **072** |
| **`Progress Processing Enabled?`** | XP, streaks, WAS create/link, achievements progress | **010**, **031**, **053**, **065** |

### Athlete matrix

| State | Active? | Progress Processing Enabled? | 010/031/053/065 | 072 |
|-------|---------|------------------------------|-----------------|-----|
| Normal | true | true | Run | Build |
| Hidden / Schmidt | false | true | **Run** | **Skip** |
| Withdrawn | false | false | **Skip** | **Skip** |

**Why not Active?-only on XP scripts:** C-019 Schmidt enrollment is `Active?` = false while the full pipeline must still run. Active?-only guards would break DEV testing.

**Transition rule:** If `Progress Processing Enabled?` field is **missing**, treat as **true** (no skip). Same for `Active?` on 072 — if missing, do not skip (legacy bases).

---

## 1. Pre-flight (DEV)

| # | Check | Expected | Done |
|---|-------|----------|------|
| 1.1 | Base ID | `appTetnuCZlCZdTCT` | [ ] |
| 1.2 | Enrollments.`Active?` | Exists (checkbox) | [ ] |
| 1.3 | Enrollments.`Progress Processing Enabled?` | Exists **or** Mike authorizes create | [ ] |
| 1.4 | Backfill PPE | Non-withdrawn enrollments = true | [ ] |
| 1.5 | Schmidt | `recgP9qZYjAhE7NXm` · Active?=false · PPE=true | [ ] |
| 1.6 | Screenshot | Enrollment field list before paste | [ ] |

### Schema create (Mike/OMNI only)

| Field | Table | Type | Default |
|-------|-------|------|---------|
| `Progress Processing Enabled?` | Enrollments | Checkbox | true on create (**001** update separate) |

---

## 2. Per-automation install specs

### 2.1 Automation **010** — Submission Base XP

| Item | Spec |
|------|------|
| **Table** | Submissions |
| **Trigger condition** | Record matches: counted submission path (`Count This Submission?` + XP award path as today) |
| **Script guard** | After enrollment resolved + counted/shots validation; before XP rule load. Load Enrollment; if PPE field exists and unchecked → skip |
| **Guard field** | `Progress Processing Enabled?` |
| **actionOut** | `skipped_progress_disabled` |
| **statusOut** | `skipped` |
| **Expected inactive (PPE false)** | No XP create/repair; no milestone re-arm; Award Status unchanged |
| **Reactivation** | PPE=true → re-run 010 on counted submission; Source Key `SUBMISSION_XP\|{submissionId}` prevents duplicates |
| **Test record** | Schmidt submission (Active?=false, PPE=true) **must create XP**; withdrawn fixture (PPE=false) **must skip** |
| **Expected output (withdrawn)** | `statusOut=skipped`, `actionOut=skipped_progress_disabled`, `errorOut` explains PPE |
| **Rollback** | Re-paste prior 010 script; leave PPE field |

**Pseudocode**

```text
debugStep = "7b - Check Progress Processing Enabled?"
enr = load Enrollment(enrollmentId)
if fieldExists(PPE) && !getBooleanish(enr, PPE, fallback=true):
  setOutputs(statusOut=skipped, actionOut=skipped_progress_disabled, ...)
  return
```

---

### 2.2 Automation **031** — Find/Create Weekly Athlete Summary

| Item | Spec |
|------|------|
| **Table** | Submissions |
| **Trigger condition** | Enters view / matches: Activity Date, Week, Enrollment set; Count This Submission?; WAS empty (as today) |
| **Script guard** | Immediately after enrollment load; before Enrollment Key / WAS create |
| **Guard field** | `Progress Processing Enabled?` |
| **actionOut / actionTaken** | `skipped_progress_disabled` |
| **statusOut** | `skipped` |
| **Expected inactive (PPE false)** | No WAS create/link; no orphan XP repair |
| **Reactivation** | PPE=true + counted submission with empty WAS → 031 creates/links |
| **Test record** | PPE=false counted sub → no new WAS; Schmidt Active?=false PPE=true → WAS **created** |
| **Expected output** | `statusOut=skipped`, action `skipped_progress_disabled` |
| **Rollback** | Re-paste prior 031 |

---

### 2.3 Automation **053** — Streak occurrences rebuild

| Item | Spec |
|------|------|
| **Table** | Submissions |
| **Trigger condition** | Confirm in DEV UI (inventory UNKNOWN); script runs from triggering submission’s enrollment |
| **Script guard** | Immediately after `enrollmentId` resolved; before bulk streak queries |
| **Guard field** | `Progress Processing Enabled?` |
| **actionOut** | `skipped_progress_disabled` |
| **statusOut** | `skipped` |
| **Expected inactive (PPE false)** | No streak occurrence rebuild/upsert |
| **Reactivation** | PPE=true + new/edited counted submission → rebuild; occurrence keys stay idempotent |
| **Test record** | PPE=false enrollment with history → skip; re-enable → upsert without dup keys |
| **Expected output** | `statusOut=skipped`, `actionOut=skipped_progress_disabled` |
| **Rollback** | Re-paste prior 053 |

**Helper note:** Do **not** use raw `isChecked` without missing→true fallback (missing field would skip everyone).

---

### 2.4 Automation **065** — Homework XP

| Item | Spec |
|------|------|
| **Table** | Homework Completions |
| **Trigger condition** | Review complete, satisfactory, Award Status Pending, XP Events empty (as today) |
| **Script guard** | After enrollment link validated; before award-status processing |
| **Guard field** | `Progress Processing Enabled?` |
| **actionOut** | `skipped_progress_disabled` |
| **statusOut** | `skipped` |
| **Expected inactive (PPE false)** | No XP Event; **leave** Award Status = Pending (so reactivation can award) |
| **Reactivation** | PPE=true → re-run 065; Source Key `HOMEWORK_XP\|{homeworkCompletionId}` |
| **Test record** | Satisfactory Pending HC on PPE=false → skip; flip PPE → creates once |
| **Expected output** | `statusOut=skipped`, `actionOut=skipped_progress_disabled` |
| **Rollback** | Re-paste prior 065; Pending rows remain awardable |

---

### 2.5 Automation **072** — Build weekly summary email package

| Item | Spec |
|------|------|
| **Table** | Weekly Athlete Summary |
| **Trigger condition** | `Build Weekly Email Now?` checked; `Weekly Email Sent?` unchecked; Enrollment + Week not empty |
| **Script guard** | Immediately after enrollment record loaded; before heavy package queries |
| **Guard field** | **`Active?`** (comms) + hard exclude Schmidt ID |
| **actionOut** | `skipped_inactive` (or `skipped_inactive_enrollment`) |
| **statusOut** | `skipped` |
| **Expected inactive (Active?=false)** | Clear `Build Weekly Email Now?`; do **not** set Ready? / HTML / Send to Make? |
| **Reactivation** | Active?=true + check Build Now? → build; staff/C-011 arms send |
| **Test record** | Schmidt WAS with Build Now? → skip + Build Now cleared; normal Active enrollment → build |
| **Expected output** | `statusOut=skipped`, `actionOut=skipped_inactive` |
| **Rollback** | Re-paste prior 072; re-check Build Now? if needed |

**Schmidt hard exclude (belt-and-suspenders):**

```text
SCHMIDT_TEST_ENROLLMENT_ID = "recgP9qZYjAhE7NXm"
if enrollmentId === SCHMIDT_TEST_ENROLLMENT_ID → same skip path as Active?=false
```

---

## 3. Paste order (DEV)

1. Confirm PPE field exists (or fallback-true behavior accepted).  
2. Paste **010** → **031** → **053** → **065** (progress gates).  
3. Paste **072** (comms gate).  
4. Leave each OFF until single-automation smoke, then ON in DEV only.  
5. Do **not** change **071** (owner C-027 / homework email rule).

Also scheduled later (not this packet’s five): move **056 / 066 / 101** from Active? → PPE per Stage-4 inventory.

---

## 4. Combined DEV smoke matrix

| ID | Enrollment setup | Action | Pass |
|----|------------------|--------|------|
| C010-T1 | Active?=false, PPE=true (Schmidt) | Counted submission | **010** XP created |
| C010-T2 | Active?=false, PPE=true | Counted submission | **031** WAS created/linked |
| C010-T3 | Active?=false, PPE=true | Streak-eligible subs | **053** rebuilds |
| C010-T4 | Active?=false, PPE=true | Satisfactory homework Pending | **065** XP created |
| C010-T5 | Active?=false, PPE=true | Build Weekly Email Now? | **072** skipped_inactive |
| C010-T6 | Active?=false, PPE=false | Counted submission | **010** skipped_progress_disabled |
| C010-T7 | Active?=true, PPE=true | Build Weekly Email Now? | **072** builds; Send to Make? still unchecked |

---

## 5. Rollback (packet-wide)

1. Re-paste previous script versions from GitHub for touched automations.  
2. Do not delete `Progress Processing Enabled?` without Mike approval.  
3. No XP voiding required for skip-only failures.  
4. If false skips occurred while PPE missing (should not — fallback true), re-run safe backfills with C-024 keys.

---

## 6. Unresolved uncertainties

| Item | Status |
|------|--------|
| Live DEV/PROD paste versions of 010/031/053/065/072 | **UNKNOWN** — confirm in UI |
| Whether PPE field already exists in DEV | **UNKNOWN** — OMNI |
| Exact 053 Airtable trigger wording | **UNKNOWN** |
| Whether **076** (daily email) is patched in same wave | Out of this five-script packet; recommended soon |

---

## 7. Mike approvals needed

1. Authorize create of `Progress Processing Enabled?` if missing.  
2. Authorize DEV paste of the five scripts.  
3. Confirm Schmidt remains Active?=false, PPE=true.  
4. Approve later wave for 056/066/101 PPE migration.  
5. No PROD paste from this packet.

---

## 8. Related

- Stage-4 inventory / contract (overnight lead-integration; mirrored here)  
- Offline tests: `tools/airtable/tests/test_c010_active_guards_contract.py`  
- C-011 weekly email: [C011_AUTOMATIC_WEEKLY_EMAIL_DEV_INSTALL.md](./C011_AUTOMATIC_WEEKLY_EMAIL_DEV_INSTALL.md)  
- C-019 Schmidt views: [C019_DEV_TESTING_VIEWS.md](./C019_DEV_TESTING_VIEWS.md)
