# Hub Airtable — Submission Outbox retry fields

**Table:** `Submission Outbox` (Curriculum Hub base — **not** Shooting Challenge `appn84sqPw03zEbTT`)  
**Status:** **COMPLETE — Mike UI (2026-09-10)**  
**Attestation:** Mike added five retry fields in Curriculum Hub Airtable (agent did not live-verify schema)

---

## Fields (required set)

| Field | Type | Purpose |
|---|---|---|
| Retry Payload | Long text | JSON retry body (not encrypted) |
| Delivery Attempt Count | Number (integer) | Monotonic counter |
| Last Attempt At | Date/time | Last delivery try |
| Delivered At | Date/time | Success timestamp |
| Processing Claim | Single line text | Worker concurrency lock |

---

## Remaining Hub cutover (after this step)

1. Hub Production **redeem** + **submit** URLs — [`structured-curriculum-hub-production-cutover.md`](./structured-curriculum-hub-production-cutover.md)
2. Merge Hub **PR #21** when lint + env ready
3. Disposable structured-homework live E2E on allowlisted email

---

## References

- Prep audit: [`docs/audits/AT-HOME-RELEASE-PREP-2026-09-10.md`](../audits/AT-HOME-RELEASE-PREP-2026-09-10.md)
- Hub cutover checklist: [`structured-curriculum-hub-production-cutover.md`](./structured-curriculum-hub-production-cutover.md)
