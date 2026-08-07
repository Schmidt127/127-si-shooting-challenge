# Cursor Execution Handoff — 2026-08-07

Prepared: 2026-08-06
Repository: `Schmidt127/127-si-shooting-challenge`
Branch: `master`
PROD Airtable base: `appn84sqPw03zEbTT`
Controlled Enrollment: Schmidt `recCyFEPeATOVNlr9`
Controlled Program Instance: `rec5mEM0YPqPqq0hZ`
Controlled Week: Early Bird `recWeVrSabnsYaHc2`

## Operating rules

- Work directly in PROD.
- Use only the Schmidt testing enrollment for controlled live tests.
- Preserve system dependencies, not historical test data.
- Do not advance Completion Master statuses from repository work alone.
- A status may advance only after the exact script is pasted into the actual Airtable automation editor, trigger/input mappings are verified, and the controlled PROD test passes.
- Do not enable live parent sends during code installation.
- Keep Make/Gmail handoffs in Test mode until payload review passes.

## Immediate install dependency chain

Complete in this exact order:

1. Automation 023 v3.1
2. Automation 053 Program Instance-scoped current version
3. Automation 066 current repository version
4. Automation 118 v1.7
5. Automation 119 v1.7
6. Automation 043 only if still required after 042 ownership is resolved

Do not install later steps before earlier Program Instance ownership is proven.

## Priority 1 — Canonical writer and replay safety

### Issue #103 — Asset and Video Feedback creation

Repair Automations 013, 020, and 112.

Required behavior:

- Video Upload accepts video, PDF, and image files.
- Preserve originating Submission attachment field and source attachment ID.
- Asset identity is deterministic: Submission + source attachment ID + slot.
- Homework HW1/HW2 requires a matching Homework Name in the same slot.
- Automation 020 writes both the reusable Homework link and the Program Homework Assignment link when resolvable.
- One canonical Video Feedback writer must own creation. Prefer asset-level identity `VIDEO_FEEDBACK|{Submission Asset RID}`.
- Automation replay must not create another asset or Video Feedback record.
- Do not create submission-level Video Feedback when valid asset-level records exist.

Controlled tests:

1. One PDF in Video Upload → one asset and one Video Feedback.
2. One image in Video Upload → one asset and one Video Feedback.
3. One video in Video Upload → one asset and one Video Feedback.
4. Replay each record → counts unchanged.
5. HW1 attachment with matching HW1 assignment → one Completion linked to correct PHA.
6. HW2 attachment without Homework Name 2 → rejected with no asset/Completion.

PROD evidence: `ASSET-REPLAY-EMAIL-SAFETY-AUDIT.md` and issue #103.

## Priority 2 — Summary and XP ownership

### Issue #96 — Automation 031

Repair stale Submission-to-Weekly-Summary validation.

- Existing link must match Enrollment, Week, Summary Key, and Program Instance.
- Wrong links must be removed from the old summary and assigned to the correct canonical summary.
- Move only XP Events that match the Submission/Enrollment/Week.
- Fail closed on duplicate Summary Keys.
- Add replay test.

### Issue #100 — Orphan XP reconciliation

Omni is deleting active XP Events where Enrollment is empty. After Omni finishes:

- verify `Active? checked AND Enrollment empty = 0`;
- add a permanent admin reconciliation path;
- require valid source ownership by XP bucket;
- retire invalid XP and request level recalculation.

### Issue #102 — Eligibility-loss reconciliation

Add reconciliation for Weekly Threshold and Perfect Week XP when eligibility becomes false or source records are deleted/moved.

## Priority 3 — Level progression ownership

### Issue #98 — Automation 041

Expand recalculation triggers beyond new positive XP Events:

- XP deactivated;
- XP reduced;
- Enrollment changed;
- submission/homework/video/Zoom/streak gate stats changed;
- gate rule version or thresholds changed.

### Issue #97 — Automation 042

Automation 042 should remain the single progression writer.

