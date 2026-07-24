# Mike Actions — Testing & Integrity (2026-07-24 Overnight Agent 1)

Ordered. Only items Cursor could not complete without UI / product decision / uncontrolled email risk.

---

### 1. P0 — UI-attest PROD automation inventory

| | |
|--|--|
| System | Airtable PROD |
| Location | Automations panel |
| Action | Paste complete list: name / ON-OFF / trigger / version. Confirm deleted set **043, 032, 033, 063, 111**; confirm **115** ON; confirm **112** state; confirm ~4 free slots |
| Expected | Matches `CURRENT-PROD-BASELINE.md` |
| Why not Cursor | Automation list not fully readable via API |
| Evidence | Screenshot or pasted table in chat/docs |
| SC | SC-058, SC-059 |

### 2. P0 — Create Testing views

| | |
|--|--|
| System | Airtable PROD |
| Location | Tables listed in `TESTING-VIEWS-MIKE-ACTIONS.md` |
| Action | Create views per that doc (Schmidt Enrollment `recgP9qZYjAhE7NXm` filters). Do not hide Schmidt from public standings |
| Expected | Testing views show Schmidt pipeline rows; orphans excluded |
| Why not Cursor | Views not creatable via API |
| Evidence | View names visible; Schmidt Submission/XP/WAS present |
| SC | SC-003 |

### 3. P0 — Confirm Weekly Threshold XP automation

| | |
|--|--|
| System | Airtable PROD + GitHub |
| Location | Automations UI; WAS Threshold XP fields |
| Action | Search for Threshold XP automation. If missing, decide rebuild vs retire rules |
| Expected | Known writer OR explicit Deferred/Not Needed on threshold XP |
| Why not Cursor | No writer script found in repo; cannot invent second XP path |
| Evidence | Automation name/version OR decision note |
| SC | SC-022, SC-049, XP-D1 |

### 4. P1 — Seed a prior Week for backdated tests

| | |
|--|--|
| System | Airtable PROD → Weeks |
| Action | Manually create/seed a Week whose Start/End cover a backdate Activity Date. Manual primary name OK |
| Expected | SCN-006 unblocked |
| Why not Cursor | Week creation is manual by design; do not automate |
| Evidence | Week RID + date range |
| SC | SC-065, SC-007 |

### 5. P1 — Product decision: 115 `Count It` preset

| | |
|--|--|
| System | Product / Automation 115 |
| Action | Decide whether Daily 115 should leave `Duplicate Review Status` blank for 007a, or keep `Count It` |
| Expected | Documented policy; scenario SCN-005 updated |
| Why not Cursor | Product decision |
| Evidence | Decision in completion master / backlog |
| SC | SC-007, SC-047, FW-D1 |

### 6. P1 — Product decision: gate 115 on Test Status

| | |
|--|--|
| System | Automation 115 |
| Action | Decide if `Test Status=Rejected` should block runs (SCN-018) |
| Expected | Accept current behavior OR authorize code change |
| Why not Cursor | Product decision |
| SC | SC-001, SC-002 |

### 7. P1 — Optional: paste 115 v1.9 message-only refresh

| | |
|--|--|
| System | Airtable Automation 115 script |
| Action | Optional repaste from GitHub (v1.9 = comments/messages only; logic unchanged from v1.8 live PASS) |
| Expected | Skip message no longer says v1.4; header notes PROD status |
| Why not Cursor | Script paste is UI |
| Evidence | Script version note in automation |
| SC | SC-001 |

### 8. P2 — Authorize orphan legacy cleanup

| | |
|--|--|
| System | Airtable PROD |
| Action | Approve bulk delete of orphan XP/WAS/Assets (Enrollment empty) after dry-run |
| Expected | Testing views clean; no Schmidt data loss |
| Why not Cursor | Destructive ~3k rows without rollback — needs explicit approval |
| Evidence | Dry-run counts then delete confirmation |
| SC | SC-050, SC-051 |

### 9. P2 — Re-run 010 on live Submission (UI)

| | |
|--|--|
| System | Automation 010 |
| Action | Re-trigger on `recuuTBgstSTGg2E3`; confirm skip/no second XP |
| Expected | Still one `SUBMISSION_XP\|recuuTBgstSTGg2E3` |
| Why not Cursor | Triggering production automations from API is unreliable/unsafe unattended |
| Evidence | XP Events Testing view still count=1 |
| SC | SC-007, SC-070 |

### 10. Do not do

- Do not exclude Schmidt from standings/leaderboards/website  
- Do not reinstall deleted 043/032/033/063/111 without new design  
- Do not enable weekly mass email schedules  
- Do not auto-generate Weeks
