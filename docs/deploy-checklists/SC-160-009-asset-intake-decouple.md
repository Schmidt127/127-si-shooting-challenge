# SC-160 — Asset intake decoupled from Submission.Week (Mike paste)

**Backlog:** SC-160  
**Automation:** **009** — Create Submission Assets from Submission (`wflGKNw4e06hCHyv9`)  
**GitHub:** `009-submission-intake-create-submission-assets.js` **v1.3**  
**Audit:** [`../audits/SC-160-ASSET-INTAKE-DECOUPLE-20260904.md`](../audits/SC-160-ASSET-INTAKE-DECOUPLE-20260904.md)  
**Policy:** Asset intake ALWAYS allowed. Week-dependent scoring evaluated separately.

## Paste order (required)

1. **Paste / publish Automation 009 v1.3 first** (GitHub script body — skip GitHub header comment block through `*/` of the top file comment; paste from the production docblock `/***` through end of file).
2. **Then** update the two Submissions formulas below (UI paste or OMNI).
3. Confirm Automations Code column / run output shows **v1.3**.
4. Do **not** change 057 / 058 / 059 for this item.

If formulas are updated before the script publish, Ready may flip to `1` while live 009 **v1.2** still throws on missing Week.

## Rollback formulas (export before change — live-read 2026-09-04)

### Ready for 009 Asset Creation? (`fld31w9XjMW5DbBpk`) — ROLLBACK

```
IF(
  AND(
    {fld0fKiO62UiztNQH},
    {fldA3fpXWckngZ6g1},
    COUNTA({fld1kilHu3o3Qtlpv}) = 0,
    OR(
      COUNTA({fldtJS9LW3PAyCaNC}) > 0,
      COUNTA({fldUvfAHi3e15Oxb7}) > 0,
      COUNTA({fld0pxr2NoMx2MxBu}) > 0
    )
  ),
  1,
  0
)
```

### Why Not Ready for 009? (`fld7PEP0RfvxBJ5sx`) — ROLLBACK

```
IF(
  NOT({fld0fKiO62UiztNQH}),
  "Missing Enrollment",
IF(
  NOT({fldA3fpXWckngZ6g1}),
  "Missing Week",
IF(
  COUNTA({fld1kilHu3o3Qtlpv}) > 0,
  "Already has Submission Assets",
IF(
  AND(
    COUNTA({fldtJS9LW3PAyCaNC}) = 0,
    COUNTA({fldUvfAHi3e15Oxb7}) = 0,
    COUNTA({fld0pxr2NoMx2MxBu}) = 0
  ),
  "No HW Sub 1, HW Sub 2, or Video Upload attachment",
  "READY"
))))
```

## New formulas (SC-160 — Week removed from asset-intake gate)

### Ready for 009 Asset Creation? (`fld31w9XjMW5DbBpk`) — NEW

```
IF(
  AND(
    {fld0fKiO62UiztNQH},
    COUNTA({fld1kilHu3o3Qtlpv}) = 0,
    OR(
      COUNTA({fldtJS9LW3PAyCaNC}) > 0,
      COUNTA({fldUvfAHi3e15Oxb7}) > 0,
      COUNTA({fld0pxr2NoMx2MxBu}) > 0
    )
  ),
  1,
  0
)
```

### Why Not Ready for 009? (`fld7PEP0RfvxBJ5sx`) — NEW

```
IF(
  NOT({fld0fKiO62UiztNQH}),
  "Missing Enrollment",
IF(
  COUNTA({fld1kilHu3o3Qtlpv}) > 0,
  "Already has Submission Assets",
IF(
  AND(
    COUNTA({fldtJS9LW3PAyCaNC}) = 0,
    COUNTA({fldUvfAHi3e15Oxb7}) = 0,
    COUNTA({fld0pxr2NoMx2MxBu}) = 0
  ),
  "No HW Sub 1, HW Sub 2, or Video Upload attachment",
  "READY"
)))
```

Field IDs (unchanged):

| Role | Field | Field ID |
|------|-------|----------|
| Enrollment | Enrollment | `fld0fKiO62UiztNQH` |
| Week (no longer in Ready gate) | Week | `fldA3fpXWckngZ6g1` |
| Assets link | Submission Assets | `fld1kilHu3o3Qtlpv` |
| HW Sub 1 | HW Sub 1 | `fldtJS9LW3PAyCaNC` |
| HW Sub 2 | HW Sub 2 | `fldUvfAHi3e15Oxb7` |
| Video Upload | Video Upload | `fld0pxr2NoMx2MxBu` |

## Trigger (unchanged)

Automation **009** (`wflGKNw4e06hCHyv9`):

- `Ready for 009 Asset Creation?` = `1`
- `Activity Date Is Future?` = `0`

## Verify after paste

1. Submission with Enrollment + attachments + **no Week** → `Why Not Ready for 009?` = `READY`, Ready = `1`.
2. 009 run creates one SA per HW1 / HW2 / each Video attachment (authorized slots).
3. Parent `Attachment Upload Error` may show: `009: Week not linked — assets created; week-dependent scoring on hold`.
4. Outputs include `weekLinkedOut=false`, `weekHoldOut=true` when Week missing.
5. Do **not** delete Mike’s reported evidence submission; treat as read-only until Agent 4 verification.

## Do not

- Run Season Simulation
- Trash FUT-002 fields
- Modify 057 / 058 / 059 for SC-160
- Paste from agents without Mike approval
