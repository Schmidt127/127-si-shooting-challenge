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
| Build Weekly Email Now? | checkbox | **118** (ON Sun 5AM) | **072** | Controlled | High | Schedule verified ON |
| Weekly Email Ready? | checkbox | **072** | **119**, **074** | No | High | Package ready gate |
| Send to Make? | checkbox | **119** (ON Sun 10AM); **074** clears | **074** | Sequenced | High | Arm ≠ send |
| Package body fields | text/date | **072** | **074**, Make | No | High | Subject/HTML/recipients/payload |
| sendMode | Test\|Live | **118 v1.5** / **072**; **074** override | **074**, Make | Sequenced | Critical | Season Live |
| Weekly Email Sent? | checkbox | **Make Live** | **074** | Make | Critical | Authoritative flag |
| Weekly Summary Sent At | dateTime | **Make Live** (`now`) | Ops | Make | Critical | Authoritative timestamp |
| Weekly Email Sent At | dateTime | **Not Make Live** | Ops | Unverified | Medium | Hide |
| Make Send Status | Ready\|Sent | **Make Live** → Sent | Ops | Make | High | Verified |
| Weekly Summary Email Status | select | **Not Make Live** | Ops | Unverified | Medium | Hide |
| Weekly Email Error | text | **074** | Ops | Possible | Medium | Keep |

**Verified-prod 2026-07-24:** 072/074/118/119 ON; Make writes Sent? + Make Send Status + Weekly Summary Sent At. Never force 074 Test. See SENT-FIELD-OWNERSHIP.md.

---

## Identity / key fields (never dual-write formulas)

| Table | Field | Type | Writer | Rule |
|-------|-------|------|--------|------|
| Enrollments | Enrollment Key | formula | none | Read-only |
| Weeks | Week Key | formula `RECORD_ID()` | none | Read-only relational identity |
| Weeks | Week Code | formula (PROD; post-snapshot) | none | Ops annual code — OMNI attest |
| Weeks | Week Name | text primary | Ops | Display label |
| Enrollments | Current Level / Next Level | links | **042** | Authoritative progression |
| WAS | Level Number | formula thresholds | none | Email snapshot only — not authoritative |
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
