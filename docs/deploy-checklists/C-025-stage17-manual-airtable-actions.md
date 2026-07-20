# C-025 Stage 17 — Manual Airtable actions (PROD)

**Date written:** 2026-07-18  
**Branch:** `feature/c025-stage17-zoom-attendance` @ `2db98a0`  
**PROD:** `appn84sqPw03zEbTT`  
**Hard rules:** Do **not** enable 117 / 057 / 042 during schema work. Do **not** install Automation **115**. Do **not** write `Zoom Meetings.Attendees` from any recording path. Leave **101** alone unless Mike says otherwise (currently OFF per progress note — confirm before go-live).

Authority: [C-025-stage17-prod-schema-manifest.json](./C-025-stage17-prod-schema-manifest.json), [lookup map](./C-025-stage17-lookup-map.md), [formula build order](./C-025-stage17-formula-build-order.md).

---

## Settings the connector cannot finish reliably

Do these in the **Airtable UI** (or OMNI with explicit UI confirmation):

| Category | Why manual |
|----------|------------|
| Lookup wiring (link field + source field) | Connector/Meta often creates incomplete lookups |
| Rollup aggregation formula (e.g. `ARRAYJOIN(values)`) | DEV proved Meta may accept create but **not store** rollup formula |
| Autonumber primary field behavior | Verify `Id` is primary + autonumber |
| `prefersSingleRecordLink` | Manifest requires True/False; connector often cannot set |
| View filters | Views Meta POST historically 422 |
| Automation triggers / filters | Automations API 403 — UI only |
| Automation script paste | UI only |
| Formula paste after field creates | Must remap to PROD field IDs via UI field picker |

---

## Prefers-single-record-link audit

| Field | Manifest `prefersSingleRecordLink` | Action |
|-------|--------------------------------------|--------|
| Zoom Attendance.`Enrollment` | **True** | Verify / set “Allow linking to multiple records” = **off** |
| Zoom Attendance.`Zoom Meeting` | **True** | Same — single meeting only |
| Zoom Meetings.`Config (Global Scope)` | **Not in manifest** (null in dump) | Design intent: one global Config row — **prefer single**; verify |
| Zoom Meetings.`Config (Program Scope)` | **Not in manifest** (null in dump) | Design intent: one program Config row — **prefer single**; verify |
| Zoom Meetings.`Zoom Attendance` | **False** | Keep multi (many ZA rows per meeting) |
| Enrollments.`Zoom Attendance` | **False** | Keep multi |
| Zoom Meetings.`Attendees` | **False** | Leave unchanged — live roster |

---

## Mike version (simple — one action per line)

**Keep Automations 101 / 117 / 057 / 042 OFF for every schema step below.**

### Schema prerequisites (verify first)

1. Confirm table **Zoom Attendance** exists.
2. Confirm primary field is **Id** (Autonumber).
3. Confirm Zoom Attendance field **Enrollment** is Link to **Enrollments** (single record preferred).
4. Confirm Zoom Attendance field **Zoom Meeting** is Link to **Zoom Meetings** (single record preferred).
5. Confirm Enrollments field **Zoom Attendance** reciprocal link exists.
6. Confirm Zoom Meetings field **Zoom Attendance** reciprocal link exists.
7. Confirm Zoom Meetings field **Config (Global Scope)** is Link to **Config**.
8. Confirm Zoom Meetings field **Config (Program Scope)** is Link to **Config**.
9. Confirm Enrollments field **Record Id** is Formula `RECORD_ID()`.
10. If missing: create Zoom Meetings field **RecordId** as Formula `RECORD_ID()`.
11. If missing: create Zoom Meetings field **Week End Date** as Lookup through **Week** of Weeks field **End Date**.
12. If missing: create Zoom Meetings field **Attendance Method** as Single select with choice **Recording Quiz** (and **Live** if matching DEV).
13. Spot-check Config field **Zoom Recording XP Percent of Live** = **50** on the Config row linked as Global/Program default.
14. Spot-check XP Reward Rule **ZOOM_ATTEND_BASE** is active at **60**.

### Zoom Meetings Effective formulas (create before ZA deadline lookup)

