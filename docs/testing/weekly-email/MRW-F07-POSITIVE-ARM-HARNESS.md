# MRW-F07 — Weekly email positive-arm harness

| Field | Value |
|-------|--------|
| Backlog | **MRW-F07**, **SC-031**, **SC-035** |
| Status | Harness shipped (2026-08-30) — live `--apply` requires disposable WAS |
| CLI | `tools/testing/mrw-f07-weekly-email-positive-arm.mjs` |
| Library | `tools/testing/lib/mrw-f07-weekly-email-lib.mjs` |
| Contracts | `tools/testing/tests/test_mrw_f07_weekly_email_contract.mjs` |
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

## Chain stages (WE-01…WE-05)

| ID | Automation | Pass when |
|----|------------|-----------|
| WE-01 | 118 | `Build Weekly Email Now?` checked |
| WE-02 | 072 | `Weekly Email Ready?` + subject + payload/HTML |
| WE-03 | 119 | `Send to Make?` checked |
| WE-04 | 074 | Queue row with `WEEKLY_ATHLETE_SUMMARY\|WEEKLY_ATHLETE_SUMMARY\|{wasId}` |
| WE-05 | 079 | Queue `Status` ∈ Accepted / Sent / Ready |

## Usage

```bash
# Offline contracts (no Airtable)
node tools/testing/tests/test_mrw_f07_weekly_email_contract.mjs

# Read current chain state for a WAS
node tools/testing/mrw-f07-weekly-email-positive-arm.mjs --verify --was-id recXXXXXXXX

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

- Weekly settlement (no send): [`weekly-settlement/SC-WEEKLY-SETTLEMENT-E2E.md`](../weekly-settlement/SC-WEEKLY-SETTLEMENT-E2E.md)
- Email send plane: [`integrations/email-send-plane.md`](../integrations/email-send-plane.md)
