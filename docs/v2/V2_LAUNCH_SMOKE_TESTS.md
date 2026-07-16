# V2 Launch Smoke Tests

**Status:** Pre-PROD promotion gate (DEV first)  
**Last updated:** 2026-07-16  
**Parent runbook:** [V2_DEV_EXECUTION_RUNBOOK.md](./V2_DEV_EXECUTION_RUNBOOK.md)  
**Matrix source:** [../V2_END_TO_END_TEST_MATRIX.md](../V2_END_TO_END_TEST_MATRIX.md)  

These are the **only** matrix rows that must be green on **DEV** before asking Mike for PROD promotion smoke. Full matrix remains required for season confidence; this subset is the launch gate.

**Rule:** No Pass without evidence under `docs/v2/evidence/`. Offline PASS does not clear a live smoke row.

---

## 1. Smoke subset (must pass before PROD promotion)

Aligned with matrix sign-off plus C-025 DEV recording readiness.

| Order | ID | Scenario | Modes | Automations | Pass criteria (short) |
|---|---|---|---|---|---|
| 1 | A3 | Submission gets enrollment + week | UI / API / Mike | 023, 005 | Enrollment + Week; Denver date key |
| 2 | B1 | First counted day awards XP | UI / API / Mike | 010 | One `SUBMISSION_XP\|{submissionId}` |
| 3 | B2 | Submission XP rerun | Offline + UI / Mike | 010 | No second Event |
| 4 | C4 | Satisfactory homework XP | UI / Mike | 064/065 | One `HOMEWORK_XP\|{completionId}` |
| 5 | D3 | Posted video feedback XP | UI / Mike | 114 | One `VIDEO_SUBMISSION\|{vfId}` |
| 6 | F1 | Cross single milestone | Offline + UI / Mike | 066 | One `SHOT_MILESTONE\|enr\|ms` |
| 7 | F2 | Cross multiple milestones | Offline + UI / Mike | 066 | One unlock per new threshold |
| 8 | F3 | Milestone rerun | Offline + UI / Mike | 066 | No duplicate unlocks |
| 9 | G3 | Perfect Week unlock | UI / Mike | 058 | One `PERFECT_WEEK\|enr\|week` |
| 10 | H2 | Gate Blocked | Offline + UI / Mike | 042 | Status Gate Blocked; Current stays |
| 11 | J1 | Zoom live attendance XP | UI / Mike | 101 | One `ZOOM_ATTEND_BASE\|meeting\|enr` |
| 12 | J4 | Zoom recording credit | Offline + UI / Mike | **117a** | One `ZOOM_RECORDING\|…`; blocked if live exists |
| 13 | J5 | Recording credit rerun | Offline + UI / Mike | **117a** | `skipped_already_awarded` |
| 14 | L1 | XP Source Key battery | Offline + UI / Mike | 010,065,114,054,101 | Counts unchanged |
| 15 | L2 | Unlock Source Key battery | Offline + UI / Mike | 058,066,059 | Counts unchanged |
| 16 | M1 | `/shoot` loads | Offline / deploy check | — | 200; brand shell |
| 17 | M2 | Airtable health | API / Mike | — | `tokenValid` on `/shoot/api/airtable` |

Machine-readable flags: `launch_smoke: true` in [../../tools/airtable/v2_dev_runbook/matrix-classification.json](../../tools/airtable/v2_dev_runbook/matrix-classification.json).

```bash
node tools/airtable/v2_dev_runbook/cli.js plan --smoke-only
node tools/airtable/v2_dev_runbook/print_live_plan.js --smoke-only
```

### CLI-supported live smoke (first wave)

Safe operator CLI currently implements live dry-run/execute for:

**A3 · B1 · B2 · F1 · F2 · F3**

```bash
node tools/airtable/v2_dev_runbook/cli.js verify-env --dev-confirm
node tools/airtable/v2_dev_runbook/cli.js run-test A3 --dev-confirm --enrollment recYOUR_DEV_ENROLLMENT
# After Mike named DEV auth only:
node tools/airtable/v2_dev_runbook/cli.js run-test A3 --dev-confirm --execute --enrollment recYOUR_DEV_ENROLLMENT --operator Mike
```

Evidence: `docs/v2/evidence/dev-runs/<date>/<test-id>.md`  
Remaining smoke rows (C4, D3, G3, H2, J1, J4–J5, L1–L2, M1–M2) stay UI/API/manual until CLI handlers are added.

---

## 2. Explicitly out of launch smoke (still in full matrix)

Do **not** block PROD promotion wait on these unless Mike expands the gate:

| IDs | Why deferred |
|---|---|
| C7, D6–D8, K1 | Make/Lambda upload paths; 070a PROD OFF |
| I6, J6, L3 | Email/Make send — controlled separately; PROD smoke N for several |
| E* streak deep paths | Covered indirectly via L1 if streak XP present; full E* in full matrix |
| A1–A2, B3–B5, C1–C3, C5–C6, … | Full-matrix confidence, not launch gate |
| M3 | Extra web reads after M1/M2 |

---

## 3. Offline preflight (required before live smoke)

