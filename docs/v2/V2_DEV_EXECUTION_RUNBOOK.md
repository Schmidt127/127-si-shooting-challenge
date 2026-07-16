# V2 DEV Execution Runbook

**Status:** Executable DEV plan derived from the athlete-scenario matrix  
**Last updated:** 2026-07-16  
**Worker:** Testing (Worker B)  
**Environment:** DEV only — `appTetnuCZlCZdTCT`  
**PROD forbidden:** `appn84sqPw03zEbTT`  

**Sources of truth**

| Doc / artifact | Role |
|---|---|
| [../V2_END_TO_END_TEST_MATRIX.md](../V2_END_TO_END_TEST_MATRIX.md) | Scenario IDs A1–M3 and pass criteria |
| [V2_LAUNCH_SMOKE_TESTS.md](./V2_LAUNCH_SMOKE_TESTS.md) | Pre-PROD promotion smoke subset |
| [../../tools/airtable/v2_dev_runbook/matrix-classification.json](../../tools/airtable/v2_dev_runbook/matrix-classification.json) | Machine-readable mode tags |
| [../../tools/airtable/v2_dev_runbook/fixtures/](../../tools/airtable/v2_dev_runbook/fixtures/) | Domain fixtures (setup/cleanup/rollback) |
| [../../tools/airtable/v2_dev_runbook/cli.js](../../tools/airtable/v2_dev_runbook/cli.js) | Safe operator CLI (dry-run default) |
| [evidence/_TEMPLATE-dev-test-evidence.md](./evidence/_TEMPLATE-dev-test-evidence.md) | Per-test evidence form |
| [evidence/dev-runs/](./evidence/dev-runs/) | CLI evidence output (`<date>/<test-id>.md`) |
| [08-testing-standards.md](./08-testing-standards.md) | Audit-first + C-020 rules |

**Live results rule:** Do **not** mark matrix cells Pass without enrollment IDs + automation output evidence filed under `docs/v2/evidence/`. Offline suite PASS ≠ live DEV PASS.

---

## 1. Hard stops

1. DEV base ID must equal `appTetnuCZlCZdTCT` (read from Airtable URL/API before any write).
2. No PROD Airtable / Make / Lambda / Vercel changes from this runbook.
3. No live Airtable access unless Mike authorizes a **named DEV check**.
4. Prefer C-020 **Testing Scenarios** / Fillout-shaped Submissions — not hand-typed incomplete rows.
5. Use named test enrollments only (Schmidt + DEV sandbox).
6. Keep **070a OFF in PROD**; DEV 070a only when Mike schedules.
7. Keep **117a/117b OFF in PROD** until Mike schedules install.
8. Never commit tokens. Store PAT in `tools/airtable/.env` locally (gitignored).

---

## 2. Execution mode taxonomy

Every matrix row is tagged with one or more modes in `matrix-classification.json`.

| Mode | Meaning | Typical access needed |
|---|---|---|
| `offline` | Repo contract/fixture tests; no credentials | Node/Python in this repo |
| `airtable_api` | Read/write via Airtable REST against **DEV** | `AIRTABLE_TOKEN` + DEV `BASE_ID` + Mike named DEV auth |
| `airtable_ui` | Operator/OMNI in Airtable UI | Mike Airtable login on DEV; automation toggles; Run Test? |
| `make` | DEV Make scenario + DEV webhook | DEV Make workspace; webhook URL input (never PROD) |
| `email_evidence` | Inbox / webhook capture proof | Isolated test inbox or Make history |
| `mike_approval` | Explicit Mike gate before live action | Verbal/written authorization for named check |

Print the classification anytime:

```bash
node tools/airtable/v2_dev_runbook/cli.js list
node tools/airtable/v2_dev_runbook/cli.js plan --smoke-only
node tools/airtable/v2_dev_runbook/print_live_plan.js --check-credentials
```

---

## 2A. Safe operator CLI (Mike / Desktop Lead)

Entrypoint: `node tools/airtable/v2_dev_runbook/cli.js`

