# PKG-038 — Before and after evidence checklist

**Controlled Enrollment:** `recCyFEPeATOVNlr9`  
**Athlete:** `recgqVstObQRzgXJF`  
**Program Instance:** `rec5mEM0YPqPqq0hZ`  
**Grade Band (2026-08-05):** `reclWDQZzKbVBtdhG`

Use **record IDs** in the log. Display names are reference only.

---

## Session metadata (capture once)

| Field | Before paste | After proof |
|-------|--------------|-------------|
| Date / operator | | |
| `git rev-parse HEAD` | | |
| Audit JSON filename (read-only) | | |
| 053 installed version + ON/OFF | | |
| 054 installed version + ON/OFF | | |
| 066 installed version + ON/OFF | | |
| 059 installed version + ON/OFF | | |
| 010 version + ON/OFF (must stay ON) | | |

---

## Enrollment `recCyFEPeATOVNlr9`

| Field | Field type | Before | After |
|-------|------------|--------|-------|
| `Active?` | checkbox | | |
| Athlete link → `recgqVstObQRzgXJF` | link | | |
| Program Instance → `rec5mEM0YPqPqq0hZ` | link | | |
| Grade Band → `reclWDQZzKbVBtdhG` | link | | |
| `Run Shot Milestone Check?` | checkbox | | |
| `Lifetime XP Total` | rollup/formula | | |
| `Total Shots Submitted` / counted rollups | number | | |
| `Current Shooting Streak` / status fields | number/text | | |
| `Level Recalc Needed?` | checkbox | | |
| Linked Streak Occurrences (count + IDs) | link | | |
| Linked Athlete Achievement Unlocks (count + IDs) | link | | |
| Linked XP Events (count; list IDs) | link | | |

---

## Streak XP Events (per known key — expand if inventory differs)

For each row record **XP Event record ID**, `Active?`, `XP Points`, `XP Bucket`, `XP Source`, Week ID, WAS ID, Streak Occurrence link ID.

| Source Key | XP Event ID (before) | Active? before | XP Event ID (after) | Active? after |
|------------|----------------------|----------------|---------------------|---------------|
| `STREAK_XP\|recCyFEPeATOVNlr9\|recQuAtXyT2wKJNGI\|2026-08-04` | `rec4EJUNz9EmRvmiD` | | | |
| `STREAK_XP\|recCyFEPeATOVNlr9\|rechOec7g8LBLcdgl\|2026-08-06` | `recqzIkftOsyIPhkM` | | | |
| `STREAK_XP\|recCyFEPeATOVNlr9\|recP8QP4uhEXaiZAX\|2026-08-08` | `recPpgYv8Prc67nvP` | | | |
| *(new key from step F if applicable)* | | | | |

---

## Streak Occurrences (linked to enrollment)

For each occurrence used in test:

| Occurrence ID | Achievement ID | Streak End Date | Active? | Source Status | XP Events link IDs |
|---------------|----------------|-----------------|---------|---------------|-------------------|
| | | | | | |

---

## Shot milestone unlocks (8 keys — record unlock ID each)

| Milestone Source Key | Unlock record ID (before) | Active? | XP Award Status | XP Event ID(s) | Active? (XP) |
|----------------------|---------------------------|---------|-----------------|----------------|--------------|
| `SHOT_MILESTONE\|recCyFEPeATOVNlr9\|recWGiiyPsv5wKeWd` | | | | | |
| `SHOT_MILESTONE\|recCyFEPeATOVNlr9\|recsmKrqpCjErhR1K` | | | | | |
| `SHOT_MILESTONE\|recCyFEPeATOVNlr9\|recvPCvwmMzIBogMP` | | | | | |
| `SHOT_MILESTONE\|recCyFEPeATOVNlr9\|recuzCxUOLUU6dDGx` | | | | | |
| `SHOT_MILESTONE\|recCyFEPeATOVNlr9\|rec697KEVaK8axCFK` | | | | | |
| `SHOT_MILESTONE\|recCyFEPeATOVNlr9\|recvzZE04Jg1mUsof` | | | | | |
| `SHOT_MILESTONE\|recCyFEPeATOVNlr9\|reccezOiPdSpOQQhy` | | | | | |
| `SHOT_MILESTONE\|recCyFEPeATOVNlr9\|rec5ySmeXYWeIReJn` | | | | | |

**Correction test target:** circle one unlock + XP pair for steps H/I in test plan.

---

## Controlled Submission(s) used in test

| Submission ID | Enrollment link | Activity Date | Total Shots Counted | Count This Submission? | SUBMISSION_XP event ID | Active? |
|---------------|-----------------|---------------|---------------------|------------------------|------------------------|---------|
| | `recCyFEPeATOVNlr9` | | | | `SUBMISSION_XP\|{id}` | |

**Rule:** Submission Base XP must remain owned by **010** — same event ID before/after unless 010 reconciliation explicitly run.

---

## Weekly Athlete Summary (per week touched)

| WAS ID | Week ID | Enrollment | XP Earned This Week (before/after) | Total Shots This Week |
|--------|---------|------------|-----------------------------------|------------------------|
| | | `recCyFEPeATOVNlr9` | | |

---

## Progression (observe only — 041/042 not in scope)

| Field | Before | After |
|-------|--------|-------|
| Current Level record ID | | |
| Next Level record ID | | |
| Level Status | | |
| `Progression Last Queued Signature` | | |
| `Progression Last Reconciled Signature` | | |

---

## Audit summary

| Metric | Before JSON | After JSON |
|--------|-------------|------------|
| `issueCounts.active_state_drift` | | |
| `issueCounts.duplicate_canonical_xp_source_key` | | |
| `issueCounts.wrong_xp_source_or_bucket` | | |
| `streakOccurrencesChecked` | | |
| `unlocksChecked` | | |

---

## Sign-off

| Check | Before complete | After complete |
|-------|---------------|----------------|
| All IDs recorded (not display names only) | ☐ | ☐ |
| No records deleted during test | ☐ | ☐ |
| Duplicate Source Key scan clean | ☐ | ☐ |
| Mike approves Production state | ☐ | ☐ |
