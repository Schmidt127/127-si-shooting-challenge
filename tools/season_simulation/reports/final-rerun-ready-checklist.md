# SC-SEASON-SIM-001 — Final Clean Rerun Checklist

**Branch:** `chore/sim-window-apr25-jun30-67day`  
**Production base:** `appn84sqPw03zEbTT`  
**Preserved failed run (cleanup after verification):** `SEASON-SIM-2027-20260913T010724Z-threeathlete`  
**042 source commit:** `90ed4b24988459704ec7425c4a1c347e4979565f`

Run all CLI commands from repo **`tools/`** directory with `AIRTABLE_TOKEN` or `AIRTABLE_API_TOKEN` set.

---

## Phase 0 — Mike manual (Production Airtable)

1. Open Automation **042** (`wfl3aiiK8vI2tz0HA`).
2. Paste **042 v4.1.3** from:
   `airtable/automations/shooting-challenge/042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js`
   - **Lines 25–1532** (skip GitHub header lines 1–23).
3. Confirm `Version: 4.1.3` and `CONFIG.automation.version: "4.1.3"`.
4. Preserve trigger, view `viwm9OgwkPKI2bii3`, filters, dynamic `recordId`.
5. **Publish** Automation 042.

---

## Phase 1 — Read-only verification gate (must PASS)

```bash
cd tools
python -m season_simulation verify-post-042 \
  --run-id SEASON-SIM-2027-20260913T010724Z-threeathlete
```

**Expect:** `Post-042 verification — PASS`

Checks:
- 042 = **4.1.3**, 053 = **5.6**, 076 = **8.15**, 101 = **6.9**
- `Effective Zoom Gate Meetings` + three Zoom gate formulas
- Normal Production submission formulas (no Season Sim temp gates)
- Preserved failed run still intact
- No older failed-run residue

Reports: `tools/season_simulation/reports/post-042-verification-latest.{json,md}`

**STOP if FAIL** — do not cleanup or execute.

---

## Phase 2 — Cleanup preserved failed run

### 2a. Preview (read-only)

```bash
python -m season_simulation cleanup-preview-preserved \
  --run-id SEASON-SIM-2027-20260913T010724Z-threeathlete
```

Review counts by table; **foreign records must be 0**.

### 2b. Execute cleanup (after preview OK)

```bash
python -m season_simulation cleanup-three \
  --run-id SEASON-SIM-2027-20260913T010724Z-threeathlete \
  --execute \
  --confirm "SEASON-SIMULATION-2027" \
  --confirm-cleanup "CONFIRM-CLEANUP-SEASON-SIM"
```

Residue pass (late descendants) runs via `run_three_athlete_cleanup_with_residue_pass` in tooling.

### 2c. Verify zero residue

Re-run preview — expect **total_records = 0** or empty targets.

---

## Phase 3 — Confirm normal Production formulas

```bash
python -m season_simulation verify-post-042
```

Submission formulas must remain **Production-normal** before temp gates.

---

## Phase 4 — Install temporary Season Sim gates (OMNI paste forbidden)

Paste **exact** formulas from `tools/season_simulation/FORMULAS-TO-PASTE.txt` §1–2:

| Field | Section |
|-------|---------|
| `Activity Date Is Future?` | §1 (temporary block in doc) |
| `Submitted Same Day?` | §1 TEMPORARY |
| `Perfect Week Grace Eligible?` | §2 TEMPORARY |

Verify with:

```bash
python -m season_simulation preflight
```

---

## Phase 5 — Preflight

```bash
python -m season_simulation preflight
```

**Require:**
- Production base `appn84sqPw03zEbTT`
- 10 challenge weeks, 18 PHA, 2 canonical Zoom meetings
- 042 v4.1.3 / 053 v5.6 / 076 v8.15 / 101 v6.9 (via verify-post-042)
- Perfect oracle **4910 XP**
- No blockers

---

## Phase 6 — Dry-run-three

```bash
python -m season_simulation dry-run-three
```

**Expect:**
- Status: **READY**
- **NOT EXECUTED**
- Perfect profile oracle **4910** / **G.O.A.T.**
- Recovery **2305 XP** / **1** Perfect Week
- Edge **3620 XP** / **5** Perfect Weeks

Reports: `tools/season_simulation/reports/sc001-dry-run-latest.{json,md}`

---

## Phase 7 — Fresh execute-three (Mike authorization required)

Mike phrase exactly: **`RUN 3-ATHLETE SEASON SIMULATION`**

```bash
RUN_ID="SEASON-SIM-2027-$(date -u +%Y%m%dT%H%M%SZ)-threeathlete"

python -m season_simulation execute-three \
  --run-id "$RUN_ID" \
  --execute \
  --confirm "SEASON-SIMULATION-2027" \
  --confirm-disposable "CONFIRM-DISPOSABLE-SEASON-SIM" \
  --confirm-three-athlete "THREE-ATHLETE-SEASON-SIM-2027" \
  --authorization-phrase "RUN 3-ATHLETE SEASON SIMULATION" \
  --acknowledge-clock-override
```

**Hard success (Perfect):** 4910 XP, 10 PW, G.O.A.T., streak through 60, Zoom gate 2/2 effective, E2 live XP match.

---

## Phase 8 — Restore normal Production formulas

Stage Z / formula restore from execute report snapshot, or paste §3–4 ROLLBACK from `FORMULAS-TO-PASTE.txt`.

Verify:

```bash
python -m season_simulation verify-post-042
```

---

## Phase 9 — GitHub evidence (required for finished run)

Commit and push both:

- `tools/season_simulation/reports/final-production-run-<RUN_ID>.json`
- `tools/season_simulation/reports/final-production-run-<RUN_ID>.md`

**Do not** auto-cleanup successful or failed fresh-run records.

---

## Phase 10 — Preserve for ChatGPT review

Leave fresh-run transactional records in Production until Mike/ChatGPT sign off.

---

## Quick reference — automation pins

| Automation | Required version |
|------------|-------------------|
| 042 | 4.1.3 |
| 053 | 5.6 |
| 076 | 8.15 |
| 101 | 6.9 |

## Quick reference — Perfect XP buckets (4910)

| Bucket | XP |
|--------|-----|
| Submission | 1340 |
| Homework | 630 |
| Video | 750 |
| Streak | 455 |
| Weekly Threshold | 480 |
| Perfect Week | 1000 |
| Shot Milestone | 165 |
| Zoom | 90 |
