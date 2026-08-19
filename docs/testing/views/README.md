# SC-003 Operator Checklist — Testing Views (PROD)

| Field | Value |
|-------|--------|
| Base | PROD `appn84sqPw03zEbTT` |
| Schmidt Enrollment | `recgP9qZYjAhE7NXm` |
| Spec | [`TESTING-VIEWS-SPEC.json`](./TESTING-VIEWS-SPEC.json) |
| Omni prompt | [`OMNI-INSTALL-PROMPT.md`](./OMNI-INSTALL-PROMPT.md) |
| Verifier | `node tools/testing/verify_testing_views.mjs` |
| Rule | Do **not** hide Schmidt from public standings |
| PROD naming | Views may live under Airtable section **`02 TESTING`** with **short names** (e.g. `Schmidt WAS`). Canonical `Testing - …` names remain preferred; short names are accepted aliases in `TESTING-VIEWS-SPEC.json`. Section names are not API-visible — match by table + view name only. |

## Before you start

- [ ] Confirm you are in **PROD** (not Production)
- [ ] Confirm Schmidt Enrollment `recgP9qZYjAhE7NXm` still exists and **Active?=true**
- [ ] Prefer Omni paste of `OMNI-INSTALL-PROMPT.md`, or create views manually

## Install checklist

| # | Table | Canonical view name | Accepted short alias (PROD) | Filter | Created? | Rows look Schmidt-only? | Known ID visible? |
|---|-------|---------------------|----------------------------|--------|----------|-------------------------|-------------------|
| 1 | Testing Scenarios | `Testing - Schmidt Scenarios` | `Schmidt Testing` | Related Enrollment = Schmidt | ☐ | ☐ | `recPdyfYRFgDtpzQ8` ☐ |
| 2 | Submissions | `Testing - Schmidt Submissions` | `Schmidt Submissions` | Enrollment = Schmidt | ☐ | ☐ | any of `recuuTBgstSTGg2E3` / `recjt6QpUcprSIxAk` ☐ |
| 3 | XP Events | `Testing - Schmidt XP Events` | `Schmidt XP Events` | Enrollment = Schmidt | ☐ | ☐ **not ~2500** | Source Key `SUBMISSION_XP\|…` ☐ |
| 4 | Weekly Athlete Summary | `Testing - Schmidt WAS` | `Schmidt WAS` | Enrollment = Schmidt | ☐ | ☐ | `recuxvGq2kY8WKcey` ☐ |
| 5 | Submission Assets | `Testing - Schmidt Assets` | `Schmidt Assets` | Enrollment - Linked = Schmidt | ☐ | ☐ **not ~280** | (0 OK) ☐ |
| 6 | Homework Completions | `Testing - Schmidt Homework Completions` | `Schmidt Homework Completions` | Enrollment = Schmidt | ☐ | ☐ | `recrBnHbLvDpFyIeO` ☐ |
| 7 | Video Feedback | `Testing - Schmidt Video Feedback` | `Schmidt Video Feedback` | Enrollment = Schmidt | ☐ | ☐ | `recBqqe0uGMsqjUrF` ☐ |
| 8 | Athlete Achievement Unlocks | `Testing - Schmidt Unlocks` | `Schmidt Unlocks` (or `Testing`) | Enrollment = Schmidt | ☐ | ☐ | (0 OK) ☐ |
| 9 | Enrollments | `Testing - Schmidt Enrollment` | `Schmidt Enrollment` | RID / Athlete Schmidt | ☐ | ☐ **exactly 1** | `recgP9qZYjAhE7NXm` ☐ |
| 10 | Weeks | `Testing - Seeded Weeks` | `Seeded Weeks` | Manual seeded weeks | ☐ | ☐ | `recVDKiYATgzsfpmE` ☐ |
| 11 | Zoom Attendance (optional) | `Testing - Schmidt Zoom Attendance` | `Schmidt Zoom Attendance` | Enrollment = Schmidt | ☐ | ☐ | any ZA ☐ |

## Verification after install

```bash
node tools/testing/verify_testing_views.mjs
node tools/testing/verify_testing_views.mjs --require-installed
```

- [ ] Verifier reports each required view **present** (canonical name or accepted short alias)
- [ ] View row counts via Data API are not orphan-scale for XP/Assets
- [ ] Expected Schmidt record IDs appear when counting through the view (where data exists)
- [ ] No new public-standings exclusion of Schmidt was added
- [ ] Do **not** treat `Grid Testing View` on WAS as a match unless Schmidt IDs + sane counts are proven separately (default: unacceptable)

## Sign-off

| Field | Value |
|-------|--------|
| Operator | (PROD short-name install attested 2026-08-05) |
| Date | 2026-08-05 |
| Omni used? | ☐ |
| Manual UI used? | ☐ |
| Verifier JSON path | `docs/testing/evidence/2026-08-04-sc-003-006-testing-control-center/TESTING-VIEWS-VERIFY.json` (+ aliases pass 2026-08-05) |
| SC-003 final status | **Complete** (2026-08-05) — 10/10 `--require-installed`; optional canonical rename not required |

## Honesty gate

Do **not** mark SC-003 Installed / Live Tested / Complete from Omni text alone. Require Meta API name presence + sane view row counts + known Schmidt IDs visible. **That bar was met 2026-08-05** (short aliases under `02 TESTING`). Current completion-master status is **Complete**; re-run verifier after renames.
