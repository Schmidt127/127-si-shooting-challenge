# Weekly settlement live results — 2026-08-30

## Aggregate

| Case | WAS ID | Pass | Notes |
|------|--------|------|-------|
| WS-01 fully-successful | `receZH9vivRtg8bhv` | PASS | Eligible=1; award path cited from SC-PW-E2E |
| WS-02 missing-shooting-day | `recjzOo3n2dna3AP8` | PASS | Fail closed |
| WS-03 insufficient-shots | `recsibGa3DZpKoCBL` | PASS | Fail closed |
| WS-04 no-videos | `rec7AQb2Bzw2ADR4l` | PASS | Fail closed |
| WS-05 fewer-than-three-videos | `recS8CFTAlcSl3RGk` | PASS | Video count 2 |
| WS-06 zoom-required-completed | `recDdwVugk8RSWd3K` | PASS | Attendees on Zoom Meeting |
| WS-07 zoom-required-not-completed | `recKDn061tiQOCEZq` | PASS | Fail closed |
| WS-08 no-zoom-meeting | `rec8zw140MWHNqjNF` | PASS | Zoom met via none |
| WS-09 inactive-enrollment | `reczXYrpUaSLcpGVh` | PASS | Disposable inactive enrollment |
| WS-10 backdated-submissions | `rec1E2iBweHlUX3pP` | PASS | Gated timestamps |

## Perfect Week award citation (do not re-apply)

| Field | Value |
|-------|--------|
| WAS | `recl3DmBh22ADPWWe` |
| Unlock | `recJ5umer4J4FHTOz` |
| Milestone Source Key | `PERFECT_WEEK\|rec93mAfo5jKqP3g5\|recNzl4dNOtDmJqnV` |
| XP Event | `reczehlzkA8fjiQh0` |
| XP | 100 / Awarded |
| Evidence | `docs/testing/evidence/sc-pw-e2e/award-was-recl3DmBh22ADPWWe-2026-08-29-mcp.json` |

## Evidence files

Per-case JSON under `docs/testing/evidence/sc-weekly-settlement/*-live.json`.

## Cleanup

Run `node tools/testing/sc-weekly-settlement.mjs --cleanup` using the latest manifest. Weeks may archive only (PAT delete 403). Orphan archived week from first failed apply: `recKRU4hkPdW581EZ` (rename attempted separately).

## External limitations

- No email / Resend / Make / Gmail invoked  
- Weeks delete often forbidden  
- Coach Summary Queue / Grade Submitted / Frequency-Send Day naming are documentation drift (see DEFECT-REPORT)
