# SC-172 — Production verification (2026-09-10)

**Status:** **Health LIVE** · **Diagnostics fail-closed (no token)** · **`ADMIN_DIAGNOSTICS_TOKEN` pending Mike**  
**Backlog:** SC-172  
**GitHub:** PR **#505** merged `master` @ `ba3f17dd`  
**Probe time:** 2026-09-10 (UTC, agent curl against Production)

---

## Live probe results

| URL | Method | HTTP | Body / behavior |
|---|---|---|---|
| `/shoot/api/health` | GET | **200** | `{"status":"ok"}` |
| `/shoot/api/admin/diagnostics` | GET (no auth) | **403** | `Admin diagnostics gate is not configured. Set ADMIN_DIAGNOSTICS_TOKEN (preferred) or SITE_ACCESS_TOKEN.` |
| `/shoot/admin/diagnostics` | GET (no auth) | **200** | HTML **Forbidden** error state — no config payload rendered |
| `/shoot/api/curriculum/redeem` | POST (no auth) | **401** | Route exists (not 404) |
| `/shoot/api/curriculum/homework/submit` | POST (no auth) | **401** | Route exists (not 404) |

**Interpretation:** Vercel Production has deployed SC-172. Public health probe works. Diagnostics correctly fail closed because neither `ADMIN_DIAGNOSTICS_TOKEN` nor `SITE_ACCESS_TOKEN` gate is configured for staff access.

---

## Remaining operator steps

1. Set **`ADMIN_DIAGNOSTICS_TOKEN`** in Vercel Production (Shooting Challenge project).
2. Re-probe diagnostics with Bearer token — expect **200**, `secretsExposed: false`, `athleteDataExposed: false`.
3. Mark SC-172 **COMPLETE / Live Tested** after gated probe passes.

Checklist: [`docs/deploy-checklists/SC-172-health-admin-diagnostics.md`](../deploy-checklists/SC-172-health-admin-diagnostics.md)

---

## Structured homework (SC-side routes only)

Curriculum API routes from PR **#504** are live on Production (401 without secrets). Hub Production redeem/submit URL configuration remains a **separate Hub operator step** — see [`docs/deploy-checklists/structured-curriculum-hub-production-cutover.md`](../deploy-checklists/structured-curriculum-hub-production-cutover.md).
