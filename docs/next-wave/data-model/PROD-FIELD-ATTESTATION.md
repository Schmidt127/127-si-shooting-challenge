# PROD Field Attestation Sheet — Agent 2

**Base:** `appn84sqPw03zEbTT`  
**Updated:** 2026-07-24 (continuation)

| Evidence tag | Meaning |
|--------------|---------|
| schema-snapshot | Metadata API export 2026-07-23 post-ts |
| verified-prod | Mike / Live run 2026-07-24 |
| make-blueprint-user | Uploaded Make Live module mapping (user 2026-07-24) |
| repo-script | Automation CONFIG / logic |
| mike-ui | Exact OMNI/UI check still required |

---

## Weeks

| Field | Type / formula | Writer | Reader | Verified? | Evidence | Discrepancy |
|-------|----------------|--------|--------|-----------|----------|-------------|
| Week Name (primary) | singleLineText | Ops | Display | Yes | schema-snapshot | Display label only |
| Week Key | formula `RECORD_ID()` | none | Summary Key; 031/118 | Yes | schema-snapshot | Relational identity |
| Week Code | formula (intended `YYYY-YYYY\|Week N`) | none | Ops uniqueness | **Partial** | verified-prod (Mike created in current PROD) | **Absent from 2026-07-23 snapshot** — OMNI must confirm exact name + formula |
| Start Date | dateTime America/Denver | Ops | 005 | Yes | schema-snapshot | — |
| End Date | dateTime America/Denver | Ops | 118/119 | Yes | schema-snapshot | — |
| Week End Key | — | — | — | **Absent** | schema-snapshot | Schedulers use End Date Denver date key |
| Config - Lnk | — | — | — | **Absent on Weeks** | schema-snapshot | Weeks → Program Instance |
| Program Instance | link | Ops | Season | Yes | schema-snapshot | Year grouping path |

### Three distinct Week concepts (do not collapse)

1. **Week Key** = `RECORD_ID()` — stable relational identity  
2. **Week Code** — human/ops annual code (Mike PROD formula; attest exact field)  
3. **Week Name** — display primary (`Week 0`, `Post-Challenge`, …)

---

## Weekly Athlete Summary (email)

| Field | Type | Writer | Reader | Verified? | Evidence | Discrepancy |
|-------|------|--------|--------|-----------|----------|-------------|
| Summary Key | formula | none | 031/118 | Yes | schema-snapshot | Never write |
| Build Weekly Email Now? | checkbox | **118** (ON) | **072** | Yes | verified-prod | — |
| Weekly Email Ready? | checkbox | **072** | **119**/074 | Yes | repo-script | — |
| Send to Make? | checkbox | **119** arm; **074** clear | **074** | Yes | verified-prod | — |
| sendMode | Test\|Live | **118**/072/ops; 074 input | **074**/Make | Live PROD | verified-prod | 118 v1.5 writes input sendMode |
| Weekly Email Sent? | checkbox | **Make Live** | **074** | Yes | verified-prod + make-blueprint-user | Authoritative flag |
| Make Send Status | Ready\|Sent | **Make Live** → Sent | Ops | Yes | make-blueprint-user | — |
| Weekly Summary Sent At | dateTime | **Make Live** = now | Ops | Yes | make-blueprint-user | Authoritative timestamp |
| Weekly Email Sent At | dateTime | **Not Make Live** | Ops | Unverified | make-blueprint-user | May stay blank — not Make-owned |
| Weekly Summary Email Status | singleSelect | **Not Make Live** | Ops | Unverified | make-blueprint-user | Not Make-owned |
| Weekly Email Error | text | 074 / package | Ops | repo | repo-script | — |

---

## Homework Completions

| Field | Type | Writer | Reader | Verified? | Evidence | Notes |
|-------|------|--------|--------|-----------|----------|-------|
| Homework Completion Key | formula display join | none | Views | Yes | schema-snapshot | Scripts do **not** dedupe on this |
| Enrollment / Week / Homework | links | 020 / 067 | 065 XP | Yes | repo-script | RID matching in scripts |
| Submission Assets | link | 020 | Upload | Yes | repo-script | — |
| Completion/Review status | select | 020 + coach | 064/065 | Yes | repo-script | — |
| XP Events | link | 065 | Ledger | Yes | registry | `HOMEWORK_XP\|{hcId}` |

**020 match:** Submission RID + Homework RID + slot  
**067 match:** Enrollment RID + Week RID + Homework RID  

---

## Automations ON (verified-prod 2026-07-24)

072 ON · 074 ON (sendMode Live) · 118 ON Sun 5:00 AM Denver · 119 ON Sun 10:00 AM Denver · Make Bulk Email May 18 ON  

**Do not recommend keeping 118/119 OFF.**
