# Homework Completion Identity Audit

**Conclusion:** RID-based script matching is **safe**. Display `Homework Completion Key` formula is **not** the script identity. **No RID-key migration required** from this audit.

---

## Current Completion Key formula (schema-snapshot)

```
ARRAYJOIN({Enrollment}) & "|" & ARRAYJOIN({Week}) & "|" & ARRAYJOIN({Homework})
```

Uses linked **primary display** values. Renaming Week Name or Homework title changes the formula string — but scripts do not match on it.

---

## Script duplicate-prevention

### 020 (asset path) — authoritative HC create for submission assets

| Item | Value |
|------|-------|
| Match | `Submission RID + Homework RID + Asset slot (HW1/HW2)` |
| Create writes | Enrollment, Week, Homework, Submission, Assets, statuses |
| Re-query before create | Yes (race guard) |
| Uses Completion Key formula? | **No** |

### 067 (reflection quiz path)

| Item | Value |
|------|-------|
| Match | `Enrollment RID + Week RID + Homework RID` via `buildDedupeKey` |
| Create writes | Enrollment, Week, Homework, quiz link, Grade Band |
| Uses Completion Key formula? | **No** |

### XP

| Item | Value |
|------|-------|
| Source Key | `HOMEWORK_XP\|{homeworkCompletionId}` (**065**) |
| Identity | HC record ID — stable |

---

## Does key change when display labels change?

| Surface | Effect |
|---------|--------|
| Homework Completion Key formula | Yes — display string changes |
| 020 / 067 matching | **No** — RIDs |
| XP Source Key | **No** — HC RID |

---

## Actual duplicate evidence

| Finding | Class |
|---------|-------|
| 020 vs 067 different match shapes | `duplicate_risk` if both create for same Enr+Week+HW without shared Submission | Product open (Agent 9 OW-D4) — not fixed by RID formula migration |
| Formula display collision across years if Week Name reused without Program Instance | Ops view noise only | Scripts unaffected |
| Live duplicate count in PROD | **mike-ui** — optional OMNI scan | Not proven required for migration |

---

## Dependencies on Completion Key formula

| Consumer | Uses formula? |
|----------|---------------|
| 020 / 067 / 065 | No |
| WAS Homework Assigned Count rollup | Counts Completion Key field presence on linked HC (rollup target) — still works if string changes |
| Make / Fillout / Softr | No repo evidence of Completion Key mapping |

---

## Verdict

**Proof current identity is safe for automations:** scripts key on record IDs / Submission+slot.  
**Do not** propose RID-key migration solely because the display formula is imperfect.  
**Remain open:** product rule for 020 vs 067 dual create paths (attest / decide).
