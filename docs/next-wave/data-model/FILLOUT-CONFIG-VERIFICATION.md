# Fillout Config Verification — 2026–2027

**Repo conclusion:** Enrollment Fillout does **not** hard-code a Config record ID in repository contracts. Season scoping uses Enrollments.`School Year` + `Program Instance`. Config year resolution is Airtable/script-side (`lib/config-selection`) after enrollment exists.

**Not documented in repo:** Live Fillout hidden field → Config RID mapping. Treat as **mike-ui**.

---

## Evidence from repository

| Claim | Result | Evidence |
|-------|--------|----------|
| Fillout writes Config link on Enrollment | **Not in contract** | `FILLOUT-ENROLLMENT-CONTRACT.md` — School Year + Program Instance, no Config field |
| Config resolved by Active School Year | Yes (scripts/tools) | `lib/config-selection` + tests |
| Enrollment → Config direct link | **Absent** in schema-snapshot | Relationship map |
| Daily submission Fillout | OFF since C-008 | PROJECT_STATE |
| Enrollment Fillout | Contract Built in Repository; form reopen gated SC-146 | enrollment-season pack |

---

## Exact Mike checklist (2026–2027)

1. Open Enrollment Fillout form in Fillout UI.  
2. For each mapped field, confirm Airtable destination — note if any hidden field targets Config.  
3. Confirm School Year option includes / defaults to **`2026-2027`**.  
4. Confirm Program Instance picker defaults to 2026–2027 instance (not prior year).  
5. Confirm **no** hard-coded Config record ID in Fillout calculation/hidden fields.  
6. Submit one Schmidt/test enrollment → Enrollment.School Year = `2026-2027` + correct Program Instance.  
7. In Airtable, confirm Config row `Active School Year = 2026-2027` exists (`rechc1f9f4kVM1tHP` per config-selection fixture — **verify live ID in OMNI**).  
8. Confirm submission Fillout (if reopening later) does not inject old year Config.

Record results under this file or chat; no repo inventing of Fillout mappings.
