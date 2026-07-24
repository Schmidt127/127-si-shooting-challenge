# Field Ownership Matrix — Agent 2

**Extends (does not replace):**  
- `docs/foundation-reset/CRITICAL-PATH-FIELD-OWNERSHIP-MATRIX-2026-07-23.md`  
- `docs/next-wave/automation-ownership/SINGLE-WRITER-OWNERSHIP-MATRIX.md`

**Evidence mix:** `schema-snapshot` + `repo-script` + `verified-prod` (weekly email 2026-07-24)

---

## Ownership classes

| Class | Meaning |
|-------|---------|
| User / Fillout | Human or form entry |
| Ops | Manual Airtable / OMNI |
| Automation NNN | Named script is intended writer |
| Make / Lambda | External system writeback |
| Formula / Rollup / Lookup | Computed — scripts must not write |
| Dual / Race | More than one live writer path — risk |
| Unknown | Insufficient evidence |

---

## Weekly Athlete Summary — email / send fields (high attention)

| Field | Type | Intended writer | Readers | Multiple writers? | Risk | Notes |
|-------|------|-----------------|---------|-------------------|------|-------|
| Build Weekly Email Now? | checkbox | **118** (schedule) / ops | **072** trigger | Controlled | High | Clear after build per 072 pattern |
| Weekly Email Ready? | checkbox | **072** | **119**, **074** trigger | No (intended) | High | Package ready gate |
| Send to Make? | checkbox | **119** arm; **074** clears on webhook success | **074** | Sequenced | High | Arm ≠ send |
| Weekly Email Subject / Recipients / HTML / Text / Payload JSON / Week Label / Last Built At / Revision | text/date | **072** | **074**, Make | No | High | Package body |
| sendMode | singleSelect Test\|Live | **072** / ops; **074** input may override | **074**, Make | Dual possible | **Critical** | PROD 074 must not force Test (`verified-prod`) |
| Weekly Email Sent? | checkbox | **Make Live writeback** | **074** skip-if-sent | Make owns final | Critical | 074 must not clear |
| Weekly Email Sent At | dateTime | **Make Live writeback** | Ops / audits | Make | High | Preferred sent timestamp for email path |
| Weekly Summary Sent At | dateTime | Unknown / legacy path | Ops | Unknown | Medium | Parallel timestamp — classify carefully |
| Make Send Status | singleSelect Ready\|Sent | **Make Live** → Sent | Ops | Make | High | Verified Sent after Live |
| Weekly Summary Email Status | singleSelect Not Ready\|Ready for Send\|Sent\|Error | **072** / legacy mix | Ops | Possible dual | Medium | Overlaps checkbox Sent? — Hide from casual views |
| Weekly Summary Send Error / Weekly Email Error | text | **072** / **074** / Make | Ops | Possible | Medium | Prefer one error surface later |

**Verified production correction (`verified-prod` 2026-07-24):** After 074 `sendMode` changed from fixed Test → Live, Make wrote `Weekly Email Sent?`, `Make Send Status=Sent`, and sent timestamp. Production must not remain forced to Test.

---

## Identity / key fields (never dual-write formulas)

| Table | Field | Type | Writer | Rule |
|-------|-------|------|--------|------|
| Enrollments | Enrollment Key | formula | none | Read-only |
| Weeks | Week Key | formula `RECORD_ID()` | none | Read-only |
| WAS | Summary Key | formula | none | 031/101/118 must not write |
| WAS | Weekly Summary Key | formula | none | Display-based alternate — do not treat as primary identity |
| XP Events | Source Key | text | Creating XP script | One pattern per family |
| XP Events | XP Dedupe Key / Normalized | formula | none | 010/114 may read |
| Athlete Achievement Unlocks | Unlock Key | formula | none | |
| Athlete Achievement Unlocks | Milestone Source Key | text | **066** | Unlock family |
| Homework Completions | Homework Completion Key | formula | none | |
| Video Feedback | Video Feedback Key | text/formula path | **013** | 112 legacy OFF |

---

## Core pipeline fields (condensed)

| Table | Field | Intended writer | Risk |
|-------|-------|-----------------|------|
| Enrollments | Active? | Ops (+ skip guards in many scripts) | High (standings/views) |
| Enrollments | Athlete / Program Instance / Grade Band / School Year | Intake **001–003** / Fillout | Medium |
| Enrollments | Current Level / Next Level | **042** | High |
| Submissions | Enrollment | **023** / 115 pre-link | High |
| Submissions | Week | **005** | High |
| Submissions | Activity Date / Shot totals | Fillout / 115 | High |
| Submissions | Duplicate Review Status | **007** / 115 | High |
| Submission Assets | Canonical URL / Storage Key / hash | Make/Lambda | High |
| Submission Assets | Upload Status | **009/020/013/070\*** / Make | Dual sequenced |
| Homework Completions | Enrollment / Week / Homework | **020** | High |
| XP Events | Enrollment / Points / Source Key / XP Bucket | XP scripts (010/054/059/065/101/114/117…) | Critical |
| Zoom Meetings | Attendees | Live attendance only | Critical if recording writes |
| Zoom Attendance | credit / send keys | **117\*** / **117f** | High |
| Video Feedback | Enrollment / Asset | **013** | High if 112 ON |
| Testing Scenarios | Run Test? / results | Operator + **115** | Keep isolated |

Full writer inventory by automation number: Agent 9 `AUTOMATION-WRITER-INVENTORY.md`.

---

## Explicit non-ownership (Agent 2)

- Did not change any Airtable field
- Did not reassign live writers
- Did not resolve 117 vs 117c (still Mike attestation)
- Did not invent Weekly Threshold XP writer
