# SC-172 — Production health + admin diagnostics

**Backlog:** SC-172  
**GitHub:** PR **#505** merged to `master` @ `ba3f17dd` (2026-09-10)  
**Vercel project:** `127-si-shooting-challenge` (Root Directory `web`)  
**Public base path:** `/shoot`

---

## What shipped

| Route | Auth | Notes |
|---|---|---|
| `GET /shoot/api/health` | **Public** | `{ "status": "ok" }` only; stays public even when site-access gate is on |
| `GET /shoot/api/admin/diagnostics` | Staff | JSON config presence; no secrets or athlete data |
| `GET /shoot/admin/diagnostics` | Staff | HTML operator page |

Auth order:

1. **`ADMIN_DIAGNOSTICS_TOKEN`** (preferred) — Bearer header, cookie `admin_diagnostics_token`, or query `admin_diagnostics_token`
2. Else **`SITE_ACCESS_TOKEN`** when site-access gate is enabled
3. Athlete/parent sessions **never** grant diagnostics access
4. Fail closed when neither admin nor site gate is configured

---

## Mike — Vercel Production (Shooting Challenge)

### 1. Confirm deploy

After merge to `master`, confirm Vercel Production finished deploying the commit that includes SC-172 (`ba3f17dd` or later).

**Verified 2026-09-10:** `GET /shoot/api/health` → **200**. Evidence: [`docs/audits/SC-172-PRODUCTION-VERIFY-20260910.md`](../audits/SC-172-PRODUCTION-VERIFY-20260910.md).

### 2. Set admin diagnostics token

In Vercel → **127-si-shooting-challenge** → Settings → Environment Variables → **Production**:

| Variable | Value | Notes |
|---|---|---|
| `ADMIN_DIAGNOSTICS_TOKEN` | New random string (≥32 chars) | **Do not commit.** Prefer dedicated token over reusing `SITE_ACCESS_TOKEN`. |

Redeploy Production if Vercel does not auto-redeploy on env change.

Reference: [`web/.env.example`](../../web/.env.example)

### 3. Smoke tests (Production)

```bash
# Public health — expect 200 + {"status":"ok"}
curl -sS "https://www.fairfieldbasketballclub.com/shoot/api/health"

# Diagnostics without token — expect 401 or 403
curl -sS -o /dev/null -w "%{http_code}\n" \
  "https://www.fairfieldbasketballclub.com/shoot/api/admin/diagnostics"

# Diagnostics with token — expect 200; body must not contain pat/rec/app ids or Bearer secrets
curl -sS -H "Authorization: Bearer <ADMIN_DIAGNOSTICS_TOKEN>" \
  "https://www.fairfieldbasketballclub.com/shoot/api/admin/diagnostics"
```

Browser (optional): open `/shoot/admin/diagnostics?admin_diagnostics_token=<token>` once to confirm HTML view.

**Pass criteria:**

- Health returns only `{ "status": "ok" }`
- Ungated diagnostics return 401/403
- Gated diagnostics return `ok: true`, `secretsExposed: false`, `athleteDataExposed: false`
- No Airtable PAT, record IDs, or raw secret values in response

---

## Curriculum Hub — required before structured homework live E2E

These are **Hub** (separate repo / Vercel project) steps documented here because they blocked at-home prep. SC-172 deploy alone does not unblock Hub submit.

### Hub Production URLs (prep found empty)

Set in Hub Vercel **Production** (exact env names per Hub repo — typical pattern):

| Setting | Target (Shooting Challenge Production) |
|---|---|
| Redeem URL | `https://www.fairfieldbasketballclub.com/shoot/api/curriculum/redeem` |
| Submit URL | `https://www.fairfieldbasketballclub.com/shoot/api/curriculum/homework/submit` |
| Upload URL | Already correct at prep — verify unchanged |

Also confirm Hub stores and forwards `submitAuthorizationToken` from redeem on every submit. Contract: [`docs/interfaces/curriculum-hub-submit-authorization.md`](../interfaces/curriculum-hub-submit-authorization.md)

Full SC-side env checklist: [`structured-curriculum-vercel-env-checklist.md`](./structured-curriculum-vercel-env-checklist.md)

### Hub Airtable — Submission Outbox fields

Add before retry-dependent live tests (Mike UI / OMNI — schema change):

| Field | Suggested type |
|---|---|
| Retry Payload | Long text (JSON) |
| Delivery Attempt Count | Number |
| Last Attempt At | Date/time |
| Delivered At | Date/time |
| Processing Claim | Single line text or formula per Hub design |

---

## Rollback

Revert Vercel Production to the deployment before `ba3f17dd`, or redeploy prior `master` SHA. Routes are additive; rollback removes health/diagnostics endpoints only — no Airtable or automation impact.

---

## Evidence

- Prep audit: [`docs/audits/AT-HOME-RELEASE-PREP-2026-09-10.md`](../audits/AT-HOME-RELEASE-PREP-2026-09-10.md)
- Implementation: `web/lib/ops/diagnostics.ts`, `web/app/api/health/route.ts`, `web/app/api/admin/diagnostics/route.ts`