- select Level Gate Rule by Next Level plus intended School Year / Rule Set;
- document shared-rule fallback policy;
- fail closed on duplicate active candidates;
- test current Schmidt 2026-2027 enrollment.

### Issue #95 — Automation 043

Current v2.1 exits whenever any gate link exists. It cannot refresh stale/wrong-year links.

Preferred resolution:

- if 042 reliably owns gate assignment, retire/disable 043;
- otherwise repair 043 to validate and replace stale links.

Do not leave 042 and 043 competing for the same field.

## Priority 4 — Video XP and email accuracy

### Issue #101 — Automations 113/114

Reject or retire video XP when the linked Submission is future-dated, Week-less, non-countable, or owned by a different Enrollment.

### Issue #104 — Automations 072/076

Repair parent-email reporting:

- use current Airtable field names;
- include only active XP with valid Enrollment/Week/source ownership;
- use Program Homework Assignments for assigned homework;
- do not claim configured XP as earned when no XP Event exists;
- report reconciliation disagreement instead of using `Math.max`;
- review generated Schmidt payload before any send.

Automation 074 Make handoff may remain separate; test only after 072 payload is correct.

## Priority 5 — Program Instance chain

Verify repository versions and actual editor installation for:

- 023
- 053
- 066
- 118
- 119

Known inventory state:

- 053 inventory contains stale v5.0 date-only matching.
- 066 is labeled Live without authoritative installation/live-test evidence.
- 118 and 119 inventory records exist as Off, paste-pending v1.7.

Required proof for each:

1. repository script/version identified;
2. exact script pasted into Airtable editor;
3. trigger table/type/conditions captured;
4. input variables captured;
5. controlled Schmidt run output captured;
6. replay output captured;
7. resulting records and keys verified;
8. Completion Master updated with evidence link.

## Current protected fixtures

### Perfect Week fixture

- Summary `recKebuZ79QFTwivA`
- Preserve until Program Instance isolation retest and explicit fixture retirement.
- Its 100-point future Perfect Week XP was retired.

### Milestone fixture

- Summary `recMMeJENu6Pg8l58`
- Contains controlled 5,001 and 10,000-shot milestone submissions.
- Labeled as controlled milestone fixture evidence.

### Homework fixtures

- `recqXxlOpATQI3sD4`
- `rechzFmWrUp1tonto`

Their PHA rows are inactive fixture rows. Parent Feedback Ready flags are cleared.

## Records and paths that must not be recreated

- Do not restore unmatched HW2 attachment on Submission `recA1YgNKTJ1LgTwF` unless a valid Homework Name 2 and scheduled PHA are deliberately added.
- Do not recreate empty Video Feedback for submissions with no Video Upload.
- Do not create more than one Submission Asset per source attachment ID and slot.
- Do not create more than one Video Feedback per canonical Submission Asset.

## GitHub issues prepared

- #95 — Automation 043 stale/wrong-year gate refresh
- #96 — Automation 031 stale summary link validation
- #97 — Automation 042 school-year gate-rule selection
- #98 — Automation 041 recalculation coverage
- #100 — orphan XP reconciliation
- #101 — future/non-countable Video XP protection
- #102 — threshold/Perfect Week eligibility-loss reconciliation
- #103 — source attachment slot and canonical Video Feedback writer
- #104 — 072/076 canonical homework and active-XP email reporting

## Required test evidence format

For each automation package, record:

- automation number and version;
- actual Airtable automation name;
- editor script checksum or commit SHA;
- trigger and conditions;
- input variable names and mapped values;
- Schmidt source record ID;
- created/updated record IDs;
- dedupe/source/summary keys;
- first run result;
- replay result;
- pass/fail determination;
- rollback performed if failed.

## Completion Master rule

Update `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` after each logical package, not once at the end.

Do not mark anything Live Tested solely because repository tests pass. Airtable editor installation and PROD evidence are mandatory.