| Command | Purpose |
|---|---|
| `list` | Matrix rows + which IDs the CLI can run live |
| `plan [--smoke-only]` | Execution plan |
| `verify-env --dev-confirm` | Token presence, DEV `BASE_ID`, schema plan (no token print) |
| `run-offline` | Offline fixture suite |
| `run-test <ID> --dev-confirm` | Dry-run one scenario (default) |
| `run-test <ID> --dev-confirm --execute --enrollment rec…` | Live write path (Mike auth required) |
| `collect-evidence <ID> --dev-confirm` | Write/update evidence markdown |
| `cleanup <ID> --dev-confirm [--rollback-only] [--execute]` | Delete **owned** run-state records only |
| `status` | Local run-state + evidence summary |

### CLI hard safety controls

1. `BASE_ID` must equal exactly `appTetnuCZlCZdTCT` — any other value (including PROD) is refused.  
2. `--dev-confirm` required for live/env actions.  
3. Default is **dry-run**; Airtable writes require separate `--execute`.  
4. Token values are never printed.  
5. PROD Make/webhook env keys are refused.  
6. Cleanup only deletes record IDs stored in the local run-state ownership file; shared fixtures are skipped.  
7. Make/email tests (`I6`, `J6`, `L3`, `C7`, …) are **not** implemented in the CLI yet.

### Exact commands for first live block (A3 → F3)

```bash
# 0) tools/airtable/.env (gitignored)
# AIRTABLE_TOKEN=pat...
# BASE_ID=appTetnuCZlCZdTCT

node tools/airtable/v2_dev_runbook/cli.js run-offline
node tools/airtable/v2_dev_runbook/cli.js verify-env --dev-confirm

# Dry-run (safe; no writes)
node tools/airtable/v2_dev_runbook/cli.js run-test A3 --dev-confirm --enrollment recYOUR_DEV_ENROLLMENT
node tools/airtable/v2_dev_runbook/cli.js run-test B1 --dev-confirm --enrollment recYOUR_DEV_ENROLLMENT
node tools/airtable/v2_dev_runbook/cli.js run-test B2 --dev-confirm
node tools/airtable/v2_dev_runbook/cli.js run-test F1 --dev-confirm --enrollment recYOUR_DEV_ENROLLMENT
node tools/airtable/v2_dev_runbook/cli.js run-test F2 --dev-confirm --enrollment recYOUR_DEV_ENROLLMENT
node tools/airtable/v2_dev_runbook/cli.js run-test F3 --dev-confirm

# ONLY after Mike named DEV authorization — writes enabled
node tools/airtable/v2_dev_runbook/cli.js run-test A3 --dev-confirm --execute --enrollment recYOUR_DEV_ENROLLMENT --operator Mike

# Evidence lands at:
# docs/v2/evidence/dev-runs/<YYYY-MM-DD>/<TEST-ID>.md

node tools/airtable/v2_dev_runbook/cli.js collect-evidence A3 --dev-confirm --result pass --notes "Week linked"
node tools/airtable/v2_dev_runbook/cli.js cleanup A3 --dev-confirm --rollback-only
# then --execute only if owned rows should be deleted
```

Initial live-supported IDs: **A3, B1, B2, F1, F2, F3**.

CLI safety tests: `node tools/airtable/v2_dev_runbook/cli.test.js`

---

## 3. Classification summary (matrix A–M)

Counts below are from `matrix-classification.json` (a test may appear in multiple modes).

### 3.1 Executable offline

| IDs | What offline proves | Command / suite |
|---|---|---|
| A4 | Malformed `recordId` rejected | `v2-engine-contracts.test.js` |
| B2, B3, B5 | XP idempotency / date keys | `run_offline_fixture_suite.js` + contracts |
| C2, C5 | Homework link-existing / XP skip | fixture suite |
| D4, D5, D7, D8 | Steal-guard, rerun, upload validation | fixture suite + `upload-make-lambda-response.test.js` |
| E1, E2, E4 | Streak blocks + XP skip | fixture suite |
| F1–F3 | Milestone crossings + idempotency | `066-milestone-crossing-harness.test.js` + fixture suite |
| G1, G2, G4 | Perfect Week eligibility / unlock key | fixture suite |
| H1–H3 | Gate evaluate / blocked ladder | fixture suite |
| I2, I4 | WAS idempotency shape / week order | fixture suite + contracts |
| J3, J4, J5 | Zoom live rerun + recording contracts | fixture suite + `c025-zoom-recording-credit.test.js` |
| K2, K4 | Invalid SHA / blank Duplicate Key | contracts + fixture suite |
| L1, L2 | Cross-cutting Source Key battery | fixture suite |
| M1, M3 | Web unit coverage (not live health) | `cd web && npm test` |

