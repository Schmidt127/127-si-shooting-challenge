# Public published awards — schema gap (fail-closed)

| Item | Value |
|------|--------|
| **Date** | 2026-09-03 |
| **Branch** | `feat/public-published-awards` |
| **Authority** | Production schema snapshot Aug 2026 + web public surface rules |
| **Hard bans** | Do not invent Airtable fields · No Airtable writes · No Production schema change |

## Verdict

**Award Recipients has no publication field.** Public award display is **fail-closed** (empty / blocked) until Mike adds an explicit publish control and a dedicated public loader filters on it.

Private season awards remain available only on the **authenticated** Family Dashboard (`/shoot/dashboard`).

## Schema evidence

**Snapshot:** [`airtable/schema/snapshots/prod-20260831-fut002-batch1/schema_doc_appn84sqPw03zEbTT_20260831_070120.md`](../../airtable/schema/snapshots/prod-20260831-fut002-batch1/schema_doc_appn84sqPw03zEbTT_20260831_070120.md)

**Table:** Award Recipients (`tblTyQXl8aEP93ubK`) — **40 fields**

### Publication candidates checked (absent)

| Candidate | Present on Award Recipients? |
|-----------|------------------------------|
| `Published?` | **No** |
| `OK to Publish on Softr` | **No** |
| `Public?` | **No** |
| `Show on Public Profile?` | **No** |

Note: `Published?` **does** exist on other tables (e.g. Homework Library curriculum) — that must not be confused with Award Recipients.

### Fields that are *not* publication controls

| Field | Why it is not enough |
|-------|----------------------|
| `Award Status` (`Pending` / `Approved` / `Sent` / …) | Fulfillment workflow — not parent-facing publish intent |
| `Tremendous Test Record?` | Test isolation only |
| `Ready to Send?` / `Send to Tremendous?` | Ops send gates |
| Awards catalog `Active?` / `Challenge Active?` | Catalog eligibility, not per-recipient public publish |

## Web behavior (this PR)

| Surface | Behavior |
|---------|----------|
| Public athlete profile / public APIs | **No award list** — `resolvePublicAwardsGate()` → `blocked_missing_publication_field`; `listPublicAwardsForProfile()` → `[]` |
| Private dashboard awards | **Authorized only** — existing `private-dashboard-loader` + opaque keys; unchanged send/Tremendous fields |
| Invented `Published?` writes | **Forbidden** |

Code: [`web/lib/data/public-awards.ts`](../../web/lib/data/public-awards.ts) · tests: `web/lib/data/public-awards.test.ts`

## Gap to close (Mike / OMNI — not this PR)

1. Decide the publication field name on **Award Recipients** (recommend checkbox `Published?`).
2. OMNI/schema add the field after dependency review (human approval required for schema change).
3. Then: public loader filters `Published? = true`, private dashboard can keep showing all non-test recipients behind auth.
4. Do **not** overload `Award Status` as the public publish switch.

## Related

- SC-127 — Award Recipients scope metadata cleanup (Deferred)
- C-028 — Tremendous fulfillment (ops path; not public web)
- Private dashboard awards UI — `web/components/dashboard/athlete-dashboard-view.tsx`
