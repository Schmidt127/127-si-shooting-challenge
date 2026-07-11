# C-023 — PROD automation 116 runtime validation (Schmidt Testing fixture)

**Audit date:** 2026-07-11  
**PROD base ID:** `appn84sqPw03zEbTT`  
**Automation name:** `116 - Submission Assets - Apply Asset Reuse Decision Consequences`  
**Script path:** `airtable/automations/shooting-challenge/116-submission-assets-apply-asset-reuse-decision-consequences.js`  
**Script version:** 1.0.1  
**Script commit:** `992677d`  
**Schema validation commit:** `2958d8d`  
**Test enrollment:** `recgP9qZYjAhE7NXm` (Schmidt, Testing - 2025-2026)  
**Harness:** `tools/airtable/prod_116_fixture_run.py`

## Overall result

**FAIL** — Fixture and baseline **PASS**; Confirmed Duplicate forward test **FAIL** (no consequence field changes after 90s poll). Approved Reuse reversal **NOT RUN**. Automation 116 live UI state cannot be confirmed ON via API; forward test evidence indicates automation is **OFF or not pasted**.

---

## Phase 1 — Automation configuration verification

| Check | Result | Evidence |
|-------|--------|----------|
| Automation exists in PROD Airtable UI | **Not verified via API** | Airtable automations are UI-managed only |
| Name matches `116 - Submission Assets - Apply Asset Reuse Decision Consequences` | **Not verified** | — |
| Trigger: When record updated | **Expected** | `docs/automation-index.md` |
| Table: Submission Assets | **Expected** | — |
| Watched field: Asset Reuse Decision | **Expected** | — |
| Action: Run script · input `recordId` | **Expected** | — |
| Script body matches GitHub v1.0.1 (`992677d`) | **Not verified in UI** | — |
| Automations table documentation record | **FAIL — absent** | PROD Automations table has 48 records; **no row** for 116 (legacy **008** still documented) |
| Runtime forward test | **FAIL** | No field changes after setting Confirmed Duplicate |

### Manual correction required (Mike)

1. In PROD Airtable, create or open automation **`116 - Submission Assets - Apply Asset Reuse Decision Consequences`** (retire/replace legacy **008** in the same slot if present).
2. Paste script body from GitHub `992677d` — file `116-submission-assets-apply-asset-reuse-decision-consequences.js` v1.0.1 (skip GitHub header).
3. Configure trigger: **When record updated** → table **Submission Assets** → watch field **Asset Reuse Decision**.
4. Script action input: **`recordId`** = triggering Submission Asset record ID.
5. **Enable** automation 116 only for re-test.
6. Re-run:

```powershell
Set-Location tools/airtable
python prod_116_fixture_run.py pretest
python prod_116_fixture_run.py confirm
python prod_116_fixture_run.py restore
```

7. If both `confirm` and `restore` report `"pass": true`, leave 116 **ON** and fixture at **Approved Reuse** per test plan.

---

## Phase 2 — Fixture verification

**PASS** — Existing approved Schmidt Testing fixture retained (created 2026-07-10).

| Record | ID | Label / key |
|--------|-----|-------------|
| Submission | `rec9yoDZ3DMIEhi3I` | Testing Schmidt - 7/10/2026 - Post Challenge |
| Submission Asset | `recWZ4cHNYgbV60mL` | Asset Label: **PROD V2 Test - Duplicate Reuse** |
| Video Feedback | `reccXspFIiNIPMPcm` | Video Feedback Key: **PROD-V2-A116-TEST** |
| XP Event | `recYQ10pOoFlApmjZ` | Source Key: **`VIDEO_SUBMISSION|reccXspFIiNIPMPcm`** |

Verified:

- All four records link only to `recgP9qZYjAhE7NXm`
- Submission Asset → Video Feedback linked
- XP Event → same Video Feedback linked
- No active athlete enrollment in chain
- XP count for test source key = **1**

---

## Phase 3 — Baseline evidence (2026-07-11)

Captured before forward test (`tools/airtable/_preview/prod-116-baseline-2026-07-11.json`).

| Field | Value |
|-------|-------|
| Asset Reuse Decision | Not Reviewed |
| Duplicate Resolution Applied? | null |
| Duplicate Resolution Last Applied Decision | null |
| Duplicate Resolution Error | null |
| Video Feedback Do Not Award XP? | null (unchecked) |
| XP Event Active? | true |
| XP Event Duplicate Status | Unique |
| XP Reason Debug | PROD V2 Test fixture for automation 116 (PROD-V2-A116-TEST). Reference commit 992677d. |
| XP Event count (source key) | **1** |

---

## Phase 4 — Confirmed Duplicate forward test

**Action:** Set `Asset Reuse Decision = Confirmed Duplicate` on `recWZ4cHNYgbV60mL`  
**Wait:** 90s poll (3s interval) — **timeout**  
**Automation run IDs / timestamps:** Not accessible via REST API

| Expected | Observed |
|----------|----------|
| Run succeeded · `statusOut = success` | No automation output observable via API |
| `actionOut = applied_confirmed_duplicate` | N/A |
| VF Do Not Award XP? checked | **null** (unchanged) |
| XP Active? false | **true** |
| XP Duplicate Status = Duplicate - Remove | **Unique** |
| XP Reason Debug contains `[C-023-S5] Confirmed duplicate — XP deactivated` | **absent** |
| Duplicate Resolution Applied? checked | **null** |
| Duplicate Resolution Last Applied Decision = Confirmed Duplicate | **null** |
| Duplicate Resolution Applied At populated | **null** |
| Duplicate Resolution Error blank | blank (unchanged) |
| XP Event count remains 1 | **1 → 1** PASS |

**Result:** **FAIL**

---

## Phase 5 — Approved Reuse reversal test

**NOT RUN** — blocked by Phase 4 failure.

---

## Phase 6 — Final state (post-failure recovery)

| Item | State |
|------|--------|
| Automation 116 (recommended) | **OFF** until paste + forward/reversal PASS |
| Asset Reuse Decision | **Not Reviewed** (reset via `prod_116_fixture_run.py reset-decision`) |
| XP Event `recYQ10pOoFlApmjZ` | Active · Unique · 1 row |
| Video Feedback Do Not Award XP? | unchecked |
| Fixture records | **Retained** — do not delete |

---

## Artifacts

| Artifact | Path |
|----------|------|
| Fixture audit JSON | `tools/airtable/_preview/prod-116-fixture-audit.json` |
| Baseline JSON | `tools/airtable/_preview/prod-116-baseline-2026-07-11.json` |
| Fixture runner | `tools/airtable/prod_116_fixture_run.py` |
| Prior validation | `docs/deploy-checklists/C-023-prod-automation-116-validation-2026-07-10.md` |

## Remaining manual action

Paste and enable PROD automation **116 v1.0.1**, then re-run controlled fixture tests. Do **not** enable automation **070b** until C-013 PROD infrastructure smoke PASS.
