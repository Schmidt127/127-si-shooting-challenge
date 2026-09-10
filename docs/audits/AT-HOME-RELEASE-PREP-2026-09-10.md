# At-home release prep — 2026-09-10

**Status:** **SC-172 LIVE on Production (health 200)** · diagnostics fail-closed pending `ADMIN_DIAGNOSTICS_TOKEN` · Hub PR **#21** open · Live E2E not run  
**Repos:** `Schmidt127/127-si-shooting-challenge` · Curriculum Hub (separate) · `Schmidt127/communications` (Hub PR context)  
**Production base:** `appn84sqPw03zEbTT` (Shooting Challenge)

---

## Executive summary

Pre-release verification for Shooting Challenge health/diagnostics (**SC-172**) and Curriculum Hub structured homework (**PR #21**). SC-172 CI and Vercel preview were green; routes were absent from production before merge. Hub typecheck/tests/build passed; Hub Production redeem and submit URLs were empty; Hub Airtable Submission Outbox was missing five retry fields.

**Merge outcome (follow-up):** PR **#505** merged to `master` @ `ba3f17dd`. Vercel Production deployed SC-172 — health **200** on live probe; diagnostics **403** until `ADMIN_DIAGNOSTICS_TOKEN` is set. Evidence: [`SC-172-PRODUCTION-VERIFY-20260910.md`](./SC-172-PRODUCTION-VERIFY-20260910.md).

---

## SC-172 — Shooting Challenge health + admin diagnostics

| Item | Value |
|---|---|
| Branch | `fix/sc-172-health-admin-diagnostics` |
| Commit | `11230270` |
| PR | [#505](https://github.com/Schmidt127/127si-shooting-challenge/pull/505) — **MERGED** → `ba3f17dd` |
| CI | Green (Web CI) |
| Vercel preview | Ready |
| Production (pre-merge) | On PR **#504** slice; `/shoot/api/health`, `/shoot/admin/diagnostics`, `/shoot/api/admin/diagnostics` returned **404** |

### Routes shipped

| URL | Auth | Response |
|---|---|---|
| `GET /shoot/api/health` | Public | `{ "status": "ok" }` only |
| `GET /shoot/api/admin/diagnostics` | Staff (`ADMIN_DIAGNOSTICS_TOKEN` preferred; else `SITE_ACCESS_TOKEN`) | Config presence; no secrets or athlete data |
| `GET /shoot/admin/diagnostics` | Same as API | HTML operator view |

### Local verification (agent re-run post-merge)

| Check | Result |
|---|---|
| `npm run typecheck` (`web/`) | PASS |
| `npm test` (`web/`) | **780 passed**, 1 skipped |
| `npm run build` (`web/`) | PASS |

### Operator gaps (post-deploy)

1. **`ADMIN_DIAGNOSTICS_TOKEN`** — not set in Vercel Production at prep time. Diagnostics fail closed until set (preferred staff gate).
2. **Production smoke** — after Vercel promotes `master`, verify health 200 and diagnostics 401 without token / 200 with token.

Checklist: [`docs/deploy-checklists/SC-172-health-admin-diagnostics.md`](../deploy-checklists/SC-172-health-admin-diagnostics.md)

---

## Curriculum Hub — PR #21

| Item | Result |
|---|---|
| PR state | Open, mergeable |
| Typecheck / tests / build | PASS |
| Lint | Failed on a purity rule (non-blocking for functional prep) |
| Older SHAs | `aa5cc44`, `2eead07`, `b07c7b9` not found on remote; current PR commits cover features |
| Retry payload | JSON (not encrypted) |
| Protected diagnostics route | Not found in Hub repo |

### Hub Production environment gaps

| Variable / setting | Prep finding |
|---|---|
| Redeem URL | **Empty** in Production |
| Submit URL | **Empty** in Production |
| Upload URL | Correct |

**Required before live structured homework E2E:** set Hub Production redeem + submit URLs to Shooting Challenge endpoints (see [`docs/deploy-checklists/structured-curriculum-vercel-env-checklist.md`](../deploy-checklists/structured-curriculum-vercel-env-checklist.md) and Hub operator docs).

---

## Hub Airtable — Submission Outbox (read-only check)

Five retry-dependent fields were **missing** at prep time:

| Field | Purpose |
|---|---|
| Retry Payload | Stored JSON for delivery retry |
| Delivery Attempt Count | Monotonic attempt counter |
| Last Attempt At | Timestamp of last try |
| Delivered At | Successful delivery timestamp |
| Processing Claim | Concurrency / claim lock for workers |

**Action:** Mike adds fields in Hub Airtable (schema change — not agent-automated) before any retry-dependent live test.

---

## Vercel settings (names only)

Verified by name during prep; **no secret values recorded**.

### Shooting Challenge (`127-si-shooting-challenge`)

- Root Directory: `web`
- `NEXT_PUBLIC_BASE_PATH`: `/shoot`
- Curriculum + Airtable + Redis vars per structured checklist
- `ADMIN_DIAGNOSTICS_TOKEN`: unset at prep

### Curriculum Hub (separate project)

- Redeem / submit URL vars empty in Production (upload URL present)

---

## Production probe (post-merge)

| URL | Result (2026-09-10) |
|---|---|
| `GET /shoot/api/health` | **200** `{"status":"ok"}` |
| `GET /shoot/api/admin/diagnostics` (no auth) | **403** — gate not configured |
| `GET /shoot/admin/diagnostics` (no auth) | **200** HTML Forbidden (no payload) |

Full probe log: [`SC-172-PRODUCTION-VERIFY-20260910.md`](./SC-172-PRODUCTION-VERIFY-20260910.md)

---

## Live E2E

**Not executed** — no authorized live submission this session. Blockers for a future live pass:

1. ~~Vercel Production deploy of SC-172~~ **DONE** (health 200)
2. **`ADMIN_DIAGNOSTICS_TOKEN`** on Shooting Challenge Production
3. Hub Production redeem + submit URLs
4. ~~Hub Outbox five retry fields~~ **DONE — Mike UI 2026-09-10**
5. Disposable test enrollment + Mike allowlist

---

## Ordered operator next steps

1. ~~Confirm Vercel Production deployed `master` after PR **#505** merge~~ **DONE**
2. Set **`ADMIN_DIAGNOSTICS_TOKEN`** in Shooting Challenge Vercel Production; smoke gated diagnostics.
3. Set Hub Production **redeem** and **submit** URLs — [`deploy-checklists/structured-curriculum-hub-production-cutover.md`](../deploy-checklists/structured-curriculum-hub-production-cutover.md)
4. ~~Add five **Submission Outbox** retry fields in Hub Airtable~~ **DONE — Mike UI 2026-09-10**
5. Run one disposable structured-homework E2E on allowlisted email when steps 2–3 are complete.

---

## References

- SC-172 backlog: [`docs/127-SI-MASTER-FUTURE-WORK-LIST.md`](../127-SI-MASTER-FUTURE-WORK-LIST.md) § SC-172
- Structured homework audit: [`docs/audits/structured-homework-pre-vercel-work.md`](./structured-homework-pre-vercel-work.md)
- Submit auth contract: [`docs/interfaces/curriculum-hub-submit-authorization.md`](../interfaces/curriculum-hub-submit-authorization.md)