15. Create formula **Effective Recording Approval Email Enabled?** (paste from formula-build-order C1).
16. Create formula **Effective Recording Approval Email Template Key** (C2).
17. Create formula **Effective Recording Approval Email Timing** (C3).
18. Create formula **Effective Recording Counts for Level Gate?** (C4).
19. Create formula **Effective Recording Counts for Perfect Week?** (C5).
20. Create formula **Effective Recording Deadline Mode** (C6).
21. Create formula **Effective Recording Makeup Enabled?** (C7).
22. Create formula **Effective Recording Makeup Window Days** (C8).
23. Create formula **Effective Recording Quiz Requires Coach Approval?** (C9).
24. Create formula **Effective Recording XP Percentage** (C10).
25. Create formula **Calculated Recording Quiz Deadline** (C11) — requires Recording Available At, Attendance Method, Effective Deadline Mode, Effective Makeup Window Days, Week End Date.

### Lookup creation (Zoom Attendance) — start here tomorrow after step 25

26. Create Lookup **Calculated Recording Quiz Deadline** — link field **Zoom Meeting** — source **Calculated Recording Quiz Deadline**.
27. Create Lookup **Effective Recording Counts for Level Gate?** — link **Zoom Meeting** — source same name.
28. Create Lookup **Effective Recording Counts for Perfect Week?** — link **Zoom Meeting** — source same name.
29. Create Lookup **Effective Recording Deadline Mode** — link **Zoom Meeting** — source same name.
30. Create Lookup **Effective Recording Makeup Enabled?** — link **Zoom Meeting** — source same name.
31. Create Lookup **Effective Recording Makeup Window Days** — link **Zoom Meeting** — source same name.
32. Create Lookup **Effective Recording Quiz Requires Coach Approval?** — link **Zoom Meeting** — source same name.
33. Create Lookup **Effective Recording XP Percentage** — link **Zoom Meeting** — source same name.
34. Create Lookup **Enrollment RID** — link **Enrollment** — source Enrollments **Record Id**.
35. Create Lookup **Zoom Meeting RID** — link **Zoom Meeting** — source Zoom Meetings **RecordId**.

### Formula creation (Zoom Attendance) + preconflict rollup

36. Create formula **Zoom Credit Pre-Approved?** (D1).
37. Create formula **Preconflict Pair Tag** (D2).
38. Create Zoom Meetings Rollup **Approved Preconflict Pair Tags** — link **Zoom Attendance** — field **Preconflict Pair Tag** — aggregation `ARRAYJOIN(values)`.
39. Create Lookup **Meeting Approved Preconflict Pair Tags** — link **Zoom Meeting** — source **Approved Preconflict Pair Tags**.
40. Create formula **Zoom Credit Conflict?** (D3).
41. Create formula **Zoom Credit Approved?** (D4).
42. Create formula **Zoom XP Percentage** (D5).
43. Create formula **Zoom XP Amount** (D6).
44. Create formula **Zoom Gate Credit Earned?** (D7).
45. Create formula **Zoom Credit Key** (D8).
46. Create formula **Zoom Credit Debug** (D9).
47. Create formula **Zoom Recording Quiz — Past Deadline (view marker)** (D10).

### Select-option updates

48. On XP Events field **XP Source**, add option exactly: **Zoom Meeting Recording Quiz**.
49. Re-verify Zoom Attendance **Attendance Method** choices: **Live**, **Recording Quiz**.
50. Re-verify Zoom Attendance **Recording Quiz Review Status** choices: **Not Submitted**, **Needs Review**, **Satisfactory**, **Needs Correction**.

### Record / Config values

51. On the Global default Config row, set **Recording Path Enabled?** = checked (true).
52. Set **Recording Makeup Enabled?** per program decision (DEV sample enabled row uses Yes).
53. Set **Zoom Recording Makeup Window Days** = **7** (Stage 17 default).
54. Set **Zoom Recording Deadline Mode** = **Later of Both** (default).
55. Set **Zoom Recording XP Percent of Live** = **50**.
56. Set **Recording Quiz Requires Coach Approval?** per decision (DEV enabled sample = Yes).
57. Set **Recording Gives Full Zoom Gate Credit?** per decision (DEV enabled sample = Yes).
58. Set **Recording Makeup Counts for Perfect Week?** per decision (DEV enabled sample = Yes).
59. Set **Recording Approval Email Enabled?** per decision (DEV enabled sample = Yes).
60. Set **Recording Approval Email Timing** = **On Satisfactory**.
61. Set **Recording Approval Email Template Key** = **ZOOM_RECORDING_APPROVED**.
62. Bulk-link Zoom Meetings **Config (Global Scope)** / **Config (Program Scope)** to the correct Config rows.
63. Confirm a test meeting with **Normal Live Zoom XP** path: Effective % 50 → ZA **Zoom XP Amount** = **30** when approved.