```bash
node tools/airtable/v2_dev_runbook/run_offline_fixture_suite.js
node airtable/automations/shooting-challenge/lib/v2-engine-contracts.test.js
node airtable/automations/shooting-challenge/lib/066-milestone-crossing-harness.test.js
node airtable/automations/shooting-challenge/lib/c025-zoom-recording-credit.test.js
node airtable/automations/shooting-challenge/lib/upload-make-lambda-response.test.js
node airtable/automations/shooting-challenge/lib/script-header-contract.test.js
node tools/validate-v2-release-readiness.js
```

### 3.2 Executable through Airtable API (DEV)

Requires: Mike named DEV authorization + PAT with `data.records:read/write` on **DEV only** + `BASE_ID=appTetnuCZlCZdTCT`.

| IDs | API-shaped work |
|---|---|
| A3, B1, B4 | Create/read Fillout-shaped submissions; query XP / Duplicate Status |
| I1 | Confirm one WAS per enrollment+week |
| D6, D7, K1 | Asset field writeback verification (still prefer Make path for upload) |
| M2 | `/shoot/api/airtable` health when web env points at authorized base |

**This cloud agent session:** no `AIRTABLE_TOKEN` / `.env` present → all `airtable_api` rows are **Blocked** for live execution.

Safe dry check:

```bash
node tools/airtable/v2_dev_runbook/print_live_plan.js --mode airtable_api --check-credentials
```

### 3.3 Requires Airtable UI

| IDs | Why UI |
|---|---|
| A1, A2 | Registrant/athlete/band flows + visual confirm |
| A3, B1–B5, C1–C6, D1–D5 | C-020 **Run Test?** / coach review / automation run history |
| E3, E5, F1–F4, G3, G5, H4 | Occurrence Ready flags, 066 sandbox, WAS links, recalc |
| I3, I5, J1–J5, K3 | Views, triggers, Zoom attendance UI, broken WAS rows |
| L1, L2 | Manual reruns with count snapshots |

### 3.4 Requires Make.com (DEV scenarios only)

| IDs | Notes |
|---|---|
| C7 | 070a DEV-only when scheduled |
| D6, D8, K1 | 070b/070c upload + malformed writeback |
| I6, L3 | Weekly/email webhook resilience |
| J6 | 117b approval email webhook |

### 3.5 Requires email evidence

| IDs | Evidence |
|---|---|
| I6, L3 | Make history + trigger checkbox state after 5xx |
| J6 | Approval email once after Satisfactory |
| (related) 071/073 paths | Parent email automations — isolation required |

### 3.6 Requires Mike approval

All live DEV UI/API/Make/email rows carry `mike_approval`. Additionally:

| Gate | Before |
|---|---|
| Named DEV check | Any API write or automation ON/OFF change |
| Email send | I6 / J6 / L3 |
| 070a DEV experiment | C7 |
| 117a/117b DEV install | J4–J6 live |
| Any PROD smoke | After DEV smoke green — see [V2_LAUNCH_SMOKE_TESTS.md](./V2_LAUNCH_SMOKE_TESTS.md) |

---

## 4. Global DEV setup (once per session)

1. Confirm base ID `appTetnuCZlCZdTCT`.
2. Confirm Mike authorized the named DEV block (e.g. “F1–F3 066” or “launch smoke”).
3. Confirm webhook isolation ([../development-base-setup.md](../development-base-setup.md) Step 3) — no PROD Make URLs.
4. Confirm send email automations OFF unless the test is explicitly I6/J6/L3 with isolated inbox.
5. Pick test enrollment(s); record IDs in evidence file (replace `REPLACE_AFTER_OMNI_EXPORT` in fixtures).
6. Prefer C-020 Testing Scenarios (`tblEQLsXTCwx0iOd8`) for intake.
7. Snapshot pre-counts: XP Events by Source Key, unlocks, WAS rows for that enrollment+week.
8. Copy [evidence/_TEMPLATE-dev-test-evidence.md](./evidence/_TEMPLATE-dev-test-evidence.md) to `docs/v2/evidence/YYYY-MM-DD-{ID}-{enrollmentId}.md`.

