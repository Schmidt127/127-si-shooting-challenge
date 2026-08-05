# SC-003–SC-006 Testing Control Center — Evidence (2026-08-04)

| Field | Value |
|-------|--------|
| Branch | `agent/sc-003-006-testing-control-center` |
| PROD base | `appn84sqPw03zEbTT` |
| Schmidt Enrollment | `recgP9qZYjAhE7NXm` |
| Schmidt Athlete | `recgqVstObQRzgXJF` |
| Mode | PROD read-only verification + repository tooling |

## Status honesty (this package)

| SC | Highest honest status | Why |
|----|----------------------|-----|
| SC-003 | **Built in Repository** | Full install package + verifier shipped. Meta API proves canonical Testing views are **not** installed (9/10 required missing). Do **not** mark Installed until Omni/Mike creates views and `--require-installed` passes. |
| SC-004 | **Live Tested in PROD** | Fresh identity verifier **PASS** (17/17). Active athlete+enrollment, week, submissions, XP, WAS, homework, video, zoom links confirmed. Standings exclusion **not** added. |
| SC-005 | **Live Tested in PROD** | Executable matrix ran against PROD: **11 PASS / 4 BLOCKED / 2 NOT_TESTED / 0 FAIL**. Blocked rows need product decision or SC-008. |
| SC-006 | **Live Tested in PROD** | Expanded read-only verifier (identity/homework/video/zoom + writeback policy). Offline 11/11 PASS. Live bundles PASS. **No Airtable Pass/Fail writeback** (competing-writer risk). |

## Artifacts

| File | Purpose |
|------|---------|
| `PROD-LIVE-SNAPSHOT.json` | Meta views + Schmidt link snapshot |
| `TESTING-VIEWS-VERIFY.json` | SC-003 view presence / sanity |
| `SCHMIDT-IDENTITY-VERIFY.json` | SC-004 identity PASS |
| `E2E-MATRIX-RESULTS.json` | SC-005 executable matrix results |
| `../views/*` | Omni prompt, checklist, machine spec |

## Key live record IDs (2026-08-04)

| Path | IDs |
|------|-----|
| Enrollment / Athlete | `recgP9qZYjAhE7NXm` / `recgqVstObQRzgXJF` (both Active?=true) |
| Foundation Week | `recVDKiYATgzsfpmE` |
| Current WAS | `recuxvGq2kY8WKcey` (Week `recWeVrSabnsYaHc2`) — prior foundation WAS `rechWp330MqSgRWzN` **deleted** |
| Seed scenario | `recPdyfYRFgDtpzQ8` → Linked Submission `recjt6QpUcprSIxAk` |
| Homework | HC `recrBnHbLvDpFyIeO` → XP `rec6xE4V1t0atiTIP` (`HOMEWORK_XP\|…`, 35) |
| Video Feedback | `recBqqe0uGMsqjUrF` |
| Zoom Attendance | `recfqsgM7zDobxsPf`, `receHkLl0cpLFLMVa`, `recJ8G7SOsk4XOsO9`, `recBA5Q6XcZDFU4dQ` |

## Mike-only remaining (Airtable UI)

1. Paste `docs/testing/views/OMNI-INSTALL-PROMPT.md` into Omni (or create views manually).
2. Complete `docs/testing/views/OPERATOR-CHECKLIST.md`.
3. Re-run `node tools/testing/verify_testing_views.mjs --require-installed`.
4. Only then advance SC-003 to **Installed in PROD** (then Live Tested after opening views and confirming Schmidt rows).

## Commands re-run

```bash
node --test tools/testing/tests/test_expected_actual.mjs
node tools/testing/verify_testing_views.mjs
node tools/testing/verify_schmidt_identity.mjs
node tools/testing/run_e2e_matrix.mjs
```
