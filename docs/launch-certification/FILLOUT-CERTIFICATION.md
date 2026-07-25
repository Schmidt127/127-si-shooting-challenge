# Launch Certification — Fillout

**Authority:** Final Launch Closure Lead  
**Date:** 2026-07-25  
**Companion:** [`docs/next-wave/data-model/FILLOUT-CONFIG-VERIFICATION.md`](../next-wave/data-model/FILLOUT-CONFIG-VERIFICATION.md)

## Repo facts (not invented mappings)

| Claim | State |
|-------|-------|
| Daily submission Fillout | **OFF** — C-008 contest intake closed (PROJECT_STATE) |
| Enrollment Fillout Config RID hard-code in repo | **Not in contract** — season via Enrollment `School Year` + `Program Instance` |
| Live Fillout → Config RID mapping | **mike-ui** — not documented in repo |

## Season / Config Mike checklist (2026–2027)

Complete in Fillout + Airtable UI. Record PASS/FAIL beside each step.

| # | Action | Done when |
|---|--------|-----------|
| F1 | Open Enrollment Fillout form in Fillout UI | Form opens |
| F2 | For each mapped field, note Airtable destination; flag any hidden field targeting Config | Written notes |
| F3 | Confirm School Year option includes / defaults to **`2026-2027`** | Option present |
| F4 | Confirm Program Instance picker defaults to 2026–2027 instance (not prior year) | Correct default |
| F5 | Confirm **no** hard-coded Config record ID in Fillout calculation/hidden fields | No Config RID hard-code |
| F6 | (Optional controlled) Submit one Schmidt/test enrollment → Enrollment.School Year = `2026-2027` + correct Program Instance | Enrollment fields match |
| F7 | In Airtable, confirm Config row `Active School Year = 2026-2027` exists (fixture cited `rechc1f9f4kVM1tHP` — **verify live ID in OMNI**) | Active year Config OK |
| F8 | Confirm daily submission Fillout remains **OFF** unless Mike explicitly reopens intake | Remains OFF for launch |

## Certification status

| Item | Status |
|------|--------|
| Repo contract review | **PASS** (repo_evidence) |
| Live Fillout UI season defaults | **BLOCKED** — requires Mike UI |
| Live Config Active School Year | **BLOCKED** — requires Mike / OMNI |

## Explicit non-actions

1. Do not invent Fillout field mappings in git.  
2. Do not reopen daily submission Fillout without Mike authorization.  
3. Do not collapse multi-year Config rows without migration approval.