### Global cleanup (end of session)

1. Uncheck all `Run Test?` / build / send / Create XP triggers used.
2. Leave 070a / 117a / 117b in the ON/OFF state Mike specifies (default: leave experimental automations OFF after smoke).
3. Do **not** delete config/reference tables (Milestones, Levels, Weeks, XP Rules).
4. Soft-void only true duplicate XP/unlocks Mike confirms.
5. File evidence even for Blocked runs (credential/UI missing).

### Global rollback

| Incident | Action |
|---|---|
| Wrong base (PROD) | **STOP immediately**; no further scripts; escalate to Mike |
| Email escaped isolation | Disable send automations; document recipients; Mike decides outreach |
| Duplicate XP/unlocks | Mark `Duplicate - Remove` / soft-void; fix automation; do not mass-delete |
| Schema edited without auth | Stop; document; Mike/OMNI decides revert |

---

## 5. Domain fixtures — setup, cleanup, rollback

Fixtures live under `tools/airtable/v2_dev_runbook/fixtures/`. Each JSON includes `pre_test_state`, `records_to_create_shape` / synthetic inputs, `automation_expected`, `expected_output`, `cleanup`, `rollback`, `evidence_location`.

| Domain | Fixture | Matrix IDs | Offline builder coverage |
|---|---|---|---|
| Enrollment / intake | `enrollment.json` | A1–A3 | Source enrollment id + evidence shell |
| Submission XP | `submission_xp.json` | B1–B3, B5 | `SUBMISSION_XP\|…` + decideXpEventAction |
| Homework | `homework_completion.json` | C1–C6 | `HOMEWORK_XP\|…` + link_existing |
| Video feedback | `video_feedback.json` | D1–D5 | `VIDEO_SUBMISSION\|…` + steal-guard |
| Zoom attendance | `zoom_attendance.json` | J1–J3 | `ZOOM_ATTEND_BASE\|…` |
| Zoom recording | `zoom_recording.json` | J4–J6 | `ZOOM_RECORDING\|…` |
| Streaks | `streaks.json` | E1–E5 | buildStreakBlocks |
| Milestones | `milestones.json` | F1–F4 | detectShotMilestoneCrossings |
| Perfect Week | `perfect_week.json` | G1–G5, K3 | evaluatePerfectWeekEligibility |
| Weekly summary | `weekly_summary.json` | I1–I6, L3 | week order helpers |
| Levels / gates | `levels_gates.json` | H1–H4 | evaluateGate |
| Asset reuse | `asset_reuse.json` | C7, D6–D8, K1–K2 | SHA validation |
| Duplicate prevention | `duplicate_prevention.json` | A4, B4, K4, L1–L2 | blank key + Source Key battery |

### 5.1 Per-live-test recording checklist (required)

For **every** live DEV test, fill all of:

1. **Pre-test state** — enrollment ID, shot totals, existing Source Keys, automation ON/OFF  
2. **Records created** — table + record IDs  
3. **Automation expected** — number + version from inventory  
4. **Expected output** — Source Keys, counts, `statusOut`/`actionOut`  
5. **Actual output** — paste only real outputs  
6. **Cleanup** — triggers cleared / rows retained  
7. **Rollback** — what was undone or left for Mike  
8. **Evidence location** — path under `docs/v2/evidence/`

---

## 6. Exact live DEV procedures by domain

Procedures below are for Mike/OMNI (or a Mike-authorized agent with DEV PAT). Agents without credentials stop after offline + plan print.

### 6.1 Enrollment / intake (A1–A3)

**Setup**

1. Open DEV Testing Scenarios; link Schmidt/sandbox enrollment.  
2. Scenario Type **Daily Submission**; set Submission Date + Shot Total.  
3. Snapshot: enrollment Athlete link, Grade Band, existing Submissions today.  
4. Check **Run Test?** (115) **or** create verified Fillout-shaped Submission.

