# Shooting Challenge Controlled Test Identity Contract

**Status:** IDENTITY_VERIFIED for non-email controlled testing  
**Date:** 2026-09-08  
**Base:** Production `appn84sqPw03zEbTT`

## Current controlled identity

| Item | Value |
|---|---|
| Athlete | `recshWT5DQPUZXDvr` — Testing Schmidt |
| Enrollment | `recn54wbxTjygydqa` — Testing Schmidt |
| Program Instance | `rec5mEM0YPqPqq0hZ` — Shooting Challenge \| 2026-2027 |
| School Year | `2026-2027` |
| Grade | `12` |
| Grade Band | `9-12` |
| Enrollment Active? | `true` |
| Registration Source | `Manual` |

The Athlete and Enrollment were created specifically as controlled Production testing records after the September purge removed the prior test identity. They must never be treated as a genuine participant.

## Historical identities

The prior documented identities are historical only and must not be used by automated `--execute` scenarios without a fresh live read proving they exist and are intentionally restored.

- Athlete `recgqVstObQRzgXJF` — HISTORICAL / PURGED
- Enrollment `recgP9qZYjAhE7NXm` — HISTORICAL / PURGED
- Other prior candidate test enrollments discovered in old docs are not authoritative.

## Safety contract

Production `--execute` may proceed only when all of the following are true:

1. live Enrollment RID equals `recn54wbxTjygydqa`;
2. live Athlete RID equals `recshWT5DQPUZXDvr`;
3. Enrollment is Active;
4. Program Instance is `rec5mEM0YPqPqq0hZ`;
5. School Year is `2026-2027`;
6. grade-band resolution remains `9-12`;
7. CLI receives the explicit Production acknowledgement required by the test harness;
8. scenario declares expected mutations and cleanup;
9. scenario is not blocked by another active work item such as SC-STRUCTURED-HOMEWORK-FILES-001 / PR #486.

Fail closed if any assertion differs.

## Email safety

No Parent Email or Athlete Email was populated when this identity was created. Therefore:

- non-email controlled scenarios may use this identity once the CLI contract matches these RIDs;
- any scenario that can send email remains BLOCKED until an explicitly allowlisted test recipient is deliberately attached and reverified;
- do not infer or copy a family email from another Enrollment;
- do not use a genuine participant as a recipient fixture.

## Testing Week / WAS

A permanent controlled Testing Week and canonical WAS were not recreated as part of the identity transaction. Scenarios requiring a dedicated testing Week or WAS must either resolve a current safe fixture or create a narrowly scoped disposable fixture under the scenario's declared cleanup contract.

## Reverification

Before each controlled Production execution, the identity verifier should read the Enrollment and confirm the contract above. A missing record, changed Program Instance, inactive state, mismatched grade band, or unexpected recipient field must return BLOCKED rather than attempting repair automatically.
