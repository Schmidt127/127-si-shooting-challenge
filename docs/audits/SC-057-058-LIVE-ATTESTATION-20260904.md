# Live Production automation attestation — 2026-09-04

**Base:** `appn84sqPw03zEbTT`  
**Evidence:** Airtable MCP `list_automations` + selective `get_automation` (draft == deployed; `deployedVersion` null)  
**Git tip at worktree create:** `8e662a38ab3d12a726dd7599ccdac4077db0e015` (`origin/master`)  
**Authority:** Live Automations UI / MCP graph. Production `Automations` data table is authority for **Name / Status / Automation Code only** — MCP read of those three columns returned **empty Code bodies** on 2026-09-04 (treat operator table as non-authoritative for version strings this pass).

## Summary

| Metric | Value |
|--------|-------|
| Live automations (`deploymentStatus=deployed`) | **50** |
| Trigger types | recordMatchesConditions 35 · recordEntersView 6 · recordUpdated 5 · cron 4 |
| Retired slots **absent** from live UI | **043, 063, 068, 075, 077, 111, 112** |
| Repo scripts **not** in live UI | **006**, **007** (live uses **007a**), **043**, **063**, **068**, **075**, **077**, **111**, **112**, **115** (ETF by design) |
| Extra live slot vs older inventories | **120** (FUT-009 S3 rename) |

## Live automation set (sorted)

| # | Live name | Trigger type | Table | automationId |
|---|-----------|--------------|-------|--------------|
| 001 | Find or Create Athlete and Link Enrollment | recordEntersView | Enrollments | wflM3vw4mgP50HsWe |
| 002 | Assign Grade Band - Initial | recordEntersView | Enrollments | wflr13bp3RfyCtIey |
| 003 | Assign Grade Band - If Grade Changes | recordEntersView | Enrollments | wfl7AvilhlV0TYuwG |
| 005 | Assign Week to Submission - Homework First | recordMatchesConditions | Submissions | wfld5XC7BPXRtftOZ |
| 007a | Duplicate Checker for Submissions | recordMatchesConditions | Submissions | wfl6hwR395yps49UD |
| 009 | Create Submission Assets from Submission | recordMatchesConditions | Submissions | wflGKNw4e06hCHyv9 |
| 010 | Create XP Event from Submission | recordMatchesConditions | Submissions | wflJUkUJYTtRWJCyH |
| 013 | Create or Link Video Feedback | recordMatchesConditions | Submission Assets | wflZwhJqLWwAlCHMv |
| 020 | Link or Create Homework Completion from Submission Asset | recordMatchesConditions | Submission Assets | wfl5bUBHJGLVFWuQA |
| 021 | Set Attachment Upload Status | recordMatchesConditions | Submissions | wflPcB9g4WptRgBhA |
| 022 | Sync Child Upload Writeback from Submission Asset | recordMatchesConditions | Submission Assets | wflXNNNCH0ocI1qav |
| 023 | Assign Enrollment to Submission | recordMatchesConditions | Submissions | wfltkJQsWm7FcUYq8 |
| 030 | Copy Enrollment Grade Band to Weekly Summary | recordEntersView | Weekly Athlete Summary | wflieZd3s3o8SB0xD |
| 031 | Find or Create Weekly Athlete Summary from Submission | recordEntersView | Submissions | wflKviSzqoWMnKNrE |
| 032 | Link Challenge Goal Record to Weekly Athlete Summary | recordMatchesConditions | Weekly Athlete Summary | wflOHqpcDF2F8oItI |
| 033 | Assign Homework to Weekly Athlete Summary | recordMatchesConditions | Weekly Athlete Summary | wfl1trFEUOV3yIMHM |
| 034 | Set Previous Week Helper Values | recordMatchesConditions | Weekly Athlete Summary | wflkSZX2nWn8ZK9L5 |
| 035 | Create Weekly Threshold XP Events | recordMatchesConditions | Weekly Athlete Summary | wflQDjG1OphlQ03S5 |
| 041 | Mark Enrollment for Level Recalculation | **cron** (every 15 min) | — | wflCRvaopntNPsc64 |
| 042 | Assign Current and Next Level | recordEntersView | Enrollments | wfl3aiiK8vI2tz0HA |
| 053 | Streak Occurrences Rebuild From Submissions | recordUpdated | Submissions | wflxGeLKCL9ToB9cp |
| 054 | Create or Repair Streak XP Event | recordUpdated | Streak Occurrences | wflNfKv5hFknF69cz |
| 055 | Recalculate Current Shooting Streak from Submission | recordMatchesConditions | Submissions | wfloWQRJJ54eKYKpC |
| 056 | Refresh Current Shooting Streaks Daily | cron | — | wflWppw6j9AdWdCcy |
| 057 | Calculate Perfect Week Eligibility | recordMatchesConditions | Weekly Athlete Summary | wflVRPhgunsosFjWS |
| 058 | Create Perfect Week Unlock | recordMatchesConditions | Weekly Athlete Summary | wflDinFz6FBIGEOMg |
| 059 | Create XP Event from Achievement Unlock | recordMatchesConditions | Athlete Achievement Unlocks | wfltDo4HZxpYlbqn8 |
| 064 | Assign Base Homework XP | recordMatchesConditions | Homework Completions | wflKKgCAfXwmzjmhO |
| 065 | Create or Update Homework XP Event | recordMatchesConditions | Homework Completions | wfllkhzl3R6OlClzy |
| 066 | Create Shot Milestone Unlocks | recordMatchesConditions | Enrollments | wflSMXHrUoFZEBLqf |
| 067 | Link Reflection Quiz to Homework Completion | recordMatchesConditions | Final Reflection Quiz Submissions | wflaMSBUbfR4NhVPk |
| 070a | Send Homework Asset Payload to Make | recordMatchesConditions | Submission Assets | wflIYVOmRRaHu9cl2 |
| 070b | Send Video Asset Payload to Make | recordMatchesConditions | Submission Assets | wflM5RiPPcuERcwSq |
| 070c | Verify Async Video Asset Upload | recordMatchesConditions | Submission Assets | wfl0pe3wmT8WTTDRL |
| 071 | Send Homework Feedback Email Webhook | recordMatchesConditions | Homework Completions | wflpgZsyC16gI56Fi |
| 072 | Build Weekly Summary Email Package | recordMatchesConditions | Weekly Athlete Summary | wflnFeGqUMJFUaUOQ |
| 073 | Send Video Feedback Parent Email Webhook | recordMatchesConditions | Video Feedback | wfl7CPqiuntYBYeFP |
| 074 | Create Weekly Summary Hub Handoff | recordMatchesConditions | Weekly Athlete Summary | wfluWC1sX7XyqxCDm |
| 076 | Daily Submission Communications Hub Handoff | recordMatchesConditions | Submissions | wfloqdrjhDcGwBBnI |
| 078 | Mark Homework Parent Feedback Ready | recordMatchesConditions | Homework Completions | wflp25FlsKCpW0vtk |
| 078A | Enrollment → Create WELCOME Email Handoff | recordMatchesConditions | Enrollments | wflMcjmOa06vGi2yf |
| 079 | Send to Communications Hub - NEW | recordMatchesConditions | Email Handoff Queue | wflMFP6CtbrObUhpx |
| 101 | Award Meeting XP | recordMatchesConditions | Zoom Meetings | wfllWsq7qikhOujGl |
| 113 | Assign Base Video XP by Grade Band | recordUpdated | Video Feedback | wflfKRNcfiNLtib7X |
| 114 | Create or Update Video XP Event | recordUpdated | Video Feedback | wfl91138bIIQynAl5 |
| 116 | Apply Asset Reuse Decision Consequences | recordUpdated | Submission Assets | wflNzKKLVhjdNzMhU |
| 117 | Create Zoom Recording Approval Communications Hub Handoff | recordMatchesConditions | Zoom Attendance | wflBMRCDdNwY08yu6 |
| 118 | Schedule Weekly Summary Email Build | cron | — | wflaSFRTHs6rNzs5L |
| 119 | Schedule Weekly Summary Email Send | cron | — | wflPOA06rNdPhlaMR |
| 120 | Automatic S3 Video Rename | recordMatchesConditions | Video Feedback | wfl36qsR7FbeJI2gh |