**Expected**

- A1: Athlete linked; band assigned.  
- A2: Band updates once after grade change (separate UI edit).  
- A3: Submission has Enrollment + Week; Denver activity date key correct.

**Cleanup / rollback**

- Uncheck Run Test?.  
- Revert test grade if A2 changed it.  
- Keep Submission if chaining B/F tests.

### 6.2 Submission XP (B1–B5)

**Setup**

1. Start from A3 success (counted submission).  
2. Pre-count XP Events where Source Key = `SUBMISSION_XP|{submissionId}`.  
3. Ensure 010 ON.

**Expected**

- B1: count becomes 1.  
- B2: rerun 010 → still 1 (`skip_existing` / repair).  
- B3: second same-day counted log does not create second shooting XP for that day rule.  
- B4: Duplicate Key collision → Needs Review.  
- B5: backdated activity uses normalized Denver key for Week + XP.

**Cleanup / rollback**

- Retain Event for L1. Soft-void only true duplicates.

### 6.3 Homework (C1–C6)

**Setup**

1. C-020 Homework scenario **or** homework attachment path (009/020).  
2. For C3/C4 set Satisfactory? false/true before 065.  
3. Pre-count `HOMEWORK_XP|{completionId}`.

**Expected**

- One completion (C1); link existing on rerun (C2).  
- No XP if unsatisfactory (C3); one XP if satisfactory (C4); skip on rerun (C5).

**Cleanup**

- Clear review triggers; keep completion for Perfect Week if needed.

### 6.4 Video feedback (D1–D5)

**Setup**

1. Video upload path → 013/112 Feedback row.  
2. D3: Ready for XP Automation? checked; 114 ON.  
3. D4: link XP that belongs to another VF (steal-guard).

**Expected**

- `VIDEO_SUBMISSION|{vfId}` once; steal-guard errors; rerun repairs same Event.

### 6.5 Streaks (E1–E5)

**Setup**

1. Create three contiguous counted days (E1) or intentional gap (E2) via C-020 dates.  
2. Run 053/055; for E3 set occurrence Ready for XP → 054.

**Expected**

- One contiguous block vs two gap blocks (offline proves logic; live proves occurrence rows).  
- `STREAK_XP|enr|ach|endDate` once; rerun no duplicate.

### 6.6 Milestones (F1–F4) — recommended first live block

**Setup**

1. Enrollment cumulative shots below threshold (e.g. 90).  
2. Pipeline-ready counted submissions to cross 100 (F1) or 100+250 (F2).  
3. 066 ON; pre-list existing `SHOT_MILESTONE|…` keys.

**Expected**

- F1: one new unlock.  
- F2: one unlock per newly crossed milestone.  
- F3: rerun adds zero.  
- F4: 059 awards one XP per unlock key.

**Cleanup**

- Do not delete Milestone config. Retain unlocks for F3 evidence.

### 6.7 Perfect Week (G1–G5)

**Setup**

1. WAS for enrollment+week.  
2. Required daily dates complete (+ homework; video/zoom if Config).  
3. 057 then 058.

**Expected**

- G1 eligible / G2 missing day listed.  
- G3 unlock `PERFECT_WEEK|enr|week` once; G4 rerun none; G5 XP via 059.

### 6.8 Levels and gates (H1–H4)

**Setup**

1. Place enrollment Lifetime XP across next level.  
2. H2: leave homework/videos below gate.  
3. Run 041→042.

**Expected**

- H1 Assigned without gate.  
- H2 Gate Blocked.  
- H3 advances after meeting stats.  
- H4 Recalc Needed cleared.

### 6.9 Weekly summary + email (I1–I6, L3)

**Setup**

1. Counted submission → 031 WAS.  
2. I5: build flag only (send OFF).  
3. I6/L3: DEV Make webhook only; isolated inbox.

**Expected**

- One WAS; package builds; send once; **trigger remains checked on webhook failure**.

### 6.10 Zoom attendance + recording (J1–J6)

**Setup**

