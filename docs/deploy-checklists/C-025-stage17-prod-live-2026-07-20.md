# C-025 Stage 17 — PROD live enablement (2026-07-20)

**PROD:** `appn84sqPw03zEbTT`  
**Operator:** Mike  
**Result:** **COMPLETE** — Stage 17 PROD verification **PASS**

---

## Enabled state

| Item | State |
|------|--------|
| **117** Orchestrator v1.1.1 | **ON** |
| **057** Perfect Week v1.3 | **ON** |
| **042** Level gates v3.1 | **ON** |
| **101** Live Zoom XP | **Unchanged** (live path) |
| **117 `webhookUrl` / approval email** | See follow-on [PROD 117f workflow](./C-025-117f-prod-zoom-recording-approval-email.md) — **tested; not documented as fully live** |
| **115** | **Not installed** |

---

## Final verification (2026-07-20)

| Gate | Result |
|------|--------|
| `Zoom Meetings.Approved Preconflict Pair Tags` rollup | **`ARRAYJOIN(ARRAYUNIQUE(values), "\n")`** |
| Meeting tags for Enrollment `recgP9qZYjAhE7NXm` | Both **`…\|LIVE`** and **`…\|REC`** confirmed |
| Recording ZA `recfqsgM7zDobxsPf` | **Conflict = 1**, **Approved = 0** |
| Recording XP `recOceuW34jQz7suD` | **Inactive** (`Active?` blank/unchecked) |
| 117 create + idempotency (prior) | ZA `recfqsgM7zDobxsPf` → XP `recOceuW34jQz7suD` (30 XP; `skipped_exists`) |
| Effective Recording XP % | Program Config only when `Config (Program Scope)` populated |

### Preconflict rollup note

Meta API often fails to persist rollup aggregation. Authoritative PROD aggregation is the UI formula:

```airtable
ARRAYJOIN(ARRAYUNIQUE(values), "\n")
```

Link: `Zoom Attendance` → field `Preconflict Pair Tag`. Conflict requires both `|LIVE` and `|REC` tags in that rollup text (Attendees alone do not create `|LIVE`).

---

## Stage status

**Stage 17 is complete.** Recording credit path is live in PROD with conflict exclusivity verified.

**Follow-on (not blocking Stage 17 credit COMPLETE):** Zoom recording approval email via Make **117f** — built and controlled-tested; permanent go-live not claimed here. See [C-025-117f-prod-zoom-recording-approval-email.md](./C-025-117f-prod-zoom-recording-approval-email.md).

---

## Immediate rollback triggers only

See [rollback plan](./C-025-stage17-rollback-plan.md). First action: turn **OFF** the offending automation(s); soft-void only erroneous new `ZOOM_CREDIT|…` if needed; **never** rewrite historical `ZOOM_ATTEND_BASE|…`.
