# SC-112 — Athlete dashboard parent magic-link auth

**Status:** Merged to `master` (PR #352, merge commit on master) · **Preview proof required before Production enablement**

Authority: [web/docs/athlete-auth-architecture.md](../../web/docs/athlete-auth-architecture.md) · [ATHLETE-AUTH-DECISION.md](../overnight/web-integration/ATHLETE-AUTH-DECISION.md)

**Scope:** Web `/shoot` dashboard authentication only. Does **not** change Airtable automations, Communications Hub handoff, parent-email Live cutover (PR #350), Automation 101/117, or SC-147.

---

## Safe defaults (Production today)

| Variable | Production default | Notes |
|----------|-------------------|--------|
| `ATHLETE_AUTH_ENABLED` | **unset / false** | Dashboard shows coming-soon placeholder |
| `ATHLETE_AUTH_TEST_MODE` | **unset / false** until Preview proof | When true, all magic links go to test recipient only |
| `ATHLETE_AUTH_DEV_BYPASS` | **must not be set in Production** | Blocked when `NODE_ENV=production` |

Public catalog routes and approved public athlete profiles remain public without auth.

---

## Required environment variable names

**Preview and Production (when enabling auth):**

- `ATHLETE_AUTH_ENABLED`
- `ATHLETE_AUTH_SECRET` (Mike generates ≥32 random characters; never commit)
- `ATHLETE_AUTH_TEST_MODE`
- `ATHLETE_AUTH_TEST_RECIPIENT`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

**Optional:**

- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (recommended for multi-instance token store)
- `ATHLETE_AUTH_TOKEN_TTL_MINUTES` (default 15)
- `ATHLETE_AUTH_SESSION_TTL_DAYS` (default 30)

**Unchanged:** `AIRTABLE_API_TOKEN`, `AIRTABLE_BASE_ID`, `SITE_ACCESS_TOKEN`, `NEXT_PUBLIC_*`.

Configure on the Vercel **`web`** project (Root Directory = `web`). Use **Preview** scope first; copy to Production only after checklist below passes.

---

## Preview setup (Mike / operator)

1. Open Vercel → project `127-si-shooting-challenge` → Settings → Environment Variables → **Preview**.
2. Set:
   - `ATHLETE_AUTH_ENABLED` = `true`
   - `ATHLETE_AUTH_SECRET` = *(Mike-provided secure value)*
   - `ATHLETE_AUTH_TEST_MODE` = `true`
   - `ATHLETE_AUTH_TEST_RECIPIENT` = `schmidt@fairfieldbasketballclub.com`
   - `RESEND_API_KEY` = *(existing Resend key; do not rotate unless needed)*
   - `RESEND_FROM_EMAIL` = *(verified Resend sender for 127 SI)*
3. Optional: add Upstash Redis URL/token for shared magic-link token invalidation.
4. Redeploy Preview from `master` (do **not** promote to Production yet).

---

## Preview test procedure

Use **only** `schmidt@fairfieldbasketballclub.com` as the delivery inbox during test mode.

1. **Anonymous dashboard:** Open `/shoot/dashboard` → expect redirect to `/shoot/dashboard/sign-in` or coming-soon if auth not yet enabled on that deployment.
2. **Generic confirmation:** POST sign-in form (or `/shoot/api/auth/magic-link`) with any valid non-Gmail parent email → same friendly JSON message whether or not the email exists in Enrollments.
3. **Test-mode delivery:** Confirm magic-link email arrives **only** at `schmidt@fairfieldbasketballclub.com`, not at the submitted address.
4. **Link works once:** Open the link → lands on `/shoot/dashboard` with authenticated session.
5. **Authorized data only:** Dashboard shows enrollment(s) for the verified parent email only.
6. **URL tampering:** Append `?enrollmentId=rec…` for an unauthorized enrollment → access denied message; no other athlete data.
7. **Reuse rejected:** Open the same magic link again → sign-in error (used/expired).
8. **Sign out:** Use Sign out → session cleared; `/shoot/dashboard` protected again.
9. **Privacy:** Browser must not show Airtable record IDs, raw tokens, or internal errors.
10. **Public surface:** `/shoot/leaderboard`, `/shoot/homework`, `/shoot/athletes/[slug]` (approved profiles) still work anonymously.
11. **Keep** `ATHLETE_AUTH_TEST_MODE=true` after Preview proof until Mike explicitly schedules Production family delivery.

Capture screenshots or a short screen recording for Phase 5 closeout.

---

## Production enablement procedure

**Only after Preview checklist passes and Mike approves.**

Preconditions:

- Preview proof documented (dated evidence).
- Confirm no requirement to authenticate real active family enrollments during this test window, **or** accept that test mode still redirects all mail to schmidt@.
- `ATHLETE_AUTH_TEST_MODE` remains **`true`** for the first Production enablement slice.

Steps:

1. Vercel → **Production** environment variables:
   - Set `ATHLETE_AUTH_ENABLED` = `true`
   - Ensure `ATHLETE_AUTH_SECRET`, `RESEND_*`, and test-mode vars match Preview-approved values.
   - **Do not** set `ATHLETE_AUTH_TEST_MODE=false` until a separate approved cutover.
2. Promote/deploy Production from the same `master` SHA that passed Preview.
3. Smoke-test with schmidt@ only (same as Preview).
4. Document Production enablement date in `CHANGELOG.md` under `### Web` when Mike confirms.

**Do not:** change parent-email Live cutover settings, Automation 101/117/079, Hub templates, or Airtable data as part of SC-112.

---

## Rollback procedure

If the dashboard misbehaves after enablement:

1. Vercel Production → set `ATHLETE_AUTH_ENABLED` = `false` (or remove the variable).
2. Redeploy Production → dashboard returns to safe coming-soon placeholder; public catalog unchanged.
3. Leave `ATHLETE_AUTH_TEST_MODE=true` until root cause is understood.
4. Do **not** delete Upstash keys, Resend config, or unrelated env vars without a scoped plan.
5. Do **not** modify Airtable enrollments or automations for rollback.

---

## Automated test commands (repo)

From `web/`:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e -- tests/dashboard-privacy.spec.ts
ATHLETE_AUTH_ENABLED=true ATHLETE_AUTH_SECRET=<secret> ATHLETE_AUTH_TEST_MODE=true ATHLETE_AUTH_DEV_BYPASS=true npm run test:e2e -- tests/athlete-auth-privacy.spec.ts
npm run test:smoke
```

---

## Remaining SC-112 work (future)

- Optional Hub template `DASHBOARD_MAGIC_LINK` if Mike wants all outbound mail in Hub audit logs.
- Multi-enrollment family picker when one parent email maps to several active athletes.
- Separate parent vs athlete account views (product decision pending).
- Upstash Redis required for reliable single-use tokens at Production scale (in-memory store is per-instance only).
