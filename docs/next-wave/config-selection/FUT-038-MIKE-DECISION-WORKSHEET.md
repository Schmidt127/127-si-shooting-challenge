# FUT-038 — Mike decision worksheet (async)

**Status:** Awaiting Mike reply — **do not implement** until decisions captured in brief §11  
**Date:** 2026-09-01  
**Full brief:** [FUT-038-GLOBAL-CATEGORY-ONOFF-BRIEF.md](./FUT-038-GLOBAL-CATEGORY-ONOFF-BRIEF.md) (§3–§8 detail, consumer inventory, test matrix)  
**Format:** Same async pattern as [FUT-039 §8](../fillout/FUT-039-FILLOUT-BRANDING-BRIEF.md#8-mike-decisions-locked-2026-09-01) — reply with letter choices only.

---

## Reply format

Reply in one line from your phone, e.g.:

```text
1D, 2A, 3A, 4A, 5A, 6A, 7A, 8C, 9A, 10A, 11B, 12B
```

Optional note after a `#` if one item needs nuance, e.g. `8C # use B for video only`.

---

## Decisions (10 items)

| # | Question | Options | Brief recommendation | Impact if wrong |
|---|----------|---------|----------------------|-----------------|
| **1** | **Where do category on/off flags live?** (brief §3) | **A** — **Config** row per school year (extend latent toggles) · **B** — **Program Instance - Sync** checkboxes · **C** — New **Program Category Settings** table · **D** — **Hybrid:** Config year defaults + PI coach overrides (Effective = PI ?? Config ?? enabled) | **D** (PI authority for coaches; Config for year defaults) | Wrong owner blocks PKG-004, resolver design, and every consumer join path |
| **2** | **2026–27 launch defaults** when a flag is unset/null? (brief §3, §11) | **A** — All categories **enabled** (fail-open; missing flag = on) · **B** — All **disabled** until coach explicitly turns on · **C** — Per-category defaults in Config only (PI must copy or inherit) | **A** | Fail-closed defaults could block GOAT / level advancement on day one |
| **3** | **Level gates (042) when a category is OFF** (brief §6.1) | **A** — **Auto-pass:** `effectiveMinimum = 0` for that dimension; XP-only advancement still works · **B** — Keep configured minimum (athlete must meet rollup anyway) · **C** — Auto-uncheck **Gate Enabled?** on rules touching that dimension | **A** | **B** breaks approved requirement: disabled categories must not block GOAT |
| **4** | **Homework OFF — Homework Completion (020) lifecycle** (brief §5.2, §8 T1) | **A** — **Skip 020** HC create entirely · **B** — Allow HC / parent completion **without XP** (audit trail only) · **C** — Same as B but only when homework was on earlier in season (mid-season edge) | **A** | **B/C** add orphan HC rows and parent confusion; **A** simplifies HW-OFF test matrix |
| **5** | **Perfect Week — flag model** (brief §6.2, §11) | **A** — **No separate flag;** derive eligibility from enabled component categories (submissions, homework, video, zoom) · **B** — Add explicit **`perfect_week`** category key coaches can toggle · **C** — Disable Perfect Week whenever **any** component category is off | **A** | **B** adds schema + 057/WAS branches; **C** is overly aggressive (HW-OFF would kill PW even when brief expects PW without HW) |
| **6** | **Submissions OFF — Perfect Week behavior** (brief §6.2) | **A** — **Disable Perfect Week entirely** (no PW unlock/XP) · **B** — Perfect Week still possible without daily-shooting requirement · **C** — N/A — submissions always on for 2026–27 | **A** | **B** contradicts PW definition (daily shooting is core) |
| **7** | **Zoom OFF — Perfect Week + Stage 17 recording** (brief §6.2, §11 #10) | **A** — **Skip Zoom branch** in 057/WAS; **117** does not stamp gate credit or PW credit · **B** — Recorded attendance still counts for PW when homework on · **C** — Live 101 off only; recording path unchanged | **A** | **B/C** leave zoom credit active when coaches turned Zoom off |
| **8** | **Web UX when a category is disabled** (brief §7) | **A** — **Hide** sections and remove nav links (`/homework`, `/zoom-meetings`) · **B** — **Visible disabled notice** on profile (“not part of this season”) · **C** — **Mixed:** disabled notice on profile sections athletes expect; **hide** program nav links | **C** | Inconsistent UX if profile shows “missing homework” or dead CTAs |
| **9** | **Email when category OFF** (brief §5.4) | **A** — **Weekly (072):** omit disabled sections · **Daily (076):** **suppress** when submissions off · **071/073:** no send for homework/video off · **B** — Same as A but **shorten** daily email instead of suppress · **C** — Send all templates unchanged | **A** | **C** emails parents about activities that do not count |
| **10** | **Intake when category OFF** (brief §5.5) | **A** — **Submissions:** accept Fillout intake, **no XP** (coach-visible “not scored”) · **Homework/video:** block asset intake (**070**, HC path) · **B** — **Reject** all Fillout submissions when any linked category off · **C** — Accept everything audit-only (no XP, no block) | **A** | **B** breaks daily shooting habit; **C** creates unscored homework/video clutter |
| **11** | **Mid-season category toggle** (brief §8 T8, §10.2) | **A** — **Allowed** with **041** recalc + documented family notice · **B** — **Locked at PI launch** (change only before season start) · **C** — Allowed **admin-only** with reconcile job for orphan XP/HC | **B** (safer v1) | **A** without reconcile policy leaves orphan XP and gate surprises |
| **12** | **PKG-004 field naming + achievement keys** (brief §3, §10, §11 #8–9) | **A** — **Repurpose** Config `HW Review Enabled?` / `Video Review Enabled?` as category flags (document semantic change) · **B** — **New** `{Category} Enabled?` fields; deprecate latent review toggles · **C** — **B** plus **one flag** for achievements **and** milestones (not separate) | **B** + separate achievements/milestones keys (brief §1 table) | Repurpose (**A**) confuses “review off” vs “category off”; merged flag (**C**) blocks disabling milestones only |

**Count: 12 decisions — all open.**

---

## After Mike replies

1. Paste reply into brief [§11 open decisions](./FUT-038-GLOBAL-CATEGORY-ONOFF-BRIEF.md#11-open-decisions-for-mike) as a locked table (FUT-039 §8 pattern).  
2. Unblock PKG-004 ownership matrix and Phase 3 slice **3a** (schema + resolver).  
3. Update [127-SI-MASTER-FUTURE-WORK-LIST.md](../../127-SI-MASTER-FUTURE-WORK-LIST.md) FUT-038 row to **Decisions captured**.

---

*End of FUT-038 async decision worksheet.*
