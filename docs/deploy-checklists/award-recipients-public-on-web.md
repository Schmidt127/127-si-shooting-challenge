# Award Recipients — Public On Web (deploy / verification)

**Date:** 2026-09-03  
**Backlog:** SC-112  
**Branch:** `feature/sc-112-public-on-web`  
**Git base (PR #378 merge):** `a0e84533` · **origin/master tip (post-closeout):** `9a68281eadce33b101bcb2a1f0876530b9179e1d` · **Status:** **MERGED** (Public On Web sole public gate)

---

## Airtable schema (Production `appn84sqPw03zEbTT`)

| Check | Result |
|-------|--------|
| Table | Award Recipients `tblTyQXl8aEP93ubK` |
| Field name exactly **Public On Web** | Present (`fldqX3U52KrfOKhua`) — checkbox |
| Do not create/rename | Field already exists; agents must not alter schema |
| Award Status | Separate singleSelect — **not** a publication substitute |

---

## Web app behavior (`web/lib/data/public-awards.ts`)

| Rule | Behavior |
|------|----------|
| `AWARD_RECIPIENT_PUBLICATION_FIELD` | `"Public On Web"` |
| Checked | May appear in `listPublicAwardsForEnrollment` / `mapPublishedPublicAwards` |
| Unchecked / blank / missing | Hidden (fail closed) |
| Award Status alone | Does **not** publish |
| Public mapper output | Display name, date, scope, description only — no record ids, parent email, Tremendous, amounts |
| Private dashboard | Still loads authorized Award Recipients; `publiclyVisible` badge = Award Status tone only |

Public athlete profile (`PublicAthleteProfile.awards`) loads Award Recipients via enrollment links, filters with `listPublicAwardsForEnrollment`, and renders `PublicAwardsSection` (name, date, scope, description only). Private fields and record IDs are never serialized.

---

## Disposable Award Recipient (Mike — manual only)

Agents must **not** create Award Recipient records. If Mike wants a Production proof row:

1. Open **Award Recipients** in Production.
2. Create **one disposable** record with at least:
   - **Athlete Enrollment** — link to a disposable / Mike test enrollment that has a public profile slug (or any enrollment you control).
   - **Award** — link any Awards catalog row (or fill **Award - Display** if your process allows display-only).
   - **Award Status** — e.g. `Approved` or `Delivered` (status alone must **not** make it public).
   - **Public On Web** — checked for the “appears publicly” case; leave unchecked to prove hide.
   - Optional: **Date Awarded**, **Award Scope**, **Award Description - Display** (safe public copy only).
3. Do **not** put real parent payment amounts or Tremendous live-order data on a throwaway row if avoidable.
4. After proof: uncheck **Public On Web** or delete the disposable Award Recipient (transactional test data only — not Weeks/schema).

Suggested proof pairs:

| Case | Public On Web | Expected public list |
|------|---------------|----------------------|
| Publish | checked | Item appears via `listPublicAwardsForEnrollment` |
| Hide | unchecked / blank | Empty |

---

## Tests

```text
cd web
npx vitest run lib/data/public-awards.test.ts
```

---

## Operator next steps

1. Merge PR for `feature/sc-112-public-on-web` when ready (Mike approval).
2. Optional: create disposable checked/unchecked Award Recipient manually (above).
3. Optional follow-up: surface `listPublicAwardsForEnrollment` on public profile UI once product copy is ready.
