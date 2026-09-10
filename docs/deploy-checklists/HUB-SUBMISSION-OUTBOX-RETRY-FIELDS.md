# Hub Airtable — Submission Outbox retry fields

**Table:** `Submission Outbox` (Curriculum Hub base — **not** Shooting Challenge `appn84sqPw03zEbTT`)  
**Status:** **PENDING** — five fields missing at 2026-09-10 prep  
**Fastest path:** **OMNI in Hub base** (Mike) or run script below with Hub PAT

---

## Fields to add

| Field name | Type | Notes |
|---|---|---|
| Retry Payload | Long text | JSON retry body (not encrypted) |
| Delivery Attempt Count | Number (integer) | Monotonic counter; default empty |
| Last Attempt At | Date and time | America/Denver if Hub uses MT elsewhere |
| Delivered At | Date and time | Success timestamp |
| Processing Claim | Single line text | Worker concurrency lock |

Skip any field that already exists — do not duplicate.

---

## OMNI (recommended — in Hub base)

Paste into OMNI while the **Curriculum Hub** base is open:

```
On table "Submission Outbox", add these fields if missing (skip existing names):

1. Retry Payload — Long text
2. Delivery Attempt Count — Number, integer, no default
3. Last Attempt At — Date and time (America/Denver)
4. Delivered At — Date and time (America/Denver)
5. Processing Claim — Single line text

Do not rename or delete existing fields. Report field IDs after creation.
```

---

## Script (GitHub — when Hub base ID + PAT available)

From repo root, with `tools/airtable/requirements.txt` installed:

```bash
export AIRTABLE_TOKEN='pat…'   # schema.bases:read + schema.bases:write on Hub base
export CURRICULUM_HUB_AIRTABLE_BASE_ID='app…'   # Hub base, NOT appn84sqPw03zEbTT

# Dry run — lists missing fields only
python3 tools/airtable/hub_submission_outbox_add_retry_fields.py

# Apply
CONFIRM_WRITE=1 python3 tools/airtable/hub_submission_outbox_add_retry_fields.py
```

Find Hub base ID: Curriculum Hub Vercel → `AIRTABLE_BASE_ID`, or Airtable UI URL `airtable.com/appXXXXXXXX/...`.

---

## Verify

1. Open Submission Outbox in Hub base — five fields visible.
2. Hub PR #21 code references these names — merge Hub PR after fields exist.
3. Update [`structured-curriculum-hub-production-cutover.md`](./structured-curriculum-hub-production-cutover.md) checklist when done.

---

## Why Cursor could not apply live (2026-09-10)

- Submission Outbox is in **Curriculum Hub Airtable**, separate from this repo’s SC base.
- Cloud agent had **no Airtable PAT** and **Airtable MCP is not authenticated** in this session.
- Hub repo `127-si-curriculum-hub` is not in this workspace.
