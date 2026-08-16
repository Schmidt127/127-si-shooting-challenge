# PKG-038 — Repository vs Production version audit

**Purpose:** Document what GitHub claims vs what Production evidence last proved — without assuming the repository or an older packet is current in Airtable.

**Repository SHA at package build:** verify `git rev-parse HEAD`  
**Last updated:** 2026-08-16

---

## Target versions (repository — authoritative for tomorrow's paste)

| # | Automation | Repo file | Repo version | Repo last-updated |
|---|------------|-----------|--------------|-------------------|
| 053 | Streak Occurrences Rebuild | `053-achievements-and-milestones-streak-occurrences-rebuild-and-upsert-from-submissions.js` | **5.5** | 2026-08-14 |
| 054 | Streak XP Event | `054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js` | **v5.8** | 2026-08-13 |
| 059 | XP from Achievement Unlock | `059-achievements-and-milestones-create-xp-event-from-achievement-unlock.js` | **v3.6** | 2026-08-13 |
| 066 | Shot Milestone Unlocks | `066-achievements-and-milestones-create-shot-milestone-unlocks.js` | **v3.8** | 2026-08-14 |

**Audit extension:** `audit-achievement-xp-pipeline-integrity.js` **v2.1** (read-only).

---

## Last attested Production versions (evidence — not assumed current)

| # | Last attested PROD version | Evidence source | Date | Confidence |
|---|---------------------------|-----------------|------|------------|
| 053 | **v5.3** (editor); governance notes also cite v5.0 stale stamp | `docs/prod-completion/2026-08-07/PROD-INTEGRITY-AND-PASTE-QUEUE-RECONCILIATION.md`; Completion Master SC-029 retains prior status | 2026-08-07 | **LOW** — not re-opened after 053 v5.4/v5.5 rewrites |
| 054 | **v5.6** | `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` SC-029/SC-075; streak XP live on Schmidt | 2026-08-05 | **MEDIUM** — v5.7/v5.8 exact-ownership lifecycle **not** pasted |
| 059 | **v3.5** | `docs/deploy-checklists/059-perfect-week-trigger-coverage.md` | 2026-08-05 | **MEDIUM** — v3.6 milestone `Active?` withdrawal path **not** attested in PROD |
| 066 | **v3.5** | `docs/prod-completion/2026-08-08/PROD-STATE-RECONCILIATION-010-031-066-118-119-043.md` | 2026-08-08 | **MEDIUM** — v3.6–v3.8 corrected-history / Notes-optional **not** pasted |

**Mike must capture** automation editor version string, trigger table, watched fields, dynamic `recordId` mapping, and ON/OFF state for all four **before** paste. Treat every cell above as **UNKNOWN** until re-captured tomorrow.

---

## Version drift by script (repo ahead of last PROD proof)

| Jump | Repository change | Production risk if not pasted |
|------|-------------------|-------------------------------|
| 053 v5.3 → **v5.5** | Separate create vs Ready-for-XP update (054 first-create handoff); canonical topology reconciliation | New streak awards may not reach 054 on first create; unsupported occurrences may stay active |
| 054 v5.6 → **v5.8** | Exact-ownership reconciliation; inactive withdrawal; duplicate rule-key guard; append backlinks | Corrections may leave stale active `STREAK_XP`; duplicates may not fail closed |
| 059 v3.5 → **v3.6** | Shot milestone `Active?` lifecycle: inactive unlock deactivates same XP Event; restoration reactivates | Milestone corrections may not withdraw XP; may create duplicates |
| 066 v3.5 → **v3.8** | Counted-submission-only totals (v3.7); below-threshold inactive unlocks (v3.6); optional Notes (v3.8) | Wrong totals; unsupported unlocks stay active; schema drift on Notes blocks runs |

---

## Stale documentation hazards (do not trust without UI check)

