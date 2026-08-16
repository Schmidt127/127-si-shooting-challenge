# PKG-037 — Core Certification Evidence Worksheet

**Status:** Draft companion worksheet; blocked until PKG-034 live-attendee and PKG-007 Video XP proof complete (006R/036/038 complete as of 2026-08-16)
**Canonical packet:** [PKG-037 core application certification](../deploy-checklists/PKG-037-CORE-APPLICATION-PRODUCTION-CERTIFICATION.md)
**Operator:** Mike only. This worksheet records evidence; it authorizes no live action.

## Run identity and prerequisite gate

- [ ] `origin/master` SHA immediately before execution: `________________`
- [ ] Certification athlete / test email / Athlete RID: `________________`
- [ ] School Year / Program Instance RID: `________________`
- [ ] PKG-006R complete (010 v10.9 ON; do not retest): `________________`
- [ ] PKG-036 complete (041 v5.0 / 042 v4.1.2 ON; do not retest): `________________`
- [ ] PKG-038 complete (053/054/066/059 ON; do not retest): `________________`
- [ ] PKG-007 Homework evidence complete; Video XP 113/114 Production proof: `________________`
- [ ] PKG-034 live-attendee evidence complete (base installation proven; do not retest empty-roster): `________________`
- [ ] No Production schema, configuration, email, Make, deployment, or retired-writer changes are made by this worksheet.

## Lane 1 — repository proof

- [ ] SHA, source path, and offline result captured for each claimed owner.
- [ ] Exact source keys recorded: `SUBMISSION_XP|{Submission RID}`, `HOMEWORK_XP|{HC RID}`, `VIDEO_SUBMISSION|{VF RID}`, `ZOOM_ATTEND_BASE|{Meeting Key}|{Enrollment RID}`.
- [ ] Ownership map confirmed: 020 → HC; 064 → prepare; 065 → Homework XP; 013 → Video Feedback; 113 → video value; 114 → Video XP; 101 v6.3 → live Zoom; 041 queue; 042 progression output.
- [ ] Retired/prohibited writers remain absent/OFF: 043, 063, 068, 077, 112; recording designs 117a–117e remain design-only.

## Lane 2 — installed-version proof

- [ ] Installed version, ON/OFF state, trigger, dynamic `recordId`, and latest run ID captured for 001, 023/005/007/031, 010, 020/064/065, 101 **v6.3**, 113/114, 041 **v5.0** / 042 **v4.1.2**, 076 **v8.6** / 079.
- [ ] 065 trigger is `Homework XP Reconciliation Needed? = 1`.
- [ ] 101 trigger is `Zoom XP Reconciliation Needed? = 1`; no recording or Attendees trigger condition.
- [ ] 114 lifecycle trigger reaches both positive and withdrawal transitions.
- [ ] Version mismatch is recorded as blocked; repository version is never substituted for installed proof.

## Lane 3 — natural-trigger proof

- [ ] Registration produced one canonical Athlete + active Enrollment.
- [ ] Counted Submission naturally traversed 023 → 005 → 007 → 031 → 010.
- [ ] Homework naturally traversed 020 → 064 → 065.
- [ ] Video naturally traversed 013 → 113 → 114.
- [ ] One-athlete live Zoom naturally triggered 101.
- [ ] Each row has triggering field transition, Automation run ID, dynamic record ID, status/action/debug outputs.
- [ ] No controlled action, replay, or offline test is mislabeled as natural-trigger proof.

## Lane 4 — settlement/data proof

- [ ] Baseline: one Enrollment, one counted Submission, one Week, one WAS, expected pre-existing XP Events and totals.
- [ ] Positive result: exact links, unique Source Keys, active Events, WAS XP, Lifetime XP, and standings inputs.
- [ ] Replay: same Event RID for Submission, Homework, Video, and Zoom; no duplicate.
- [ ] Withdrawal/restoration: same Event RID deactivates/reactivates; no delete/replacement; totals settle down/up.
- [ ] Settlement captured at `T+0 / T+30s / T+2m / T+5m`; two stable observations recorded.
- [ ] 041 queue and 042 result captured; Current Level, Next Level, Gate Rule, Level Status, and standings readback settled.
- [ ] No `ZOOM_CREDIT`, `ZOOM_RECORDING`, recording email, legacy Make/Gmail daily send, or unexpected Communications Hub action.

## Consolidated evidence record

| Family | Source RID / run IDs | Same Event RID | Before/after totals | Four lanes complete? |
|---|---|---|---|---|
| Submission | | | | |
| Homework | | | | |
| Video | | | | |
| Zoom live | | | | |

- [ ] Final audit JSON path / issue count: `________________`
- [ ] Stop condition, preserved evidence, and approved rollback action: `________________`
- [ ] Decision: `[ ] blocked  [ ] ready for Mike review  [ ] certified`
