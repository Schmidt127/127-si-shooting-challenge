# Production-readiness inventory — 2026-08-23

**Repository:** `Schmidt127/127-si-shooting-challenge`  
**Audit branch:** `cursor/production-readiness-cleanup-1079` (from `cursor/perfect-week-testing-repair-e251`)  
**Base comparison:** `master` @ `1a910cae` → cleanup branch  
**Operator:** Cursor Cloud Agent  
**Airtable:** Production-only (`appn84sqPw03zEbTT`); DEV base retired 2026-08-19 — no live Airtable writes in this audit

---

## 1. Git state

| Check | Result |
|-------|--------|
| Default branch | `master` |
| Pre-cleanup `master` tip | `1a910cae` — Fix XP activity table dates and reconciliation |
| Source feature branch | `cursor/perfect-week-testing-repair-e251` @ `82f029df` (PR #243 merged partially; branch ahead of master) |
| Related merged PRs | #241 XP enrollment filter, #242 XP activity integrity, #243 Perfect Week Testing repair |
| Working tree | Clean at audit start |

### Commits on feature branch not yet on `master` (pre-merge)

- `e8607b82` — Fix XP activity dates, reconciliation, missing-submission reporting
- `5d018083` — Repair Perfect Week Testing XP: backfill submissions and milestones
- `78ac035a` — Web: full XP ledger on public profile with pagination and date fixes
- `b0f2a481` — Fix CHANGELOG structure and athlete profile test assertion
- `78c432cc` — Align contract tests with current automation script versions
- `82f029df` — Restore V2 DEV runbook artifacts and fix challenge-year contract test

---

## 2. Pull request map (requested themes)

| Theme | PR | State | Branch |
|-------|-----|-------|--------|
| XP activity ledger | #241, #242, #243 | Merged (ledger code on feature branch; master partial) | `cursor/xp-activity-*`, `cursor/perfect-week-testing-repair-e251` |
| Perfect Week Testing repair | #243 | Merged to branch; pending master merge | `cursor/perfect-week-testing-repair-e251` |
| Athlete profile activity | #242, #243 | Same | `cursor/xp-activity-integrity-fix-e251` |
| Date normalization | #216, fix/005-010-date-only-midnight-utc | Merged earlier | — |
| Production-only migration | #228 | Merged 2026-08-19 | `qa/full-system-audit-2026-08-19` |
| Automation contract updates | #236 | Merged 2026-08-21 | `cursor/final-production-version-reconciliation` |
| Documentation restoration | #228, #236, feature branch DEV runbook restore | In progress | This cleanup |

---

## 3. Authoritative automation versions (GitHub SCRIPT headers)

Verified from `airtable/automations/shooting-challenge/*.js` on cleanup branch:

| # | GitHub version | Notes |
|---|----------------|-------|
| 001 | v5.1 | Enrollment intake |
| 005 | v5.5 | PHA slot normalize |
| 009 | v1.2 | Submission Assets |
| 010 | **v10.12** | Formula/link settlement grace |
| 057 | **v1.9** | Perfect Week goal settlement (season lookup) |
| 064 | v12.2 | Homework XP prepare |
| 065 | v10.2 | Homework XP create |
| 072 | **v4.2** | Weekly summary email package |
| 074 | **v3.1** | Weekly summary Hub handoff |
| 075 | v3.0 | Welcome email |
| 078 | Native Airtable automation | Not a script file |
| 070a | Retired/off by design | Launch decision doc |
| 012 | Deleted/retired | — |
| 063 | Retired/hard stop | — |

Production paste status for **010 v10.12** and **057 v1.9** may lag GitHub — verify in Automations UI before claiming live.

---

## 4. Stale reference scan

| Pattern | Active-doc hits | Disposition |
|---------|-----------------|-------------|
| DEV base `appTetnuCZlCZdTCT` | `CURRENT-TRUTH.md`, `PROJECT_STATE.md`, `AUTOMATION_VERSION_INVENTORY.md` | Update active sections to production-only; retain historical banners on DEV install docs |
| DEV-first workflow | `PROJECT_STATE.md` § V2-015 | Mark retired; point to production-only |
| Retired 077 Make email | Documented as deleted — OK | No change |
| Retired 063/012 | Hard-stop in inventory — OK | No change |
| 057 v1.7 in CURRENT-TRUTH | Stale vs GitHub v1.9 | Update |
| 010 v10.11 in CURRENT-TRUTH | Stale vs GitHub v10.12 | Update with paste-pending note |

Historical DEV documents restored on feature branch (`docs/v2/V2_DEV_EXECUTION_RUNBOOK.md`, `docs/v2/C009_*`, `066-dev-omni-confirmation-packet.md`, etc.) carry **Historical — read-only (DEV base retired 2026-08-19)** banners — required by `tools/validate-v2-release-readiness.js`.

---

## 5. Duplicate / obsolete file review

| Item | Verdict |
|------|---------|
| `docs/SHOOTING_CHALLENGE_PROD_OPERATING_MODE.md` | Keep — historical banner present |
| `tools/airtable/v2_dev_runbook/` | Keep — offline fixtures for contract tests |
| `tools/testing/repair_perfect_week_testing.mjs` | Keep — authorized repair script + evidence |
| `web/scripts/full-xp-reconciliation.mjs` | Keep — operator reconciliation tool |
| Nested clone `127-si-shooting-challenge/` | Gitignored — not source of truth |

No files removed in this pass.

---

## 6. XP bucket confirmation (repository contracts)

| Bucket | Source Key pattern | Activity date source |
|--------|-------------------|---------------------|
| Submission Base | `SUBMISSION_XP\|{submissionId}` | Submission → Activity Date |
| Homework Completion | `HOMEWORK_XP\|{hcId}` | Homework submission date |
| Video Feedback | `VIDEO_SUBMISSION\|{vfId}` | Video Activity Date |
| Zoom Attendance | `ZOOM_ATTEND_BASE\|{meetingId}\|{enrollmentId}` | Zoom date |
| Streak | Streak End Date keyed | Streak End Date |
| Weekly Threshold | Award date | Award date |
| Manual Bonus | Rule-specific | Per automation |
| Shot Milestone | `SHOT_MILESTONE\|{enr}\|{unlockId}` | Latest counted submission date |
| Perfect Week | `PERFECT_WEEK\|{enr}\|{weekId}` | Saturday / week-end date |

Web loader (`web/lib/data/xp-activity-loader.ts`) uses **Enrollment Record ID** filter (not ARRAYJOIN), excludes inactive and Duplicate - Remove, dedupes by Source Key.

---

## 7. Perfect Week Testing enrollment (read-only contract)

**Enrollment:** `rec93mAfo5jKqP3g5`

Expected post-repair state (from `tools/testing/repair_perfect_week_testing.mjs` + CHANGELOG):

| Check | Expected |
|-------|----------|
| Active XP Events in ledger | 39 |
| Repaired Submission Base XP | 5 (`SUBMISSION_XP\|{id}`) |
| Shot milestone XP | 5 (from Pending unlocks) |
| Duplicate XP Event IDs | None |
| Activity Dates | Unchanged by repair |
| Homework/video XP | Skipped (not review-eligible) |
| 2026-08-23 submission date | Remains 2026-08-23 |

Live verification requires `AIRTABLE_API_TOKEN` — not available in Cloud Agent VM. Operator: run `node web/scripts/full-xp-reconciliation.mjs rec93mAfo5jKqP3g5` with Production credentials.

---

## 8. Validation results (cleanup branch)

| Command | Result |
|---------|--------|
| `node tools/testing/run-agent4-suite.js` | **29/29 PASS** |
| `node tools/validate-v2-release-readiness.js` | **PASS** |
| `python3 -m unittest discover -s tools/airtable/tests` | **147 PASS** |
| `python3 -m unittest discover -s lambda/upload-asset/tests` | **139 PASS** |
| `node tools/testing/audit-source-of-truth.mjs` | PASS (after Completion Master update) |
| `cd web && npm test` | **260 PASS** |
| `cd web && npm run typecheck` | PASS |
| `cd web && npm run lint` | PASS |
| `cd web && npm run build` | PASS |

---

## 9. Deployment targets

| Item | Value |
|------|--------|
| Vercel project | `127-si-shooting-challenge` |
| Root directory | `web/` |
| Production branch | `master` |
| Public URL | https://www.fairfieldbasketballclub.com/shoot |
| Required env vars (names only) | `AIRTABLE_API_TOKEN`, `AIRTABLE_BASE_ID`, `NEXT_PUBLIC_BASE_PATH`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_LANDING_URL` |

---

## 10. Actions taken in this cleanup

1. Merge feature-branch XP ledger + Perfect Week repair + DEV runbook fixtures onto `master`.
2. Update `CURRENT-TRUTH.md`, `PROJECT_STATE.md`, `AUTOMATION_VERSION_INVENTORY.md` for production-only operation.
3. Add Completion Master traceability entry.
4. Refresh `CONTROL.json` canonical SHA after merge.

No Airtable production data modified. No automation script logic changed for test convenience.
