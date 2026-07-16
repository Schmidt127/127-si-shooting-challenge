# Automation 066 — DEV OMNI confirmation support packet

**Status:** Repository support only — **live OMNI confirmation is NOT complete**  
**Backlog:** H-002  
**Script:** `066-achievements-and-milestones-create-shot-milestone-unlocks.js` **v3.2**  
**Base:** DEV `appTetnuCZlCZdTCT`  
**Companion:** [066-v3.1-dev-deploy.md](../deploy-checklists/066-v3.1-dev-deploy.md)  
**Offline harness:** `node airtable/automations/shooting-challenge/lib/066-milestone-crossing-harness.test.js`

---

## What can be completed without live Airtable

| Item | Repo status |
|------|-------------|
| Script version / Source Key contract | Done in GitHub v3.2 |
| Pure crossing + idempotency harness | Done (this packet) |
| Exact OMNI verification steps | Done below |
| Expected log / output shape | Done below |
| Pass/fail criteria + evidence checklist | Done below |
| Live Schmidt pipeline confirmation | **Still pending OMNI** |
| Marking H-002 / PROJECT_STATE complete | **Forbidden until live evidence** |

---

## Offline harness (run anytime)

```bash
node airtable/automations/shooting-challenge/lib/066-milestone-crossing-harness.test.js
```

Harness proves:

- Threshold crossing detection (`prev < T <= curr`)
- `SHOT_MILESTONE|{enrollmentId}|{shotMilestoneId}` stability
- Rerun does not re-create unlocked keys
- Multiple crossings in one run are valid

This does **not** prove DEV Airtable paste or Schmidt intake.

---

## Exact DEV verification steps (OMNI / Mike)

**Do not check `Run Shot Milestone Check?` until steps 1–4 pass.**

### 1. Confirm environment

- [ ] Base ID is `appTetnuCZlCZdTCT`
- [ ] Automation **066** ON
- [ ] Trigger: Enrollments when `Run Shot Milestone Check?` checked
- [ ] Input `recordId` = Enrollment
- [ ] GitHub paste is **v3.2** (docblock Version / `SCRIPT.version`)

### 2. Confirm intake pipeline for test enrollment (Schmidt or named test)

Pick one Enrollment `rec…` and one Submission that should have completed:

| Automation | Evidence to find |
|------------|------------------|
| 023 | Submission.Enrollment linked |
| 005 | Submission.Week linked |
| 009 | Submission Assets created (if attachments) |
| 010 | XP Event `SUBMISSION_XP\|{submissionId}` (if counted) |
| 031 | Weekly Athlete Summary linked |

Record:

- Enrollment ID: _______________
- Submission ID: _______________
- Grade Band: _______________
- Counted shots total (from counted submissions): _______________

### 3. Compute expected milestones (before trigger)

Using active **Shot Milestones** for that Grade Band:

| Milestone name | Threshold | Already unlocked? (Milestone Source Key) | Expect create? |
|----------------|-----------|------------------------------------------|----------------|
| | | | |
| | | | |

Offline check: feed prev/curr shot totals into harness mentally or via test fixtures.

### 4. OMNI confirmation gate (required)

OMNI must explicitly confirm both:

1. The chosen Submission **completed intake with automations ON**  
2. The expected milestone create/skip list above  

Until both are confirmed: **stop**.

### 5. Trigger sandbox (only after gate)

1. On Enrollment, check `Run Shot Milestone Check?`
2. Wait for 066 run
3. Capture automation outputs / console JSON

---

## Expected log / output shape

Successful create (example):

```json
{
  "automation": "066 - Achievements and Milestones - Create Shot Milestone Unlocks",
  "version": "v3.2",
  "statusOut": "success",
  "actionOut": "created_or_updated",
  "enrollmentIdOut": "rec…",
  "createdUnlocksOut": 1,
  "skippedExistingUnlocksOut": 0
}
```

Idempotent rerun:

- `skippedExistingUnlocksOut` increases or create count stays 0 for same Source Keys
- No duplicate `Athlete Achievement Unlocks` with same `Milestone Source Key`

Error / skip inactive:

- `statusOut` = `skipped` or `error` with `errorOut` populated
- On hard error, `Run Shot Milestone Check?` may remain checked (by design) for triage

Exact `actionOut` strings may vary — capture actual values from DEV run and paste into evidence.

---

## Pass / fail criteria

| Criterion | Pass |
|-----------|------|
| Intake chain complete | All required links/XP present for chosen submission |
| Unlock Source Keys | `SHOT_MILESTONE\|{enr}\|{milestoneId}` unique |
| Crossing set | Matches precomputed table |
| Rerun | No duplicate unlocks |
| Week write | Milestone Activity Date resolves Week via Denver date keys (v3.2) |
| Trigger clear | `Run Shot Milestone Check?` unchecked after success |

**Fail examples:** intake incomplete; wrong Grade Band milestones; duplicate Source Keys; UTC-only week mismatch.

---

## Evidence to capture (do not mark complete without these)

- [ ] Enrollment + Submission record IDs  
- [ ] Screenshot/table of Shot Milestones for Grade Band  
- [ ] Precomputed expected crossings  
- [ ] 066 output JSON (`statusOut`, counts, version)  
- [ ] Unlock record IDs + Milestone Source Keys  
- [ ] Rerun output proving idempotency  
- [ ] Operator name + date  

Update [PROJECT_STATE.md](../PROJECT_STATE.md) / [066-v3.1-dev-deploy.md](../deploy-checklists/066-v3.1-dev-deploy.md) only after evidence exists.

---

## Live confirmation status

**Pending OMNI / Mike.** This document does not close H-002.

**Repo-only re-run (2026-07-16, Online Agent 2):** `066-milestone-crossing-harness.test.js` **PASS**. No live Airtable access in that run — see [DEV-release-readiness-verification-2026-07-16.md](./DEV-release-readiness-verification-2026-07-16.md).

**Authorized live attempt (2026-07-16, Online Agent 2, master `1d403df`):** **BLOCKED** before any write — no `AIRTABLE_*` PAT in environment; browser hit Airtable login wall for `appTetnuCZlCZdTCT`; base identity could not be independently confirmed live. F1–F3 not executed. Evidence: [066-omni-live-attempt-2026-07-16.md](./066-omni-live-attempt-2026-07-16.md). **H-002 remains OPEN.**