| Document | Stale claim | Correct repo authority |
|----------|-------------|------------------------|
| `docs/automation-index.md` (pre-PKG-038 closeout) | 053 **v5.4**, 066 **v3.7** | 053 **v5.5**, 066 **v3.8** |
| `docs/AUTOMATION_VERSION_INVENTORY.md` | 053 **5.1**, 054 **v5.4**, 059 **v3.5**, 066 **v3.3** | Inventory dated 2026-07-16 — use script headers |
| `docs/v2-change-backlog.md` PKG-038 row | Blocked by PKG-006R + PKG-036 | Both **complete 2026-08-15** — paste still requires Mike approval + this packet |
| H-002 / Completion Master | 066 v3.1/v3.2 PROD pasted 2026-07-06 | Superseded by later 066 versions; 2026-08-08 attests **v3.5** only |
| `AUTOMATION_VERSION_INVENTORY` row 054 | Trigger: Source Status = Ready for XP only | **Incorrect for v5.8** — lifecycle trigger must include `Active?` withdrawal |

---

## Uncertainty register (explicit blockers)

| ID | Uncertainty | Required proof before Production enable |
|----|-------------|----------------------------------------|
| U-001 | Live 053 editor version | Screenshot or automation metadata: must match **5.5** after paste |
| U-002 | Live 054 trigger watches `Active?` and does not require Ready-only positive filter | Trigger screenshot + controlled withdrawal test |
| U-003 | Live 059 reaches inactive milestone unlock updates | Edit `Active?` on one controlled unlock; 059 must run without Shot Milestone filter |
| U-004 | Live 066 uses counted-submission formula gate | Controlled submission exclude/include changes milestone total |
| U-005 | Schmidt streak occurrence IDs for existing `STREAK_XP` keys | Export before test — keys from 2026-08-05 may have shifted |
| U-006 | Eight milestone unlock record IDs still tied to `recCyFEPeATOVNlr9` | Inventory unlocks by Milestone Source Key before correction test |
| U-007 | XP Reward Rules: no duplicate active `STREAK_*` or `SHOT_MILESTONE` keys | Read-only rule table scan |
| U-008 | PKG-006R / PKG-036 observation window closed | Mike confirms no competing lifetime-XP reconciliation in flight |

**If any U-* cannot be proven:** stop — see [PKG-038-DO-NOT-PROCEED-GATE.md](./PKG-038-DO-NOT-PROCEED-GATE.md).

---

## Repository test evidence (not Production proof)

| Test | Path | Covers |
|------|------|--------|
| Mocked lifecycle | `tests/streak-milestone/mocked-runtime.test.js` | award, rerun, streak withdrawal/restoration, milestone withdrawal/restoration, duplicate guard |
| 053 handoff | `airtable/automations/shooting-challenge/lib/pkg-038-streak-lifecycle.test.js` | v5.5 create-then-Ready update |
| 066 Notes optional | `airtable/automations/shooting-challenge/lib/pkg-038-066-notes-optional.test.js` | v3.8 schema gate |
| Audit read-only | `tests/streak-milestone/audit-achievement-xp-pipeline-integrity-read-only.test.js` | no mutations; drift detection |
| Dedupe harness | `airtable/automations/shooting-challenge/lib/overnight-streak-milestone-dedupe.test.js` | source keys, crossings |

Offline tests **do not** replace Mike's Production paste and controlled-athlete proof.

---

## Recommended operator action tomorrow

1. Record live versions for 053/054/059/066 (screenshot).
2. Compare to this table — if any mismatch with target, paste from GitHub per individual paste packets.
3. Run read-only audit JSON before enablement.
4. Execute [PKG-038-PRODUCTION-TEST-PLAN-SCHMIDT.md](./PKG-038-PRODUCTION-TEST-PLAN-SCHMIDT.md).
5. File evidence in [PKG-038-EVIDENCE-CHECKLIST.md](./PKG-038-EVIDENCE-CHECKLIST.md).
