# V2 Release Checklist — Shooting Challenge

**Status:** Active release-readiness runbook  
**Last updated:** 2026-07-16  
**Repo:** `Schmidt127/127-si-shooting-challenge`  
**Environments:** DEV `appTetnuCZlCZdTCT` · PROD `appn84sqPw03zEbTT`  
**Hard rules:** DEV first · no unattended PROD paste · Mike approves PROD · no Vercel setting changes from agents · do not merge without Mike

**Offline suite (2026-07-16):** Validator + C-025/066/header/engine/upload/web lint·typecheck·test·build **PASS** — see [DEV-release-readiness-verification-2026-07-16.md](./deploy-checklists/DEV-release-readiness-verification-2026-07-16.md). Live DEV install **not** performed. Merge gate **closed** 2026-07-16 (#25/#26/#27 on `master`); OA2 package reconciled after merges.

**Companion docs:**

| Doc | Role |
|-----|------|
| [AUTOMATION_VERSION_INVENTORY.md](./AUTOMATION_VERSION_INVENTORY.md) | Script versions, triggers, DEV/PROD status |
| [V2_END_TO_END_TEST_MATRIX.md](./V2_END_TO_END_TEST_MATRIX.md) | Athlete-scenario launch matrix |
| [known-issues.md](./known-issues.md) | Active gaps and accepted exceptions |
| [deploy-checklists/_PROMOTION-STEPS-TEMPLATE.md](./deploy-checklists/_PROMOTION-STEPS-TEMPLATE.md) | Per-change promotion template |
| [deploy-checklists/PROD-promotion-rollback-index-stage10.md](./deploy-checklists/PROD-promotion-rollback-index-stage10.md) | Track-level promotion/rollback index (if present from overnight S10) |
| [deploy-checklists/DEV-release-readiness-verification-2026-07-16.md](./deploy-checklists/DEV-release-readiness-verification-2026-07-16.md) | Online Agent 2 DEV verification package |
| [v2/08-testing-standards.md](./v2/08-testing-standards.md) | Audit-first testing standards |
| [PROJECT_STATE.md](./PROJECT_STATE.md) | Live base IDs and milestone snapshot |
| [v2/ZOOM_RECORDING_CREDIT_DEV_INSTALL.md](./v2/ZOOM_RECORDING_CREDIT_DEV_INSTALL.md) | C-025 / 117a–117b DEV install packet |
| [v2/AUTOMATION_070A_LAUNCH_DECISION.md](./v2/AUTOMATION_070A_LAUNCH_DECISION.md) | 070a PROD keep-OFF decision |
| [deploy-checklists/066-dev-omni-confirmation-packet.md](./deploy-checklists/066-dev-omni-confirmation-packet.md) | 066 OMNI confirmation support |

**Safe repo validation (no secrets / no Airtable):**

```bash
node tools/validate-v2-release-readiness.js
cd web && npm run lint && npm run typecheck && npm test && npm run build
node airtable/automations/shooting-challenge/lib/v2-engine-contracts.test.js
node airtable/automations/shooting-challenge/lib/c025-zoom-recording-credit.test.js
node airtable/automations/shooting-challenge/lib/066-milestone-crossing-harness.test.js
node airtable/automations/shooting-challenge/lib/script-header-contract.test.js
node airtable/automations/shooting-challenge/lib/upload-make-lambda-response.test.js
python3 -m unittest tools.airtable.tests.test_c025_recording_watch_contract
```

---

## 1. Pre-promotion checks

- [ ] Working tree on an approved feature branch; intended commit SHA recorded
- [ ] `docs/PROJECT_STATE.md` base IDs still match DEV/PROD above
- [ ] No secrets committed (`.env`, PATs, webhook URLs with tokens)
- [ ] Frontend styling PRs from other agents reviewed for conflict (do not restyle here)
- [ ] Backlog items being promoted have Phase 2 approval + promotion docs under `docs/deploy-checklists/`
- [ ] [known-issues.md](./known-issues.md) launch blockers reviewed (accept, fix, or defer with owner)
- [x] Repository validation script **PASS** (includes 009 SCRIPT metadata + 117a/117b presence) — 2026-07-16 offline
- [x] C-025 DEV install packet reviewed if recording credit in scope — reviewed; live install still open
- [x] 070a PROD remains OFF unless Mike-approved decision flips — decision record affirmed 2026-07-16
- [ ] 066 OMNI confirmation packet followed if milestones in scope (do not mark live-complete without evidence) — offline PASS; **live pending**
- [x] Web lint / typecheck / tests / production build **PASS** — 2026-07-16
- [x] Engine / C-025 / 066 harness / header / upload Node tests **PASS** — 2026-07-16

---

## 2. DEV test requirements

Run on DEV only (`appTetnuCZlCZdTCT`) with Schmidt / named test enrollments.

| Area | Required DEV proof | Done |
|------|--------------------|------|
| Fillout-shaped intake | C-020 / **115** or verified Fillout-shaped Submission | [ ] |
| Daily submission → XP | Counted submission creates `SUBMISSION_XP\|{id}` once; rerun skips | [ ] |
| Homework path | Asset → **020** completion; no duplicate completion on rerun | [ ] |
| Homework XP | Coach review → **064/065**; `HOMEWORK_XP\|{id}` idempotent | [ ] |
| Video path | Feedback → **114**; steal-guard on wrong Source Key | [ ] |
| Shot milestones | **066** crosses threshold once per `SHOT_MILESTONE\|…` | [ ] |
| Streaks | **053/054** unlock + XP; rerun repairs, does not duplicate | [ ] |
| Perfect Week | **057/058** eligibility + `PERFECT_WEEK\|…` unlock | [ ] |
| Level gates | **042** Gate Blocked when XP ok / gate fail | [ ] |
| Weekly summary | **031–034** WAS create + previous-week helpers | [ ] |
| Zoom live attendance | **101** awards live keys only | [ ] |
| Zoom recording credit (C-025) | **117a/117b** repo-ready — [ZOOM_RECORDING_CREDIT_DEV_INSTALL.md](./v2/ZOOM_RECORDING_CREDIT_DEV_INSTALL.md); not live-verified | [ ] |
| Asset upload | **070b/070c** writeback + hash validation (if in scope) | [ ] |
| Audits | Stages A–J / relevant 090 dry-runs clean or documented exceptions | [ ] |

Full scenario rows: [V2_END_TO_END_TEST_MATRIX.md](./V2_END_TO_END_TEST_MATRIX.md).

---

## 3. Airtable field / view verification

- [ ] Schema snapshot exported for DEV (and PROD pre-promote if schema changed)
- [ ] New/changed fields match promotion checklist (type, options, formula text)
- [ ] No accidental writes to formula / rollup / lookup / count fields in scripts
- [ ] Testing views (C-019) filter by Related Enrollment / test enrollments only
- [ ] Public/web views (`OK to Publish` / Softr gate) reviewed if web reads change
- [ ] Level Gate Rules / XP Reward Rules / Achievements / Weeks **Active?** flags correct for season

---

## 4. Automation version verification

Use [AUTOMATION_VERSION_INVENTORY.md](./AUTOMATION_VERSION_INVENTORY.md).

For each automation in the promotion set:

- [ ] GitHub script `#` / name / version / version date match intended release
- [ ] Airtable DEV automation script paste matches GitHub (skip GitHub-only header)
- [ ] Airtable PROD version recorded (or explicitly **UNKNOWN** until verified in UI)
- [ ] No duplicate automation numbers in repo (`validate-v2-release-readiness.js`)

---

## 5. Trigger and input-variable verification

For each automation in the promotion set (confirm in Airtable UI — many GitHub headers still say *confirm in Airtable*):

- [ ] Trigger table + type (record created / matches conditions / enters view / scheduled)
- [ ] Conditions / view filters match docblock intent
- [ ] Input variables present (almost always `recordId`)
- [ ] Output variables present where required: `statusOut`, `errorOut`, `debugStep`, `actionOut` (V2 standard scripts)
- [ ] Idle / dangerous automations left **OFF** until smoke window

---

## 6. Make.com verification

- [ ] Correct environment scenario (DEV vs PROD) — no DEV webhook pointed at PROD
- [ ] Upload / email scenarios match GitHub blueprints under `make/` when changed
- [ ] Webhook URLs stored only in secrets managers / Airtable input config — not in git
- [ ] Failed webhook does not clear send triggers incorrectly (070 / 074 patterns)
- [ ] C-013 video upload path: Lambda Function URL + Make handoff still healthy if in scope

---

## 7. Email verification

- [ ] Welcome / daily / weekly / homework feedback / video feedback packages build in DEV
- [ ] Parent-facing copy reviewed (ChatGPT / Mike) before PROD send enable
- [ ] Send triggers remain unchecked until package content verified
- [ ] No mass-send from test enrollments

---

## 8. PROD promotion order

Execute **in order**. Stop on first failure.

1. **Freeze window** — announce; pause non-essential PROD edits
2. **Schema** (if any) — plain fields → links → rollups/lookups → formulas → views → interfaces
3. **Configuration data** — Levels, gates, XP rules, achievements, weeks (season values)
4. **Automations** — paste GitHub scripts to PROD (skip GitHub header); keep OFF until smoke
5. **Make / Lambda** — only if this release includes them; redeploy prior version IDs noted for rollback
6. **Web** — Vercel deploy from approved `master` commit only after Mike approval (agents do not deploy)
7. **Enable automations** — smallest blast radius first (intake → XP → achievements → email)
8. **CHANGELOG.md** — production-impacting entries under Airtable / Web / Make
9. **Inventory update** — mark DEV/PROD status + test evidence in automation inventory

Per-item template: [deploy-checklists/_PROMOTION-STEPS-TEMPLATE.md](./deploy-checklists/_PROMOTION-STEPS-TEMPLATE.md).

---

## 9. Production smoke tests

Use Schmidt / isolated fixture enrollment only.

| Smoke | Expected | Done |
|-------|----------|------|
| Health | `/shoot/api/airtable` tokenValid true (if web in scope) | [ ] |
| Daily submission | One counted day → one submission XP Event | [ ] |
| Rerun same source | Second run skips / repairs — no second XP Event | [ ] |
| Homework | Completion linked; XP only after satisfactory review | [ ] |
| Video | Feedback XP with `VIDEO_SUBMISSION\|{id}` | [ ] |
| Milestone / streak / Perfect Week | Unlock + XP Source Keys unique | [ ] |
| Level gate | Gate Blocked vs Assigned matches enrollment stats | [ ] |
| Weekly summary | WAS row + email package dry-run (send OFF) | [ ] |
| Zoom live | Attendance XP keys only (`ZOOM_ATTEND_*`) | [ ] |
| Zoom recording (if in scope) | **117a** `ZOOM_RECORDING\|…` once; exclusivity vs live; **117b** email only after Satisfactory | [ ] |
| Upload (if in scope) | 070b/070c writeback fields + hash | [ ] |
| Audit dry-run | No new unexpected integrity failures | [ ] |

Detailed athlete matrix: [V2_END_TO_END_TEST_MATRIX.md](./V2_END_TO_END_TEST_MATRIX.md).

---

## 10. Rollback procedure

| Failure | Immediate action | Rollback |
|---------|------------------|----------|
| Bad automation paste | Turn automation **OFF** | Re-paste previous known-good GitHub SHA; re-smoke |
| Duplicate / stolen XP | Disable awarding automation | Audit by Source Key; repair with idempotent tools; do not mass-delete blindly |
| Bad Make / Lambda | Keep Airtable send triggers OFF | Redeploy prior Lambda version / Make scenario |
| Bad schema / formula | Disable dependent automations first | Restore prior formula/options; avoid hasty field deletes |
| Bad web deploy | Mike-approved Vercel rollback to prior deployment | Confirm `basePath=/shoot` and env names unchanged |
| Email misfire | Disable send automations / Make scenarios | Document affected recipients; do not rotate secrets without Mike |

**Never as rollback:** `git reset --hard`, force-push, secret rotation without Mike, or Production schema deletes as a shortcut.

Broader ops: [recovery/emergency-recovery.md](./recovery/emergency-recovery.md).

---

## 11. Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| DEV test operator | | | Pass / Fail |
| Automation inventory verified | | | Pass / Fail / Partial |
| Make / email verified | | | Pass / Fail / N/A |
| PROD smoke verified | | | Pass / Fail |
| **Mike — PROD promote approved** | | | Approved / Hold |
| **Mike — release closed** | | | Closed / Rolled back |

**Release commit SHA:** _______________________  
**PROD smoke notes:** _______________________  
**Deferred blockers:** link to [known-issues.md](./known-issues.md)
