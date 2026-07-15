# Phase D — Complete DEV no-send smoke (072 v4.0.0)

**Base:** DEV only · **Webhook:** blank · **Real email:** disabled · **074:** leave present until PASS · **117:** do not touch

Use one known Weekly Athlete Summary (WAS) fixture with Enrollment + Week. Prefer a DEV athlete with no live family-send path.

**While testing:** turn **072 ON** only for the run(s) under test; leave **074 OFF** the entire smoke. After each case, return to a clean fixture state (uncheck Build/Send arms as needed). Prefer blank `makeWebhookUrl`.

---

## Pass bar

| Gate | Required |
|------|----------|
| Critical | All rows below PASS; no unexpected throw; no Gmail/family send |
| Safety | No production Make call; webhook blank → `skipped_no_webhook` (never send) |
| Capacity | Retire **074** only after this table is **critical PASS** |

---

## Smoke matrix

| # | Case | How to drive | Expect (outputs / fields) |
|---|------|--------------|---------------------------|
| 1 | **Package build** | `Build Weekly Email Now?` checked; Sent unchecked; Send unchecked; webhook blank | `buildActionOut=built` (or equivalent success); subject/HTML/recipients written; `Weekly Email Ready?` on; Send left unchecked; `sendActionOut` skipped / not sent |
| 2 | **Already-built package** | Ready already on; subject/HTML present; arm `Send to Make?` only; webhook blank | No rebuild required; send path → `skipped_no_webhook` (or skipped_send_*); Ready stays on |
| 3 | **Disabled Config** | Set `sendEnabled` input to `false` (or Config path that disables send); Send armed; webhook blank or present | `skipped_send_disabled` / send skipped; package not mutated for a failed send |
| 4 | **Blank webhook** | Send armed + Ready; `makeWebhookUrl` blank | `skipped_no_webhook`; **no throw**; Send stays armed (retryable model) |
| 5 | **Missing recipient / template** | Clear recipients (or subject/HTML) for send-only run; Send armed | `skipped_missing_recipient` or `skipped_missing_package`; no send |
| 6 | **Already-sent key** | `Weekly Email Sent?` checked (or fixture with Sent on) | Skip send (`skipped_already_sent` / duplicate blocked); no webhook call |
| 7 | **Failed-send retry model** | (Docs/offline-proven) After a failed Make response Send stays checked — **do not** use live prod webhook. If unavailable live, mark **PASS by offline contract** + blank-webhook case #4 proves no clear-on-fail for empty URL path | Send arm preserved on failure; second run can retry |
| 8 | **Duplicate-trigger protection** | Re-run same WAS after successful build without clearing Sent / without new arm | `skipped_nothing_to_do` or idempotent skip; no duplicate package corruption |
| 9 | **Weekly timing prerequisites** | Enrollment empty **or** Week empty **or** Sent checked outside intended window | Automation does not falsely send; trigger conditions or script skips hold |

---

## Explicit non-goals this smoke

- No real family/parent email
- No production Make webhook URL
- No Folder 07 other automations toggled
- No 117 changes
- No PROD

---

## After critical PASS

1. Delete DEV automation **074**.
2. Capacity: **45 occupied / 5 free** (estimated; no visible Airtable counter).
3. Reply: **“Phase D UI complete”** so Cursor can close CONTROL / ledger / evidence.

## After critical FAIL

1. Turn OFF combined 072.
2. Restore from `_rollback/phase-d-072-074-2026-07-14/` (072 + 074).
3. Keep 074; do not delete.
4. Paste evidence (statusOut / errorOut / debugStep) to Cursor.
