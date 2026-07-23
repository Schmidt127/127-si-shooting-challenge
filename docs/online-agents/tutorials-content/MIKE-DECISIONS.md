# Mike Decisions — Tutorials Content Consolidation

**Agent:** Online Agent 8  
**Date:** 2026-07-23  
**Rule:** Only product judgment items. Technical matters settled by dependency evidence are excluded.

## Decisions required

### D1 — Conflicting tutorial versions

**Context:** Duplicate audit may find same canonical URL (or same attachment IDs) with different titles, descriptions, or publish flags between `Tutorials` and `Tutorials & Assets`.

**Question:** When metadata conflicts, which version wins?

| Option | Meaning |
|--------|---------|
| A | Prefer `Tutorials` (canonical/public) always |
| B | Prefer newer modified time (requires export metadata) |
| C | Case-by-case review list before any write |

**Recommendation:** **A + C for publish promotion** — keep Tutorials text by default; never auto-promote publish from orphan without review.

**Mike decision:** `_pending_`

### D2 — Public naming for Presentation fields

**Context:** SC-054 content spec proposes `Display Title`, `Short Description`, `Athlete Instructions`, `Parent Description`, etc. Web currently shows primary `Name`.

**Question:** Approve the recommended Presentation field names for a future schema wave, or supply alternate labels?

**Recommendation:** Approve names in `PRESENTATION-FIELD-SPEC.md` as the working set; create fields only in an authorized schema session.

**Mike decision:** `_pending_`

### D3 — Keep / archive obsolete orphan content

**Context:** Orphan table includes:

- Hardcoded 2025–26 athlete single-select values
- `Informational` type with no Tutorials option
- Possible incomplete blank-URL rows

Historical preservation is **not** required, but discarding is a product call.

**Question:** For orphan rows with no canonical match, default action?

| Option | Meaning |
|--------|---------|
| A | Migrate unpublished into Tutorials for operator review |
| B | Archive export only; do not create Tutorials rows |
| C | Migrate only rows that pass quality rules; discard rest after export retained |

**Recommendation:** **C**

**Mike decision:** `_pending_`

### D4 — Unpublished incomplete content

**Context:** Incomplete rows (missing title/media/description) appear in fixtures and may exist live.

**Question:** Should unpublished incomplete orphan rows be migrated into Tutorials?

| Option | Meaning |
|--------|---------|
| A | No — leave out of Tutorials; keep in pre-delete export only |
| B | Yes — migrate as unpublished stubs |
| C | Migrate only if linked from an external system (Softr/homework) |

**Recommendation:** **A**, unless D4-C evidence appears in Softr check.

**Mike decision:** `_pending_`

### D5 — Confirm orphan table deletion after migration

**Context:** Repo evidence supports deletion candidacy, but Softr/Interface bindings are UNKNOWN in-repo. Deletion is irreversible without export.

**Question:** After runbook steps 1–13 pass, authorize deletion of `Tutorials & Assets`?

| Option | Meaning |
|--------|---------|
| A | Yes, delete after DEV+PROD verification |
| B | Hide/archive table for one season; delete later |
| C | Keep indefinitely |

**Recommendation:** **B** unless Softr proof is absolute and season launch timing is comfortable.

**Mike decision:** `_pending_`

## Non-decisions (resolved by evidence — do not ask Mike)

| Topic | Resolution |
|-------|------------|
| Which table web uses | `Tutorials` only |
| Whether automations write either table | Neither (repo-wide) |
| Whether to rename publish field during merge | No (SC-144 later) |
| Whether title alone can auto-delete | No |
| Whether this agent executes live migration | No |
| Whether Grade Band exists on Tutorials tables | No |
)
