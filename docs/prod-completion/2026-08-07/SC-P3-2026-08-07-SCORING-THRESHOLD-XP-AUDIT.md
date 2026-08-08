# SC-P3-2026-08-07 Scoring Package — Weekly Threshold XP Audit

Status: Repository audit and test preparation only. Automation 035 was not enabled, pasted, or changed in Airtable.

## Authoritative repository contract

Source: `airtable/automations/shooting-challenge/035-weekly-summary-and-goal-logic-create-weekly-threshold-xp-events.js`

- Repository version: **v1.3**, including guarded `unloadData()` cleanup.
- Trigger contract: one `Weekly Athlete Summary` with `Threshold XP Ready? = 1`.
- Input: `recordId`.
- Required outputs: `statusOut`, `actionOut`, `errorOut`, `debugStep`.
- Award tiers: 100%, 125%, and 150%, one event per met tier.
- Reward rules: active `XP Reward Rules` keyed by `WEEKLY_THRESHOLD_{100|125|150}_{gradeBand}`.
- XP Bucket: `Weekly Threshold`.
- XP Sources: `Weekly Threshold 100`, `Weekly Threshold 125`, `Weekly Threshold 150`.
- Source Key: `WEEKLY_THRESHOLD|{enrollmentId}|{weekId}|{percent}`.
- Activity date: Week End Date / Week End Key in America/Denver.
- Inactive Enrollment: skipped.
- Missing or invalid reward rule: error for that tier; never invent an XP amount.

## Ownership boundary

035 is the canonical writer for `WEEKLY_THRESHOLD|`. It must not create or modify:

- Submission Base XP;
- Homework XP;
- Perfect Week XP;
- Video XP;
- Zoom or Zoom Credit XP;
- milestone XP;
- streak XP.

Perfect Week remains owned by 058/059. Homework XP remains owned by 064/065. Submission Base remains owned by 010.

## Repository verification

Passed:

- `node --test airtable/automations/shooting-challenge/lib/weekly-threshold-xp.test.js`
- `node --test tests/automation-contracts/source-key-registry.test.js`
- Async-wrapper syntax compilation for 035
- `git diff --check`
- `node tools/testing/check-completion-master-integrity.js` (integrity PASS)

The threshold suite covers ratio handling, tier planning, reward-rule lookup, inactive enrollment, exact Source Key dedupe, legacy-label dedupe, missing rules, repeated plans, week separation, and metadata.

The shared ownership harness currently reports one unrelated pre-existing Automation 031 finding:

`was_missing_uniqueness_guard lookup=true create=false`

This threshold package does not alter that 031 contract or harness behavior.

## Installed-versus-repository gap

Repository evidence documents a live-tested **035 v1.2** percent-ratio repair and sequential replay, while the repository source is now **v1.3**. The v1.3 cleanup compatibility change has no Airtable installation attestation in the reviewed repository evidence.

Therefore:

- Do not claim PROD v1.3 installed.
- Keep 035 OFF until Mike confirms the exact pasted version and no competing Threshold XP writer is enabled.
- After DEV installation, rerun the Schmidt threshold scenario and expect the same first-run/replay behavior: three tier events on the first qualifying run, then zero new events on replay.

## Airtable evidence required before enablement

Mike must provide:

1. Automation editor screenshot showing the exact installed 035 version, trigger, `recordId` input mapping, and OFF/ON state.
2. Screenshot or export proving no competing Threshold XP automation is enabled.
3. First-run record export showing the Weekly Athlete Summary, three XP Events, their XP Sources, amounts, Week End activity date, and canonical Source Keys.
4. Replay run-history screenshot showing zero new events and skipped existing tiers.
5. Evidence that Submission Base, Homework, Perfect Week, Video, Zoom, milestone, and streak XP Events were unchanged.

Any missing item is `NEEDS INFORMATION`, not a production-ready pass.
