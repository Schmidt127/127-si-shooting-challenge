# SC-009 — Photo homework E2E evidence (2026-08-04)

| Field | Value |
|-------|--------|
| Date | 2026-08-04 / 2026-08-05 UTC |
| Base | PROD `appn84sqPw03zEbTT` |
| Enrollment | Testing Schmidt `recgP9qZYjAhE7NXm` |
| Parent email | `mschmidt@fairfield.k12.mt.us` (Schmidt-only) |
| Result | **PASS** (Live Tested) — coach review + one-time XP + S3 image writeback + reviewer URL |

## Primary PNG proof

| Step | Record / value |
|------|----------------|
| Submission | `rec3BHRPdtlv806do` |
| Submission Asset | `rec9qz0QHSUzgWA1y` |
| Homework Completion | `recRi12lcH2epFi2L` (HW1 Shot Tracker Usage) |
| Week | `recnMGC2JBHjO0ay6` |
| Homework | `rechVLOeyEVIqmy2v` |
| Route | `homework_completion` / automationNumber `070a` |
| Upload path | PROD Lambda direct invoke with 070a payload (`actionOut=uploaded`) |
| Storage Key | `shooting-challenge/2025-2026/shooting-challenge/schmidt-testing/2026-08-04-homework-rec9qz0QHSUzgWA1y-sc009-controlled-logo.png` |
| MIME | `image/png` |
| SHA-256 | `448c3126df730cf6b0cf6875f77f1f726b1fa3a2b4c36bb631b326981b25f967` |
| Upload Status | `Uploaded` |
| Upload Error | blank |
| Canonical File URL | populated (anonymous GET → **403**) |
| Reviewer File URL | opens immediately (**200** `image/png`) |
| Invalid token | **403** |
| Retry | `skipped_already_uploaded`; hash/key unchanged |
| XP Event | `recuG91F7fKXKtV74` — `HOMEWORK_XP\|recRi12lcH2epFi2L` — **35** pts — exactly one |
| Duplicate review | still one XP / one HC / one asset |
| Email-ready | `Upload Ready?=1`, `Parent Feedback Ready?=true`, `Award Status=Awarded`, Schmidt parent only |

Artifact: [`SC-009-png-E2E.json`](./SC-009-png-E2E.json)

## JPG proof

| Step | Record / value |
|------|----------------|
| Submission | `recQxnFNmoOvXgGoR` |
| Asset | `recoitXYwn2CWxrtc` |
| HC | `recR4RaQNukzAcCi7` (HW4) |
| MIME | `image/jpeg` |
| Storage Key | `…/2026-08-04-homework-recoitXYwn2CWxrtc-sc009-controlled-w3c.jpg` |
| XP | `recj3WDcOlELESgew` — `HOMEWORK_XP\|recR4RaQNukzAcCi7` |

Artifact: [`SC-009-jpg-E2E.json`](./SC-009-jpg-E2E.json)

## Negative paths

| Test | Result |
|------|--------|
| Blank / missing attachment | `error_missing_attachment` / Upload Status=`Error` — PASS |
| Invalid reviewer token | HTTP 403 — PASS |
| Retry already uploaded | `skipped_already_uploaded` — PASS |
| Duplicate coach review | XP count remains 1 — PASS |

Artifact: [`SC-009-blank-attachment-failure.json`](./SC-009-blank-attachment-failure.json)

## PROD repairs applied this session

1. **Submission Assets `Writeback Complete?`** — gates on Canonical File URL + Storage Key + SHA-256 + Uploaded At (removed Google Drive gate).
2. **Homework Completions `Upload Ready?`** — enrollment + (legacy HC attachment **OR** Fillout quiz **OR** linked assets all Uploaded).
3. **070a script → v4.5** in GitHub — skip when Canonical/S3 already uploaded; keep Drive legacy skip. **PROD Airtable paste of v4.5 still required.**

## Make / 070a note (dependency)

Make webhook accepted a `070a` / `homework_completion` payload (`HTTP 200 Accepted`) but did **not** produce Airtable S3 writeback in this window. PROD Lambda invoke with the same payload **did** upload and write back. Treat automatic Make Module completion as **SC-101 / SC-095 follow-up**; do not block photo storage proof on that gap.

## Cleanup

Controlled Schmidt rows retained as evidence (PNG + JPG + blank-attachment HC). Safe to delete later if Mike wants a clean base; no real-family emails were targeted.

## Runner

[`_run_sc009_photo_e2e.py`](./_run_sc009_photo_e2e.py) — Schmidt-only harness (URL sanitization for session Function URL leading `/`).
