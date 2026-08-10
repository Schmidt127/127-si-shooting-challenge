# Fillout reopening checklist — 2026–2027

**SC-146 / SC-135 gates** · Enrollment form only (daily submission separate)

## Current state (repo audit 2026-08-10)

| Item | Status |
|------|--------|
| Enrollment Fillout | **OFF** |
| Daily submission Fillout | **OFF** (C-008) |
| Contract in git | **PASS** — `FILLOUT-ENROLLMENT-CONTRACT.md` |
| Offline validator | **PASS** — 18/18 tests |
| Live form ID / URL | **UNKNOWN** — F-ATT-01 |
| Config hidden field on form | **UNKNOWN** — F-ATT-02 |

---

## Gate checklist (all must pass before reopen)

### A — Repository / offline

- [ ] `python3 -m unittest discover -s tools/enrollment-season/tests -v` → OK
- [ ] `node tools/season-launch/validate-2026-2027-package.mjs` → PASS or Mike-accepted WARNINGS
- [ ] `fillout-field-mappings.json` reviewed against live UI

### B — Airtable season rows

- [ ] Program Instance `rec5mEM0YPqPqq0hZ` Status appropriate for registration
- [ ] School Year `2026-2027` on PI and Config
- [ ] Weeks contiguous for PI (PWTEST `reci5GdxEC57vfoS3` **inactive**)
- [ ] Mike decisions D1–D4 recorded

### C — Fillout UI (Mike / OMNI)

- [ ] **F-ATT-01** Record enrollment form URL: _______________
- [ ] **F-ATT-02** Config link field yes/no + record id: _______________
- [ ] **F-ATT-03** Hidden defaults: School Year=`2026-2027`, PI=`rec5mEM0YPqPqq0hZ`
- [ ] **F-ATT-04** Daily form: no stale year hard-codes (keep OFF until SC-135)
- [ ] **F-ATT-05** Confirmation copy + redirect → `https://www.fairfieldbasketballclub.com/shoot`
- [ ] Grade options match Grade Bands table
- [ ] Consent checkbox required

### D — Controlled proof (before public)

- [ ] One **Schmidt** test enrollment → verify:
  - School Year = `2026-2027`
  - Program Instance = `rec5mEM0YPqPqq0hZ`
  - Grade Band assigned (002)
  - Athlete Match Status not Skipped
- [ ] No duplicate Enrollment same athlete+year
- [ ] Welcome **not** auto-sent to real parents (079 Test Mode)

### E — Identity paths

| Path | Verify |
|------|--------|
| New athlete | 001 creates Athlete + Enrollment |
| Returning | Match Parent Email + name |
| Sibling | Same parent, new Athlete record |
| Bad email | Fillout blocks |

### F — Final reopen (Mike only)

- [ ] Written approval on DECISION-SHEET D3 intake dates
- [ ] Publish enrollment form
- [ ] Record reopen timestamp in CHANGELOG / completion master
- [ ] Monitor first 5 enrollments manually

## Rollback

1. Unpublish Fillout form immediately.
2. Leave enrollments created — mark inactive per ops policy.
3. Restore hidden field screenshot values.
4. Set launch state Paused per `ROLLBACK-CHECKLIST.md`.

## Mapping audit reference

Machine-readable: [`fillout-field-mappings.json`](../challenge-year/generated/2026-2027/fillout-field-mappings.json)  
Human contract: [`FILLOUT-ENROLLMENT-CONTRACT.md`](../../online-agents/enrollment-season/FILLOUT-ENROLLMENT-CONTRACT.md)
