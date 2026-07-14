# C-025 — OMNI inventory reconciliation (DEV live Meta API)

**Date:** 2026-07-14  
**Base:** DEV `appTetnuCZlCZdTCT` only  
**Authority:** GitHub designs + live Meta GET (not OMNI)  
**Purpose:** Compare S17 scan, OMNI claims, and current live schema before further Config-linkage writes.

Raw dump: `tools/airtable/_preview/c025_omni_reconciliation_live.json`

---

## Verdict (do not trust OMNI)

| OMNI claim | Live DEV truth |
|---|---|
| C-025 Config fields already exist and are active | **True now** — but they were **missing at S17**. Present because **Cursor Phase A (this session, ~05:47 MDT)** created them, not because linkage was already complete historically. |
| Zoom Meetings `Effective Recording *` are already rollups from Config | **FALSE.** All ten `Effective Recording *` fields are still **editable** (`number` / `checkbox` / `singleSelect` / `singleLineText`). They are **not** rollups and **not** precedence formulas. |
| Linkage is complete | **FALSE.** Scaffolding exists (Config fields + scope links + overrides + Program/Global rollups + draft formulas). **Effective\* conversion to 4-tier formula is not done.** Meta API cannot change those field types in place; ZA lookup rewire also rejected. |
| (Implicit) Past Deadline marker absent / irrelevant | **FALSE / incomplete.** ZA still has `Zoom Recording Quiz — Past Deadline (view marker)` (`fldr1qhbdGPM4Qct9`, formula). Do not delete. |
| Zoom Credit Key placement ambiguous | Credit Key exists on **both** tables. Authoritative credit path uses **Zoom Attendance** `Zoom Credit Key` (`fldhaYb9gaCndiQvx`). Zoom Meetings also has a **legacy** `Zoom Credit Key` formula (`fldlZGADtQ4VIfBy9`) — do not treat ZM as primary. |

---

## Timeline reconciliation

| When | Config C-025 fields | ZM Effective* type | Notes |
|---|---|---|---|
| **S17 live scan (2026-07-13)** | **None** | Editable manual fields | Documented in `C-025-config-linkage-design.md` §1.1–1.2 and UNATTENDED-RUN-STATUS morning report |
| **Deadline apply (2026-07-14 earlier)** | Still none | Unchanged editable | Week End Date + deadline date formula only |
| **Cursor Phase A/B (2026-07-14 ~05:47–05:49)** | **Created 13 Config fields**; seeded 2025-2026; created links, 10 overrides, 20 rollups | Still editable | Override values copied from then-current Effectives |
| **OMNI inventory (Mike-provided)** | Claims present/active | Claims rollups from Config | Matches “fields exist” only if scanned **after** Phase A; **wrong** on Effective type / linkage complete |
| **This verification (now)** | Present (IDs below) | Still editable | Draft formula fields exist alongside Effectives |

---

## Config fields (live) — exact

| Field | Status | ID | Type | Notes |
|---|---|---|---|---|
| `Zoom Recording XP Percent of Live` | Present & correct type | `fldRaNc87BixzsmLV` | number | Seeded **50** on 2025-2026 (`recq14M5hEv3TIGEj`) |
| `Recording Gives Full Zoom Gate Credit?` | Present | `fld9QHugLr37qJmGS` | checkbox | Seeded checked |
| `Recording Makeup Counts for Perfect Week?` | Present | `fldmahedrTcx111aX` | checkbox | Seeded checked |
| `Recording Quiz Requires Coach Approval?` | Present | `fldB5cmOxn0AtcHUc` | checkbox | Seeded checked |
| `Recording Makeup Enabled?` | Present | `fldEktL1d27p5KlF5` | checkbox | Design §2 proposed; created this session |
| `Zoom Recording Makeup Window Days` | Present | `fld1Qg2jgJJOjDJKD` | number | Seeded **7** |
| `Zoom Recording Deadline Mode` | Present | `fldQ61QvoZSbMLFIK` | singleSelect | Seeded **Later of Both** |
| `Recording Approval Email Enabled?` | Present | `fldWGs5xDGD4UwIDM` | checkbox | Seeded checked; formula fallback if unresolved remains **false** |
| `Recording Approval Email Timing` | Present | `fld3m4sPbI5xHint3` | singleSelect | Choices: **On Satisfactory** (design). Note: ZM Effective Timing still has older choices |
| `Recording Approval Email Template Key` | Present | `fldzmMcbHHJ77yz0v` | singleLineText | Seeded `ZOOM_RECORDING_APPROVED` |
| `Recording Path Enabled?` | Present | `flduBG29tSHjHergL` | checkbox | Config-only (no ZM Effective this slice) |
| `Program Instance` | Present | `fld9KuUMhOAavlk2Y` | link → `Program Instance - Synced` | Optional; blank on rows |
| `Is Global Default?` | Present | `fld8D2Xq32FhEPo3E` | checkbox | **True** only on 2025-2026 row |

