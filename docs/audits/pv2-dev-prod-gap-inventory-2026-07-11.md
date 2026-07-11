# Production v2 — DEV-to-PROD Gap Inventory

**Audit date:** 2026-07-11  
**DEV base:** `appTetnuCZlCZdTCT`  
**PROD base:** `appn84sqPw03zEbTT`  
**Repository branch:** `master`  
**Repository HEAD:** `cb18277a57a833d1c98f3a684c4cbe1010c60a69`  
**Audit script:** `tools/airtable/pv2_dev_prod_gap_audit.py`  

## 1. Executive summary

Production v2 promotion is **not complete**. Submission Assets required field promotion **PASS** (1 approved DEV-only difference). Automation **116 schema PASS**; automation **116 runtime validation FAIL** (2026-07-11 — forward test no field changes; automation not pasted/enabled on PROD). C-013 production promotion **not started**. Classified gaps: **1 BLOCKER**, **1 REQUIRED BEFORE LAUNCH**. Validation: `docs/audits/pv2-prod-submission-assets-field-validation-2026-07-11.md` · Runtime: `docs/deploy-checklists/C-023-prod-automation-116-validation-2026-07-11.md`.

## 2. Repository Production v2 inventory

| Workstream | File | Commit | Table | Expected change | For PROD |
|---|---|---|---|---|---|
| C-013 Wave 7 asset storage | `docs/deploy-checklists/C-013-production-promotion-plan.md` | cca1ac5 | Submission Assets | Canonical File URL, Storage Key, Lambda writeback | Yes |
| C-023 duplicate hash + review | `docs/deploy-checklists/C-023-production-duplicate-policy.md` | 847aa6e | Submission Assets | File Content Hash, Duplicate Match Record | Yes |
| C-023 Stage 5 consequences | `airtable/automations/shooting-challenge/116-submission-assets-apply-asset-reuse-decision-consequences.js` | 992677d | Submission Assets | Automation 116 + consequence fields | Yes |
| 070b Lambda upload route | `airtable/automations/shooting-challenge/070b-email-notifications-and-external-handoffs-send-video-asset-payload-to-make.js` | 955ea2a | Submission Assets | 070b v4.2 Make→Lambda | Yes |
| 022 upload writeback sync | `airtable/automations/shooting-challenge/022-submission-intake-sync-child-upload-writeback-from-submission-asset.js` | c0f91d3 | Submission Assets | Child table writeback | Yes |
| 066 shot milestones v3.2 | `airtable/automations/shooting-challenge/066-achievements-and-milestones-create-shot-milestone-unlocks.js` | 36a2e95 | Enrollments | 066 pasted DEV+PROD 2026-07-06 | Yes |
| C-019 testing views | `docs/deploy-checklists/C-019-testing-views-verification-checklist.md` | — | multiple | Testing views on DEV | No |
| C-020 test harness 115 | `airtable/automations/shooting-challenge/115-engineering-test-framework-run-testing-scenario-daily-submission.js` | — | Testing Scenarios | DEV-only harness | No |
| 008 retirement → 116 | `docs/automation-index.md` | 63541b6 | Automations | Replace 008 with 116 on PROD | Yes |

## 3. Table-by-table schema comparison

### Automations
- DEV present: **True** · PROD present: **True**
- Field counts: DEV **15** · PROD **15**

### Config
- DEV present: **True** · PROD present: **True**
- Field counts: DEV **16** · PROD **16**

### Enrollments
- DEV present: **True** · PROD present: **True**
- Field counts: DEV **131** · PROD **130**
- **Raw DEV-only fields (1):** `Testing Scenarios`
- **Required missing in PROD (1):** `Testing Scenarios`

### Submissions
- DEV present: **True** · PROD present: **True**
- Field counts: DEV **98** · PROD **96**
- **Raw DEV-only fields (2):** `Testing Scenarios`, `Video Feedback Focus`
- **Required missing in PROD (2):** `Testing Scenarios`, `Video Feedback Focus`

### Submission Assets
- DEV present: **True** · PROD present: **True**
- Field counts: DEV **97** · PROD **96**
- **Raw DEV-only fields (1):** `Calculation`
- **Approved differences (1):** `Calculation`

