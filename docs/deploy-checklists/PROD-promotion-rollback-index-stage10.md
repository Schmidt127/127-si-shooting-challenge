# PROD promotion and rollback index (Stage 10)

**Date:** 2026-07-13  
**Package:** `prod-promotion-rollback-docs`  
**Status:** Documentation only — **no PROD execution**

---

## 1. Purpose

Single entry point for Mike when promoting DEV-proven work to PROD, with rollback for each track.

---

## 2. Ready / blocked promotion tracks

| Track | Repo readiness | PROD status | Promote when |
|-------|----------------|-------------|--------------|
| C-013 video S3 / 070b / 070c | **Done** | PROD proven | Optional hygiene only (secret rotate) |
| C-023 / **116** asset reuse | DEV complete; PROD runtime PASS on fixture | Doc row hygiene pending | After checklist sign-off |
| C-010 two-field enrollment | Repo audit + verify tooling complete | **No field/automation yet** | After DEV OMNI + live scenarios |
| C-019 Testing views | Repo verification complete | DEV views not created | After C-010 + OMNI views |
| C-011 weekly email auto | Design audit complete | Not implemented | After C-010 gates in **072**/**074** |
| 070a homework S3 | DEV E2E historical; re-verify on current SHA | PROD OFF | Keep OFF — [AUTOMATION_070A_LAUNCH_DECISION.md](../v2/AUTOMATION_070A_LAUNCH_DECISION.md) |
| C-025 Zoom recording (**117a/117b**) | **Repo ready** for DEV install | Not installed | After [ZOOM_RECORDING_CREDIT_DEV_INSTALL.md](../v2/ZOOM_RECORDING_CREDIT_DEV_INSTALL.md) + DEV evidence |
| C-009 Learning Activities | Proposal complete | **Blocked Airtable** | After owner schema approval |

### Status distinctions

| State | Tracks above |
|-------|----------------|
| Implemented in repository | C-025 scripts/tests/docs; 009 header; 066 support packet; 070a decision |
| Ready for DEV installation | C-025 packet |
| Verified in DEV | C-013 video; 116 fixture (partial); **not** C-025; **not** 066 OMNI close |
| Ready for PROD promotion | Only Mike-approved tracks with promotion docs |
| Verified in PROD | C-013 video 070b/070c |

---

## 3. Standard promotion sequence (every automation)

1. GitHub script matches intended version.
2. Paste to **DEV** automation (skip GitHub header).
3. Dry-run audit + smoke on Schmidt enrollment.
4. Mike approval recorded.
5. Paste identical script to **PROD**.
6. Smoke on PROD Schmidt fixture.
7. Update `CHANGELOG.md` + deploy checklist with date/SHA.
8. Leave idle automations **OFF** when not needed.

---

## 4. Rollback patterns

| Failure | Rollback |
|---------|----------|
| Bad automation paste | Re-paste previous GitHub SHA; turn automation OFF |
| Bad Make/Lambda deploy | Redeploy prior Lambda version / Make scenario; keep Airtable OFF |
| Bad schema field | Do not delete hastily — disable automation first; restore prior option/formula |
| Double XP observed | Disable XP automation; run audit; repair with Source Key idempotent tools |

**Never:** `git reset --hard`, force-push PROD runbooks, or delete Tutorials/Homework fields as rollback.

---

## 5. Credential / secret gate

Any secret rotation (PAT, webhook secret, Lambda env) requires **explicit Mike authorization** and is **out of scope** for unattended runs. See C-013-SEC history for pattern only.

---

## 6. Documents to open first

| Need | Path |
|------|------|
| C-023 PROD 116 validation | `docs/deploy-checklists/C-023-prod-automation-116-validation-2026-07-11.md` |
| C-013 PROD lambda | `docs/deploy-checklists/C-013-prod-lambda-deployment-2026-07-11.md` |
| C-010 DEV OMNI | `docs/deploy-checklists/C-010-dev-omni-implementation-stage4.md` |
| C-010 post-OMNI verify | `docs/deploy-checklists/C-010-post-omni-dev-verification-stage5.md` |
| Desktop OS control | `docs/overnight-runs/CONTROL.json` |

**Status:** **COMPLETE** (index only)
