# C-025 — Config-linkage verification repair (no Airtable writes)

**Date:** 2026-07-14  
**Status:** Script repaired · offline 17/17 · **waiting for Mike approval** before any live re-run  
**No Airtable writes in this repair step.**

---

## 1. Root cause of failed verification

`tools/airtable/_c025_config_linkage_verify.py` called:

```python
update_record(CFG_2025, {"Zoom Recording XP Percent of Live": 40})
```

but `update_record` is defined as `(table_id, rid, fields)`.  
`CFG_2025` (`recq14M5hEv3TIGEj`) was passed as `table_id`, so the call was missing the Config table ID (`tblRB6sh77NxjS568`).

Failure occurred at the **start of `precedence_tests()`**, after earlier steps in the same `main()` may already have run:

1. `ensure_draft_formulas()` — schema writes (draft formula fields)
2. `sync_effectives_from_precedence()` — **data writes** to Zoom Meetings Effectives
3. `precedence_tests()` — **crashed here** (Config update)

So the precedence matrix never completed; Config mutation from that script **did not run**.

---

## 2. Exact Airtable changes already made this Config-linkage session

### Config (`tblRB6sh77NxjS568`) — created + seeded

| Field | ID | Type | Session? | Safe/complete? | Draft? | Rollback? | Owner approval? |
|---|---|---|---|---|---|---|---|
| Zoom Recording XP Percent of Live | fldRaNc87BixzsmLV | number | Yes create | Yes (seeded 50 on 2025-2026) | No | No (keep) | Already authorized |
| Recording Gives Full Zoom Gate Credit? | fld9QHugLr37qJmGS | checkbox | Yes | Yes | No | No | Already authorized |
| Recording Makeup Counts for Perfect Week? | fldmahedrTcx111aX | checkbox | Yes | Yes | No | No | Already authorized |
| Recording Quiz Requires Coach Approval? | fldB5cmOxn0AtcHUc | checkbox | Yes | Yes | No | No | Already authorized |
| Recording Makeup Enabled? | fldEktL1d27p5KlF5 | checkbox | Yes | Yes | No | No | Design §2 proposed; created under task auth |
| Zoom Recording Makeup Window Days | fld1Qg2jgJJOjDJKD | number | Yes | Yes | No | No | Already authorized |
| Zoom Recording Deadline Mode | fldQ61QvoZSbMLFIK | singleSelect | Yes | Yes | No | No | Already authorized |
| Recording Approval Email Enabled? | fldWGs5xDGD4UwIDM | checkbox | Yes | Yes | No | No | Already authorized |
| Recording Approval Email Timing | fld3m4sPbI5xHint3 | singleSelect (On Satisfactory) | Yes | Yes | No | No | Already authorized |
| Recording Approval Email Template Key | fldzmMcbHHJ77yz0v | singleLineText | Yes | Yes | No | No | Already authorized |
| Recording Path Enabled? | flduBG29tSHjHergL | checkbox | Yes | Config-only OK | No | No | Design optional |
| Program Instance | fld9KuUMhOAavlk2Y | link | Yes | Optional blank OK | No | No | Already authorized |
| Is Global Default? | fld8D2Xq32FhEPo3E | checkbox | Yes | True on 2025-2026 | No | No | Already authorized |

**Config record data:** `recq14M5hEv3TIGEj` (2025-2026) seeded with defaults + `Is Global Default?=true`. Last live GET after failure still showed XP%=50 (verify crash did not leave XP at 40).

### Zoom Meetings — links / overrides / rollups / drafts

| Field pattern | Count | Session? | Type | Safe/complete? | Draft? | Rollback? |
|---|---|---|---|---|---|---|
| Config (Program Scope) | 1 (`fldDZPEVVJkNLE82d`) | Yes | link→Config | Yes; meetings linked | No | No (keep) |
| Config (Global Scope) | 1 (`fldCk3Ilb4JVrhSUX`) | Yes | link→Config | Yes | No | No |
| `* — Meeting Override` | 10 | Yes | number/select/text | Values copied for non-blank Effectives | No | No |
| `Program Config: *` / `Global Config: *` | 20 | Yes | rollup | Live values populate | No | No |
| `Effective * (Config formula draft)` | 10 | Yes | formula | Helpers only; ZA ignores | **Yes** | Optional later delete (needs Mike) |
| `Effective Recording *` (ten) | preexisting IDs | **No type convert** | still editable | **Incomplete** vs design end-state | No | N/A — do not delete |

### Zoom Attendance

- **No schema creates** in Config-linkage apply.
- Lookups still point at editable ZM Effectives.
- Past Deadline view marker untouched.

### Failed convert attempt (recovered)

