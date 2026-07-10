# C-023 — PROD automation 116 validation (Schmidt Testing fixture)

**Date:** 2026-07-10  
**PROD base ID:** `appn84sqPw03zEbTT`  
**Automation:** 116 — Submission Assets — Apply Asset Reuse Decision Consequences  
**Script version:** 1.0.1  
**Reference commit:** `992677d`  
**Test enrollment:** `recgP9qZYjAhE7NXm` (Schmidt, Testing - 2025-2026)  
**Harness:** `tools/airtable/prod_116_fixture_run.py`

## Phase 1 — Automation configuration

| Check | Result |
|-------|--------|
| Automation 116 exists in PROD | **Not verified via API** — Airtable automations are UI-managed only |
| Trigger: When record updated | Expected per `docs/automation-index.md` |
| Table: Submission Assets | Expected |
| Watched field: Asset Reuse Decision | Expected |
| Action: Run script · input `recordId` | Expected |
| Script matches GitHub v1.0.1 (`992677d`) | **Not verified in Airtable UI** — paste pending prod promotion |
| Automation OFF during fixture build | **Assumed OFF** — forward test produced no field changes |

## Phase 2 — Fixture created

Isolated Video Feedback route under Schmidt Testing only.

| Record | ID | Label / key |
|--------|-----|-------------|
| Submission | `rec9yoDZ3DMIEhi3I` | Week `rec7fCckt1zj9CbmP` · Activity Date 2026-07-10 |
| Submission Asset | `recWZ4cHNYgbV60mL` | Asset Label: **PROD V2 Test - Duplicate Reuse** |
| Video Feedback | `reccXspFIiNIPMPcm` | Video Feedback Key: **PROD-V2-A116-TEST** |
| XP Event | `recYQ10pOoFlApmjZ` | Source Key: **`VIDEO_SUBMISSION|reccXspFIiNIPMPcm`** (script-required; not custom string) |

**Asset fields:** Asset Purpose `Video For Feedback` · Asset Type `Video Feedback` · Asset Slot `VIDEO`  
**XP fields:** XP Source `Video Submission` · XP Bucket `Video Feedback` · 1 XP · Active · Unique · Processed

## Phase 3 — Pre-test verification

**PASS** (2026-07-10)

- All four records exist and link only to `recgP9qZYjAhE7NXm`
- Submission Asset → Video Feedback linked
- XP Event → same Video Feedback linked
- XP Active = true · Duplicate Status = Unique
- Video Feedback Do Not Award XP? = unchecked
- No live athlete enrollment in chain
- XP count for `VIDEO_SUBMISSION|reccXspFIiNIPMPcm` = **1**

## Phase 4 — Confirmed Duplicate (forward)

**FAIL** — automation 116 did not run (or is OFF)

**Action taken:** Set `Asset Reuse Decision = Confirmed Duplicate` on `recWZ4cHNYgbV60mL`  
**Wait:** 90s poll — no consequence fields changed

| Expected | Observed |
|----------|----------|
| `statusOut = success` | No automation output (REST cannot read run history) |
| `actionOut = applied_confirmed_duplicate` | N/A |
| VF Do Not Award XP? checked | **null** (unchanged) |
| XP Active? false | **true** |
| XP Duplicate Status = Duplicate - Remove | **Unique** |
| XP Reason Debug contains `[C-023-S5] Confirmed duplicate — XP deactivated` | **absent** |
| Asset resolution applied | **false** |
| Second XP Event | **none** (count stayed 1) |

**XP Event count:** before **1** · after **1**

**Recovery:** Reset `Asset Reuse Decision` → **Not Reviewed** for clean re-test when automation is enabled.

## Phase 5 — Approved Reuse reversal

**NOT RUN** — blocked by Phase 4 failure.

## Phase 6 — Final state

| Item | State |
|------|--------|
| Automation 116 | **OFF** (recommended until forward + reversal PASS) |
| Asset Reuse Decision | **Not Reviewed** (reset after failed forward attempt) |
| XP Event | Active · Unique · 1 row |
| VF Do Not Award XP? | unchecked |
| Fixture records | **Retained** — do not delete |

## Overall result

**FAIL** — fixture and pre-test PASS; live automation forward test did not execute.

**Blocker:** Enable automation **116** in PROD Airtable (paste script v1.0.1 from `992677d` if not already), confirm trigger matches index, then re-run:

```powershell
Set-Location tools/airtable
python prod_116_fixture_run.py confirm
python prod_116_fixture_run.py restore
```

If both pass, leave 116 **ON** and Asset Reuse Decision **Approved Reuse** per test plan.

## Artifacts

- JSON audit: `tools/airtable/_preview/prod-116-fixture-audit.json`
- Fixture runner: `tools/airtable/prod_116_fixture_run.py`
