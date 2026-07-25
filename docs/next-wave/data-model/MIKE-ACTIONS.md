# Exact Airtable / Make / Fillout Actions for Mike — Agent 2

Minimal UI attestations only. No field deletes/renames.

---

## P0 — Already verified (do not undo)

1. 072 ON · 074 ON · 118 ON (Sun 5:00 AM Denver) · 119 ON (Sun 10:00 AM Denver)  
2. Make `Weekly Athlete Summary - Bulk Email - May 18` ON  
3. 074 sendMode **Live** (never fixed Test)  
4. Live writeback: `Weekly Email Sent?`, `Make Send Status=Sent`, `Weekly Summary Sent At`

---

## P0 — Paste 118 v1.5 (repo fix)

GitHub `118` v1.5 allows `sendMode=Live` with `dryRun=false` and writes WAS `sendMode` from input (no longer hardcodes Test).

1. Paste 118 v1.5 into PROD automation (skip GitHub header).  
2. Set inputs: `dryRun=false`, `sendMode=Live`, `includeSchmidt=false`, `emptyWeekPolicy=send_short`.  
3. Paste 119 v1.5 (docs/version bump; behavior same arm-only).  
4. Set 119: `dryRun=false`, `includeSchmidt=false`.

---

## P1 — OMNI field attestations (one screen each)

| # | Check | Pass criteria |
|---|-------|---------------|
| 1 | Weeks → field **Week Code** | Exists; formula shows year\|Week Name (or document actual formula) |
| 2 | Same Week row | Week Key = record id; Week Name = label; Week Code = annual code |
| 3 | One Live-sent WAS | Weekly Summary Sent At populated; Weekly Email Sent At may be blank |
| 4 | Automation 043 | OFF (042 owns Level Gate Rule) |

---

## P1 — View hygiene (hide only)

WAS Email Ops: show Sent?, Make Send Status, Weekly Summary Sent At; **hide** Weekly Email Sent At + Weekly Summary Email Status.  
Weeks Admin: show Week Name, Week Key, Week Code (if present), Start/End, Program Instance.

---

## P2 — Fillout 2026–2027

Follow `FILLOUT-CONFIG-VERIFICATION.md` checklist (School Year + Program Instance; no hidden Config RID).

---

## Do not

- Turn 118/119 OFF “for safety” after Live proof  
- Force 074 Test in PROD  
- Delete/rename Sent? / Summary Key / Week Key / Week Code  
- Assume Week Code is only a seed convention without OMNI confirm
