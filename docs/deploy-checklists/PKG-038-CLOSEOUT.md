# PKG-038 — Closeout document

**Package:** Streak and shot-milestone XP corrected-history reliability  
**Backlog ID:** PKG-038 (`docs/v2-change-backlog.md`)  
**Repository status:** Documentation + script package **ready**; Production paste/proof **not claimed**  
**Prepared:** 2026-08-16

---

## Objective

Install repository versions **053 v5.5**, **054 v5.8**, **066 v3.8**, **059 v3.6** with lifecycle triggers that support:

- Canonical streak topology and exact `STREAK_XP` same-event inactive/reactivate
- Counted-submission milestone totals and exact `SHOT_MILESTONE` unlock/XP lifecycle
- No deletes of XP Events, unlocks, occurrences, or athlete data

**010** remains Submission Base XP owner. **041/042** observe only during proof.

---

## Package index

| Artifact | Path |
|---|---|
| **This closeout** | [PKG-038-CLOSEOUT.md](./PKG-038-CLOSEOUT.md) |
| Operator production packet (paste order) | [PKG-038-STREAK-MILESTONE-XP-PRODUCTION-PACKET.md](./PKG-038-STREAK-MILESTONE-XP-PRODUCTION-PACKET.md) |
| Field + table dependency sheet | [PKG-038-FIELD-DEPENDENCY-SHEET.md](./PKG-038-FIELD-DEPENDENCY-SHEET.md) |
| Repository vs Production audit | [PKG-038-REPOSITORY-VS-PRODUCTION-AUDIT.md](./PKG-038-REPOSITORY-VS-PRODUCTION-AUDIT.md) |
| Do-not-proceed gate | [PKG-038-DO-NOT-PROCEED-GATE.md](./PKG-038-DO-NOT-PROCEED-GATE.md) |
| Controlled test plan | [PKG-038-CONTROLLED-TEST-PLAN.md](./PKG-038-CONTROLLED-TEST-PLAN.md) |
| Evidence checklist | [PKG-038-EVIDENCE-CHECKLIST.md](./PKG-038-EVIDENCE-CHECKLIST.md) |
| Rollback plan | [PKG-038-ROLLBACK-PLAN.md](./PKG-038-ROLLBACK-PLAN.md) |

### Paste packets

| Automation | Operator packet | Copy-ready script |
|---|---|---|
| 053 v5.5 | [PKG-038-053-PASTE-PACKET.md](./PKG-038-053-PASTE-PACKET.md) | [PKG-038-053-v5.5-PASTE.txt](./PKG-038-053-v5.5-PASTE.txt) |
| 054 v5.8 | [PKG-038-054-PASTE-PACKET.md](./PKG-038-054-PASTE-PACKET.md) | [PKG-038-054-v5.8-PASTE.txt](./PKG-038-054-v5.8-PASTE.txt) |
| 066 v3.8 | [PKG-038-066-PASTE-PACKET.md](./PKG-038-066-PASTE-PACKET.md) | [PKG-038-066-v3.8-PASTE.txt](./PKG-038-066-v3.8-PASTE.txt) |
| 059 v3.6 | [PKG-038-059-PASTE-PACKET.md](./PKG-038-059-PASTE-PACKET.md) | [PKG-038-059-v3.6-PASTE.txt](./PKG-038-059-v3.6-PASTE.txt) |

### Code + offline tests

| Item | Path |
|---|---|
| 053 script | `airtable/automations/shooting-challenge/053-…-rebuild-and-upsert-from-submissions.js` |
| 054 script | `airtable/automations/shooting-challenge/054-…-create-or-repair-streak-xp-event.js` |
| 066 script | `airtable/automations/shooting-challenge/066-…-create-shot-milestone-unlocks.js` |
| 059 script | `airtable/automations/shooting-challenge/059-…-create-xp-event-from-achievement-unlock.js` |
| Streak lifecycle test | `airtable/automations/shooting-challenge/lib/pkg-038-streak-lifecycle.test.js` |
| 066 Notes optional test | `airtable/automations/shooting-challenge/lib/pkg-038-066-notes-optional.test.js` |
| Read-only audit | `airtable/extension-scripts/audits/audit-achievement-xp-pipeline-integrity.js` (v2.1) |

```bash
node airtable/automations/shooting-challenge/lib/pkg-038-streak-lifecycle.test.js
node airtable/automations/shooting-challenge/lib/pkg-038-066-notes-optional.test.js
```

---

## Release gates

| Gate | Status (2026-08-16) |
|---|---|
| PKG-006R complete | Backlog marks **complete** 2026-08-15 — Mike confirm 010 ON + reversal proof |
| PKG-036 complete | Backlog marks **complete** 2026-08-15 — Mike confirm no observation window |
| Schema/trigger attestation | **Open** — see audit uncertainties |
| Production controlled test | **Not started** |
| CHANGELOG Production entry | **Pending** successful proof |

---

## Known blockers (do not skip)

1. **059 trigger:** 2026-08-04 export shows `Ready for 059 XP? = 1` filter — incompatible with v3.6 lifecycle. Must attestation-fix before enable ([gate](./PKG-038-DO-NOT-PROCEED-GATE.md)).
2. **Editor versions:** Inventory lists 053 5.1 / 054 v5.4 / 066 v3.3 — behind repository; **UI proof required**.
3. **054 trigger:** Legacy “Ready for XP only” docs — withdrawal path **unverified** in PROD.
4. **Corrected-history proof:** Schmidt has positive streak/milestone data; inactive/reactivate same-ID path **not** live-proven.

---

## Mike tomorrow — execution order

1. Read [do-not-proceed gate](./PKG-038-DO-NOT-PROCEED-GATE.md).
2. UI attestation → fill [audit](./PKG-038-REPOSITORY-VS-PRODUCTION-AUDIT.md) gaps.
3. Run read-only audit → save JSON.
4. Complete [evidence checklist](./PKG-038-EVIDENCE-CHECKLIST.md) **Before** column with live record IDs.
5. Paste OFF automations per [production packet](./PKG-038-STREAK-MILESTONE-XP-PRODUCTION-PACKET.md).
6. Execute [controlled test plan](./PKG-038-CONTROLLED-TEST-PLAN.md).
7. On failure: [rollback](./PKG-038-ROLLBACK-PLAN.md) — no deletes.

---

## Completion criteria (PKG-038 done)

- [ ] All four automations at repository target versions **attested in UI**
- [ ] Lifecycle triggers attested (especially 059 without formula filter)
- [ ] Controlled test PASS on `recCyFEPeATOVNlr9` (or approved alternate) with checklist complete
- [ ] Before/after audit v2.1 zero findings
- [ ] `CHANGELOG.md` § Airtable entry (Mike paste approval)
- [ ] Backlog PKG-038 status updated after Mike sign-off

**This repository commit does not complete PKG-038** — it delivers the operator package only.
