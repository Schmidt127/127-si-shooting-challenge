# Pipeline audit — Zoom + Achievements (Stage 7)

**Date:** 2026-07-13  
**Package:** `pipeline-zoom-achievements-audit`  
**Branch:** `overnight/v2-run/worker-b-s7-zoom-achievements-pipeline`  
**Base SHA:** `ce7c85a`  
**Scope:** Repo analysis only

---

## 1. Zoom attendance (**101**)

| Item | Today | Target (C-025) |
|------|-------|----------------|
| Trigger | `Create XP Events` on Zoom Meetings | Same + recording path |
| XP amount | Live attendance full rule | Recording = **50% XP** |
| Level gate | Live credit | Recording = **full gate credit** |
| Dedupe | Per meeting attendee | `ZOOM_LIVE` vs `ZOOM_RECORDING` mutually exclusive Source Keys |
| C-010 gate | Not documented in **101** | `Progress Processing Enabled?` before XP |

**Gap:** No recording workflow exists. **101** awards live attendees only.

**Repo-safe next steps (not this package):**

1. Document Source Key patterns (done here).
2. Propose XP Reward Rule + Level Gate Rule rows for owner review (future).
3. Design attestation fields for recording watch (proposal only later).

---

## 2. Achievements pipeline (**053**–**059**, **066**)

| Script | Purpose | Dedupe / idempotency |
|--------|---------|---------------------|
| **053** | Streak rebuild from submissions | Rebuild safe to rerun |
| **054** | Streak XP Event | Source Key per streak occurrence |
| **055**–**056** | Current streak refresh | Scheduled **056** |
| **057**–**058** | Perfect Week unlock | One unlock per athlete+week |
| **059** | Achievement XP | Source Key; earliest unlock wins |
| **066** v3.2 | Shot milestone unlocks | Week assignment fixed v3.1+ |

**Existing audit:** `audit-achievement-xp-pipeline-integrity.js` (Stage I).

---

## 3. C-010 interaction matrix

| Athlete state | **066** milestones | **054**/**059** XP | Streak **053** rebuild |
|---------------|-------------------|---------------------|------------------------|
| Active, progress on | Run | Award | Include |
| Hidden, progress on | Run | Award (no public comms) | Include |
| Withdrawn | **Stop** | **Skip new XP** | Exclude new work |
| Schmidt test | Run full pipeline | Award (suppress comms) | Include |

**Gap:** **066**, **054**, **059** need `Progress Processing Enabled?` after C-010 paste.

---

## 4. C-024 dedupe touchpoints

| Check | Script / table | DK id |
|-------|----------------|-------|
| Duplicate achievement unlock | Athlete Achievement Unlocks | Earliest valid |
| Duplicate XP from unlock | XP Events | DK-01 Source Key |
| Zoom live + recording same meeting | XP Events | DK-08 (pattern covered offline) |

---

## 5. Failure modes

| ID | Scenario | Safe behavior |
|----|----------|---------------|
| Z-01 | Live then recording claim | Second XP blocked by Source Key family |
| Z-02 | Recording without gate rule | No gate credit until rule exists |
| A-01 | **066** rerun same week | No duplicate unlock rows |
| A-02 | Perfect Week double trigger | **058** idempotent |
| A-03 | Withdrawn milestone check | Skip when progress disabled |

---

## 6. Manual verification checklist (DEV)

- [ ] Stage I audit dry-run
- [ ] Confirm **066** v3.2 matches GitHub on DEV
- [ ] Schmidt: milestone XP created, no parent email (C-027 future)
- [ ] Recording path remains **blocked** until C-025 implementation approved

**Status:** **COMPLETE** (repo audit)
