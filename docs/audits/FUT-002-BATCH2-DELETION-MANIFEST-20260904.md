# FUT-002 Batch 2 — Deletion Manifest (2026-09-04)

**Status: COMPLETE — Mike UI trash verified 2026-09-05**  
**Phase gate:** Cleared (SC-160 COMPLETE). Four stubs quarantined 2026-09-04; Mike UI-deleted 2026-09-05. Row #3 already gone. No fields restored by agent.

**Agent:** A6 (manifest) · Closeout Cursor 2026-09-05  
**Base:** `appn84sqPw03zEbTT`  
**Live evidence (post-delete):** Meta + MCP **35** tables / **1375** fields  
**Schema:** `airtable/schema/snapshots/prod-20260905-fut002-batch2/`  
**Verify JSON:** `docs/testing/evidence/fut-002/batch2-live-verify-20260905.json`  
**Closeout:** [`FUT-002-BATCH2-POST-DELETE-CLOSEOUT-20260905.md`](./FUT-002-BATCH2-POST-DELETE-CLOSEOUT-20260905.md)

## Independent self-review legend

| Verdict | Meaning |
|---------|---------|
| **APPROVED-FOR-DELETE** | Text stub; empty; no formula/link/automation/web/interface runtime dep; within Batch 2 quarantine scope |
| **RETAIN** | Hard stop, real link, required config, or unresolved |
| **ALREADY-GONE** | Not present live; no action |
| **DELETED** | Confirmed absent after Mike UI trash |

---

## Manifest rows

| # | Table | Field | Field ID | Type | Live? | Self-review |
|---|-------|-------|----------|------|-------|-------------|
| 1 | Athlete Achievement Unlocks (`tblyT2AQo1JbvmvZS`) | XP Events copy | `fldWnU9gJCsTmTLpK` | singleLineText | **No** | **DELETED** (2026-09-05) |
| 2 | Shot Milestones (`tbl5C4TsQpOigIyRz`) | XP Events copy | `fldVcHPjvuabirn6E` | singleLineText | **No** | **DELETED** (2026-09-05) |
| 3 | Video Feedback (`tblOV6pJDxQFBSQ3q`) | DELETE MAYBE - XP Events copy | `fldTJd1LkzRRmBiAZ` | singleLineText (historical) | **No** | **ALREADY-GONE** (pre-session) |
| 4 | Weeks (`tblcsKugv1cla36A6`) | Video Feedback | `fld8tdkjgyYmrs4Eq` | singleLineText | **No** | **DELETED** (2026-09-05) |
| 5 | Weeks (`tblcsKugv1cla36A6`) | Submission Assets | `fldo906P9t7nj9xmn` | singleLineText | **No** | **DELETED** (2026-09-05) |

### Explicit RETAIN (verified still present 2026-09-05)

| Table | Field | Field ID | Verdict |
|-------|-------|----------|---------|
| Config | Root Google Drive Folder ID | `fldvG7kDIreffetRt` | **RETAIN** |
| Config | Root Google Drive Folder Link | `fldwRqavjwXbCHzar` | **RETAIN** |
| Weeks | XP Events (link) | `fldchUzF9JSCQzxai` | **RETAIN** |
| Weeks | Homework Completions (link) | `fldBCFzjforqsWunR` | **RETAIN** |
| Weeks | Submissions (link) | `fld8hxWh7fATBLghL` | **RETAIN** |
| Video Feedback | XP Events (link) | `fldkTbQ1yyK0qOyLp` | **RETAIN** |
| Shot Milestones | XP Events (link) | `fldmmFEzJt3kmEDh4` | **RETAIN** |
| Homework Completions | XP Events (link) | `fldBv878RIIC5tpE0` | **RETAIN** |
| Submissions | XP Events (link) | `fldVewtOPR0DmVg12` | **RETAIN** |
| Submission Assets | Homework Completions / Video Feedback (links) | `fldQF8OsfESrHdcUb` / `fldxapOLpLH4KaXOb` | **RETAIN** |

---

## Quarantine → delete timeline

| Field ID | Quarantine rename (2026-09-04) | UI trash |
|----------|--------------------------------|----------|
| `fldWnU9gJCsTmTLpK` | ZZZ DELETE — XP Events copy (text stub) | 2026-09-05 |
| `fldVcHPjvuabirn6E` | ZZZ DELETE — XP Events copy (text stub) | 2026-09-05 |
| `fld8tdkjgyYmrs4Eq` | ZZZ DELETE — Video Feedback (Weeks text stub) | 2026-09-05 |
| `fldo906P9t7nj9xmn` | ZZZ DELETE — Submission Assets (Weeks text stub) | 2026-09-05 |
| `fldTJd1LkzRRmBiAZ` | Already absent | n/a |

**Field count:** 1378 (quarantine) → **1375** live (observed −3; see closeout for +1 concurrent drift note vs pure −4).
