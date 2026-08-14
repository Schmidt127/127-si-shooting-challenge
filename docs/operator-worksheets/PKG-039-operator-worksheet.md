# PKG-039 — WAS and Weekly Goal Operator Worksheet

**Status:** Draft companion worksheet; DEV-first, Mike-operated
**Canonical packet:** [PKG-039 WAS/weekly-goal integrity packet](../deploy-checklists/PKG-039-WAS-WEEKLY-GOAL-INTEGRITY-PRODUCTION-PACKET.md)
**Boundary:** No schema, data, automation, trigger, email, Make, progression, or lock changes are authorized by this worksheet.

## DEV schema attestation

- [ ] DEV base and timestamp recorded: `________________`
- [ ] `Target Goal Shots.Program Instance` exists, is a linked-record field to `Program Instance - Sync`, and has field ID **`fldmgJgCQTIHKqhD6`**.
- [ ] Every active usable goal has exactly one `Program Instance` link; no historical inactive variant is reactivated.
- [ ] Existing `Goal Key` and related formula text exported before any approved formula change.
- [ ] `Goal Key` identity includes linked Program Instance record identity and Grade Band record identity; it does not rely only on display names.
- [ ] Formula/lookup values reread after settlement; blank/malformed is classified unsettled/invalid, never configured zero.
- [ ] `Total Shot Target` is explicit numeric; zero is valid only for exactly one applicable active goal.

## Field and writer checks

- [ ] WAS `Enrollment` + `Week` links are exact and unique; both resolve to the same Program Instance and correct School Year.
- [ ] WAS formulas `Summary Key`, `Enrollment Key`, and `Week Key` exist and are settled.
- [ ] WAS writable fields verified: `Submissions`, `Goal Record`, `Homework`; no formula/rollup/lookup field is treated as writable.
- [ ] Goal fields verified: `Grade Band`, `Program Instance`, `Active?`, `Total Shot Target`, `Goal Key`.
- [ ] 031 is the only create-capable WAS writer; 068 remains OFF/retired.
- [ ] 032 links exactly one active goal for WAS Enrollment Program Instance + Grade Band; no Week matching.
- [ ] Current installed versions/triggers/inputs captured for 005, 010, 030, 031, 032, 033, 035, 057, 068, 072, 076, 101, 114, and 118.

## Lane A — canonical WAS, goal, and weekly schedule

- [ ] 031 DEV trigger is counted `Submissions`; dynamic `recordId`.
- [ ] 032 DEV trigger is eligible WAS needing goal; dynamic `recordId`.
- [ ] First create, replay, and two concurrent starts produce one canonical WAS; loser fails closed.
- [ ] Duplicate WAS, wrong owner, zero/multiple links, wrong Program Instance/year, same Week in another Program, and inactive Enrollment fail closed.
- [ ] Goal cases captured separately: missing goal, explicit zero, positive goal, inactive goal, wrong Grade Band, multiple active candidates.
- [ ] 031/032 writes do not alter progression fields.
- [ ] Formula/rollup settlement captured for weekly goal, percentage, shots, XP, 035 eligibility, and 057 boundary.
- [ ] Lane A sequence is complete and recorded as **031 → 032 → 118**; 118 uses
      its isolated `dryRun`/email-disabled proof.

## Lane B — separately approved consumer tests

- [ ] 057 target is v1.7 and its Perfect Week fixture/trigger approval is captured.
- [ ] 058 target is v1.3 and its lifecycle fixture/trigger approval is captured.
- [ ] 076 target is v8.6 with `Build Daily Email Now?` checked and dynamic `recordId`; isolate it from this goal proof unless explicitly selected.
- [ ] 101 target is v6.3 with `Zoom XP Reconciliation Needed? = 1` and dynamic
      `recordId`; isolate it from this goal proof unless explicitly selected.
- [ ] Before any Lane B proof, prior states are captured and 072, 079, 119, 074,
      and relevant Make scenarios are OFF/isolated.
- [ ] No email handoff, Make webhook, Delivery row, or Communications Hub action occurs.
- [ ] No progression-field write occurs; 041/042 remain outside this worksheet.
- [ ] Lane B evidence is not inferred from completion of Lane A.
- [ ] Restore captured ON/OFF state only after isolated evidence is complete.

## Evidence and stop

- [ ] Fixture record: Enrollment `________`; School Year `________`; Program Instance `________`; Week `________`; WAS `________`; Goal `________`.
- [ ] Before/after links, formulas, statusOut/actionOut/debugStep, run IDs, and audit JSON path captured.
- [ ] Stop for duplicate canonical WAS, cross-Program/year link, multiple goal, wrong-owner backlink, unsettled-as-zero, email/Make invocation, or progression write.
