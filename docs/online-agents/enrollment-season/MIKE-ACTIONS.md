# Mike Actions — Enrollment & Season Package

Online Agent 7 produced offline contracts, validators, and fixtures only. No live Fillout/Airtable structural changes and no emails were sent.

---

## Required before enrollment reopen (SC-146)

1. **Confirm Fillout field map** against `FILLOUT-ENROLLMENT-CONTRACT.md` (OMNI / Fillout UI).  
2. **Tighten Fillout validation** for required names, parent email format, grade, school year, consent (SC-060/063).  
3. **Seed Weeks manually** using `weeks-seed-template.csv` + approved dates; validate with `weeks_seed_validator.py` first (SC-065).  
4. **Decide early-bird** keep/drop for next season (SC-066).  
5. **Confirm School Year + Program Instance** options for the test/next season.  
6. **Keep Schmidt** Enrollment `recgP9qZYjAhE7NXm` Active?=true and publicly visible — do not add exclusion rules.  
7. **PPE field decision** — create/backfill `Progress Processing Enabled?` before pasting C-010 progress guards (email/XP owner packages).  
8. **Reconcile Schmidt hard-exclude** in 072/118/119 with email testing needs (email-owner agent; not done here).  
9. **Do not turn Fillout enrollment ON** until contract checks + Weeks seed + SC-135 dry-run gate (submissions) are satisfied.

---

## Optional / later

- Manual duplicate-Athlete audit if parent email changes occurred historically (empty-base reset may make this N/A).  
- Sibling live test with two controlled enrollments sharing parent email.  
- Program Instance multi-year wave (SC-067) — remains Deferred.
