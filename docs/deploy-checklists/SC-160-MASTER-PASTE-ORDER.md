# SC-160 — Master paste / publish order (Mike)

**Backlog:** SC-160  
**Policy:** Asset intake ALWAYS allowed without `Submission.Week`. Week-dependent scoring and Perfect Week are evaluated separately.  
**Do not** flip Ready formulas before publishing **009 v1.3** (live **v1.2** still hard-requires Week).  
**Do not** touch Automation **059** (SC-159 already Live).  
**Do not** run Season Simulation. **Do not** trash FUT-002 Batch 2 fields until SC-160 live proof.

## Ordered steps

### 1) Paste Automation **009** → **v1.3**

- File: `airtable/automations/shooting-challenge/009-submission-intake-create-submission-assets.js`
- Skip GitHub header; paste production docblock through EOF.
- Publish. Confirm Automations Code / run output shows **v1.3**.
- Detail: [`SC-160-009-asset-intake-decouple.md`](./SC-160-009-asset-intake-decouple.md)

### 2) Update Submissions formulas (after 009 is Live)

| Field | Action |
|---|---|
| `Ready for 009 Asset Creation?` | Paste **NEW** formula (Week gate removed) from 009 checklist |
| `Why Not Ready for 009?` | Paste **NEW** formula (no `Missing Week`) from 009 checklist |

Rollback formulas are in the same checklist — export/copy before change.

### 3) Paste homework / Perfect Week scripts (order matters)

1. **020** → **v4.0** — HC Week = PHA.Week; Submission.Week optional  
2. **065** → **v10.7** — early/late still full homework XP when satisfactory  
3. **057** → **2.5** — early + on-time count for PW homework; late excluded  

Detail: [`SC-160-homework-timing-pw-020-057-065.md`](./SC-160-homework-timing-pw-020-057-065.md)

### 4) Disposable verification (then controlled re-arm)

1. Synthetic Submission with empty Week + HW1/HW2 + multiple videos → assets created once; no indefinite Processing.
2. Early / on-time / late / boundary / placeholder-then-late cases per A4 audit.
3. Retry 009 → no duplicate assets.
4. Only then: controlled re-arm of Mike’s reported evidence submission (do not delete it).

Evidence template: [`../audits/SC-160-INDEPENDENT-E2E-VERIFY-20260904.md`](../audits/SC-160-INDEPENDENT-E2E-VERIFY-20260904.md)

## UI-only note

Airtable **customScript** bodies and some automation graph edits are UI-only. Repository work is complete; live completion requires the paste steps above plus disposable proof.
