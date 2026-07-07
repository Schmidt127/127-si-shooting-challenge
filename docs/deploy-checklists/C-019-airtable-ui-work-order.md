# C-019 — Airtable UI work order: create Testing views (DEV)

**Operator:** Mike  
**Backlog:** C-019 · Wave 6  
**Base:** DEV `appTetnuCZlCZdTCT` (127 SI Shooting Challenge — Development)  
**Why manual:** Airtable API cannot create views or read filter definitions. See [C-019 verification checklist](./C-019-testing-views-verification-checklist.md).

---

## Schmidt test enrollment (filter value)

| Item | Value |
|------|--------|
| **Picker label** | `Schmidt, Testing - 2025-2026` (may also show as **Testing Schmidt**) |
| **Record ID** | `recgP9qZYjAhE7NXm` |

**Filter rule:** one condition only — enrollment link **is** Schmidt. **Do not** filter `Active?` (Schmidt is intentionally inactive for standings).

---

## Click path (repeat for each table below)

1. Open base **DEV** → `appTetnuCZlCZdTCT`.
2. Open the **table** (left sidebar).
3. **Create view:** click **+** next to view tabs → **Grid** → name **`Testing`** → **Create new view**.  
   *(Athlete Achievement Unlocks: open existing **Testing** view instead.)*
4. Click **Filter** in the toolbar.
5. **Add condition** → choose the **Filter Field** from the work table below → operator **is** → pick **Schmidt, Testing - 2025-2026** / **Testing Schmidt**.
6. Confirm **no other conditions** (no AND group with extra filters).
7. **Remove forbidden filters** if any are present (see list below).
8. Note the **footer record count** in the work table.

---

## Forbidden filters (remove if present)

- `Is Test Record?`
- `Active?`
- Date fields (e.g. Activity Date, Submitted At, week dates)
- Status fields (e.g. Upload Status, XP Award Status, Completion Status)
- Any other date/status/week filter unless you document it in **Notes**

---

## Work table

| Table | Create or Verify | Filter Field | Filter Value | Footer Count | Done | Notes |
|-------|------------------|--------------|--------------|--------------|------|-------|
| Submissions | **Create** | `Enrollment` | Schmidt, Testing - 2025-2026 | | ☐ | |
| Submission Assets | **Create** | `Enrollment - Linked` | Schmidt, Testing - 2025-2026 | | ☐ | Not `Enrollment` |
| Homework Completions | **Create** | `Enrollment` | Schmidt, Testing - 2025-2026 | | ☐ | |
| Video Feedback | **Create** | `Enrollment` | Schmidt, Testing - 2025-2026 | | ☐ | |
| XP Events | **Create** | `Enrollment` | Schmidt, Testing - 2025-2026 | | ☐ | |
| Weekly Athlete Summary | **Create** | `Enrollment` | Schmidt, Testing - 2025-2026 | | ☐ | |
| Streak Occurrences | **Create** | `Enrollment` | Schmidt, Testing - 2025-2026 | | ☐ | |
| Athlete Achievement Unlocks | **Verify** | `Enrollment` | Schmidt, Testing - 2025-2026 | | ☐ | View exists (`viwhHkNyEPe21oMbI`); confirm filter in UI |

---

## After the work — verification

1. **Re-run probe** (view **names** only; needs local PAT in `tools/airtable/.env` or `web/.env.local`):

   ```powershell
   python tools/airtable/_probe_c019_testing_views.py
   ```

2. **Confirm:** all **8** tables report a `Testing` view (probe maps views per table via schema).
3. **Remember:** the probe **cannot** confirm filter field, filter value, or forbidden filters — only that a view named `Testing` exists. Filter correctness is **UI sign-off** in the table above.
4. When complete, update [C-019 verification checklist](./C-019-testing-views-verification-checklist.md) sign-off and [v2-change-backlog.md](../v2-change-backlog.md) **C-019** status if promoting to `done (DEV)`.

---

## Related

- [C-019 Testing views verification checklist](./C-019-testing-views-verification-checklist.md) — full rules + API limits
- [C-020 Testing Scenarios script checklist](./C-020-testing-scenarios-script-checklist.md) — Automation **115** test runs
- Probe script: `tools/airtable/_probe_c019_testing_views.py`
