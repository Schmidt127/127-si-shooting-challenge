# SC-152 / SC-153 live verification — 2026-09-04

**Base:** Production `appn84sqPw03zEbTT`  
**Repo tip at verify start:** `9f0c2512`  
**Fixture:** Disposable Schmidt Athlete1 Weekly Athlete Summary for Week 9 (created then deleted). No real-family records.

## Live configuration attestation

### 057 (`wflVRPhgunsosFjWS`)

| Check | Result |
|-------|--------|
| Name | 057 - Achievements and Milestones - Calculate Perfect Week Eligibility |
| deploymentStatus | deployed |
| Script Version | **2.4** |
| Trigger | `recordMatchesConditions` · Weekly Athlete Summary · Queue?=1 only |
| recordId | trigger.id |
| GitHub compare | Functionally matches tip **2.4**; sync banner only differs harmlessly |

### 058 (`wflDinFz6FBIGEOMg`)

| Check | Result |
|-------|--------|
| Name | 058 - Achievements and Milestones - Create Perfect Week Unlock |
| deploymentStatus | deployed |
| Script Version | **1.6** (live at verify) |
| Trigger | `recordUpdated` |
| Watched fields (9) | Week; Daily Requirement Met?; Video Count; Zoom Meeting Count; Zoom Attendance Count; Homework Requirement Met?; Automation Status; Enrollment; Goal Record |
| Perfect Week Unlock watched? | **No** |
| Positive-only conditions | **Absent** |
| recordId | trigger.id |
| GitHub compare | Live **1.6** matched pre-hotfix GitHub. **v1.7** hotfix required for withdraw (see below). |

## Matrix results

| Case | Result | Notes |
|------|--------|-------|
| A SF-01 Recalc re-entry | **PASS** | Ready + Recalc → Queue 1 → 057 ran → Recalc cleared → Queue 0 |
| B SF-02 withdraw | **FAIL (live 1.6)** | 058 fired on ineligible transition but threw: Coach Note not in unlock QueryResult; unlock stayed Active |
| C SF-02 restore | **PASS** (after operator Active=false) | Same Milestone Source Key restored Active; no second unlock |
| D Award | **PASS** | One unlock; 059 awarded **100** XP; Source Key `PERFECT_WEEK|{enr}|{week}`; XP Source Perfect Week |
| E Idempotency | **PASS** | Re-touch Status Ready → still 1 unlock / 1 XP @ 100 |
| F Reconciliation | **PASS** | Recalc+Error stranded (Queue=1) detectable; 057 cleared Recalc |
| G Status lifecycle | Observed Ready; Eligible 0↔1; Unlock Active↔Inactive (manual for withdraw); Awarded XP status preserved on restore |

## Hotfix required before SC-153 close

**Root cause:** 058 v1.6 `deactivateExactOwnedUnlock` called `getCellValueAsString("Coach Note")` on unlock records queried without Coach Note in `fields`.

**Fix:** GitHub **058 v1.7** — include Coach Note in unlock query + harden getText. Mike must UI-paste v1.7 (API cannot edit customScript), then re-run withdraw only.

## Cleanup

Deleted this verification’s disposable WAS, Unlock, and Perfect Week XP Event. Enrollment / Week / Goal untouched. Season Sim / field cleanup / email / 070a untouched.

## Closure recommendation

| ID | Status |
|----|--------|
| SC-152 | **COMPLETE / Live Tested** |
| SC-153 | **Partial — lifecycle live; withdraw blocked until 058 v1.7 paste + re-attest** |
