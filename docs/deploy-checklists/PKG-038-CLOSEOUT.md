# PKG-038 closeout — Streak and shot-milestone XP corrected-history reliability

**Package ID:** PKG-038  
**Status:** Repository-ready · Production paste/proof **pending Mike**  
**Last updated:** 2026-08-16  
**Repository branch:** `cursor/pkg-038-operator-package-d76c` (verify merged SHA on `master` before paste)

---

## Goal

Make Production work **low-risk and fast** by supplying scripts, offline tests, read-only audit, version honesty, paste packets, controlled Schmidt test plan, evidence checklist, rollback, and explicit stop gates — without assuming the live base matches GitHub.

**010** remains sole owner of Submission Base XP (`SUBMISSION_XP|{Submission ID}`).

---

## Repository code (target versions)

| # | Version | File |
|---|---------|------|
| 053 | **5.5** | `airtable/automations/shooting-challenge/053-achievements-and-milestones-streak-occurrences-rebuild-and-upsert-from-submissions.js` |
| 054 | **v5.8** | `airtable/automations/shooting-challenge/054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js` |
| 059 | **v3.6** | `airtable/automations/shooting-challenge/059-achievements-and-milestones-create-xp-event-from-achievement-unlock.js` |
| 066 | **v3.8** | `airtable/automations/shooting-challenge/066-achievements-and-milestones-create-shot-milestone-unlocks.js` |

**Lifecycle rules:** unsupported unlocks/occurrences/events → `Active?` false; **never deleted**. Rerun idempotent. Separate canonical streak blocks may earn again (new Streak End Date → new `STREAK_XP` key).

---

## Operator packet index

| Document | Purpose |
|----------|---------|
| [PKG-038-STREAK-MILESTONE-XP-PRODUCTION-PACKET.md](./PKG-038-STREAK-MILESTONE-XP-PRODUCTION-PACKET.md) | Master enablement order + scope |
| [PKG-038-FIELD-AND-TABLE-DEPENDENCY-SHEET.md](./PKG-038-FIELD-AND-TABLE-DEPENDENCY-SHEET.md) | Tables, fields, types, writers |
| [PKG-038-REPOSITORY-VS-PRODUCTION-VERSION-AUDIT.md](./PKG-038-REPOSITORY-VS-PRODUCTION-VERSION-AUDIT.md) | Version drift + uncertainty register |
| [PKG-038-DO-NOT-PROCEED-GATE.md](./PKG-038-DO-NOT-PROCEED-GATE.md) | Hard stops before paste |
| [PKG-038-PASTE-053-v5.5.md](./PKG-038-PASTE-053-v5.5.md) | Copy-ready 053 |
| [PKG-038-PASTE-054-v5.8.md](./PKG-038-PASTE-054-v5.8.md) | Copy-ready 054 |
| [PKG-038-PASTE-066-v3.8.md](./PKG-038-PASTE-066-v3.8.md) | Copy-ready 066 |
| [PKG-038-PASTE-059-v3.6.md](./PKG-038-PASTE-059-v3.6.md) | Copy-ready 059 |
| [PKG-038-PRODUCTION-TEST-PLAN-SCHMIDT.md](./PKG-038-PRODUCTION-TEST-PLAN-SCHMIDT.md) | Controlled athlete proof |
| [PKG-038-EVIDENCE-CHECKLIST.md](./PKG-038-EVIDENCE-CHECKLIST.md) | Before/after record + field IDs |
| [PKG-038-ROLLBACK-PLAN.md](./PKG-038-ROLLBACK-PLAN.md) | Script-only revert |

---

## Read-only audit

| Item | Path |
|------|------|
| Extension script | `airtable/extension-scripts/audits/audit-achievement-xp-pipeline-integrity.js` **v2.1** |
| Contract test | `tests/streak-milestone/audit-achievement-xp-pipeline-integrity-read-only.test.js` |

**No write capability.** Run in Airtable Scripting before paste and after proof; save JSON to evidence folder.

---

## Automated tests (repository — not Production proof)

| Test | Command |
|------|---------|
| Mocked 053→054→066→059 lifecycle | `node tests/streak-milestone/mocked-runtime.test.js` |
| 053 v5.5 handoff | `node airtable/automations/shooting-challenge/lib/pkg-038-streak-lifecycle.test.js` |
| 066 Notes optional | `node airtable/automations/shooting-challenge/lib/pkg-038-066-notes-optional.test.js` |
| Audit read-only | `node tests/streak-milestone/audit-achievement-xp-pipeline-integrity-read-only.test.js` |
| Dedupe / crossings | `node airtable/automations/shooting-challenge/lib/overnight-streak-milestone-dedupe.test.js` |
| 066 harness | `node airtable/automations/shooting-challenge/lib/066-milestone-crossing-harness.test.js` |

**Focused PKG-038 suite:** run all commands above before paste.

---

## Tomorrow quick start (Mike)

1. Read [PKG-038-DO-NOT-PROCEED-GATE.md](./PKG-038-DO-NOT-PROCEED-GATE.md).
2. Capture live 053/054/059/066 versions + triggers; compare to [version audit](./PKG-038-REPOSITORY-VS-PRODUCTION-VERSION-AUDIT.md).
3. Fill **Before** column of [evidence checklist](./PKG-038-EVIDENCE-CHECKLIST.md) for `recCyFEPeATOVNlr9`.
4. Run read-only audit; stop on blockers.
5. Paste OFF: 053 → 054 → 066 → 059 (individual paste packets).
6. Enable: 053 → 054 → 066 → 059.
7. Execute [test plan](./PKG-038-PRODUCTION-TEST-PLAN-SCHMIDT.md); complete **After** evidence.
8. On failure: [rollback](./PKG-038-ROLLBACK-PLAN.md) — no data deletes.

---

## Dependencies satisfied (repository claim)

| Dependency | Status (backlog 2026-08-15) |
|------------|-------------------------------|
| PKG-006R | **complete** |
| PKG-036 | **complete** |
| Mike PKG-038 release | **Required** — not automatic |

---

## Remaining Airtable steps (Production)

1. Mike approval + gate clearance  
2. Baseline capture + rollback exports  
3. Paste four automations (versions above)  
4. Trigger verification  
5. Schmidt controlled test (steps A–L)  
6. Post-proof audit JSON  
7. `CHANGELOG.md` → `### Airtable` entry on successful paste  
8. Update backlog PKG-038 status to complete with evidence path  

---

## Known blockers / assumptions

| Item | Notes |
|------|-------|
| Live PROD versions unknown until UI capture | Last attested: 053 v5.3, 054 v5.6, 059 v3.5, 066 v3.5 |
| Streak/milestone record IDs from 2026-08-05 may drift | Re-inventory at step A |
| Schema snapshot dated 2026-07-23 | Re-verify field IDs if OMNI reports mismatch |
| Perfect Week must not regress | 059 trigger must not filter Shot Milestone |
| No web / Make / schema changes in this package | |

---

## Backlog

`docs/v2-change-backlog.md` — **PKG-038** row updated to repository-ready / Production proof pending.

---

## Related changelog entries

`CHANGELOG.md` — PKG-038 script changes 2026-08-13 through 2026-08-14 (053 v5.5, 054 v5.8, 059 v3.6, 066 v3.8, audit v2.1).
