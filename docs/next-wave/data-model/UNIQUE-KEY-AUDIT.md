# Unique-Key Audit (corrected)

**XP/email prefixes:** reuse `docs/next-wave/automation-ownership/xp-source-key-registry.json`

---

## Week identity (three fields)

| Concept | Field | Format | Evidence |
|---------|-------|--------|----------|
| Relational identity | `Week Key` | `RECORD_ID()` | schema-snapshot 2026-07-23 |
| Annual ops code | `Week Code` | intended `2026-2027\|Week 0` … | verified-prod Mike created in current PROD; **absent from 2026-07-23 snapshot** — OMNI attest |
| Display label | `Week Name` | `Week 0`, `Post-Challenge`, … | schema-snapshot primary text |

**Do not** call Week Code a seed convention. **Do not** claim Week Key equals year\|Week Name.

---

## Other identity keys

| Domain | Key | Format | Mutable? | Notes |
|--------|-----|--------|----------|-------|
| Enrollment | Enrollment Key | `{Athlete ID}\|{School Year}` | If Athlete/Year change | formula |
| WAS | Summary Key | `{Enrollment Key}\|{Week Key}` | If Enrollment Key changes | formula; never write |
| WAS | Weekly Summary Key | display links | Yes | Do not use for dedupe |
| Submission XP | Source Key | `SUBMISSION_XP\|{subId}` | No | 010 |
| Homework XP | Source Key | `HOMEWORK_XP\|{hcId}` | No | 065; legacy HOMEWORK_COMPLETION\| |
| HC script match | — | 020: Sub+HW+slot; 067: Enr+Week+HW RIDs | No | Not Completion Key formula |
| HC formula | Homework Completion Key | display join | Yes | Ops/views only |
| Streak / milestones / Zoom / email | See XP registry | RID-based | No | |

---

## Corrections to prior Agent 2 language

| Old claim | Corrected |
|-----------|-----------|
| year\|Week collapsed into Week Key | Separate **Week Code** field (OMNI attest formula) |
| Keep 118/119 OFF due to WAS race | Schedules **ON**; race is bounded concurrency residual |
| Make timestamp field Unknown | Make writes **Weekly Summary Sent At** |
