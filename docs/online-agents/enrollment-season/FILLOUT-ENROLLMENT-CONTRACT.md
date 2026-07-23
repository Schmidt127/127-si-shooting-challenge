# Fillout Enrollment Contract

**SC items:** SC-060, SC-063, SC-146 (enrollment reopen readiness)  
**Schema:** `fillout-enrollment-contract.schema.json`  
**Validator:** `tools/enrollment-season/enrollment_validator.py`  
**Constraint:** Do **not** edit the live Fillout form in this package.

---

## Purpose

Define the machine-readable field contract between the Enrollment Fillout form and Airtable `Enrollments`, so PROD reopen (SC-146) can be validated offline before Mike turns the form on.

---

## Contract instance (repository)

```json
{
  "formId": "OPERATOR_SET_IN_FILLOUT",
  "version": "1.0.0-enrollment-season",
  "timezone": "America/Denver",
  "airtableBaseId": "appn84sqPw03zEbTT",
  "airtableTable": "Enrollments"
}
```

---

## Field contract

| External label | Airtable field | Type | Required | Validation | Normalization | Allowed values | Failure (Fillout / 001) | Downstream | Privacy |
|----------------|----------------|------|----------|------------|---------------|----------------|-------------------------|------------|---------|
| Athlete First Name | Athlete First Name | singleLineText | yes | non-empty; not email/digits-only | trim; collapse spaces | — | block / skip | 001 identity, 075 display | PII |
| Athlete Last Name | Athlete Last Name | singleLineText | yes | non-empty | trim; collapse spaces | — | block / skip | 001 identity | PII |
| Parent / Guardian First Name | Parent First Name | singleLineText | yes* | non-empty (or full name) | trim | — | block / n_a | 075 | PII |
| Parent / Guardian Last Name | Parent Last Name | singleLineText | yes* | non-empty (or full name) | trim | — | block / n_a | 075 | PII |
| Parent Email | Parent Email | email | yes | RFC-like email | lowercase; strip whitespace/angles | — | block / skip | 001 key, 075/072/076 Make | sensitive_contact |
| Athlete Email | Athlete Email | email | no | if present, valid email | lowercase | — | warn / ignore | future athlete comms | sensitive_contact |
| Grade | Grade | singleSelect | yes | must map to Grade Band range | map Pre-K→Pre K | Pre K,K,1–12 (confirm live options) | block / 002 skip | 002/003 Grade Band | public_safe |
| School | School | multipleRecordLinks / text bridge | season-dependent | prefer linked School record | trim | Schools table | warn / n_a | standings display | public_safe |
| Parent Cell | Parent Cell Number | phoneNumber | no | basic phone pattern | strip formatting optionally | — | warn / n_a | SMS future (SC-044) | sensitive_contact |
| Athlete Cell | Athlete Cell Number | phoneNumber | no | basic phone pattern | — | — | warn / n_a | future | sensitive_contact |
| School Year / Season | School Year | singleSelect | yes | must be current season option | — | live single-select | block / n_a | season scoping | internal_ops |
| Program / Challenge | Program Instance | multipleRecordLinks | yes for welcome | must link active instance | — | Program Instance records | block / 075 error | 075, 023 | internal_ops |
| Gender | Gender | singleSelect | no | option exists | — | live options | allow / n_a | welcome copy | PII |
| Consent / Terms | *(confirm Fillout-only or Airtable field)* | checkbox | yes | must be true | — | true | block / n_a | compliance | internal_ops |
| Mailing Address | Mailing Address Submitted | multilineText | no | — | trim | — | allow / n_a | ops | PII |
| Registration Source | Registration Source | singleSelect | no | option exists | — | live options | allow / n_a | analytics | internal_ops |

\*Parent name: either first+last or a single full-name field that maps into Parent First/Last / formula — confirm live Fillout mapping before reopen.

### Computed Airtable fields (never map Fillout writes)

`Parent Email - Cleaned`, `Athlete Email - Cleaned`, `Athlete Match Key Lookup`, `Enrollment Key`, `Full Athlete Name*`, `Welcome Email Ready?`, rollups/counts.

---

## Failure behavior summary

| Layer | Bad required identity | Bad email format | Duplicate season submit |
|-------|----------------------|------------------|-------------------------|
| Fillout (target) | Block submit | Block submit | Warn if detectable; cannot fully know Airtable state |
| Automation 001 | Skip + Athlete Match Status Skipped | N/A (pre-validated) | May rematch Athlete; may create second Enrollment |
| Offline validator | FAIL | FAIL | FAIL when season key provided |

---

## Privacy classification

| Class | Handling |
|-------|----------|
| PII / sensitive_contact | Never commit real values; mask in fixtures; Schmidt-only for live email tests |
| payment | Stripe amount fields if present — do not log |
| public_safe | School/grade may appear in public presentation later |

---

## SC-146 reopen gate (enrollment portion)

Before turning Fillout ON:

1. Contract fields verified against live Fillout UI (Mike/OMNI — not this agent).  
2. Offline validator PASS on sample payloads.  
3. Weeks + School Year + Program Instance seeded.  
4. Schmidt remains Active and visible (no new exclusion rule).  
5. Daily intake form reopen still depends on SC-135 dry-run (submission form — sibling concern).

---

## Related

- `CURRENT-ENROLLMENT-PIPELINE.md`  
- `IDENTITY-MATCHING-AUDIT.md`  
- `MIKE-ACTIONS.md`
