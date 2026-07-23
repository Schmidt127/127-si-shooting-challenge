# New vs Returning Athlete Spec

**SC item:** SC-061  
**Fixtures:** `tests/fixtures/enrollment-season/new-returning-cases.json`  
**Tests:** `tools/enrollment-season/tests/test_new_returning_and_siblings.py`

---

## Intended behaviors

| Case | Athlete row | Enrollment row | Notes |
|------|-------------|----------------|-------|
| Brand-new athlete | **Create** First/Last/Parent Email, Active?=true | Create (Fillout) → 001 links + Active?=true | Then 002 Grade Band |
| Returning, same data | **Match**; refresh names/parent email/Active?=true | New season Enrollment linked to same Athlete | Idempotent field updates OK |
| Returning, changed school | Match Athlete | New Enrollment carries new School link | School is Enrollment-scoped, not identity |
| Returning, changed grade | Match Athlete | Grade on Enrollment → 002/003 band | Prior season Grade Band history untouched |
| Returning, changed athlete email | Match Athlete | Enrollment Athlete Email may differ | Email not in match key |
| Already enrolled current season | Match Athlete | **Second Enrollment possible today** | Helper WARNING; ops decide void/inactivate; no auto-merge |
| Returning after inactive season | Match; 001 sets Athlete Active?=true | New Active Enrollment | Prior Enrollment may stay Inactive |

---

## Explicit non-behaviors

- No automatic merge of Athletes.  
- No automatic deletion of prior Enrollments.  
- No “steal” of another family’s Athlete when parent email differs.  
- Parent email change is treated as **new Athlete** (see identity audit risk).

---

## Operator checklist (PROD, when testing)

1. Submit returning Schmidt-shaped identity (controlled emails only).  
2. Confirm Athlete ID unchanged (`recgqVstObQRzgXJF` for Schmidt).  
3. Confirm Enrollment link points to that Athlete.  
4. Confirm Grade Band assigned.  
5. Confirm no second Athlete created for whitespace/case variants.
