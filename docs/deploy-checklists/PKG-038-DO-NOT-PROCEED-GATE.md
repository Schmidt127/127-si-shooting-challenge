# PKG-038 — Do not proceed gate

**Authority:** No Production paste, enablement, or controlled test until every section below is **proven** from repository evidence + Mike's live UI capture. If proof is missing, **report the blocker** — do not invent schema, triggers, or record IDs.

---

## Gate 1 — Dependency locks

| Requirement | Proof | Blocker if missing |
|-------------|-------|-------------------|
| PKG-006R complete | `docs/v2-change-backlog.md` row **complete 2026-08-15** | Do not paste while 010 reconciliation unstable |
| PKG-036 complete | backlog row **complete 2026-08-15** | Do not paste during progression observation window |
| Mike releases PKG-038 | Explicit Mike message | Repository-ready ≠ approved |
| No competing lifetime-XP window | Mike confirmation | Wait |

---

## Gate 2 — Live automation metadata (Mike UI only)

For **each** of 053, 054, 059, 066 record:

- [ ] Automation name matches packet
- [ ] Installed version string (screenshot)
- [ ] ON/OFF state
- [ ] Trigger table
- [ ] Watched fields list matches paste packet
- [ ] No fixed `rec…` input — `recordId` is dynamic
- [ ] No forbidden filters (054 Ready-only; 059 Shot Milestone not empty; 059 Ready for 059 XP)

**Blocker example:** "054 trigger does not watch `Active?` — cannot prove withdrawal path."

---

## Gate 3 — Schema field proof

From [PKG-038-FIELD-AND-TABLE-DEPENDENCY-SHEET.md](./PKG-038-FIELD-AND-TABLE-DEPENDENCY-SHEET.md):

| Check | Blocker if fails |
|-------|----------------|
| `Streak Occurrences.Source Status` options include Ready for XP, Awarded, Error | Cannot write single-select |
| `Athlete Achievement Unlocks.XP Award Status` includes Pending, Awarded | 059 cannot arm |
| `XP Events.Active?` exists and writable | Cannot inactive lifecycle |
| `Submissions.Count This Submission?` is formula | 066 v3.7+ requirement |
| `XP Events.XP Bucket` includes Streak and Shot Milestone | Select option missing |
| `Athlete Achievement Unlocks.Notes` | Optional in v3.8 — **not** a blocker if absent |

**If live field ID ≠ snapshot:** stop and refresh schema snapshot before paste.

---

## Gate 4 — Config ownership

| Check | Blocker |
|-------|---------|
| Exactly one active XP Reward Rule per streak Rule Key used | Duplicate → 054 errors |
| Exactly one `SHOT_MILESTONE` active rule | 059 errors |
| Shot Milestone achievement row exists (`SHOT_MILESTONE` key) | 066 cannot create unlocks |
| Streak achievements `Trigger Type = Streak Length` active | 053 no-op |
| Enrollment `recCyFEPeATOVNlr9` has one Grade Band + one Program Instance | Week/milestone scope ambiguous |

---

## Gate 5 — Data ambiguity (Schmidt scope)

| Check | Blocker |
|-------|---------|
| No duplicate active XP Events per exact Source Key in test scope | `duplicate_canonical_xp_source_key` in audit |
| No duplicate canonical WAS per Enrollment+Week for touched weeks | WAS ownership unclear |
| Streak occurrence inventory matches `STREAK_XP` keys (or document drift) | Cannot verify same-ID restoration |
| Eight milestone keys inventory current | Wrong unlock targeted in correction test |

---

## Gate 6 — Repository vs Production version

From [PKG-038-REPOSITORY-VS-PRODUCTION-VERSION-AUDIT.md](./PKG-038-REPOSITORY-VS-PRODUCTION-VERSION-AUDIT.md):

| Uncertainty ID | Must resolve |
|----------------|--------------|
| U-001 … U-008 | Each open item blocks enablement |

**Do not assume** GitHub master is installed in Production because a prior packet said so.

---

## Gate 7 — Test isolation

| Check | Blocker |
|-------|---------|
| Email/Make disabled or test-isolated | Risk of parent email |
| Controlled submissions identified by ID | Cannot reproduce correction |
| Rollback capture completed | No safe revert |

---

## Blocker report template

When stopped, file:

```
PKG-038 BLOCKER
Date:
Operator:
Gate failed: (number + name)
Evidence gap: (what cannot be proven)
Live state observed: (versions, IDs if known)
Recommended action: (OMNI field check / schema export / Mike decision)
Do not: (paste / enable / edit production data)
```

Post in operator log; do not proceed to paste until gate cleared.

---

## Clear to proceed (all required)

- [ ] Gates 1–7 pass
- [ ] Read-only audit JSON saved (pre-paste)
- [ ] Rollback scripts captured
- [ ] Evidence checklist **Before** column started
- [ ] Mike explicit go-ahead for PKG-038 Production work

Then follow [PKG-038-STREAK-MILESTONE-XP-PRODUCTION-PACKET.md](./PKG-038-STREAK-MILESTONE-XP-PRODUCTION-PACKET.md) enablement order.