### Homework Completions
- DEV present: **True** · PROD present: **True**
- Field counts: DEV **85** · PROD **83**
- **Raw DEV-only fields (2):** `Linked Asset Reuse Decision`, `Testing Scenarios`
- **Required missing in PROD (2):** `Linked Asset Reuse Decision`, `Testing Scenarios`
- Formula diffs: **1**

### Video Feedback
- DEV present: **True** · PROD present: **True**
- Field counts: DEV **54** · PROD **50**
- **Raw DEV-only fields (4):** `Coach Video Title`, `Linked Asset Reuse Decision`, `Video Feedback Focus`, `Video Feedback Question`
- **Required missing in PROD (4):** `Coach Video Title`, `Linked Asset Reuse Decision`, `Video Feedback Focus`, `Video Feedback Question`
- Formula diffs: **1**

### XP Events
- DEV present: **True** · PROD present: **True**
- Field counts: DEV **51** · PROD **51**

### Weekly Athlete Summary
- DEV present: **True** · PROD present: **True**
- Field counts: DEV **101** · PROD **101**

### XP Reward Rules
- DEV present: **True** · PROD present: **True**
- Field counts: DEV **9** · PROD **9**

### Level Gate Rules
- DEV present: **True** · PROD present: **True**
- Field counts: DEV **15** · PROD **15**

### Streak Occurrences
- DEV present: **True** · PROD present: **True**
- Field counts: DEV **24** · PROD **24**

### Shot Milestones
- DEV present: **True** · PROD present: **True**
- Field counts: DEV **17** · PROD **17**

### Athlete Achievement Unlocks
- DEV present: **True** · PROD present: **True**
- Field counts: DEV **35** · PROD **35**

### Zoom Meetings
- DEV present: **True** · PROD present: **True**
- Field counts: DEV **26** · PROD **26**

### Weeks
- DEV present: **True** · PROD present: **True**
- Field counts: DEV **20** · PROD **20**

### Final Reflection Quiz Submissions
- DEV present: **True** · PROD present: **True**
- Field counts: DEV **55** · PROD **54**
- **Raw DEV-only fields (1):** `Testing Scenarios`
- **Required missing in PROD (1):** `Testing Scenarios`

### Achievements
- DEV present: **True** · PROD present: **True**
- Field counts: DEV **23** · PROD **23**

### Testing Scenarios
- DEV present: **True** · PROD present: **False**

### Athletes
- DEV present: **True** · PROD present: **True**
- Field counts: DEV **11** · PROD **11**

### Levels
- DEV present: **True** · PROD present: **True**
- Field counts: DEV **20** · PROD **20**

## 4. Script dependency matrix

| Script | Version | DEV | PROD | Safe to deploy PROD | Issues |
|---|---|---|---|---|---|
| 116 | v1.0.1 | PASS | PASS | Yes | — |
| 070b | v4.2 | PASS | PASS | Yes | — |
| 022 | v1.1 | PASS | PASS | Yes | — |
| 114 | v5.8 | PASS | PASS | Yes | — |
| 065 | v9.2 | PASS | PASS | Yes | — |
| 066 | v3.2 | PASS | PASS | Yes | — |

## 5. Formula comparison (priority fields)

| Table | Field | Match | Classification |
|---|---|---|---|
| Submissions | Count This Submission? | Yes | Behaviorally equivalent |
| Submissions | Total Shots Counted | Yes | Behaviorally equivalent |
| Submissions | Perfect Week Countable Submission? | Yes | Behaviorally equivalent |
| Submissions | Homework Completion Ready? | Yes | Behaviorally equivalent |
| Submissions | Ready for 009 Asset Creation? | Yes | Behaviorally equivalent |
| Submissions | Duplicate Key | Yes | Behaviorally equivalent |
| Submission Assets | Ready for Homework Completion Script? | Yes | Behaviorally equivalent |
| Submission Assets | Ready to Send to Make? | Yes | Behaviorally equivalent |
| Submission Assets | Writeback Complete? | Yes | Behaviorally equivalent |
| Submission Assets | Upload Destination | Yes | Behaviorally equivalent |
| Submission Assets | Potential Asset Reuse? | — | Behaviorally equivalent |
| Submission Assets | File is Duplicate? | — | Behaviorally equivalent |
| Weekly Athlete Summary | Perfect Week Eligible? | Yes | Behaviorally equivalent |
| Weekly Athlete Summary | Threshold XP Ready? | Yes | Behaviorally equivalent |
| Enrollments | Active XP Total | — | Unknown — field missing both |
| Enrollments | Level Recalc Needed? | — | Behaviorally equivalent |
| Video Feedback | Ready for XP Automation? | — | Behaviorally equivalent |
| Video Feedback | Writeback Complete? | Yes | Behaviorally equivalent |
| Homework Completions | Ready for XP Automation? | — | Unknown — field missing both |
| XP Events | XP Date Resolved | Yes | Behaviorally equivalent |

