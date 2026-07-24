# Agent 4 — Failure Visibility Report

**Last updated:** 2026-07-24

| Failure class | Primary surface | Silent risk? |
|---------------|-----------------|--------------|
| Airtable script throw | Automation history `errorOut` | Low if watched |
| Missing reward rule | Skip / no XP Event | **Medium** if skip looks like success |
| 074 missing recipients/subject/HTML/links | Throw before webhook | Low |
| Webhook failure | `errorOut`; Send to Make? kept | Medium if history ignored |
| Make / Gmail failure | Make history | Medium — open Make |
| Live writeback failure after Gmail | Email sent; Sent? false | **High** duplicate risk if re-armed |
| Fixed `sendMode=Test` in PROD | Email OK; no Sent? | **High** — verified 2026-07-24 incident |
| Empty-week `suppress` | 072 skip; not Ready | Low if policy understood |
| Weekly threshold XP never awarded | No error | **High product gap** (no writer) |
| Schedules OFF (118/119) | No runs | Expected during controlled validation |

## Operator checks after weekly email changes

1. 074 run: `statusOut`, `sendMode`, `errorOut`
2. Make scenario `Weekly Athlete Summary - Bulk Email - May 18` branch Test vs Live
3. WAS: Ready?, Sent?, Make Send Status, timestamp, Send to Make? cleared only after successful handoff
4. PROD 074 input must be **Live** (or blank + WAS Live) — never fixed Test
