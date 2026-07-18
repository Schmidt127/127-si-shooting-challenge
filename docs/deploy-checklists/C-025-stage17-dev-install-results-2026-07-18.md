# C-025 Stage 17 — DEV installation results (2026-07-18)

**Branch:** `feature/c025-stage17-zoom-attendance`  
**Feature commit:** `5245cfe`  
**DEV base:** `appTetnuCZlCZdTCT`  
**PROD base:** `appn84sqPw03zEbTT` — **untouched**

---

## Verdict

**STOPPED after Step 1 (preflight PASS).**  
Step 2 (DEV Automations UI inventory) cannot be completed from Cursor because the Automations Meta API returns **403**. Paste of 117a–f is blocked until Mike completes the UI inventory and confirms no material overlap.

---

## 1. DEV XP Source option result — PASS

| Item | Value |
|------|--------|
| Table | `XP Events` |
| Field | `XP Source` |
| Option added (exact display) | **`Zoom Meeting Recording Quiz`** |
| Method | Records API create with `typecast: true` on a throwaway probe XP Event, then delete |
| Probe record | `reckpYlndi89cZqSa` (deleted) |
| Meta PATCH of choices | Failed with **422** (not used) |
| Legacy options | **Not** added (`Zoom Recording`, XP Bucket `Zoom` unchanged) |
| Field create/rename | **None** |

Evidence: `tools/airtable/_preview/c025_stage17_xp_source_option.json`

---

## 2. Updated preflight result — PASS

Re-ran `tools/airtable/_tmp_c025_stage17_preflight.py` + install probe.

| Check | Result |
|-------|--------|
| Zoom Attendance required fields | **22/22** |
| XP Bucket contains `Zoom Attendance` | **Yes** |
| XP Source contains `Zoom Meeting Recording Quiz` | **Yes** (exact) |
| `ZOOM_ATTEND_BASE` exists exactly once (active) | **Yes** (`recwwmZY5IZssmo6b`) |
| Current amount | **60** |
| `XP Activity Date` exists | **Yes** |
| `XP Reason Public` / `XP Reason Debug` | **Yes** |
| Source Key formula available (`Zoom Credit Key`) | **Yes** |
| Legacy S16 fields required | **No** (`Activity Date` / HC Zoom fields not required) |
| Duplicate active `ZOOM_ATTEND_BASE` | **No** (count = 1) |
| Config `Zoom Recording XP Percent of Live` | **50** (`recq14M5hEv3TIGEj`) |
| Expected recording amount (formula) | **`FLOOR(60 * 50 / 100) = 30`** when approved |

Evidence: `tools/airtable/_preview/c025_stage17_dev_preflight.json`, `c025_stage17_install_probe.json`

---

## 3. Existing DEV automation inventory — BLOCKED (API 403)

```
GET /v0/meta/bases/appTetnuCZlCZdTCT/automations → 403
INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND
```

Cursor cannot list, create, enable, or disable Airtable Automations via API with the current token.

### Mike UI checklist (required before paste)

In **DEV** Automations, search names/scripts for:

- `117` · `Zoom Attendance` · `Recording Quiz` · `Recording Credit`
- Zoom recording approval / email / gate / Perfect Week

For **each** match, record:

| Field | Fill in |
|-------|---------|
| Automation name | |
| Enabled / Disabled | |
| Trigger | |
| Conditions | |
| Actions (script / email / webhook) | |
| Script version in body | |
| Input variables | |
| Table / view | |
| Overlaps Stage 17 117a–f? (Y/N + note) | |

**Do not overwrite or delete** any existing automation until documented.  
If any match **materially overlaps** Stage 17 117a–f, **stop and report** before pasting.

---

## 4. Overlap findings

**Unknown** — UI inventory not yet available. Install Steps 3–9 **not started**.

---

## 5–10. 117a–f automation IDs / configuration

**Not installed.** No DEV automation IDs to record.

Paste source when authorized (leave **OFF**):

| Auto | Repo file | Version | Exact name |
|------|-----------|---------|------------|
| 117a | `117a-zoom-recording-normalize-recording-quiz-submission.js` | v1.1.0 | 117a - Zoom Recording Credit - Normalize Recording Quiz Submission |
| 117b | `117b-zoom-recording-coach-review-and-needs-correction-handling.js` | v1.1.0 | 117b - Zoom Recording Credit - Coach Review and Needs Correction Handling |
| 117c | `117c-zoom-recording-create-zoom-xp-event.js` | v1.1.0 | 117c - Zoom Recording Credit - Create Zoom XP Event |
| 117d | `117d-zoom-recording-apply-zoom-gate-credit.js` | v1.1.0 | 117d - Zoom Recording Credit - Apply Zoom Gate Credit |
| 117e | `117e-zoom-recording-apply-perfect-week-credit.js` | v1.1.0 | 117e - Zoom Recording Credit - Apply Perfect Week Credit |
| 117f | `117f-zoom-recording-send-approval-email.js` | v1.1.0 | 117f - Zoom Recording Credit - Send Approval Email |

---

## 11–20. Controlled tests / XP / exclusivity / downstream

**Not run** — install blocked at Step 2.

---

## 21. Final enabled/disabled states

No Stage 17 automations created. No enable/disable changes made via API.

---

## 22. Test records

| Record | Action |
|--------|--------|
| `reckpYlndi89cZqSa` | Option probe XP Event — **deleted** |
| Other DEV records | **Untouched** |

---

## 23–24. PROD / Make / email

| Surface | Status |
|---------|--------|
| PROD Airtable | **Untouched** |
| Make | **Untouched** |
| Real email | **None sent** |
| Softr | **Untouched** |
| Legacy S16 install | **Not performed** |

---

## 25. Documentation commit

See git commit on `feature/c025-stage17-zoom-attendance` for this results doc + packet/PROJECT_STATE updates.

---

## 26. Repository test results

| Check | Result |
|-------|--------|
| `node …/c025-stage17-zoom-attendance.test.js` | **PASS** |
| `python -m unittest tools.airtable.tests.test_c025_stage17_contracts` | **PASS** (pytest not installed; unittest used) |
| `node tools/validate-v2-release-readiness.js` | (run at commit time) |
| `git diff --check` | (run at commit time) |

---

## 27. Remaining gaps

1. **Automations Meta API 403** — cannot inventory or install from Cursor.  
2. Mike must complete **UI inventory** before paste.  
3. After paste (disabled): controlled DEV tests T1–T15 per user brief / packet §6.  
4. Downstream formula gaps (Enrollment XP total, WAS, Perfect Week, levels) remain **read-only observation** items after first successful award — do not change formulas in this task.

---

## 28. Recommended next step

1. Mike opens DEV Automations and fills the inventory table in §3.  
2. If **no material overlap**: paste 117a–f from repo (v1.1.0), leave **all OFF**, record automation IDs.  
3. Re-launch Cursor with inventory + IDs to run controlled DEV tests (enable one-at-a-time only).  
4. Do **not** enable permanently; do **not** PROD install.