## 6. Automation documentation comparison

DEV records: **48** · PROD records: **48**
- DEV-only automation docs: **0** (e.g. [])
- PROD-only automation docs: **0** (e.g. [])
- Both bases with doc diffs: **0**

> **Limitation:** Automations table records do not prove live Airtable automation UI state.

## 7. Configuration-record comparison

- No Config Key diffs detected (or Config table structure differs).

### XP Reward Rules
- No record-level diffs detected (or key field mismatch).

### Level Gate Rules
- No record-level diffs detected (or key field mismatch).

### Shot Milestones
- No record-level diffs detected (or key field mismatch).

### Achievements
- No record-level diffs detected (or key field mismatch).

## BLOCKER list

**Count: 1**

### PV2-GAP-0003 — Automation 116
- DEV: Deployed ON, v1.0.1 validated S5A-S5L · PROD: **Runtime validation FAIL 2026-07-11** — 90s poll after Confirmed Duplicate produced no field changes; Automations table has no 116 doc row (008 still present)
- Evidence: `docs/deploy-checklists/C-023-prod-automation-116-validation-2026-07-11.md`
- Impact: Duplicate decisions have no consequences on PROD
- Correction: Paste 116 v1.0.1 in PROD Airtable UI, configure trigger on Asset Reuse Decision, enable, re-run `prod_116_fixture_run.py confirm + restore`
- Mike manual: **True** · Cursor safe: **False** · Risk: High
- Validation: prod_116_fixture_run.py confirm + restore PASS

## REQUIRED BEFORE LAUNCH list

**Count: 1**

### PV2-GAP-0004 — C-013 Production promotion
- DEV: Lambda/Make/070b hybrid proven DEV · PROD: Promotion NOT started per plan
- Evidence: docs/deploy-checklists/C-013-production-promotion-plan.md status Planning only
- Impact: No S3 canonical URLs or hash writeback on PROD uploads
- Correction: Execute C-013 production promotion plan steps 1-11
- Mike manual: **True** · Cursor safe: **False** · Risk: Medium
- Validation: Isolated PROD Lambda smoke + one controlled 070b test

## SAFE POST-LAUNCH CLEANUP list

**Count: 0**

## NO ACTION list

**Count: 3**

### PV2-GAP-0001 — Submission Assets.Calculation
- DEV: present (intentional DEV-only difference) · PROD: absent by design
- Evidence: Redundant DEV helper formula {RecordId}; PROD already contains RecordId and no production dependency references Calculation.
- Impact: none
- Correction: None — do not promote to PROD
- Mike manual: **False** · Cursor safe: **True** · Risk: None
- Validation: Required missing field count remains 0

### PV2-GAP-0002 — C-019/C-020
- DEV: Testing Scenarios table exists · PROD: absent
- Evidence: DEV-only test harness table
- Impact: None for live athletes
- Correction: None
- Mike manual: **False** · Cursor safe: **False** · Risk: None
- Validation: N/A

### PV2-GAP-0005 — 066 shot milestones
- DEV: v3.2 pasted DEV+PROD 2026-07-06 · PROD: Same commit per automation-index
- Evidence: docs/automation-index.md
- Impact: None if already pasted
- Correction: Verify PROD automation UI matches GitHub 36a2e95
- Mike manual: **True** · Cursor safe: **False** · Risk: Low
- Validation: Spot-check PROD 066 run log

## Ordered promotion plan

1. **Promote Submission Assets schema (C-013 + C-023 fields)** — Add 22+ missing PROD fields per DEV c023-stage3-verify-dev snapshot
   - Responsible: Mike/OMNI · Rollback: Field delete only if no live data written · PASS evidence: pv2 audit Submission Assets missing_in_prod = 0 for v2 fields