1. J1–J3: meeting + attendance → 101.  
2. J4–J5: C-025 DEV install complete; Satisfactory homework completion with Zoom Meeting; **no live base XP** for conflict path.  
3. J6: 117b + DEV webhook + email evidence.

**Expected**

- Live `ZOOM_ATTEND_BASE|meeting|enr` once.  
- Recording `ZOOM_RECORDING|meeting|enr` once; rerun `skipped_already_awarded`.  
- Approval email once (J6).

### 6.11 Asset reuse / upload validation (C7, D6–D8, K1–K2)

**Setup**

1. Use C-023 DEV asset fixtures when available.  
2. Valid vs invalid SHA-256 writebacks.  
3. C7 only if Mike schedules 070a DEV.

**Expected**

- Valid verify pass; invalid fail closed; reuse applied once; triggers not cleared on failure incorrectly.

### 6.12 Duplicate prevention battery (L1–L2)

**Setup**

1. After B1, C4, D3, E3, J1, G3, F1 have Events/unlocks.  
2. Snapshot counts by Source Key.  
3. Rerun listed automations.

**Expected**

- Event/unlock counts unchanged.

---

## 7. Reusable scripts (safe)

| Script | Writes? | Purpose |
|---|---|---|
| `cli.js` | Only with `--dev-confirm --execute` on DEV | Operator runner + evidence + owned cleanup |
| `cli.test.js` | No | Safety tests (PROD refusal, dry-run, ownership) |
| `run_offline_fixture_suite.js` | No | Validate fixtures, keys, decisions |
| `print_live_plan.js` | No | Mode filter + smoke list + credential presence |
| `fixture_builders.js` | No | Shared Source Key + evidence helpers |
| Existing C-023/C-013 DEV tools under `tools/airtable/` | Yes when explicitly run | Asset reuse / upload proofs — use only with Mike DEV auth |

Without both `--dev-confirm` and `--execute`, the CLI performs **no** Airtable writes.

---

## 8. Recommended live DEV order

1. Offline suite green (this package).  
2. A3 intake (C-020).  
3. B1 → B2 submission XP.  
4. F1 → F3 milestones (066).  
5. C4 homework XP (if coach review available).  
6. D3 video XP.  
7. J1 live Zoom; J4–J5 recording if C-025 installed.  
8. G3 Perfect Week unlock.  
9. H2 gate blocked.  
10. L1/L2 idempotency battery.  
11. I5 package build (send OFF).  
12. Make/email tests last (I6/J6/L3) with isolation.

Launch smoke subset details: [V2_LAUNCH_SMOKE_TESTS.md](./V2_LAUNCH_SMOKE_TESTS.md).

---

## 9. Credentials / access needed (exact)

| Need | Who | What |
|---|---|---|
| Airtable DEV UI | Mike / OMNI | Login to DEV base; confirm URL base ID |
| Airtable PAT | Mike | Token with DEV base scopes; place in `tools/airtable/.env` as `AIRTABLE_TOKEN` + `BASE_ID=appTetnuCZlCZdTCT` |
| Named DEV authorization | Mike | Explicit ok for the block being run |
| Make DEV | Mike | DEV scenarios + webhook URLs for 070*/074/117b |
| Email evidence | Mike | Isolated inbox or Make execution history |
| Web health M2 | Mike / env | `AIRTABLE_API_TOKEN` in `web/.env.local` pointing at authorized base |

**This session (Worker B cloud):** PAT absent · UI absent · Make absent · email absent → live rows Blocked; offline executable.

---

## 10. Sign-off

| Wave | Operator | Date | Result | Evidence folder |
|---|---|---|---|---|
| Offline fixture suite | | | | n/a (console) |
| DEV launch smoke | | | | `docs/v2/evidence/` |
| DEV full matrix | | | | `docs/v2/evidence/` |
| PROD smoke | | | **Mike only after DEV smoke** | separate packet |

Companion release docs: [../V2_RELEASE_CHECKLIST.md](../V2_RELEASE_CHECKLIST.md) · [../deploy-checklists/DEV-release-readiness-verification-2026-07-16.md](../deploy-checklists/DEV-release-readiness-verification-2026-07-16.md).
