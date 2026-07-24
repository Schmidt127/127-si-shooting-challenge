# Airtable Interface / view specification

**Status:** Designed (not installed)  
**Base:** PROD `appn84sqPw03zEbTT` (install only after Mike approval)  
**Rule:** Do not create production fields automatically. Prefer existing fields.

## Interface concept (future)

Name: **Reliability Command Center**  
Type: Airtable Interface with linked filtered views / record lists  
Landing: summary counts by severity (manual or formula rollups later)

This Interface is **not installed**. Spec only.

---

## Recommended views

### 1. P0 Blocking Errors — Weekly Email

| Item | Spec |
|------|------|
| Table | Weekly Athlete Summary |
| Filter | `OR({Weekly Email Ready?}, {Send to Make?}, {Weekly Email Sent?})` AND any of: subject/recipients/HTML blank while Ready; Send while not Ready; Sent? XOR Make Send Status; Sent with Send still checked |
| Practical filter (existing fields) | `AND({Weekly Email Ready?}=1, OR({Weekly Email Subject}="", {Weekly Email Recipients}="", {Weekly Email HTML}=""))` **plus** separate saved view: `AND({Send to Make?}=1, {Weekly Email Ready?}=0)` **plus** `AND({Weekly Email Sent?}=1, {Make Send Status}!="Sent")` **plus** `AND({Make Send Status}="Sent", {Weekly Email Sent?}=0)` |
| Sort | Last Modified Time descending |
| Group | sendMode |
| Visible fields | Enrollment, Week, Ready?, Sent?, Send to Make?, Subject, Recipients, HTML (preview), Make Send Status, Sent At, sendMode, Weekly Email Error |
| Recommended action | Fix package via 072 or clear illegal arms; verify Make Live writeback |
| New field required? | **No** |
| Uses existing fields? | **Yes** |

### 2. Retryable Errors

| Item | Spec |
|------|------|
| Table | Multi-table (start with Submissions + Homework Completions + Unlocks) |
| Filter examples | Submissions: `XP Award Status` contains Awarded/Processed AND no linked XP (requires audit export or linked count if available). Practical: use RCC export filtered `retryEligibility=automatically_retryable` until Interface exists |
| Sort | Last Modified descending |
| Group | Table / workflow |
| Visible fields | Record name, Enrollment, status, error, Source Key |
| Recommended action | Re-run owning automation after Source Key check |
| New field required? | Optional later: `RCC Health` / `RCC Retry Class` (see proposed fields) |
| Uses existing fields? | Partial — full precision needs RCC report or new fields |

### 3. Missing Dependencies

| Item | Spec |
|------|------|
| Table | Submissions |
| Filter | `OR({Enrollment}="", {Activity Date}="", {Week}="")` |
| Sort | Activity Date descending |
| Group | none |
| Visible fields | Enrollment, Activity Date, Week, Shot Total, XP Award Status |
| Recommended action | Run 023/005; fix intake links |
| New field? | **No** |

### 4. Duplicate Risks

| Item | Spec |
|------|------|
| Table | XP Events |
| Filter | Operator uses RCC report `DUPLICATE_RISK` IDs, or temporary grouping by `Source Key` in Interface |
| Sort | Source Key |
| Group | Source Key |
| Visible fields | Source Key, XP Dedupe Key, Enrollment, XP Source, XP Points, Active? |
| Recommended action | Keep one Active event; deactivate extras |
| New field? | **No** for grouping by Source Key |

### 5. Stale Processing Records

| Item | Spec |
|------|------|
| Table | Weekly Athlete Summary |
| Filter | `{Build Weekly Email Now?}=1` AND `{Weekly Email Ready?}=0` AND last built/modified older than 12h (approximate via Last Modified Time if no built-at filter) |
| Sort | Last Modified ascending (oldest first) |
| Group | none |
| Visible fields | Enrollment, Week, Build Now?, Ready?, Error, Last Built At |
| Recommended action | Inspect 072 error; clear or rebuild |
| New field? | **No** (uses existing Build / Last Built At) |

Also create Enrollment view: `{Recalculate Level?}=1` sorted by modified ascending.

### 6. Weekly Email Health

