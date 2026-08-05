# Program Homework Assignments — MVP Migration

| Field | Value |
|-------|--------|
| Date | 2026-08-05 |
| PROD base | `appn84sqPw03zEbTT` |
| Status | **MVP live in PROD** (table + backfill + proof) — paste **033 v3.2** / **020 v3.1.0** for ongoing automation path |
| Separate from | Perfect Week PR #81 |

## Architecture before

```text
Outside HOMEWORK base
        ↓ sync
FBC Curriculum - SYNC  ←── Week / Grade Band stored on library record
        ↓
WAS.Homework (via 033 Week+GradeBand match)
Homework Completions.Homework (via 020 from Submission HW Name 1/2)
```

Problem: library `Week` links overwrite historical scheduling context across Program Instances/years.

## MVP architecture after

```text
Outside HOMEWORK base
        ↓ sync
FBC Curriculum - SYNC   (reusable library; Week links retained, untouched)
        ↓
Program Homework Assignments   (local junction: PI + Week + Grade Band + Slot)
        ↓
Homework Completions.Program Homework Assignment
WAS.Homework still links library records (assigned list for 057 / rollups)
```

This is an **additive** junction. Legacy curriculum Week matching remains as **033 fallback**.

## Actual PROD IDs

### Table

| Name | ID |
|------|-----|
| Program Homework Assignments | `tblhA3maf7xOa8EUS` |

### Fields (Program Homework Assignments)

| Field | ID | Type |
|-------|-----|------|
| Program Homework Assignment | `fldNlOuvCiLmQRt1e` | singleLineText (primary) |
| Program Homework Assignment Display | `fldp3eQIQQKi6StzU` | formula |
| Homework Assignment | `fld32hpKiGx5l8ZhI` | link → FBC Curriculum - SYNC |
| Program Instance | `fldrB2gcduTaqxnsl` | link → Program Instance - Synced |
| Week | `fld3S4XdwY6sq4BPZ` | link → Weeks |
| Grade Band | `fldWNwh6Z3pxVwTes` | link → Grade Bands |
| Homework Slot | `fldtNNM0a6DoxmuaF` | singleSelect HW1/HW2 |
| Active? | `fldxXLOeCHh09iObk` | checkbox |
| Program Instance RID | `fld37Vw1oLvknFRHj` | lookup |
| Week RID | `fldFCQ2z9Bwg1Y8YY` | lookup |
| Grade Band RID | `fld4Dpsd837yGkoPX` | lookup |
| Homework Assignment RID | `fld0fcG9TDBXBlVDc` | lookup |
| Schedule Key | `fldSgoJUI37aPnvrJ` | formula |
| Homework Completions | `fldDg9PXNr0i9YnX7` | inverse link |

### Schedule Key formula (named)

```airtable
IF(
  AND(
    {Program Instance RID},
    {Week RID},
    {Grade Band RID},
    {Homework Slot},
    {Homework Assignment RID}
  ),
  ARRAYJOIN({Program Instance RID}) & "|" & ARRAYJOIN({Week RID}) & "|" & ARRAYJOIN({Grade Band RID}) & "|" & {Homework Slot} & "|" & ARRAYJOIN({Homework Assignment RID}),
  BLANK()
)
```

### Fields added to existing tables

| Table | Field | ID |
|-------|-------|-----|
| Homework Completions | Program Homework Assignment | `fldmhkFv4qVxfnROP` |
| Program Instance - Synced | Record Id (helper) | `fldIR3bOa82zrGrmt` |
| Grade Bands | Record Id (helper) | `fld6ZJh9vcNXgk1d4` |
| FBC Curriculum - SYNC | Record Id (helper) | `fld7CcreHRXc4ZXeg` |

No fields added to Submissions or WAS (context derived via Enrollment + HC + PHA).

## Dependency audit

| Dependency | Must change for MVP? | Notes |
|------------|----------------------|-------|
| Automation **012** | N/A | Deleted / unused (index) |
| Automation **033** | **Yes** (GitHub v3.2) | Prefer PHA; legacy curriculum fallback |
| Automation **020** | **Yes** (GitHub v3.1.0) | Link PHA on HC create/update when resolvable |
| Automation **057** | No | Reads WAS.`Homework` + Completions Link. CASE-01 manual Test **PASS** 2026-08-05 — no code change |
| Automation **065** XP | No | Still uses HC.Homework library link |
| 009 assets / 071 email | No | Legacy library links |
| Fillout / Softr / Make / weekly email | No | No junction exposure required for MVP |
| FBC Curriculum.Week | **Retain** | Untouched; historical safety PASS |

