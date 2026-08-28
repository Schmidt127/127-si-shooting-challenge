# Weekly email pipeline audit — 2026-08-28

**Authority:** Repository scripts + [`integrations/email-send-plane.md`](../integrations/email-send-plane.md)  
**Scope:** Automations **072**, **119**, **074**, **079** (Hub → Resend plane)  
**Production paste:** Not modified by this audit — Mike actions listed below.

## Intended chain (current)

```text
118 (Sun 5:00 AM Denver) → arms Build Weekly Email Now?
072 (WAS trigger)        → builds package on WAS
119 (Sun 10:00 AM Denver)→ arms Send to Make? on qualifying rows
074 (WAS trigger)        → creates one Email Handoff Queue row
079 (queue Ready)        → POST to Communications Hub → Resend
```

| Step | GitHub version | Trigger (repo docblock) | Arms / creates | Does **not** do |
|------|----------------|-------------------------|----------------|-----------------|
| **072** | v4.8 | WAS: `Build Weekly Email Now?` checked; `recordId` = WAS | Subject/HTML/text/payload; `Weekly Email Ready?`; clears arm flags | Send, webhook, Make |
| **119** | v1.7 | Scheduled Sun 10:00 AM Denver | Sets `Send to Make? = true` when ready + not sent | POST Make/Hub |
| **074** | v3.3 | WAS: Ready + not Sent + `Send to Make?` | One queue row; Handoff Key `WEEKLY_ATHLETE_SUMMARY\|WEEKLY_ATHLETE_SUMMARY\|{WAS id}` | Make/Gmail/Resend/Hub ingress |
| **079** | v2.5 | Queue: `Status = Ready` | Hub ingest POST; queue → Accepted/Failed | WAS `Weekly Email Sent?` |

**Sent? ownership:** 074 and 079 do **not** write `Weekly Email Sent?` / `Weekly Email Sent At`. Hub/Resend writeback (or operator) owns delivery confirmation.

## Drift vs live Airtable (Mike must confirm)

Repository cannot read Automations UI. Verify in Production:

| Check | Repo expectation | Risk if drift |
|-------|------------------|---------------|
| 072 paste version | **v4.8** (secure video URLs in package) | Stale v4.7 may omit Lambda-only parent video links |
| 074 automation input `testMode` | Must be **`false`** for season Live parent delivery | Default script `testMode=true` suppresses real sends |
| 119 `dryRun` input | **`false`** for production schedule | dryRun=true arms nothing |
| 119 `includeSchmidt` | **`false`** unless testing | Schmidt rows armed accidentally |
| Trigger: 074 | WAS Ready + not Sent + Send to Make? | Wrong gate → no queue row or duplicate arms |
| Trigger: 079 | Queue Status = Ready | Stale Make-era trigger would never fire |
| Field name `Send to Make?` | Still used as arm flag (legacy name) | Cosmetic only if behavior matches |

## Repository vs historical docs

| Document | Issue |
|----------|--------|
| `docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md` | **Historical** Make/Gmail path; version table stale (072 v4.0, 074 v2.1) |
| `docs/launch-certification/START-HERE.md` | Lists Make weekly scenario ON — **superseded** by Hub plane (2026-08-19) |
| `119` script header | Still says "074 posts to Make" — **stale comment** |
| Retry SOPs / scn-029 | Make webhook failure modes — use Hub queue + `WEEKLY_ATHLETE_SUMMARY\|…` key |

## Hardcoded IDs (repo)

| Script | ID | Purpose |
|--------|-----|---------|
| 072 | `recCyFEPeATOVNlr9` | Schmidt enrollment skip unless `allowSchmidtInput` |
| 119 | `recCyFEPeATOVNlr9`, `recgP9qZYjAhE7NXm` | Schmidt exclude unless `includeSchmidt=true` |

## Mike-only Airtable actions

1. **Confirm live script versions** match GitHub: 072 **v4.8**, 119 **v1.7**, 074 **v3.3**, 079 **v2.5** (Automations table Code column or script body).
2. **074 automation inputs:** set `testMode` = **`false`** for production weekly sends.
3. **119 automation inputs:** `dryRun` = **`false`**, `includeSchmidt` = **`false`** (unless disposable test).
4. **Trigger attestation:** 074 fires on WAS Send-to-Make gate; 079 fires on queue Ready (not Make webhook).
5. **Disable** any legacy Make weekly-email scenario if still ON (historical `Weekly Athlete Summary - Bulk Email`).
6. **One disposable E2E** (Schmidt or excluded enrollment): arm 118 → verify 072 package → 119 arm → 074 queue row → 079 Accepted (no parent email required for pass if Hub testMode handled).

## Secure video in weekly package (072 v4.8)

072 rejects direct S3/presigned/Drive URLs in parent-facing video lists; missing secure URLs surface as `missingSecureUrlCount` in payload. Confirm **022 v2.2** and **073 v4.4** pasted if parent video links appear in weekly mail.
