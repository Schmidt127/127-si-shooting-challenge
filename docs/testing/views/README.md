# SC-003 Operator Checklist — Testing Views (PROD)

| Field | Value |
|-------|--------|
| Base | PROD `appn84sqPw03zEbTT` |
| Schmidt Enrollment | `recgP9qZYjAhE7NXm` |
| Spec | [`TESTING-VIEWS-SPEC.json`](./TESTING-VIEWS-SPEC.json) |
| Omni prompt | [`OMNI-INSTALL-PROMPT.md`](./OMNI-INSTALL-PROMPT.md) |
| Verifier | `node tools/testing/verify_testing_views.mjs` |
| Rule | Do **not** hide Schmidt from public standings |

## Before you start

- [ ] Confirm you are in **PROD** (not DEV)
- [ ] Confirm Schmidt Enrollment `recgP9qZYjAhE7NXm` still exists and **Active?=true**
- [ ] Prefer Omni paste of `OMNI-INSTALL-PROMPT.md`, or create views manually

## Install checklist

| # | Table | Canonical view name | Filter | Created? | Rows look Schmidt-only? | Known ID visible? |
|---|-------|---------------------|--------|----------|-------------------------|-------------------|
| 1 | Testing Scenarios | `Testing - Schmidt Scenarios` | Related Enrollment = Schmidt | ☐ | ☐ | `recPdyfYRFgDtpzQ8` ☐ |
| 2 | Submissions | `Testing - Schmidt Submissions` | Enrollment = Schmidt | ☐ | ☐ | any of `recuuTBgstSTGg2E3` / `recjt6QpUcprSIxAk` ☐ |
| 3 | XP Events | `Testing - Schmidt XP Events` | Enrollment = Schmidt | ☐ | ☐ **not ~2500** | Source Key `SUBMISSION_XP\|…` ☐ |
| 4 | Weekly Athlete Summary | `Testing - Schmidt WAS` | Enrollment = Schmidt | ☐ | ☐ | `recuxvGq2kY8WKcey` ☐ |
| 5 | Submission Assets | `Testing - Schmidt Assets` | Enrollment - Linked = Schmidt | ☐ | ☐ **not ~280** | (0 OK) ☐ |
| 6 | Homework Completions | `Testing - Schmidt Homework Completions` | Enrollment = Schmidt | ☐ | ☐ | `recrBnHbLvDpFyIeO` ☐ |
| 7 | Video Feedback | `Testing - Schmidt Video Feedback` | Enrollment = Schmidt | ☐ | ☐ | `recBqqe0uGMsqjUrF` ☐ |
| 8 | Athlete Achievement Unlocks | `Testing - Schmidt Unlocks` (or filtered `Testing`) | Enrollment = Schmidt | ☐ | ☐ | (0 OK) ☐ |
| 9 | Enrollments | `Testing - Schmidt Enrollment` | RID / Athlete Schmidt | ☐ | ☐ **exactly 1** | `recgP9qZYjAhE7NXm` ☐ |
| 10 | Weeks | `Testing - Seeded Weeks` | Manual seeded weeks | ☐ | ☐ | `recVDKiYATgzsfpmE` ☐ |
| 11 | Zoom Attendance (optional) | `Testing - Schmidt Zoom Attendance` | Enrollment = Schmidt | ☐ | ☐ | any ZA ☐ |

## Verification after install

```bash
node tools/testing/verify_testing_views.mjs
node tools/testing/verify_testing_views.mjs --require-installed
```

- [ ] Verifier reports each canonical view **present** by Meta API name
- [ ] View row counts via Data API are not orphan-scale for XP/Assets
- [ ] Expected Schmidt record IDs appear when counting through the view (where data exists)
- [ ] No new public-standings exclusion of Schmidt was added

## Sign-off

| Field | Value |
|-------|--------|
| Operator | |
| Date | |
| Omni used? | ☐ |
| Manual UI used? | ☐ |
| Verifier JSON path | `docs/testing/evidence/.../TESTING-VIEWS-VERIFY.json` |
| SC-003 may advance to Installed in PROD? | ☐ only if names exist + counts sane + Schmidt visible |

## Honesty gate

Do **not** mark SC-003 Installed / Live Tested / Complete from Omni text alone. Require Meta API name presence + sane view row counts + known Schmidt IDs visible.
