# Season Launch Dry Run and Controlled Activation

**Status:** Repository-ready; no Airtable changes made by this package.
**Timezone:** America/Denver.
**Scope:** New Shooting Challenge year only; it does not change automations, Fillout, `/shoot`, or production services.

## 1. Safe local dry run

Create a local JSON fixture using a proposed Config and, when available, a read-only Airtable export of existing target-year Weeks. Do not use production credentials or record-writing tools.

```bash
node tools/challenge-year/cli.js launch-dry-run \
  --config path/to/proposed-season.json \
  --level-policy reset \
  --output tmp/season-launch-dry-run
```

The command always reports `Dry run: true; Airtable writes: 0` and creates only local files:

- `season-launch-dry-run.md` — approval-ready summary
- `season-launch-dry-run.json` — machine-readable checks and blockers
- `weeks-import.csv` — proposed manual import file, not an automatic import

It fails closed when the Config is invalid, Week 0 is not a Sunday, the regular-week count is absent/invalid, the level policy is not explicitly `reset` or `carry`, or supplied existing Weeks conflict by label, canonical key, or date range. If no existing-Week export is supplied, it reports a warning and the later reconciliation gate remains required.

## 2. Mike approval required

Before any import, Mike records all three decisions:

1. The Early Bird (Week 0) Sunday (`YYYY-MM-DD`).
2. The number of regular Weeks.
3. The level policy: `reset` or `carry`.

Do not infer dates or level carry-over from a prior year. The dry run’s approval question is the concise decision record.

## 3. Manual Airtable import

After approval only:

1. Save the dry-run folder as launch evidence.
2. In Airtable/OMNI, import `weeks-import.csv` manually into Weeks; the CLI does not and cannot import it.
3. Supply the correct Program Instance/Config record links during import if Airtable requires record IDs.
4. Preserve the existing `Week Key` `RECORD_ID()` formula. Do not create the proposed canonical-key fields without separate schema approval.
5. Do not delete prior-year Weeks or Configs.

## 4. Post-import reconciliation

Export the target Config, Weeks, Enrollments, and Weekly Athlete Summaries as read-only JSON, then run:

```bash
node tools/challenge-year/cli.js validate-export --input path/to/season-export.json
node tools/challenge-year/cli.js launch-preflight --config <NEW_CONFIG_RECORD_ID> --input path/to/season-export.json
node tools/challenge-year/cli.js activation-preview --config <NEW_CONFIG_RECORD_ID> --input path/to/season-export.json
```

Required evidence: correct Week count; Early Bird (Week 0) plus Week 1..N plus Post-Challenge; Denver date boundaries; no duplicate/overlap; exactly one intended current Config at the final activation stage; explicit level policy; and no cross-season enrollment/WAS/XP findings.

## 5. Controlled Schmidt test

Mike runs the applicable controlled tests in [`SCHMIDT-SEASON-LAUNCH-TEST-PLAN.md`](../challenge-year/SCHMIDT-SEASON-LAUNCH-TEST-PLAN.md), especially Config, Week 0, first regular Week, enrollment, submission/week assignment, one XP replay, WAS uniqueness, weekly email package/writeback, and duplicate prevention. Keep intake closed and use Schmidt-safe recipients until this evidence passes.

## 6. Final activation gate

Mike alone may approve and perform the production flip after the dry run, manual import, reconciliation, and required Schmidt evidence. Use the generated `activation-preview`; it is a plan, not an executor. Follow [`GO-LIVE-CHECKLIST.md`](../challenge-year/GO-LIVE-CHECKLIST.md) and retain the approval/evidence paths.

## 7. Rollback gate

If an unsafe condition appears, do not delete Weeks, Enrollments, or summaries. Run:

```bash
node tools/challenge-year/cli.js rollback-preview --config <NEW_CONFIG_RECORD_ID> --input path/to/season-export.json
```

Then follow [`ROLLBACK-CHECKLIST.md`](../challenge-year/ROLLBACK-CHECKLIST.md): pause the new path, restore the prior current Config and routing, retain records for diagnosis, and re-run preflight before attempting launch again.
