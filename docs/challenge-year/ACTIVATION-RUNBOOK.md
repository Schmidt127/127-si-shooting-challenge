# Annual Activation Runbook — Shooting Challenge

**Timezone:** America/Denver  
**Email chain to preserve:** `118 → 072 → 119 → 074 → Make → Gmail → Make writeback`  
**Live installation:** not claimed by this repository package  

Use with the [installation packet](../deploy-checklists/challenge-year-rollover-installation-packet.md).

---

## Config

1. Create or verify new Config row (`Active School Year` = new `YYYY-YYYY`).
2. Verify year label normalization (ASCII hyphen).
3. Verify dates (Program Instance and/or proposed Config date fields).
4. Verify exactly one intended current/active Config when activating.
5. Verify Test vs Live mode (`Test Mode?` proposed; today use ops convention + Schmidt gates).
6. Keep prior Config row — do not delete.

## Weeks

1. Generate CSV:
   ```bash
   node tools/challenge-year/cli.js generate-weeks \
     --challenge-year YYYY-YYYY \
     --week-zero-start YYYY-MM-DD \
     --regular-weeks N \
     --output tmp/weeks-YYYY-YYYY
   ```
2. Preview Markdown plan (`weeks.md`) and validation report.
3. Import Weeks manually into Airtable (UI / CSV import). Map `Week Name`, `Start Date`, `End Date`; link Program Instance.
4. Verify Sunday/Saturday boundaries and expected labels including Week 0 + Post-Challenge.
5. Verify canonical keys in ops docs (`YYYY-YYYY|Week N`) even if Airtable `Week Key` remains `RECORD_ID()`.

## Enrollments

1. Open enrollment on documented open date.
2. Link new Enrollments to new Program Instance / School Year (and Config when field exists).
3. Prevent duplicate active Enrollments per athlete per year (validator + ops check).
4. Handle Schmidt testing intentionally (retain identity; re-link year only when planned).
5. Verify Grade + Grade Band.
6. Do **not** assume Current Level resets — confirm product policy before wiping levels.

## Forms (Fillout)

1. Enrollment form — hidden Config / School Year / Program Instance values for the new year.
2. Daily submission form — Activity Date validation; year linkage.
3. Confirmation messages updated for the new year.
4. Remove stale hard-coded prior-year hidden fields.

## Automations

Inspect / update Config awareness where needed:

- **005** Activity Date → Week  
- **010 / 114 / 054 / 059** XP writers (year via Enrollment/Week links)  
- **031 / 101 / 118** WAS ensure  
- **034** previous-week helpers  
- **041 / 042** levels  
- **072 / 074 / 118 / 119** weekly email  

Identify schedules to activate later (118/119 remain OFF until authorized).  
Remove Test-only fixed inputs before Live season send.  
Validate current-year filters and historical exclusion.

## Weekly email

Preserve:

`118 → 072 → 119 → 074 → Make → Gmail → Make writeback`

Checklist:

- [ ] Correct Week selection (prior Saturday Week End, America/Denver)  
- [ ] Live send mode on **074** (never fixed Test in PROD)  
- [ ] Schmidt handling / `includeSchmidt` defaults safe  
- [ ] Empty-week policy `send_short` (SC-035)  
- [ ] First controlled Test send on Schmidt  
- [ ] Sunday schedule verification only after Mike authorization  

## Make

- [ ] Sender scenario (Bulk Email May 18 lineage)  
- [ ] Webhook URL present only in Make/Airtable inputs (never git)  
- [ ] Live route + final writeback  
- [ ] No old-year hard-coded values  
- [ ] Controlled test before season-wide enable  

## Softr / web

- [ ] Current-year filters  
- [ ] Enrollment visibility  
- [ ] Summary visibility  
- [ ] Levels and achievements  
- [ ] Historical-data separation  

## Final activation

1. Run preflight → require PASS (or Mike-accepted PASS WITH WARNINGS).  
2. Controlled Schmidt test (submission → Week → XP → WAS).  
3. Controlled weekly email Test path.  
4. Operational approval.  
5. Only then flip current flags / schedules as authorized.  

## Rollback

1. Keep prior Config current until new year proven.  
2. Turn 118/119 OFF.  
3. Do not delete prior Weeks/Enrollments/WAS.  
4. Point Fillout hidden fields back to prior year if aborting.  
5. Re-run preflight after fixes.