2. **Add required single-select options** — Asset Reuse Decision, Award Status, Duplicate Status options on PROD
   - Responsible: Mike/OMNI · Rollback: Remove unused options if no records · PASS evidence: Script 116 schema validate PASS on PROD
3. **Align priority formulas** — Manual review formula diffs on Ready to Send, Potential Asset Reuse, duplicate helpers
   - Responsible: Mike/OMNI · Rollback: Revert formula from snapshot · PASS evidence: Formula report classifications not 'Required PROD correction'
4. **Production Lambda + Make (C-013)** — Deploy Lambda, new secrets, Make scenario — 070b OFF until smoke PASS
   - Responsible: Mike/AWS/Make · Rollback: Disable Function URL; 070b OFF · PASS evidence: Isolated upload smoke allPass=true
5. **Paste automation 116 v1.0.1** — Enable on Asset Reuse Decision; retire 008 if present
   - Responsible: Mike · Rollback: Disable 116; reset test fixture · PASS evidence: prod_116_fixture_run.py confirm + restore PASS
6. **Paste 070b v4.2 + controlled enable** — One Schmidt Testing upload after infra PASS
   - Responsible: Mike · Rollback: 070b OFF immediately · PASS evidence: Canonical URL + hash on test asset
7. **Paste 022 writeback if changed** — Sync child tables after Lambda writeback fields exist
   - Responsible: Mike · Rollback: Disable 022 · PASS evidence: Writeback Complete? chain PASS on test asset
8. **Update Automations table records** — Document 116, 070b versions and statuses on PROD
   - Responsible: Mike/Cursor docs · Rollback: Doc-only · PASS evidence: Automation doc compare 116/070b parity
9. **Regression tests** — PROD fixture tests only — no live athlete records
   - Responsible: Mike/Cursor · Rollback: N/A · PASS evidence: 116 fixture + one upload smoke
10. **Launch approval + CHANGELOG** — Mike sign-off; CHANGELOG Airtable section
   - Responsible: Mike · Rollback: N/A · PASS evidence: Backlog C-013/C-023 marked promoted

## Manual actions for Mike

- Paste and enable automation 116 v1.0.1; run prod_116_fixture_run.py confirm + restore
- Execute C-013 production promotion plan (Lambda, Make, secrets) before enabling 070b
- Verify live Airtable automation ON/OFF states against automation-index.md
- Approve launch after regression tests on Schmidt Testing fixture only

## Safe actions Cursor can perform

- Re-run pv2_dev_prod_gap_audit.py after schema promotion
- Update deploy checklists and CHANGELOG when Mike completes each promotion step
- Run prod_116_fixture_run.py (read-only fixture validation)
- Commit schema snapshots to airtable/schema/snapshots/ after PROD field promotion

## Unknowns and audit limitations

- Airtable automation UI state (ON/OFF, pasted script body) is not available via API — inferred from forward tests and docs.
- Formula equivalence is string compare only; behaviorally equivalent rewrites may flag as diff.
- Automations table stores full script body in Automation Code — comparison keyed by Name prefix (###).
- Config table key field names assumed; mismatches may hide record diffs.
- Config table fetch: '<' not supported between instances of 'str' and 'NoneType'

## Production v2 completion estimate

**Estimated completion: ~55–60%** for Production v2 wave (C-013 + C-023 + 116). Submission Assets required schema promotion **PASS**; automation 116 runtime enable + C-013 PROD infra remain open.

## Recommended next Cursor prompt

Mike pasted and enabled PROD automation 116 v1.0.1. Re-run `tools/airtable/prod_116_fixture_run.py pretest`, `confirm`, and `restore` on Schmidt Testing fixture; update `docs/deploy-checklists/C-023-prod-automation-116-validation-2026-07-11.md` to PASS if both directions pass. If runtime PASS, begin C-013 PROD infrastructure readiness review per `docs/deploy-checklists/C-013-production-promotion-plan.md` — do not enable 070b until isolated Lambda smoke PASS.

---
*Generated 2026-07-11T13:16:11Z by pv2_dev_prod_gap_audit.py*