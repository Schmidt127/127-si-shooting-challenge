# C-025 Stage 17 — B1 PROD 101 live control brief

**Date:** 2026-07-20  
**Stage 17 status:** **COMPLETE** (2026-07-20) — this brief is retained as B1 control-test evidence/procedure  
**Automation:** **101** Zoom Attendance XP — Award Meeting XP (**v5.5** SoT)  
**Mode (at B1 time):** Mike runs in Airtable UI — **do not change any automation ON/OFF states for the test**  
**Standing (at B1 time):** 117 / 042 / 057 were **OFF** for live-control isolation; 101 stayed in its normal live state (do not toggle)

> After Stage 17 completion, **117 / 057 / 042 are ON**. Do not re-run B1 as a “leave 117 OFF” gate — use this doc only as historical control evidence and fixture guidance.

---

## Exact records to use

| Role | PROD record | Notes |
|------|-------------|--------|
| **Enrollment (Attendee)** | `recgP9qZYjAhE7NXm` | Schmidt Testing — same fixture as 117 smoke |
| **101 trigger record** | **Zoom Meetings** — dedicated **live-only** test meeting (see below) | Do **not** use `reczeUT0AJUWMmEOb` for B1 |
| **Recording meeting (reserved for B2)** | `reczeUT0AJUWMmEOb` | Already has `ZOOM_CREDIT|…` / ZA `recfqsgM7zDobxsPf` — keep for conflict smoke |

### Zoom Meeting for B1 (create or pick)

Use a **Completed** Zoom Meeting that:

1. Has a non-blank **`Zoom Meeting Key`**
2. Has a linked **Week**
3. Has **`Attendees`** = exactly `recgP9qZYjAhE7NXm` for this test (or includes it; prefer only this enrollment to keep XP noise low)
4. Has **no** approved Recording Quiz Zoom Attendance for this enrollment (live-only control)
5. Is **not** `reczeUT0AJUWMmEOb`

Write the IDs you actually use:

| Field | Value (fill when you pick/create) |
|-------|-----------------------------------|
| Zoom Meeting record ID | `rec________________` |
| Zoom Meeting Key (text field) | `________________` |

---

## Exact expected Source Key

```text
ZOOM_ATTEND_BASE|{Zoom Meeting Key}|recgP9qZYjAhE7NXm
```

**Important:** Middle segment is the meeting’s **`Zoom Meeting Key` field value**, not necessarily the Airtable `rec…` id (101 builds the key from that field).

Example shape only: `ZOOM_ATTEND_BASE|2026-07-20-TEST-LIVE|recgP9qZYjAhE7NXm`

---

## Exact expected XP Event fields (base live award)

| Field | Expected |
|-------|----------|
| **Source Key** | `ZOOM_ATTEND_BASE\|{Zoom Meeting Key}\|recgP9qZYjAhE7NXm` |
| **XP Points** | **60** (from active XP Reward Rule `ZOOM_ATTEND_BASE`) |
| **XP Bucket** | `Zoom Attendance` |
| **XP Source** | Label from active rule `ZOOM_ATTEND_BASE` → **XP Source Label** (PROD commonly `Zoom Meeting Attendance Base`; if blank, script fallback `Zoom Attendance: Base`) |
| **Enrollment** | linked `recgP9qZYjAhE7NXm` |
| **Zoom Meeting** | linked to the B1 meeting `rec…` |
| **Active?** | checked |
| **Awarded By** | `Airtable Automation 101` |
| **Award Mode** | `Automatic` (if field present) |
| **Week** | same Week as the Zoom Meeting (if written) |

**Allowed side effect (not a FAIL):** if this enrollment already has other live Zoom base awards, 101 may also create/update `ZOOM_ATTEND_BONUS_2|…` / `ZOOM_ATTEND_BONUS_3|…`. B1 PASS still requires the **base** key above to be correct.

**Must not appear from B1:** any new `ZOOM_CREDIT|…` row (117 was OFF during B1).

---

## Exact steps (field edits only — no automation toggles)

1. Confirm Automations **as of B1 time**: **117 OFF**, **042 OFF**, **057 OFF**; **do not** turn 101 off/on.  
2. On the B1 Zoom Meeting: set Attendees to include `recgP9qZYjAhE7NXm`; Meeting Status **Completed**; Week set; Zoom Meeting Key set.  
3. Check **`Create XP Events`** (this is the 101 trigger).  
4. Wait for 101 run → capture XP Event + console/`statusOut` if visible.  
5. After evidence: leave **`Create XP Events` unchecked** if 101 cleared it (normal); do not soft-void historical live XP.

---

## PASS / FAIL criteria

### PASS — all required

- [ ] Exactly **one** active XP Event with Source Key `ZOOM_ATTEND_BASE|{Zoom Meeting Key}|recgP9qZYjAhE7NXm`
- [ ] That event: **XP Points = 60**, Bucket **`Zoom Attendance`**, Enrollment + Zoom Meeting linked correctly, **Active?** checked, **Awarded By = `Airtable Automation 101`**
- [ ] No new `ZOOM_CREDIT|…` for this enrollment+meeting from this test
- [ ] 117 / 042 / 057 still **OFF** during B1 (unchanged for the test window)
- [ ] Meeting Attendees still contains the test enrollment (101 may clear Create XP Events / set XP Award Status — that is OK)

### FAIL — any one

- Wrong/missing Source Key, or **≠ 60** points on the base event  
- Duplicate base Source Key rows (two active `ZOOM_ATTEND_BASE|…` for same key)  
- Awarded By / bucket / source clearly not the live 101 path  
- Any Attendees write attributed to 117 (should be impossible while 117 is OFF for B1)  
- Any automation ON/OFF state changed solely to run the test  
- New recording `ZOOM_CREDIT` created during B1  

### Stop

If B1 **FAIL** → stop Stage 17 enable work; leave 117 OFF until root cause is fixed; do not start B2.
*(Historical gate — Stage 17 is now **COMPLETE** with 117 ON.)*

---

## Report back template

```
B1 Zoom Meeting = rec________
Zoom Meeting Key = ________
Expected Source Key = ZOOM_ATTEND_BASE|{key}|recgP9qZYjAhE7NXm
XP Event ID = rec________
XP Points / Bucket / Source / Awarded By / Active? = 
Bonus XP created? Yes/No (keys if any)
Result = PASS | FAIL
```
