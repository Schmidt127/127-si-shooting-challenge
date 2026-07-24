# Mike Actions — Config / XP (next-wave)

**Date:** 2026-07-24  
**Companion (overnight detail):** `docs/overnight/config-xp/MIKE-ACTIONS.md`

---

## Installed in PROD (2026-07-24)

| Automation | Version | Status | Notes |
|------------|---------|--------|-------|
| **054** | **v5.6** | **Installed in PROD** | Duplicate active `STREAK_nDAY` XP rule detection guard |
| **066** | **v3.3** | **Installed in PROD** | Grade Band link-ID matching for shot milestone unlocks |

**Not Live Tested yet** — no fresh controlled Schmidt proof recorded for these paste versions. Keep status **Installed in PROD** until a supervised streak / milestone run verifies expected unlock + XP + rerun safety.

Scripts (repo SoT — do not change behavior in this documentation pass):

- `airtable/automations/shooting-challenge/054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js`
- `airtable/automations/shooting-challenge/066-achievements-and-milestones-create-shot-milestone-unlocks.js`

---

## Still needed (Mike / Cursor)

1. **Supervised live streak test** (SC-075 / SC-029) — controlled 3-day chain on Schmidt; one unlock + one XP; rerun safe.  
2. **Supervised milestone / natural run** (SC-076 / SC-027) — Schmidt approach or OMNI check; expect skip or unlock per threshold; no Grade Band rename errors.  
3. **Video XP 1-vs-25** investigation (`recYQ10pOoFlApmjZ`) — SC-022 remaining.  
4. **SC-081** streak repeat-after-break product decision.  
5. Archive inactive legacy Grade Bands after dependency confirm (SC-023 remaining).

Do **not** mark Live Tested in PROD until controlled records prove expected results.