**Do not recreate these.** Creating again would duplicate.

---

## Zoom Meetings Effective* (live) — not rollups

| Field | ID | Live type | Linked from Config? | Classification |
|---|---|---|---|---|
| `Effective Recording XP Percentage` | `fldgBdBIDvjMELY3o` | **number** | No | Present, **wrong end-state type** (still manual) |
| `Effective Recording Counts for Level Gate?` | `fldswwnnpWpiKSIL4` | **checkbox** | No | Same |
| `Effective Recording Counts for Perfect Week?` | `fldEfs9Xk4cIm7sqA` | **checkbox** | No | Same |
| `Effective Recording Quiz Requires Coach Approval?` | `fldkKRtkzO4AkNyED` | **checkbox** | No | Same |
| `Effective Recording Makeup Enabled?` | `fldppA7JHEbYNu3bR` | **checkbox** | No | Same |
| `Effective Recording Makeup Window Days` | `fldfDKHOn54ZbH7XL` | **number** | No | Same |
| `Effective Recording Deadline Mode` | `fldnwzUITHTzEeR5n` | **singleSelect** | No | Same |
| `Effective Recording Approval Email Enabled?` | `fldqPzKXweQISK4ZR` | **checkbox** | No | Same |
| `Effective Recording Approval Email Timing` | `fldT2SG7GRc7sT32u` | **singleSelect** | No | Choices still legacy Immediate/Batch/Digest |
| `Effective Recording Approval Email Template Key` | `fldQtvxkRPGCJ7pq8` | **singleLineText** | No | Same |

ZA lookups of the seven credit-related Effectives still point at these **same ZM field IDs** (editable sources).

---

## Scaffolding that *is* present (from Cursor, not OMNI)

| Layer | Count / names | Status |
|---|---|---|
| Scope links | `Config (Program Scope)` `fldDZPEVVJkNLE82d`; `Config (Global Scope)` `fldCk3Ilb4JVrhSUX` | Present; meetings linked to 2025-2026 Config |
| Meeting overrides | 10 `* — Meeting Override` fields | Present; values copied for non-blank Effectives |
| Program/Global rollups | 20 `Program Config: *` / `Global Config: *` | Present; sources are Config fields via scope links (**these** are the rollups OMNI likely confused with Effective*). Live values populate (e.g. Program/Global `Recording XP %` = 50). Meta GET often omits rollup `formula` text even when `isValid: true` — trust live record values, not OMNI |
| Draft formulas | 10 `Effective * (Config formula draft)` | Present for precedence testing / UI paste helper — **not** wiring ZA |

---

## OMNI failure points (confirmed)

1. **Past Deadline view marker** — present on Zoom Attendance: `fldr1qhbdGPM4Qct9`.
2. **Duplicate analysis without table names** — unsafe; Credit Key / Effective names collide across ZM vs ZA.
3. **Zoom Credit Key on Zoom Meetings** — legacy field exists; **do not** treat as the credit-system key. ZA `fldhaYb9gaCndiQvx` is the live credit key used by fixtures.

---

## Classification summary for next writes

| Item | Action |
|---|---|
| Config C-025 scalars + scope meta | **Do not create again** — already present |
| ZM Config Program/Global links | **Do not create again** |
| Meeting Overrides | **Do not create again**; copies already verified |
| Program/Global rollups | **Do not create again** |
| Effective\* → formula conversion | **Still required** — blocked on Meta API type change; needs **Airtable UI** paste (preserves field IDs) or owner-approved alternate |
| Draft formula fields | Keep until UI convert done; then optional cleanup (no deletes this task unless Mike asks) |
| C-027 MEN fields | **Out of scope — do not create** |
| 117a–f | **Do not paste** |

---

## Safe next step (after this verification)

1. **Stop creating** Config / link / override / rollup fields (already done).
2. Convert each `Effective Recording *` to Formula **in the Airtable UI** using the draft formula text (same field ID → ZA lookups keep working).
3. Re-run precedence tests + Schmidt **4/4**.
4. Then document applied state and commit.
