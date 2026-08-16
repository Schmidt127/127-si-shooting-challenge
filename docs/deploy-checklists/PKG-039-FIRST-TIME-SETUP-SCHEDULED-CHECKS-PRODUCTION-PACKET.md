# PKG-039 — First-Time Setup and Scheduled-Check Reliability

**Status:** Repository-ready — Production first-create/replay and scheduler proof pending  
**Owner:** Mike (Production operator); Cursor (repository source)  
**Repository boundary:** This packet prepares copy-ready scripts and read-only
audits only when a repository change is truly required. It does not change
Airtable records, schema, views, automations, Make, Fillout, Vercel, domains,
secrets, or environment variables.

**Related packets:**

- Dependency map: [`PKG-039-FIRST-TIME-SETUP-DEPENDENCY-MAP.md`](../investigations/PKG-039-FIRST-TIME-SETUP-DEPENDENCY-MAP.md)
- WAS / weekly-goal child scope: [`PKG-039-WAS-WEEKLY-GOAL-INTEGRITY-PRODUCTION-PACKET.md`](./PKG-039-WAS-WEEKLY-GOAL-INTEGRITY-PRODUCTION-PACKET.md)

## Evidence boundary

Repository source and offline tests do not prove installed automation versions,
natural-trigger timing, formula settlement, email delivery, or Production data
correctness. Mike must capture four proof lanes per fixture:

1. Repository proof (SHA + committed version)
2. Installed-version proof (automation screenshot / run history)
3. Natural-trigger proof (triggering record + Automation run ID)
4. Settlement/data proof (before/after record IDs and fields)

## Lane A — first-record and scheduled-check chain

Lane A proves first Enrollment → first Submission → first WAS → first Submission
Base XP → scheduled weekly arm, without enabling unrelated consumers.

| Order | Automation | Target version | Trigger / schedule |
|---:|---|---|---|
| 1 | 001 | v5.4 | Enrollment intake — confirm in Airtable |
| 2 | 023 | committed | Submission created / enrollment assignment |
| 3 | 005 | v5.3 | Submission Week assignment |
| 4 | 007 | committed | Duplicate checker |
| 5 | 009 | committed | Submission Assets create |
| 6 | 031 | v4.1 | Counted Submission → canonical WAS |
| 7 | 032 | v3.4 | WAS goal link |
| 8 | 010 | v10.9 | `Reconciliation Needed? = 1` |
| 9 | 118 | v2.0 | Sunday 05:00 Denver; `dryRun=true` first |

**Lane B (separately approved):** 057, 058, 076, 101, 053, 054, 059, 066.
Lane A completion does not authorize Lane B.

## Read-only preflight

1. Record `git rev-parse HEAD` and committed script versions for every Lane A row.
2. Paste/run `audit-pkg-039-first-setup-scheduled-checks.js` — save full JSON.
3. Paste/run `audit-counted-submission-xp-standings-reliability.js` — save full JSON.
4. Confirm ownership map in the dependency doc matches installed automations.
5. Stop on duplicate canonical WAS, missing ownership, week overlap, ambiguous
   Program Instance, or cross-season pipeline link.

## Controlled Production test plan — one test athlete

Use a dedicated Mike-owned test email and a clean test athlete documented in
the worksheet. Do not reuse a source record unless prior XP events are part of
an explicit same-event test.

| Fixture | Mike action | Expected Airtable outcome | Pass criteria | Rollback (no delete) |
|---|---|---|---|---|
| Empty base slice | Read-only audits only | No writer runs | Zero `error` findings in scope | None |
| First Enrollment | Submit one controlled registration | One Athlete; one active Enrollment for Athlete + PI + School Year | No duplicate Enrollment; 001 `statusOut=success` | Turn OFF 001; preserve records |
| First Submission | One valid counted Submission on test date | Submission links Enrollment + Week; one canonical WAS | Exactly one WAS for Enrollment+Week; 031 `created_canonical_summary` or reuse | Turn OFF 031/010; preserve records |
| First XP | Wait for 010 natural run | One active `SUBMISSION_XP\|{Submission}` | Exact links; no duplicate key | Turn OFF 010; deactivate via owner only |
| First goal | Enable 032 on WAS needing goal | `Goal Record` = one active PI+Grade Band goal | No multiple-goal error | Turn OFF 032; clear only if mislinked and approved |
| Replay | Re-trigger same Submission / 010 | Same WAS ID; same XP Event ID | No duplicate totals | Preserve run output |
| Concurrent create | Two simultaneous 031 starts (DEV first) | One winner; loser fails closed | No second WAS; no email side effect | Turn OFF 031; manual review only |
| Scheduled zero | Run 118 with `dryRun=true`, zero eligible WAS | No arms; skip output | `statusOut=skipped` or equivalent | None |
| Scheduled one | One eligible canonical WAS, email path OFF | At most one `Build Weekly Email Now?` arm | No 072/074/Make invocation | Restore captured ON/OFF state |

## Evidence to save

- Audit JSON (both audits)
- Automation version / trigger screenshots
- Enrollment, Submission, WAS, XP Event record IDs
- Source Keys and Summary Key after formula settlement
- 118 `dryRun` run output with `scheduledWeekEndKeyOut`
- Worksheet row per fixture with pass/stop

## Stop conditions

Stop immediately for:

- more than one canonical WAS per Enrollment + Week
- duplicate Source Key or wrong-owner XP link
- unsettled formula presented as configured zero
- unexpected 068 execution
- email / Make / Hub invocation during Lane A integrity proof
- progression-field writes during Lane A

## Rollback (no data deletion)

1. Turn OFF only the automation just enabled.
2. Restore prior script from version capture if Mike approves.
3. Preserve all records, links, run IDs, and audit JSON.
4. Do not delete XP Events, WAS rows, or Enrollments as cleanup.
5. Re-run read-only audits and record final ON/OFF state.

## Offline validation

```bash
node tests/reliability/pkg-039-first-setup-scheduled-checks.test.js
node tests/weekly-athlete-summary/pkg-033-was-integrity.test.js
node airtable/extension-scripts/audits/audit-pkg-039-first-setup-scheduled-checks.test.js
node --test tests/pipeline/counted-submission-xp-standings-orchestration.test.mjs
```