## Selective live script versions (`get_automation` body)

| # | Live pasted Version | GitHub SCRIPT (tip) | Match? |
|---|---------------------|---------------------|--------|
| 010 | **v10.13** | v10.13 | Yes |
| 041 | **v5.1** | v5.1 | Yes |
| 057 | **2.3** | 2.3 | Yes |
| 058 | **1.5** | 1.5 | Yes |
| 059 | **v3.7** | v3.7 | Yes |
| 065 | **v10.6** | v10.6 | Yes |
| 101 | **v6.8** (live body) | v6.7 (repo) | **Drift — Agent 1 / SC-147 owns; do not paste from this agent** |

## Critical trigger attestations (SC-057)

### 057 — Perfect Week eligibility

- **Trigger:** WAS · `Perfect Week Calculation Queue? = 1` (`fldNvOVO3WidABUXS`, **formula**)
- **Input:** dynamic `recordId`
- **Risk:** formula-only queue; see remediation SF-01

### 058 — Perfect Week unlock

- **Trigger:** WAS · `Perfect Week Eligible? = 1` (formula) **AND** `Perfect Week Unlock` empty **AND** `Perfect Week Automation Status = Ready`
- **Script contract:** lifecycle / withdrawal support when not eligible — **but positive-only + empty-unlock UI conditions prevent withdrawal runs**
- **Risk:** silent miss on eligibility loss / unlock repair — see SF-02

### 010 / 065 / 101 — reconciliation pattern (good)

- **010:** Submissions · `Reconciliation Needed? = 1` (+ Enrollment/Week/etc. non-empty)
- **065:** Homework Completions · `Homework XP Reconciliation Needed? = 1`
- **101:** Zoom Meetings · reconciliation flag pattern (Agent 1 owns paste)

### 041 — levels queue

- **Live:** cron every **15 minutes** (not XP Events record trigger)
- Docs that still say “XP Events when Enrollment not empty” are **stale**

## Duplicate-writer disposition (confirmed absent)

| Slot | Expected | Live 2026-09-04 |
|------|----------|-----------------|
| 112 vs 013 | 112 OFF/absent; 013 sole VF create | **112 absent**; **013 deployed** |
| 043 vs 042 | 043 not deployed | **043 absent**; **042 deployed** |
| 063 | deleted | **absent** |
| 068 | OFF/retired | **absent** |
| 075 / 077 | retired/deleted | **absent** |

## Predecessor docs

- [`SC-057-trigger-conflict-inventory.md`](./SC-057-trigger-conflict-inventory.md) (2026-08-27 repo-only)
- [`SC-058-automation-inventory-supplement.md`](./SC-058-automation-inventory-supplement.md)
- [`docs/AUTOMATION_VERSION_INVENTORY.md`](../AUTOMATION_VERSION_INVENTORY.md) (living; many rows still UNKNOWN until this attestation)
- This pass’s authoritative workflow inventory: [`WORKFLOW-RELIABILITY-INVENTORY-20260904.md`](./WORKFLOW-RELIABILITY-INVENTORY-20260904.md)
