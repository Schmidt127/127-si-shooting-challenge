# Shooting Challenge Controlled Test Identity Contract

**Status:** `IDENTITY_VERIFIED_NON_EMAIL`  
**Date:** 2026-09-08  
**Base:** Production `appn84sqPw03zEbTT`  
**Program:** SC-003–SC-008 Test & Reliability

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
| Parent/Athlete email | **blank intentionally** |

## Identity verdict states

| State | Meaning |
|-------|---------|
| `IDENTITY_VERIFIED_NON_EMAIL` | Safe for controlled non-email Production `--execute` |
| `IDENTITY_VERIFIED_EMAIL` | Allowlisted test recipient attached and verified |
| `IDENTITY_RECONTRACT_REQUIRED` | No usable controlled identity |
| `IDENTITY_BLOCKED` | PAT missing or live read failed |

**Current expected:** `IDENTITY_VERIFIED_NON_EMAIL`

## Historical identities (PURGED — do not reuse)

| Field | RID | Status |
|-------|-----|--------|
| Athlete | `recgqVstObQRzgXJF` | **PURGED / DO NOT REUSE** |
| Enrollment | `recgP9qZYjAhE7NXm` | **PURGED / DO NOT REUSE** |

## Execute gate (shared CLI)

Non-email `--execute` requires `IDENTITY_VERIFIED_NON_EMAIL`+, canonical Enrollment/Athlete RIDs, `--acknowledge-prod`, declared mutations/cleanup, and scenario not blocked by PR #486.

Email `--execute` requires `IDENTITY_VERIFIED_EMAIL`. **Currently blocked** — `EMAIL_TEST_IDENTITY_NOT_CONFIGURED`.

Default: `--dry-run`. Fail closed otherwise.

## References

- `tools/testing/sc-test-control/config.js`
- `docs/testing/views/TESTING-VIEWS-SPEC.json` — filter RID `recn54wbxTjygydqa`
