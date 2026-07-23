# Current Enrollment Pipeline Map

**Owner package:** Online Agent 7 — Enrollment, Identity, and Season Readiness  
**Base (active construction):** PROD `appn84sqPw03zEbTT`  
**Evidence date:** 2026-07-23  
**Primary scripts:** `001`, `002`, `003`, `075` (welcome email build)  
**Schema evidence:** `airtable/schema/snapshots/prod-foundation-reset-20260723/`

This document traces the repository-evidenced enrollment path. It does **not** change live Fillout or Airtable configuration.

---

## End-to-end path

```text
Fillout Enrollment form
  → creates Enrollments row (field map external to this package)
  → Automation 001: find/create Athlete + link + Active?=true
  → Automation 002: assign Grade Band (initial, when blank)
  → Automation 003: re-assign Grade Band if Grade changes
  → Automation 075: build welcome email package (Parent Email)
  → Make/Gmail (out of scope here): send welcome when armed
  → Downstream eligibility: Active? / PPE / Program Instance / Weeks
```

---

## Stage 1 — Fillout enrollment intake

| Item | Repository evidence |
|------|---------------------|
| Form | External Fillout (not edited by this package); SC-146 notes form OFF since C-008 |
| Writer | Fillout → Enrollments create |
| Identity fields needed by 001 | Athlete First Name, Athlete Last Name, Parent Email (or Cleaned / Submitted) |
| Common enrollment fields (schema) | Grade, School (link), School Year, Parent First/Last, Athlete Email, Parent/Athlete Cell, Gender, Program Instance, Registration Source, addresses, Price Paid to Stripe |

### Input field classes

| Class | Fields |
|-------|--------|
| **Required for 001** | Athlete First Name, Athlete Last Name, Parent Email (Cleaned preferred) |
| **Required for 002** | Grade (+ Athlete linked) |
| **Required for 075** | Parent Email, Program Instance |
| **Optional / hygiene** | Athlete Email, phones, school, gender, addresses, referrer |
| **Computed (do not write)** | Parent/Athlete Email - Cleaned, Athlete Match Key Lookup, Enrollment Key, Full Athlete Name*, Welcome Email Ready? |

\*Primary-name formulas exist; Presentation-field work is owned elsewhere (SC-054).

---

## Stage 2 — Athlete lookup or creation (001 v5.1)

**Script:** `airtable/automations/shooting-challenge/001-enrollment-intake-and-setup-find-or-create-athlete-and-link-enrollment.js`

### Reads

| Table | Fields |
|-------|--------|
| Enrollments | Athlete First/Last Name, Parent Email - Cleaned / Parent Email / Parent Email Submitted, Athlete (link), Active?, Athlete Match Status |
| Athletes | First Name, Last Name, Parent Email, Athlete Match Key (formula, read-only), Active? |

### Match hierarchy (intended)

1. Enrollment already linked to Athlete → activate Athlete, skip search  
2. Exact `Athlete Match Key` formula match  
3. Exact normalized first + last + parent email  
4. Last-chance re-query before create  
5. Create Athlete

**Match key (script-built):** `normalizeEmail(parent)|normalizeText(first)|normalizeText(last)`

### Writes

| Table | Fields |
|-------|--------|
| Athletes | First Name, Last Name, Parent Email, Active?=true (create or update) |
| Enrollments | Athlete link, Active?=true, Athlete Match Status (`Processing` → `Linked` / `Skipped` / `Error`) |

### Never writes

- `Athletes.Athlete Match Key` (formula)  
- Enrollment formula/lookup/rollup/count fields

### Error / skip handling

| Condition | Behavior |
|-----------|----------|
| Missing recordId / invalid `rec*` | error + throw |
| Enrollment not found | skipped |
| Missing first/last/parent email | skipped + status Skipped |
| Match/create failure | error + status Error + throw |

### Outputs

`athleteId`, `athleteMatchKey`, `actionTaken`, `matchMethod`, `parentEmailUsed`, `statusOut`, `errorOut`, `debugStep`

---

## Stage 3 — Grade Band (002 / 003)

| Script | When | Writes |
|--------|------|--------|
| **002** | Grade present, Athlete present, Grade Band empty | Grade Band link, Grade Band (Auto Assign), Last Grade Used, Grade Band Status / Assignment Status |
| **003** | Grade changes after prior assignment | Recomputes band when refresh conditions met |

**Reads:** Enrollments.Grade; Grade Bands Min/Max Grade, Active?, Sort Order  
**Downstream:** XP Reward Rules, WAS copy scripts (030), homework/video grade-band copy (063/111)

---

## Stage 4 — Parent and athlete emails

| Concern | Evidence |
|---------|----------|
| Parent email source for identity | 001: Cleaned → Parent Email → Submitted |
| Athlete email | Stored on Enrollment; **not** used by 001 matching |
| Welcome email | 075 builds subject/HTML; requires Parent Email + Program Instance; does not mark Sent |
| Daily / weekly emails | 076/072+ — Active?/Schmidt rules (see ACTIVE-PROCESSING-AUDIT.md) |

---

## Stage 5 — Program / season fields

| Field | Role |
|-------|------|
| School Year | Season label on Enrollment (single-select) |
| Program Instance | Season/program scoping; required for 075; used by 023 when present |
| Weeks.Program Instance | Optional link on Weeks rows |
| Program Instance multi-year redesign | SC-067 **Deferred** — out of scope for automation rewrite here |

---

## Stage 6 — `Active?` status

| Writer today | 001 sets Enrollment + Athlete `Active?=true` on successful link |
| Ops override | Human may uncheck for withdrawal |
| Schmidt (Foundation Reset) | Enrollment `recgP9qZYjAhE7NXm` **Active?=true** |
| PPE field | `Progress Processing Enabled?` — C-010 design; may be missing in PROD |

See `ACTIVE-PROCESSING-AUDIT.md`.

---

## Stage 7 — Downstream processing eligibility

| Consumer | Enrollment dependency |
|----------|----------------------|
| 023 | Active Enrollment for Athlete (+ optional Program Instance) |
| 005 | Weeks by activity date range (America/Denver) — not enrollment create |
| 010 / XP family | Enrollment linked on Submission; PPE/Active? gaps documented |
| 031 WAS | Enrollment + Week |
| Levels / achievements / Zoom / video | Enrollment link + Active?/PPE per script |
| Web standings | Active?-based view / fallback |

---

## Duplicate prevention (current)

| Layer | Mechanism | Gap |
|-------|-----------|-----|
| Athlete identity | 001 match key + last-chance re-query | Parent email change / spelling → new Athlete |
| Season Enrollment uniqueness | **Not enforced in 001** | Second Enrollment same season possible |
| Form resubmit | If Enrollment already linked → `already-linked` | Second Enrollment row still possible from Fillout |
| Destructive merge | **None (correct)** | Manual ops only |

---

## Identity matching summary

See `IDENTITY-MATCHING-AUDIT.md` and `tools/enrollment-season/identity_matching.py`.

---

## Offline artifacts

| Artifact | Path |
|----------|------|
| Identity helper | `tools/enrollment-season/identity_matching.py` |
| Validator | `tools/enrollment-season/enrollment_validator.py` |
| Fixtures | `tests/fixtures/enrollment-season/` |
| Fillout contract | `FILLOUT-ENROLLMENT-CONTRACT.md` + schema JSON |
