# C-025 — 117f DEV manual action sheet (one page)

**Use when:** Make login, webhook creation, Airtable secret entry, or Mike test inbox cannot be completed by the agent.  
**Do not invent** webhook URLs, PATs, or email addresses.  
**Base:** DEV only · Scenario / automation stay **OFF** until each step says otherwise.

---

### A. Make — create webhook (scenario OFF)

| Step | Screen | Field | Value type | Button | Expected |
|------|--------|-------|------------|--------|----------|
| A1 | Make → Create scenario | Name | Text: `Shooting Challenge - DEV - Zoom Recording Approval Email - 117f - v1` | Create | Empty scenario |
| A2 | Add module | Custom webhook | New hook (JSON) | Add / Save | Hook URL shown **once** — copy to ops only; **never** paste into git/chat |
| A3 | Webhook settings | Auto-respond / immediate 2xx | **Disabled** / wait for Webhook response module | Save | Request stays open until final response |
| A4 | Scenario scheduling | On/Off | **OFF** | Save | Scenario not live |

### B. Make — ops-only variables

| Step | Screen | Field | Value type | Button | Expected |
|------|--------|-------|------------|--------|----------|
| B1 | Scenario variables | `sendMode` | Constant text `test` | Save | Test mode |
| B2 | Scenario variables | `testRecipientEmail` | Mike-controlled test inbox (real address, ops only) | Save | Not a parent address |
| B3 | Data Store | Name `C025_117f_DEV_SendKeys` | Per blueprint schema | Create | Empty store |

### C. Make — wire modules (OFF) then Run once

| Step | Screen | Field | Value type | Button | Expected |
|------|--------|-------|------------|--------|----------|
| C1 | Import / build | Modules 1–13 + error path | Per [deployment checklist](./C-025-117f-dev-make-deployment-checklist.md) / blueprint | Save | Scenario OFF |
| C2 | Run once + invalid payload | Body missing/wrong `automationNumber` | JSON | Run once | HTTP **non-2xx**; no Gmail; no DS success |
| C3 | Run once + happy payload | Use fixture IDs from evidence doc | JSON | Run once | Gmail **only** to test inbox; DS has `sendKey`; HTTP **200** `sent` |
| C4 | Run once + same `sendKey` | Identical payload | JSON | Run once | No second Gmail; HTTP **200** `already_sent` |

Happy payload IDs (DEV): enrollment `recgP9qZYjAhE7NXm` · meeting `recNOsPJQVH69ibah` · ZA `recsEERuvtyoHmDma`.

### D. Airtable — paste 117f (remain OFF)

| Step | Screen | Field | Value type | Button | Expected |
|------|--------|-------|------------|--------|----------|
| D1 | Automations → Folder `17 - Zoom Recording Credit` | New automation name | `117f - Zoom Recording Credit - Send Approval Email` | Create | Draft OFF |
| D2 | Script action | Script body | Paste from [C-025-stage17-117f-v1.2.0-PASTE.txt](./C-025-stage17-117f-v1.2.0-PASTE.txt) (below header) | Save | v1.2.0 |
| D3 | Input variables | `recordId` | Text / record id | Save | Required |
| D4 | Input variables | `webhookUrl` | Text — **leave blank** | Save | Blank |
| D5 | Automation toggle | Enabled | **OFF** | Save | No runs |

### E. Controlled Airtable tests (after Mike authorizes webhook map)

| Step | Screen | Field | Value type | Button | Expected |
|------|--------|-------|------------|--------|----------|
| E1 | 117f inputs | `webhookUrl` | Still blank; `recordId` = `recsEERuvtyoHmDma` | Test / Run | `skipped_no_webhook`; no stamps |
| E2 | Use ZA `recAqFTWmuHF1V4Z5` | — | Run | `skipped_disabled` |
| E3 | Use ZA `recbL9e1Be4iNbCZF` | — | Run | `skipped_conflict` |
| E4 | Map DEV webhook (ops) | `webhookUrl` | Paste from Make ops only | Save + one Run on happy ZA | `sent`; Send Key + Sent At stamped; **one** test Gmail |
| E5 | Identical rerun | Same ZA | Run | `skipped_already_sent` or Make `already_sent`; **no** second Gmail |
| E6 | Rollback | `webhookUrl` clear; automation OFF; meeting override → No if needed | Save | No further mail |

### F. Rollback triggers (immediate)

Wrong recipient · duplicate email · looping error · XP change · unexpected Attendees change → turn **117f OFF**, clear **webhookUrl**, set meeting email override **No**, preserve evidence. Do **not** alter 117 / 057 / 042 unless credit fault is independently proven.
