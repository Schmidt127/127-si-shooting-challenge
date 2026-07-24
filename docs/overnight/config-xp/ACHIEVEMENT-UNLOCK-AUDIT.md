# Achievement Unlock Integrity Audit

Overnight Agent 2 · 2026-07-24 · builds on 2026-07-23 config-xp package

## Writers

| Achievement family | Unlock writer | XP writer | Key contract |
|---|---|---|---|
| Streak | 053 (occurrence) → unlock path via Achievements | 054 | `STREAK_XP\|{enrollment}\|{achievement}\|{endDate}` |
| Shot Milestone | **066** | 059 | `SHOT_MILESTONE\|{enrollment}\|{milestone}` (Milestone Source Key) |
| Perfect Week | **058** | 059 | `PERFECT_WEEK\|{enrollment}\|{week}` |
| Other catalog achievements | catalog-driven | 059 when Pending | Achievement Reward Rule Key |

## Field contract (Athlete Achievement Unlocks)

| Field | Role |
|---|---|
| Unlock Key | Often formula/computed — scripts must not overwrite when computed |
| Milestone Source Key | Writable dedupe key for shot milestones |
| Streak Instance Key | Streak occurrence identity (when used) |
| Enrollment | Required link |
| Achievement / Shot Milestone / Week | Rule / source links |
| Unlock date / Milestone Activity Date | Provenance |
| XP Events | Link to awarded XP |
| XP Award Status / Award Status | Pending → Awarded |
| Writer automation | 066 / 058 / 053-family |

## Live PROD state (2026-07-24 read-only)

- Unlock table empty (`unlockCount: 0`).
- Audit utility: `tools/airtable/overnight_achievement_unlock_audit.py`
- Live report: `achievement-unlock-audit-live.json` — **zero findings** (empty table is clean).

## Risks (code + design)

| Risk | Status |
|---|---|
| Blank Unlock Keys | Guarded by `auditAchievementUnlockIntegrity` + live audit utility |
| Multiple unlocks for one source | Milestone Source Key / Source Key dedupe; tests pin `skip_existing` |
| Orphan unlocks | Detectable when Awarded without XP Event link |
| Unlock without XP | Medium finding in audit helper |
| XP without unlock | Out of unlock-table scope; XP Source Key scan is separate |
| Mismatched enrollment | High finding when Enrollment blank |
| Wrong Grade Band rule | Mitigated in repo by 066 v3.3 link-ID matching (paste required) |
| Duplicate active achievement rules | 066 throws on multiple active Shot Milestone achievements |

## Repo helpers added 2026-07-24

- `auditAchievementUnlockIntegrity` in `lib/v2-engine-contracts.js`
- Tests in `lib/overnight-xp-rules-and-unlocks.test.js`
- Read-only PROD auditor: `tools/airtable/overnight_achievement_unlock_audit.py`

## Safe fixes applied

- 066 v3.3: Grade Band match prefers linked record IDs (label fallback only).
- 054 v5.6: Duplicate active XP Reward Rules error instead of first-match.
- No live unlock rows to repair. No XP amounts changed.