- Temporarily renamed/created XP Effective formula; **restored** Effective XP name to `fldgBdBIDvjMELY3o` (number). Orphan attempt ended as draft formula field instead.

---

## 3. Partial / unsafe state currently in DEV

| Risk | Assessment |
|---|---|
| Incomplete Effective→formula conversion | **Open** — scaffolding without automatic precedence on Effectives |
| Draft formula fields | Temporary clutter; safe but should be cleaned after UI convert |
| `sync_effectives_from_precedence` may have written blanks→Config defaults into Effectives | **Likely** — filled previously blank checkboxes/text (email timing/template, perfect week, etc.) toward Config defaults on the 3 DEV meetings |
| Config left at XP=40 or gate=false | **Unlikely** — crash before those writes; later GET showed XP=50 |
| Meeting `rech5YbJNUzBRY6LQ` left unlinked | **Unlikely from crashed verify**; last GET showed both links set |
| Precedence matrix unproven live | **True** — must re-run after approval |
| Schmidt 4/4 after scaffolding | **Not re-proven** after Config-linkage writes |
| Deadline | Unaffected by verify crash; still date-typed (separate prior task) |

**Not a production outage:** Effectives still editable with copied overrides for intentional meeting values (XP 50 / Gate Yes / Days 7 / Mode Days After on relevant meetings).

---

## 4. Fixtures created or modified

| Record | Table | Role | What changed |
|---|---|---|---|
| `recq14M5hEv3TIGEj` | Config | 2025-2026 / global | C-025 fields seeded; Is Global Default |
| `rec3ToANr5pcs2SRG` | Zoom Meetings | conflict meeting | Config links; overrides XP=50, Gate=Yes; possibly Effectives synced |
| `rech5YbJNUzBRY6LQ` | Zoom Meetings | live-credit canvas | Config links; no XP override; Effectives may have been synced |
| `reczeUT0AJUWMmEOb` | Zoom Meetings | recording/deadline | Links; overrides XP/Gate/Days/Mode; deadline fixtures earlier |
| `rech5YbJNUzBRY6LQ` + ZA `recRIu3ld00t9AKKR` | ZM/ZA | live-only credit | Created in **deadline** slice (not Config apply) |
| Schmidt ZA credit set | Zoom Attendance | credit regression | Not schema-edited; data GETs later |

---

## 5. Corrected verification script

File: `tools/airtable/_c025_config_linkage_verify.py`

Changes:
- Fixed all Config updates to `update_record(CFG_ID, CFG_2025, {...})`
- Split modes: `plan` | `offline` | `live --confirm-write`
- Default / offline: **zero Airtable calls that write**
- Live asserts **draft formulas** for precedence (does not convert Effectives)
- Live restores Config + meeting links in `finally`
- Effective sync opt-in only via `--also-sync-effectives` (default **off**)

Offline validation run this repair:

- `py_compile` OK  
- `offline` → **17/17 pass**, `airtable_writes: false`  
- `live` without flag → refused (exit 2), no writes  

---

## 6. Exact live test records that would be modified (if Mike approves)

| Table | Record | Temporary mutations | Restore |
|---|---|---|---|
| Config | `recq14M5hEv3TIGEj` | XP% 50→40→50; Gate true→false→true | Yes in `finally` |
| Zoom Meetings | `rech5YbJNUzBRY6LQ` | Override XP 10/clear; clear/restore Program+Global links | Yes |
| Zoom Meetings | `reczeUT0AJUWMmEOb` | **GET only** (deadline) | — |
| Zoom Attendance | Schmidt fixtures | **GET only** | — |

---

## 7. Rollback plan (if Mike wants cleanup)

1. **Do not rollback** Config scalars / links / overrides / rollups unless abandoning Config-linkage entirely (they are the authorized scaffold).
2. **Optional:** delete 10 draft formula fields after UI Effective convert (needs explicit Mike delete auth).
3. **If Effective sync unwanted:** restore Effectives from Override fields (where Yes/value set) and clear Effectives that were blank pre-session — requires a directed restore script + approval.
4. **Never** delete Past Deadline view marker.

---

## 8. Recommendation

**Safe to rerun verification** (read+temporary data writes under `--confirm-write`) — **after Mike approval**.

- **Rollback not required first** for scaffold (Config/overrides/rollups/links are intentional).
- **Manual UI action still required later** for Effective→formula conversion (separate from verify re-run).
- Do **not** convert Effectives in the re-run.
- Do **not** begin 117a–f or C-027.

### Corrected live command (only after approval)

```text
python tools/airtable/_c025_config_linkage_verify.py live --confirm-write
```

(Omit `--also-sync-effectives` unless Mike explicitly wants Effective writes.)

---

## 9. Confirmation

**No further Airtable writes occurred after the verification failure** during this repair task. Only GitHub script edits + offline/plan runs.
