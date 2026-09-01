# MRW-F07 — Weekly email positive-arm harness

| Field | Value |
|-------|--------|
| Backlog | **MRW-F07**, **SC-031**, **SC-035**, **FUT-006** (WE-06 writeback) |
| Status | Harness shipped (2026-08-30) — WE-06 writeback verification added (2026-09-01) |
| CLI | `tools/testing/mrw-f07-weekly-email-positive-arm.mjs` |
| Library | `tools/testing/lib/mrw-f07-weekly-email-lib.mjs` |
| Contracts | `tools/testing/tests/test_mrw_f07_weekly_email_contract.mjs`, `tools/testing/tests/test_mrw_f07_was_writeback_contract.mjs` |
| Evidence | `docs/testing/evidence/mrw-f07-weekly-email/` |
| Audit | [`docs/audits/2026-08-28-weekly-email-pipeline-audit.md`](../audits/2026-08-28-weekly-email-pipeline-audit.md) |

## Purpose

Prove the **positive arm** of the weekly parent email chain on disposable data:

```text
118 → arms Build Weekly Email Now?
072 → builds package on WAS
119 → arms Send to Make? (schedule or manual)
074 → creates Email Handoff Queue row
079 → POST to Communications Hub → Resend
Hub → Resend webhook → WAS writeback (FUT-006 / WE-06)
```

This harness **does not** replace Sunday schedule attestation. It gives Mike a repeatable disposable path to verify 072/074/079 field gates before season send volume.

## Safety

| Rule | Enforcement |
|------|-------------|
| Dry-run default | `--plan` and `--verify` are read-only |
| Disposable WAS only | Schmidt enrollments (`recCyFEPeATOVNlr9`, `recgP9qZYjAhE7NXm`) or `WETEST\|` Weeks; `--force` override |
| No duplicate send | Refuses WAS with `Weekly Email Sent?` already true |
| Summary Key settled | Refuses WAS with blank `Summary Key` |
| No automation input changes | Does not set 074 `testMode` or 119 `dryRun` — Mike-only per audit |
| No email from CLI | Harness only patches WAS checkboxes; delivery is automation-owned |
| Writeback read-only | **WE-06** verifies Hub-owned fields — harness never PATCHes writeback columns |

## Chain stages (WE-01…WE-06)

| ID | Automation | Pass when |
|----|------------|-----------|
| WE-01 | 118 | `Build Weekly Email Now?` checked |
| WE-02 | 072 | `Weekly Email Ready?` + subject + payload/HTML |
| WE-03 | 119 | `Send to Make?` checked |
| WE-04 | 074 | Queue row with `WEEKLY_ATHLETE_SUMMARY\|WEEKLY_ATHLETE_SUMMARY\|{wasId}` |
| WE-05 | 079 | Queue `Status` ∈ Accepted / Sent / Ready |
| WE-06 | Hub / Resend | Writeback contract matches observable phase (see below) |

### WE-06 — WAS Hub writeback (FUT-006)

Read-only verification against [`WEEKLY_SUMMARY_SOURCE_WRITEBACK_v1.md`](../../../communications/docs/contracts/WEEKLY_SUMMARY_SOURCE_WRITEBACK_v1.md). The harness **never** writes writeback fields — Hub owns all PATCHes.

| Observable phase | Trigger | Expected WAS fields |
|------------------|---------|---------------------|
| **hub_accept** | Queue `Accepted` and/or `Hub Event ID` set; `Weekly Email Sent?` still false | `Hub Event ID` non-empty; Sent? **false**; Sent At / Summary Sent At **empty**; Status **not** `Sent` |
| **resend_success** | `Weekly Email Sent?` true and Status `Sent` | Sent? **true**; Sent At + Summary Sent At **set**; Status **`Sent`**; Weekly Email Error **cleared** |
| **resend_failure** | Status `Error` | Sent? false; Status `Error`; Error populated |
| **none** | Chain before Hub accept | WE-06 skipped (not a failure in `--verify`; use `--verify-writeback` to inspect) |

Contract diff output lists each field with `expected`, `actual`, and `pass` per check.

## Usage

```bash
# Offline contracts (no Airtable)
node tools/testing/tests/test_mrw_f07_weekly_email_contract.mjs
node tools/testing/tests/test_mrw_f07_was_writeback_contract.mjs

# Read current chain state for a WAS (includes WE-06 when observable)
node tools/testing/mrw-f07-weekly-email-positive-arm.mjs --verify --was-id recXXXXXXXX

# Read-only WE-06 writeback snapshot + contract diff
node tools/testing/mrw-f07-weekly-email-positive-arm.mjs --verify-writeback --was-id recXXXXXXXX

# Dry-run plan (optional --arm-build / --arm-send flags)
node tools/testing/mrw-f07-weekly-email-positive-arm.mjs --plan --was-id recXXXXXXXX --arm-build --arm-send

# Live disposable apply: arm build (072), optionally arm send (074 queue)
node tools/testing/mrw-f07-weekly-email-positive-arm.mjs --apply --was-id recXXXXXXXX
node tools/testing/mrw-f07-weekly-email-positive-arm.mjs --apply --was-id recXXXXXXXX --arm-send
```

Requires `AIRTABLE_API_TOKEN` with Production base access (`appn84sqPw03zEbTT`).

## Mike-only before season Live sends

From [`2026-08-28-weekly-email-pipeline-audit.md`](../audits/2026-08-28-weekly-email-pipeline-audit.md):

1. Confirm pasted versions: 072 **v4.8**, 119 **v1.7**, 074 **v3.3**, 079 **v2.5**
2. 074 automation input `testMode` = **`false`** for real parent delivery
3. 119 `dryRun` = **`false`**, `includeSchmidt` = **`false`** unless disposable test
4. Disable legacy Make weekly-email scenario if still ON

## Related

- FUT-006 promotion checklist: [`docs/deploy-checklists/FUT-006-weekly-was-hub-writeback.md`](../../deploy-checklists/FUT-006-weekly-was-hub-writeback.md)
- Weekly settlement (no send): [`weekly-settlement/SC-WEEKLY-SETTLEMENT-E2E.md`](../weekly-settlement/SC-WEEKLY-SETTLEMENT-E2E.md)
- Email send plane: [`integrations/email-send-plane.md`](../integrations/email-send-plane.md)