| Item | Spec |
|------|------|
| Table | Weekly Athlete Summary |
| Filter | `OR({Weekly Email Ready?}=1, {Send to Make?}=1, {Weekly Email Sent?}=1, {Build Weekly Email Now?}=1)` |
| Sort | Week End / Last Modified descending |
| Group | Make Send Status |
| Visible fields | Full email field set listed in §1 |
| Recommended action | Walk 118→072→119→074→Make ownership |
| New field? | **No** |

### 7. XP Integrity

| Item | Spec |
|------|------|
| Table | XP Events |
| Filter | `OR({Enrollment}="", {XP Source}="", {XP Points}=BLANK(), {Source Key}="")` |
| Sort | Created descending |
| Group | XP Source |
| Visible fields | Enrollment, XP Source, Points, Source Key, Dedupe Key, Active?, Submission / HC / Unlock links |
| Recommended action | Repair or deactivate invalid XP; never double-create |
| New field? | **No** |

### 8. Achievement Integrity

| Item | Spec |
|------|------|
| Table | Athlete Achievement Unlocks |
| Filter | `XP Award Status = Awarded` (then manually confirm linked XP) + group by Unlock/Source Key for duplicates |
| Sort | Created descending |
| Group | Unlock Key / Source Key (whichever exists) |
| Visible fields | Enrollment, Achievement, Week, Unlock Key, XP Award Status, linked XP |
| Recommended action | 059 only after uniqueness proof |
| New field? | **No** |

### 9. Level Integrity

| Item | Spec |
|------|------|
| Table | Enrollments |
| Filter | `OR({Recalculate Level?}=1, {Current Level}={Next Level})` (second condition may need formula helper — see proposed fields) |
| Sort | Lifetime XP descending |
| Group | Current Level |
| Visible fields | Active?, Challenge Year, Lifetime XP, Current Level, Next Level, Recalculate Level?, gate fields |
| Recommended action | Run 042 after confirming rules |
| New field? | Optional formula `RCC Level Conflict?` |

### 10. Current Challenge-Year Problems

| Item | Spec |
|------|------|
| Table | Enrollments |
| Filter | `{Challenge Year}="2026-2027"` AND `{Active?}=1` (adjust year) — use as parent filter when drilling into linked WAS/Submissions |
| Sort | Name |
| Group | Grade Band |
| Visible fields | Athlete, Active?, Challenge Year, Config, Grade Band, emails |
| Recommended action | Keep historical years out of current processing |
| New field? | **No** |

### 11. Recently Resolved Problems

| Item | Spec |
|------|------|
| Table | n/a until RCC logging table exists |
| Filter | — |
| Recommended approach | Keep dated RCC report JSON under `docs/` or operator folder; optional later table `RCC Findings` |
| New field/table? | Optional — see below |

---

## Proposed new fields (only if Mike authorizes)

None are required to use the repository audit runner. These are optional Airtable accelerators.

### Optional A — Enrollment / WAS formula helpers

| Field | Table | Type | Purpose | Formula | Writer | Reader | Migration | Rollback |
|-------|-------|------|---------|---------|--------|--------|-----------|----------|
| `RCC Level Conflict?` | Enrollments | checkbox formula | Surface Current=Next | `IF(AND({Current Level}, {Next Level}, {Current Level}={Next Level}), 1, 0)` (adjust if link comparison needs NAME()) | formula | views | Additive | Delete field |
| `RCC Email Conflict?` | Weekly Athlete Summary | checkbox formula | Ready but blank package OR Send without Ready OR Sent XOR Make Sent | Compound `OR(...)` matching §1 | formula | Weekly Email Health view | Additive | Delete field |

### Optional B — RCC Findings log table (future)

| Field | Type | Purpose | Writer | Reader |
|-------|------|---------|--------|--------|
| Finding Code | single line | `ready_subject_blank` | Import script / human | Interface |
| Health Status | single select | contract statuses | Import | Interface |
| Priority | single select | P0–P3 | Import | Interface |
| Source Record Id | text | `rec…` | Import | Interface |
| Retry Eligibility | single select | retry classes | Import | Interface |
| Recommended Action | long text | operator action | Import | Interface |
| Resolved? | checkbox | closure | Human | Recently Resolved view |
| Resolved At | date | closure time | Human | Recently Resolved view |

**Migration impact:** Additive only. **Rollback:** archive table / delete.  
**Do not** auto-create in PROD from this agent run.

---

## Installation note

Views/Interface creation is an **in-Airtable OMNI / Mike** step. Repository provides exact filters above. Status remains **Designed** until Mike confirms creation in the base.
