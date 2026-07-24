# Safe Migration Plan (Documentation Only — No Prod Execution)

**Constraints:** No deletes, renames, type changes, or primary-field changes in production without Mike-approved migration tickets. Agent 2 does **not** create replacement fields in this pass.

---

## M-01 — Clarify Week identity (docs + views only)

| Item | Detail |
|------|--------|
| Current | Confusion: Week Key vs `2026-2027\|Week N` naming |
| Proposed | Keep fields; document: Week Key=`RECORD_ID()`; Week Name=label; composite year\|name is ops convention |
| Reason | Prevent automations keyed on wrong string |
| Writers | none for Week Key |
| Readers | 031/118 Summary Key builders; ops views |
| Formulas | Week Key, Summary Key |
| Scripts | 005/031/118/119 |
| Views | Week admin views — show Week Name + Record ID + Program Instance |
| Forms / Make | n/a |
| Order | 1) Docs (this pack) 2) OMNI view labels 3) No field rename |
| Rollback | Revert docs |
| Verify | Field-contracts test; OMNI sample Week shows RID in Week Key |

---

## M-02 — WAS email status field consolidation (future)

| Item | Detail |
|------|--------|
| Current | `Weekly Email Sent?` + `Make Send Status` + `Weekly Summary Email Status` + dual timestamps |
| Proposed replacement | Keep Make-owned Sent? + Sent At + Make Send Status as authoritative; hide Summary* status/timestamp from default views |
| Reason | Dual status confusion after Live writeback |
| Writers | Make Live; 072 status possibly |
| Readers | 074, ops |
| Migration order | 1) Attest which fields Make writes 2) Hide non-authoritative 3) Only later consider formula “Effective Send State” **if** approved |
| Rollback | Unhide fields |
| Verify | Controlled Live send: Sent?=1, Make Send Status=Sent, Email Sent At set; Summary* fields documented as legacy or synced |

**Do not** rename Sent? fields while Make mappings depend on exact names.

---

## M-03 — Retire Weeks text stubs (candidate — verify first)

| Current fields | Homework 2, Video Feedback (text), Submission Assets (text), XP Events copy |
| Proposed | Hide now; retire only after Interface/view/Make scan shows zero readers |
| Reason | Fake relationships |
| Writers/readers | Unknown — OMNI scan required |
| Order | Inventory → Hide → 90-day watch → retire ticket |
| Rollback | Unhide |
| Verify | `field_index` + Interface export + Make blueprint search |

---

## M-04 — Prefer Summary Key over Weekly Summary Key

| Current | Both formulas exist |
| Proposed | Scripts already prefer Enrollment+Week / Summary Key — document Do not use Weekly Summary Key for dedupe; hide from ops |
| Scripts affected | Ensure no new script matches on Weekly Summary Key |
| Order | Docs + contract test → view hide |
| Rollback | n/a |
| Verify | Grep automations for `Weekly Summary Key` write/match |

---

## M-05 — Gate summary formula dedupe (low priority)

| Current | Gate Failure Summary - Formula vs Gate Summary |
| Proposed | Hide weaker FIND-based formula from views; keep numeric Gate Summary |
| Reason | Suspect FIND("Pass") on numeric field |
| Order | Verify both in Interfaces → Hide → later formula delete ticket only with approval |
| Rollback | Unhide |

---

## M-06 — HC key harden (future schema — requires approval)

| Current | Homework Completion Key uses ARRAYJOIN of link primaries |
| Proposed (future) | New formula using Enrollment RID \| Week RID \| Homework RID **additive**; dual-run readers; then switch scripts |
| Reason | Rename collision |
| Blockers | Requires Mike schema authorization; dual-key period |
| Not started | Agent 2 only documents requirement |

---

## M-07 — Typo rename `Registratioin Referrer`

| Proposed | Rename → Registration Referrer |
| Risk | Fillout/Make/mappings |
| Order | Inventory all consumers → rename in DEV first → PROD with checklist |
| Rollback | Rename back |
| Verify | No broken filters |

---

## Explicitly deferred / forbidden without new approval

- Changing Weeks primary from Week Name  
- Changing Enrollment primary formula  
- Deleting Google Drive URL fields  
- Creating new Config link on Weeks without Program Instance strategy  
- Any Team Shot Tracker alert fields  

---

## Recommended migration sequence (priority)

1. **P0** Docs correction Week Key vs Week Name (done in this pack)  
2. **P1** Mike attest Make writeback field list; hide overlapping WAS status fields in views  
3. **P1** Confirm 074 PROD sendMode remains Live (ops — not schema)  
4. **P2** Hide Weeks text stubs after inventory  
5. **P3** Gate summary / typo renames / HC RID key (approved tickets only)
