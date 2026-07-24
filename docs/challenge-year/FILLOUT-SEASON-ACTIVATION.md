# Fillout Season Activation Package

**Status:** Repository evidence package — live Fillout UI not mutated by this agent  
**Scope:** Shooting Challenge enrollment + daily submission forms  
**Related:** [`docs/online-agents/enrollment-season/FILLOUT-ENROLLMENT-CONTRACT.md`](../online-agents/enrollment-season/FILLOUT-ENROLLMENT-CONTRACT.md)  
**Machine contract:** [`fillout-season-routing.contract.json`](./fillout-season-routing.contract.json)

## Verified from repository evidence

| Fact | Evidence | Certainty |
|------|----------|-----------|
| Enrollment Fillout maps into Airtable `Enrollments` | `docs/online-agents/enrollment-season/FILLOUT-ENROLLMENT-CONTRACT.md` | High |
| PROD base id in contract instance | `appn84sqPw03zEbTT` | High (contract) |
| School Year supplied as single-select on Enrollment | Contract field table (`School Year`) | High |
| Program Instance supplied as linked record for welcome path | Contract field table | High |
| Config link field on Enrollment Fillout | Not listed in enrollment contract | **Unknown — F-ATT-02** |
| Activity Date captured on daily submission form | Submission pipeline / 005 / testing docs | High (field name `Activity Date`) |
| Week is **not** chosen in Fillout — assigned by automation **005** from Activity Date | Automation 005 + WEEK-CONTRACT | High |
| Enrollment selected for submissions | Returning-athlete lookup / pre-link (115 for Schmidt tests) | Medium — exact Fillout lookup **F-ATT-04** |
| Daily submission form currently **OFF** (C-008) | PROJECT_STATE / SC-146 | High |
| Forms must not hard-code prior year as permanent current | ANNUAL-CONFIG-WEEK-AUDIT / MIKE-ACTIONS | High (rule) |
| Exact live hidden Config / Program Instance record IDs | Not in git | **Unknown — Mike UI attestation** |
| Exact live redirect / confirmation copy for new year | Not in git | **Unknown — Mike UI attestation** |

Machine-readable routing stub: [`fillout-season-routing.contract.json`](./fillout-season-routing.contract.json) — unknowns marked `UNKNOWN_UI_ATTESTATION`.

Do **not** guess undocumented mappings.

## Forms to inspect (UI)

1. Enrollment / registration Fillout form (PROD destination).
2. Daily shot submission Fillout form (currently OFF — reopen only after season gates).
3. Any homework / learning Fillout paths still in use (confirm vs Next.js / Make).

## Hidden fields / defaults to verify

For each form, record:

| Check | Expected for new season | Mike action if wrong |
|-------|-------------------------|----------------------|
| School Year single-select default | New `YYYY-YYYY` | Change default option |
| Program Instance link / hidden id | Active instance for new year | Update hidden record id |
| Config link / hidden id (if present) | New Config `rec…` | Update; remove prior year |
| Challenge year text (if present) | Matches Config year | Update |
| Test vs Live / sandbox flag | Matches intended mode | Clear stale Test defaults before Live reopen |
| Activity Date field (submission) | Operator-entered; Denver-safe | Confirm validation rules |
| Grade / Grade Band mapping | Current option set | Align with Grade Bands table |
| Enrollment lookup (returning) | Season-aware key | Confirm identity contract |
| Confirmation screen year copy | New year wording | Edit copy |
| Redirect URL | Intended landing (`/shoot` — Softr Obsolete / Not Used) | Update if stale |

## Test vs Live behavior

| Mode | Behavior |
|------|----------|
| Test | Schmidt-only or Test enrollment; do not open mass parent intake |
| Live | Enrollment open dates respected; daily form ON only after SC-146 / SC-135 gates |

## Exact new-season updates (numbered)

1. Open Fillout → Enrollment form → Settings / Airtable mapping.
2. Screenshot current School Year, Program Instance, and any Config hidden values.
3. Set School Year default to the new challenge year.
4. Set Program Instance (and Config if mapped) to the **new** record IDs from the launch manifest.
5. Remove or blank any hard-coded prior-year hidden fields.
6. Update confirmation / email copy year labels.
7. Save form; submit one Schmidt-controlled test enrollment.
8. In Airtable, verify Enrollment links: School Year, Program Instance, Grade, Grade Band, Active?.
9. Repeat mapping review for daily submission form **before** turning it ON.
10. Record evidence URL on Config `Launch Evidence URL` (proposed) or operator folder.

## Validation steps

```bash
# Offline enrollment payloads (existing suite)
python3 -m unittest discover -s tools/enrollment-season/tests -v

# Season launch preflight after export
node tools/challenge-year/cli.js launch-preflight --config <NEW_CONFIG_REC> --input <export.json>
```

## Rollback steps

1. Restore prior School Year / Program Instance / Config hidden IDs from the pre-change screenshot.
2. Keep daily submission form OFF if aborting mid-launch.
3. Do not delete Enrollments created during the aborted attempt — mark inactive / historical per ops policy.
4. Re-run `launch-preflight` and set launch state to Rolled Back.

## Mike UI attestations (required)

| ID | Exact question |
|----|----------------|
| F-ATT-01 | What is the live Enrollment form ID / URL? |
| F-ATT-02 | Does the Enrollment form write a Config link field? If yes, which Airtable field and current `rec…`? |
| F-ATT-03 | What are the current hidden Program Instance and School Year defaults? |
| F-ATT-04 | Daily submission form: any year/Config hard-codes? |
| F-ATT-05 | Confirmation screen / redirect URLs for both forms? |
