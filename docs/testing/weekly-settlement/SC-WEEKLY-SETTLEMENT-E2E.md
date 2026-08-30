# SC-WEEKLY-SETTLEMENT-E2E — Weekly settlement workflow harness

| Field | Value |
|-------|--------|
| Backlog | **SC-WEEKLY-SETTLEMENT-E2E** |
| Status | Harness + live matrix evidence (2026-08-29/30) |
| CLI | `tools/testing/sc-weekly-settlement.mjs` |
| Library | `tools/testing/lib/sc-weekly-settlement-lib.mjs` |
| Contracts | `tools/testing/tests/test_sc_weekly_settlement_contract.mjs` |
| Evidence | `docs/testing/evidence/sc-weekly-settlement/` |
| Defects | [`DEFECT-REPORT.md`](./DEFECT-REPORT.md) |

## Purpose

Prove the **weekly settlement path** on disposable data before season simulation:

A. Weekly Athlete Summary create/link  
B. Weekly calculations  
C. Perfect Week 057 → 058 → 059 (fail-closed matrix live; award path cited from SC-PW-E2E)  
D. Level gates / achievements (structural + Source Key contracts)  
E. Communications prep/queue compatibility (**no send**)

**Not in scope:** SC-SEASON-SIM-001 / SC-SEASON-SIM-002 execute runs.

## Safety

| Rule | Enforcement |
|------|-------------|
| Dry-run default | No Airtable writes without `--apply` |
| `WSTEST\|` Weeks | Created Week names must start with prefix |
| No email | Never arms `Send to Make?` / 119 Live / Resend / Make / Gmail |
| No 075 restore | Documented ban |
| Closed PW WAS | Do **not** re-`--apply` SC-PW-E2E for `recl3DmBh22ADPWWe` |
| Gated PW formulas | Perfect Week cases use enrollment `rec93mAfo5jKqP3g5` (gated timestamps) |
| Weeks cleanup | PAT often cannot delete Weeks — harness archives (`WSTEST\|ARCHIVED\|…`, `Active?=false`) |

## Usage

```bash
# Offline matrix + dry-run plan
node tools/testing/tests/test_sc_weekly_settlement_contract.mjs
node tools/testing/sc-weekly-settlement.mjs --matrix

# Live disposable case
node tools/testing/sc-weekly-settlement.mjs --case missing-shooting-day --apply

# Cleanup (deletes submissions/WAS/videos/zoom where allowed; archives Weeks)
node tools/testing/sc-weekly-settlement.mjs --cleanup
```

## Cases (WS-01…WS-10)

| ID | Case | Expectation |
|----|------|-------------|
| WS-01 | fully-successful | Eligible path; award cited from SC-PW-E2E |
| WS-02 | missing-shooting-day | Not eligible; no unlock/XP |
| WS-03 | insufficient-shots | Daily not met; fail closed |
| WS-04 | no-videos | Video not met; fail closed |
| WS-05 | fewer-than-three-videos | Video count 2; fail closed |
| WS-06 | zoom-required-completed | Meeting + Attendees; eligible |
| WS-07 | zoom-required-not-completed | Meeting, no Attendees; fail closed |
| WS-08 | no-zoom-meeting | Zoom met via none required |
| WS-09 | inactive-enrollment | Disposable inactive enrollment; no send |
| WS-10 | backdated-submissions | Gated timestamps; WAS links correct |

## Live results (2026-08-30)

See [`RESULTS.md`](./RESULTS.md) and per-case JSON under `docs/testing/evidence/sc-weekly-settlement/`.

## Related

- Perfect Week award proof: [`../perfect-week/SC-PW-E2E.md`](../perfect-week/SC-PW-E2E.md)
- Season simulation (do not implement from this harness): Future Work **SC-SEASON-SIM-001** / **SC-SEASON-SIM-002**
