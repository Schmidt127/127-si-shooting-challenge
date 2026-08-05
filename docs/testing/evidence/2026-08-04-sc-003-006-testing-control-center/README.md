# SC-003–SC-006 Testing Control Center — Evidence (2026-08-04)

| Field | Value |
|-------|--------|
| Branch | `agent/sc-003-006-testing-control-center` |
| PROD base | `appn84sqPw03zEbTT` |
| Schmidt Enrollment | `recgP9qZYjAhE7NXm` |
| Schmidt Athlete | `recgqVstObQRzgXJF` |
| Mode | PROD read-only verification + repository tooling |

## Status honesty (current — supersedes 2026-08-04 package-day rows below)

| SC | Highest honest status | Why |
|----|----------------------|-----|
| SC-003 | **Complete** (2026-08-05) | Install package + short-name aliases + Meta API verifier `--require-installed` **PASS** (10/10 required, 0 sanity fails); Schmidt rows visible; `Grid Testing View` not accepted for WAS. No remaining operator install step. |
| SC-004 | **Live Tested in PROD** | Fresh identity verifier **PASS** (17/17). Active athlete+enrollment, week, submissions, XP, WAS, homework, video, zoom links confirmed. Standings exclusion **not** added. |
| SC-005 | **Live Tested in PROD** | Executable matrix ran against PROD: **11 PASS / 4 BLOCKED / 2 NOT_TESTED / 0 FAIL**. Blocked rows need product decision or SC-008. |
| SC-006 | **Live Tested in PROD** | Expanded read-only verifier (identity/homework/video/zoom + writeback policy). Offline 11/11 PASS. Live bundles PASS. **No Airtable Pass/Fail writeback** (competing-writer risk). |

### Superseding closeout — SC-003 Complete (2026-08-05)

Earlier rows in this README (package day 2026-08-04) correctly recorded **Built in Repository** because canonical Testing views were then missing (9/10). That state is **historical only**.

Later evidence (recorded in the completion master reconciliation **2026-08-05 — SC-003 Testing Views short-name aliases**):

- Short-name aliases under Airtable section `02 TESTING` were added and accepted in `TESTING-VIEWS-SPEC.json`
- `node tools/testing/verify_testing_views.mjs --require-installed` passed (**10/10** required; **0** sanity failures)
- Schmidt testing rows were visible in the applicable views
- `Grid Testing View` was **not** accepted as the Weekly Athlete Summary testing view

**Decision:** SC-003 advances **Live Tested in PROD → Complete**. Optional rename to canonical `Testing - …` names is cosmetic only and not required for Complete.

Do **not** change SC-004 / SC-005 / SC-006 status from this closeout alone.

## Historical status honesty (this package day — 2026-08-04)

| SC | Status on 2026-08-04 | Why (historical) |
|----|----------------------|------------------|
| SC-003 | **Built in Repository** | Full install package + verifier shipped. Meta API then proved canonical Testing views were **not** installed (9/10 required missing). |
| SC-004 | **Live Tested in PROD** | Identity verifier PASS (17/17). |
| SC-005 | **Live Tested in PROD** | Matrix 11 PASS / 4 BLOCKED / 2 NOT_TESTED / 0 FAIL. |
| SC-006 | **Live Tested in PROD** | Expanded read-only verifier; writeback off. |

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

## Mike-only remaining (Airtable UI) — **SC-003 closed**

Historical install steps (Omni prompt / checklist / `--require-installed`) are **complete** for SC-003 as of 2026-08-05. Keep short aliases in sync if views are renamed. Re-run the verifier after any rename.

## Commands re-run

```bash
node --test tools/testing/tests/test_expected_actual.mjs
node tools/testing/verify_testing_views.mjs
node tools/testing/verify_schmidt_identity.mjs
node tools/testing/run_e2e_matrix.mjs
```