Run from repo root. These clear the offline half of smoke-tagged rows; they do **not** clear live UI/API rows.

```bash
node tools/airtable/v2_dev_runbook/cli.test.js
node tools/airtable/v2_dev_runbook/cli.js run-offline
node tools/airtable/v2_dev_runbook/run_offline_fixture_suite.js
node airtable/automations/shooting-challenge/lib/v2-engine-contracts.test.js
node airtable/automations/shooting-challenge/lib/066-milestone-crossing-harness.test.js
node airtable/automations/shooting-challenge/lib/c025-zoom-recording-credit.test.js
node airtable/automations/shooting-challenge/lib/upload-make-lambda-response.test.js
node airtable/automations/shooting-challenge/lib/script-header-contract.test.js
node tools/validate-v2-release-readiness.js
```

Optional web unit (supports M1 offline confidence; not a substitute for deployed M1/M2):

```bash
cd web && npm test
```

---

## 4. Live DEV smoke sequence (Mike / OMNI)

**Prereqs**

- Base `appTetnuCZlCZdTCT` confirmed  
- Mike named DEV authorization for “V2 launch smoke”  
- Webhook isolation verified  
- Email send automations OFF (smoke subset does not include I6/J6)  
- C-020 available for A3/B1  
- 066 ON in DEV  
- For J4/J5: C-025 schema + 117a installed per [ZOOM_RECORDING_CREDIT_DEV_INSTALL.md](./ZOOM_RECORDING_CREDIT_DEV_INSTALL.md); leave 117b out of this smoke  

**Sequence**

1. **A3** — C-020 Daily Submission on Schmidt/sandbox → Enrollment+Week.  
2. **B1** — Confirm one `SUBMISSION_XP\|…`.  
3. **B2** — Re-run 010 → still one Event.  
4. **F1–F3** — Drive shots across threshold(s); rerun 066.  
5. **C4** — Satisfactory homework → one `HOMEWORK_XP\|…` (coach review).  
6. **D3** — Ready for XP on Video Feedback → one `VIDEO_SUBMISSION\|…`.  
7. **J1** — Live attendance Create XP → one `ZOOM_ATTEND_BASE\|…`.  
8. **J4–J5** — Recording quiz path on **different** meeting than J1 live conflict case as designed; rerun 117a.  
9. **G3** — Eligible week → one Perfect Week unlock.  
10. **H2** — Gate Blocked enrollment state.  
11. **L1–L2** — Rerun battery; counts unchanged.  
12. **M1–M2** — Deployed or local `/shoot` + airtable health with authorized token.

After each step: file evidence using [evidence/_TEMPLATE-dev-test-evidence.md](./evidence/_TEMPLATE-dev-test-evidence.md).

**Cleanup after smoke**

- Uncheck Run Test? / Ready for XP / Create XP triggers.  
- Leave 117a OFF if Mike wants DEV quiet after pass.  
- Soft-void only Mike-approved true duplicates.  
- Do not touch PROD.

---

## 5. PROD smoke (Mike only — after DEV smoke green)

Matrix sign-off subset for PROD (stricter / smaller):

| ID | PROD note |
|---|---|
| B1–B2 | Submission XP create + rerun |
| C4 | Homework XP |
| D3 | Video XP |
| F1 | Single milestone |
| G3 | Perfect Week unlock |
| H2 | Gate Blocked |
| J1 | Zoom live attendance |
| M1–M2 | Public `/shoot` + health |

**PROD smoke excludes by default:** J4–J5–J6 (117a/b not activated), I6, C7, 070a paths.

Do not start PROD smoke from this Worker package. Use [../V2_RELEASE_CHECKLIST.md](../V2_RELEASE_CHECKLIST.md) + Mike approval.

---

## 6. Smoke scorecard

| ID | Offline | Live DEV | Evidence path | Result |
|---|---|---|---|---|
| A3 | n/a | U | | U |
| B1 | partial (keys) | U | | U |
| B2 | U→run suite | U | | U |
| C4 | partial | U | | U |
| D3 | partial | U | | U |
| F1 | U→066 harness | U | | U |
| F2 | U→066 harness | U | | U |
| F3 | U→066 harness | U | | U |
| G3 | partial | U | | U |
| H2 | U→fixture suite | U | | U |
| J1 | partial | U | | U |
| J4 | U→c025 tests | U | | U |
| J5 | U→c025 tests | U | | U |
| L1 | U→fixture suite | U | | U |
| L2 | U→fixture suite | U | | U |
| M1 | web tests / deploy | U | | U |
| M2 | blocked w/o token | U | | U |

Update cells only with dated evidence. Result key: P / F / B / U.

---

## 7. Gate decision

| Check | Required |
|---|---|
| Offline preflight exit 0 | Yes |
| Live DEV smoke rows P with evidence | Yes |
| 070a PROD OFF reconfirmed | Yes |
| 117a/117b PROD still OFF (unless Mike scheduled) | Yes |
| Mike approval for PROD smoke | Yes |

If any live smoke row is **B** (blocked on credentials/UI), promotion waits — do not invent Pass.
