# SC-009 — Photo homework E2E evidence (2026-08-04)

| Field | Value |
|-------|--------|
| Date | 2026-08-04 / 2026-08-05 UTC |
| Base | PROD `appn84sqPw03zEbTT` |
| Enrollment | Testing Schmidt `recgP9qZYjAhE7NXm` |
| Parent email | `mschmidt@fairfield.k12.mt.us` (Schmidt-only) |
| Result | **PASS** (Complete) — coach review + one-time XP + S3 image writeback + reviewer URL; **070a v4.5 installed**; final post-paste Make→Lambda writeback **operator-attested** 2026-08-05 |

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
3. **070a script → v4.5** in GitHub — skip when Canonical/S3 already uploaded; keep Drive legacy skip. **PROD Airtable paste completed 2026-08-05 (Mike).**

## Closeout — Mike operator-attested final rerun (2026-08-05)

Mike completed the remaining PROD follow-ups after the recorded PNG/JPG evidence above:

| Item | Result |
|------|--------|
| 070a v4.5 pasted into PROD Airtable | **Done** |
| Controlled Schmidt homework image test | **PASS** (Mike operator-attested final rerun) |
| Make invoked working upload path / PROD Lambda | **PASS** |
| Final Airtable writeback on Submission Asset | **PASS** (successful Uploaded state) |
| Reviewer File URL | **PASS** |
| Canonical File URL anonymous access | **Denied** (private S3 unchanged) |
| Homework Completion + one-time XP | **PASS** (no duplicate XP) |
| Second upload writer | **Not created** |
| Earlier “Accepted without Airtable writeback” concern | **Did not remain** on this final successful test |

Record IDs for this final manual rerun were **not** captured in a new JSON artifact. Do not invent IDs. Rely on Mike’s operator attestation plus the preserved 2026-08-04 PNG/JPG evidence for detailed field-level proof.

## Make / 070a note (resolved 2026-08-05)

Earlier session: Make webhook returned `Accepted` without Airtable S3 writeback in one window; Lambda direct invoke succeeded. **Final post-paste Schmidt rerun (Mike):** Make → Lambda → Airtable writeback completed correctly. SC-101 homework routing closed by that attestation; video routing remains covered by C-013 PROD evidence.

## Cleanup

Controlled Schmidt rows retained as evidence (PNG + JPG + blank-attachment HC). Safe to delete later if Mike wants a clean base; no real-family emails were targeted.

## Runner

[`_run_sc009_photo_e2e.py`](./_run_sc009_photo_e2e.py) — Schmidt-only harness (URL sanitization for session Function URL leading `/`).