### Views and filters

64. Recreate view **Grid view** on Zoom Attendance if missing.
65. Recreate view **Zoom Recording Quiz - Past Deadline** using view-marker formula / filter from formula-build-order (exact OMNI filter text still **Unknown** in unresolved list).

### Automation script installation (ALL OFF after paste)

66. Screenshot / copy current PROD scripts for **057**, **042**, **101** to dated rollback files **before** overwrite.
67. Paste **117** orchestrator **v1.1.1** from `C-025-stage17-117-orchestrator-v1.1.1-PASTE.txt` — leave **OFF**.
68. Paste **057** **v1.3** from `C-025-stage17-057-perfect-week-v1.3-PASTE.txt` — leave **OFF**.
69. Paste **042** **v3.1** from `C-025-stage17-042-level-gates-v3.1-PASTE.txt` — leave **OFF**.
70. Do **not** paste Automation **115**.

### Trigger / filter setup (still OFF)

71. Set 117 trigger table **Zoom Attendance**; conditions: **Attendance Method** is **Recording Quiz**; **Enrollment** not empty; **Zoom Meeting** not empty; webhook blank.
72. Confirm 057 trigger still **Perfect Week Calculation Queue? = 1**.
73. Confirm 042 trigger still uses view **042** / Level Recalc Needed? re-entry pattern.
74. Confirm no Stage 17 script writes **Attendees**.

### Controlled enablement (only after smoke Pass)

75. Keep **115** uninstalled.
76. Enable **057** only for Perfect Week smoke, then OFF unless approved.
77. Enable **042** only for gate smoke, then OFF unless approved.
78. Enable **117** only for recording XP smoke, then OFF unless approved.
79. Decide whether **101** should return ON for live path (separate Mike decision — progress currently lists it OFF).

### Smoke testing

80. Follow [C-025-stage17-prod-smoke-test.md](./C-025-stage17-prod-smoke-test.md) S0–S8 on a **new dedicated** test enrollment/meeting.
81. Pass gate: recording XP **30**, live XP **60**, no Attendees write from recording, no historical live XP rewrite.

### Rollback checks

82. If Attendees mutated by recording path → STOP; restore scripts from rollback copies.
83. Soft-void bad test `ZOOM_CREDIT|…` only via **Active? = false**.
84. Do not delete historical `ZOOM_ATTEND_BASE|…` events.

---

## Omni version (connector-capable only)

Safe for connector / OMNI automation **if** Mike authorizes writes — still keep Stage 17 automations OFF:

- Create remaining **standard** fields only if any are still missing: checkbox, number, single line text, multiline text, url, dateTime, singleSelect choices.
- Add XP Events **XP Source** option `Zoom Meeting Recording Quiz` (if connector supports select-option update).
- Create empty formula **shell** fields (name + type formula) without final formula text — optional; UI paste still required.
- Do **not** rely on connector for: lookup wiring, rollup aggregation, prefersSingle, views, automation triggers/scripts, autonumber primary changes.

**Do not install 115 via Omni.**

---

## Agent version (repo-only)

Agents may do without touching Airtable:

- Maintain these deploy-checklists / status docs.
- Keep paste bodies aligned: 117 v1.1.1, 057 v1.3, 042 v3.1, 115 v1.8 DEV-only.
- Run local unit tests under `airtable/automations/.../c025-stage17-zoom-attendance.test.js` if present.
- Prepare rollback file templates in repo (empty placeholders) — do not pull live PROD script text via API (403).
- Re-run read-only readiness audit script when Mike provides PAT + approval: `tools/airtable/_c025_stage17_prod_readiness_audit.py`.
- Do **not** modify application runtime code for this audit.
- Do **not** create/modify PROD records.
- Do **not** enable or alter Airtable automations.

---

## Manual Airtable version (Mike UI only)

Everything in **Mike version** steps 1–84 that involves clicking Airtable, plus:

- Fix field **descriptions** that still say recording credit writes **Attendees** (see description mismatches in remaining-work doc).
- Set prefers-single on Enrollment / Zoom Meeting / Config links.
- Bulk-link Config scopes on Zoom Meetings.
- Paste formulas and confirm result types (especially deadline = **date**).
- Create views.
- Paste automation scripts OFF.
- Run smoke tests.
