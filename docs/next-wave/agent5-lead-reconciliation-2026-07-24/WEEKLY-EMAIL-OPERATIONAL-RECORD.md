# Weekly Email — Final Operational Record

**Status:** Verified production (2026-07-24)  
**Do not mark historical Test-only behavior as the current production configuration.**

## Repository checkpoints

| Item | SHA | Evidence |
|------|-----|----------|
| Before final sendMode correction | `adfabc5` | Verified architecture documented |
| After Live writeback rule | `a8f3b00` | 074 must not force Test |
| Go-live (schedules ON + pack integration) | `7c7a79a` / `f0d060c` | PROJECT_STATE + go-live docs |
| Master tip at Agent 5 integration | `82e4a40` | Remaining OFF claims purged |

## Final architecture (verified_prod)

```text
118 → 072 → 119 → 074 → Make.com → Gmail → Make.com Airtable writeback
```

| Step | Owner | Does | Does not |
|------|-------|------|----------|
| **118** | Schedule Sun 5:00 AM Denver | Ensure WAS; arm Build | Build HTML; call Make |
| **072** | WAS Build trigger | Package + empty-week policy | Call Make |
| **119** | Schedule Sun 10:00 AM Denver | Arm `Send to Make?` | Post webhook |
| **074** | WAS Send trigger | POST Make webhook; clear Send on success | Mark Sent? |
| **Make** | `Weekly Athlete Summary - Bulk Email - May 18` | Gmail + Live writeback | — |

## Production problem → correction → result

| Phase | Fact |
|-------|------|
| Problem | 074 input fixed `sendMode=Test` |
| Effect | Make Test branch; email OK; **no** Sent? writeback |
| Correction | 074 `sendMode=Live` |
| Result | Email delivered; `Weekly Email Sent?` checked; `Make Send Status=Sent`; timestamp populated |
| Standing rule | **PROD must not remain forced to Test** |

## Schedule state (current)

| Component | State | Evidence class |
|-----------|-------|----------------|
| 118 / 119 schedules | **ON** | `verified_prod` (go-live) |
| 072 / 074 / Make | **ON** | `verified_prod` |
| 074 sendMode | **Live** | `verified_prod` |
| Empty-week policy | `send_short` | `verified_prod` |

Older “schedules OFF” packets are **Historical / Superseded** — see `../reliability-audit-2026-07-24/STALE-CLAIM-CORRECTION.md`.
