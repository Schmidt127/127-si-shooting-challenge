# Challenge-Year Rollover Engine — Production Installation Packet

**Date:** 2026-07-24  
**Package status:** Built in Repository — **not live-installed**  
**Branch target:** feature branch for review (do not treat as PROD paste complete)  
**Timezone:** America/Denver  

---

## 1. Preconditions

- [ ] Working on Shooting Challenge repo only (not Team Shot Tracker)
- [ ] Latest `master` pulled; feature branch reviewed
- [ ] Offline tests green: `node tests/challenge-year/challenge-year-engine.test.js`
- [ ] Prior challenge year Config/Weeks preserved (no delete plan)
- [ ] Mike authorization before any Airtable schema field creation
- [ ] Mike authorization before enabling 118/119 schedules or Live mass email
- [ ] Explicit new Config record ID and `YYYY-YYYY` label known

## 2. Verified existing fields

See [`docs/challenge-year/CHALLENGE-YEAR-CONTRACT.md`](../challenge-year/CHALLENGE-YEAR-CONTRACT.md).

Highlights:

- Config.`Active School Year`, `Challenge Week Count`
- Program Instance.`School Year - Linked`, Start/End, Registration Open/Closes, Status
- Weeks.`Week Name`, `Start Date`, `End Date`, `Week Key`(=RECORD_ID()), `Program Instance`
- Enrollments.`School Year`, `Active?`, `Program Instance`, `Grade Band`, `Current Level`
- WAS identity: Enrollment + Week; `Summary Key` formula

## 3. Proposed fields (optional — Mike authorize before create)

- Config: Challenge Year Status, Challenge Start/End, Enrollment Open/Close, Week 0 / Post-Challenge dates, Challenge Timezone, Current Challenge Year?, Test Mode?, Email Schedule Enabled?, XP/Achievements Enabled?, Rollover State, Prior/Next Config
- Weeks: `Challenge Week Key` (`{year}|{Week Name}`), `Week End Key` (Denver YYYY-MM-DD from End Date)

**Do not create these from this agent run.**

## 4. Week-generation command

```bash
node tools/challenge-year/cli.js generate-weeks \
  --challenge-year 2027-2028 \
  --week-zero-start 2027-05-30 \
  --regular-weeks 8 \
  --output tmp/weeks-2027-2028
```

`week-zero-start` **must be a Sunday**.

## 5. CSV output instructions

Outputs under the `--output` directory/prefix:

| File | Use |
|------|-----|
| `weeks.csv` | Airtable import |
| `weeks.json` | Machine-readable plan + validation |
| `weeks.md` | Human preview |
| `validation-report.json` | PASS/FAIL detail |

## 6. Airtable import mapping

| CSV column | Airtable field | Required |
|------------|----------------|----------|
| Week Name | Week Name | Yes |
| Start Date | Start Date | Yes |
| End Date | End Date | Yes |
| Program Instance | Program Instance | Yes (link after/during import) |
| Week Type / Sequence / Week Key / Week End Key | Ops columns / proposed fields | Optional until schema authorized |

Do **not** overwrite formula `Week Key`.

## 7. Validation command

```bash
node tools/challenge-year/cli.js validate-weeks \
  --weeks tmp/weeks-2027-2028/weeks.csv \
  --challenge-year 2027-2028 \
  --regular-weeks 8
```

Optional enrollment / WAS fixture validation:

```bash
node tools/challenge-year/cli.js validate-enrollments --fixture path/to/fixture.json
node tools/challenge-year/cli.js validate-was --fixture path/to/fixture.json
```

## 8. Preflight command

```bash
node tools/challenge-year/cli.js preflight \
  --config path/to/rollover-fixture.json \
  --mode preflight
```

Example PASS fixture: `tests/fixtures/challenge-year/rollover-preflight-pass.json`

Manifest:

```bash
node tools/challenge-year/cli.js manifest \
  --config path/to/rollover-fixture.json \
  --output tmp/rollover-2027-2028
```

## 9. Expected PASS conditions

- Preflight overall `PASS` (or Mike-signed `PASS WITH WARNINGS`)
- Exactly one Config for the new year
- Week plan includes Week 0, Week 1..N, Post-Challenge
- No duplicate Week Keys; Sunday/Saturday boundaries valid
- No date overlap with prior Config
- Ops checklist items all true in fixture
- Not more than one current/active Config

## 10. Required manual production updates

- [ ] Create/verify Config + Program Instance dates/status
- [ ] Import Weeks; link Program Instance
- [ ] Update Fillout hidden year/config values
- [ ] Update Airtable views / Softr filters for current year
- [ ] Inspect Make for hard-coded old year / season slug
- [ ] Confirm XP Reward Rules, Grade Bands, Levels, Gates, Achievements active
- [ ] Document Schmidt test enrollment handling
- [ ] Keep 118/119 OFF until authorized

## 11. Controlled test

1. Schmidt (or designated test) Enrollment on new year  
2. Submission with Activity Date inside Week 0 or Week 1  
3. Confirm **005** links correct Week  
4. Confirm WAS ensure (031/118 path) one row per Enrollment×Week  
5. Weekly email Test path: `118 → 072 → 119 → 074` with **074 sendMode** appropriate for test; no season-wide Live schedule yet  

## 12. Live activation

Only after proof:

- [ ] Mark intended Config current (exactly one)
- [ ] Prior Config no longer current
- [ ] Fillout live forms point to new year
- [ ] Authorize 118/119 schedules if season email is in scope
- [ ] Confirm **074 sendMode=Live** (or blank+WAS Live) for PROD email writeback

## 13. Rollback

- [ ] Restore prior Config as current
- [ ] Turn 118/119 OFF
- [ ] Re-point Fillout hidden fields to prior year
- [ ] Do not delete new Weeks/Enrollments/WAS — freeze processing instead
- [ ] Re-run preflight before next attempt

## 14. Proof of completion

Collect and store:

- Preflight JSON (`overall: PASS`)
- Generated Weeks CSV + validation report
- Manifest checklist with checked items
- Controlled Schmidt evidence (Submission id, Week id, WAS id, XP event id)
- Explicit note: schema proposed fields created? yes/no (default no)

## 15. How to repeat next year

1. Copy prior rollover fixture; set new year label + Sunday Week 0 start + regular week count.  
2. `generate-weeks` → validate → update opsChecklist → `preflight` → `manifest`.  
3. Import Weeks; update forms/views/Make/Softr.  
4. Controlled test → activate → keep prior year historical.  
5. Never hard-code the new year as permanent current in scripts — use resolver + Config rows.

---

## Admin dry-run helpers (Airtable Scripting)

Paste only as **manual** Scripting extension runs (not automations):

| Script | Purpose |
|--------|---------|
| `preview-challenge-year-weeks-missing.js` | Missing Week labels vs expected plan |
| `preview-challenge-year-config-relationships.js` | Config/year relationship preview |
| `preview-challenge-year-was-duplicates.js` | WAS duplicate preview + repair recs |
| `preview-challenge-year-old-config-links.js` | Prior-year active/inactive counts |
| `preview-challenge-year-mismatches.js` | Current-year mismatch sample |

Required inputs: `configRecordId`, `challengeYear`, `dryRun=true` (and `priorChallengeYear` for old-links preview).  
All refuse unsafe writes; none delete records.