## Scripts / formulas changed

| Asset | Change |
|-------|--------|
| `033-…js` | **v3.2** — PHA-first assign to WAS.Homework |
| `020-…js` | **v3.1.0** — resolve + link Program Homework Assignment |
| PROD Same Day / Perfect Week formulas | Not part of this package |

**PROD paste still required** for 033/020 before live submissions use the junction automatically.

## Backfilled junction + HC (Perfect Week CASE-01)

| Record | ID |
|--------|-----|
| PHA HW1 | `reca5GM1JkROhXOiy` |
| PHA HW2 | `reccQhrgOK8e8Yngv` |
| HC HW1 | `recqXxlOpATQI3sD4` |
| HC HW2 | `rechzFmWrUp1tonto` |
| Library HW1 | `rechVLOeyEVIqmy2v` |
| Library HW2 | `rec6WmXjpLtIWDERo` |
| Week | `reci5GdxEC57vfoS3` |
| WAS | `recKebuZ79QFTwivA` |

WAS after backfill: **Homework Assigned Count = 2**, **Homework Satisfactory Count = 2**.

### HC → WAS field clarification (2026-08-05)

| Field | ID | Type | Role |
|-------|-----|------|------|
| `Weekly Athlete Summary` | `fldhpGNYnu2l3bpUP` | singleLineText | Empty on CASE-01; **unused/legacy** — later cleanup only |
| `Weekly Athlete Summary Link` | `fldkoEbVnCugcMCCi` | multipleRecordLinks | **Canonical** relationship; both CASE-01 HCs → `recKebuZ79QFTwivA`; written by **020** |

Do not delete/rename/convert either field in this package. Evidence: `docs/testing/evidence/2026-08-05-pha-was-link-clarification/`.

## Acceptance tests (2026-08-05)

| Test | Result |
|------|--------|
| 1 Reuse | PASS — same library on two Weeks via two PHA (cleanup deleted second) |
| 2 Dedupe | PASS — duplicate Schedule Key identical |
| 3 Slot resolution | PASS — HW1/HW2 distinct |
| 4 Historical safety | PASS — curriculum Week still `recnMGC2JBHjO0ay6` |
| 5 Completion linkage | PASS — Enrollment, Week, Homework, PHA, **`Weekly Athlete Summary Link`** → WAS (text field `Weekly Athlete Summary` may be empty — not a failure) |
| 6 No regression (grading/XP/assets/email) | **Not live-reproven** — scripts additive; legacy fields retained; Mike should spot-check after 020/033 paste |

## Perfect Week homework results

| Metric | Value |
|--------|-------|
| Assigned count (rollup) | **2** |
| Satisfactory count (rollup) | **2** |
| Perfect Week Homework Requirement Met? | **1** (057 PASS) |
| Perfect Week Eligible? | **1** |
| Perfect Week Automation Status | **Ready** |

**CASE-01 + 057 manual Test:** **PASS** — package evidence `docs/testing/evidence/2026-08-05-pha-was-link-clarification/` (**COMPLETE**). Paste 033/020 still required for future automated PHA path.

## Rollback

1. Leave table in place; uncheck `Active?` on junction rows or clear WAS.Homework / HC.Program Homework Assignment links.
2. Restore PROD paste of **033 v3.1** and **020 v3.0.0** from git history if pasted.
3. Do **not** delete the table until rollback verification complete.
4. Do **not** touch FBC Curriculum Week links.

## Future enhancements (out of scope)

- Curriculum versioning, due dates, availability windows
- Optional vs required, prerequisites, publishing workflows
- Removal of legacy Week links on FBC Curriculum - SYNC
- Full historical backfill
- Redesign of outside HOMEWORK base

## Evidence

- `docs/testing/homework-assignments/fixtures/_pha-create.json`
- `docs/testing/homework-assignments/fixtures/_pha-backfill-proof.json`
- `docs/testing/evidence/2026-08-05-pha-was-link-clarification/` (Link clarification + CASE-01 PASS + 057 manual test)
- Tools: `tools/testing/create_pha_table.mjs`, `tools/testing/backfill_pha_perfect_week.mjs`, `tools/testing/verify_case01_was_link.mjs`
