# Shooting Challenge v2 — Config vs code

**Purpose:** Clarify what you can change in **Airtable tables** (Layer 2 — Configuration) vs what requires **script or schema** work (Layer 1 — Engine).  
**Governed by:** [v2/01-constitution.md](./v2/01-constitution.md) · [shooting-challenge-v2-master-direction.md](./shooting-challenge-v2-master-direction.md)  
**Last updated:** 2026-07-03

---

## Four layers (constitutional)

| Layer | Changes | Examples |
|-------|---------|----------|
| **1 — Engine** | Never (behavior contract) | XP Event creation, level/gate evaluation, automations — see [v2/03-business-rules.md](./v2/03-business-rules.md) |
| **2 — Configuration** | Every season | **This doc** — Levels, Level Gate Rules, XP Reward Rules, Achievements, Weeks |
| **3 — Content** | Constantly | Homework, videos, Zoom, email copy, awards catalog |
| **4 — Presentation** | Generated from 1–3 | Game manual, website, guides |

**Season launch rule:** A new season should require Configuration + Presentation updates only — not engine/script changes for gameplay tuning.

---

## V2 locked decision (2026-07-03)

| Topic | Decision |
|-------|----------|
| **Progression model** | **One ladder** — XP + gate levels (same model as V1). **No dual-track / two paths for 2026–27.** |
| **If friction remains** | Revisit architecture **after** the 2026–27 season — not during build. |
| **Gate curve** | **Spread requirements early** (e.g. leaving level 1 may require **1 homework**). Tune in **Level Gate Rules**, not in scripts. |
| **Game numbers** | **Do not freeze XP/levels in docs now.** Tune in config tables before launch. |
| **Config-first** | **Move more behavior out of scripts** into **XP Reward Rules**, **Level Gate Rules**, **Levels**, and related config tables over time. |

---

## Source of truth

| Layer | Role |
|-------|------|
| **Engine (Layer 1)** | Stable behavior — [v2/03-business-rules.md](./v2/03-business-rules.md) |
| **Configuration design (Layer 2)** | Season tuning guidance — [v2/season-configuration-design.md](./v2/season-configuration-design.md) |
| **Configuration (Layer 2)** | Game math and rules per season — tables below |
| **Content (Layer 3)** | Homework, videos, messages, catalog entries |
| **Presentation (Layer 4)** | Parent-facing copy **published from** config before Day 1 |
| **Automations** | Read Configuration → execute Engine behavior |
| **GitHub scripts** | Engine logic only — not a place to hide tunable numbers |

---

## Config tables (change without redeploying script logic)

### Levels

| Field | Controls |
|-------|----------|
| Level name | What families see |
| `XP Required (Cumulative)` | XP needed to reach this level |
| `Active?` | Whether level is in the live ladder |

**Read by:** automation **042** (and related level scripts).

### Level Gate Rules

| Field | Controls |
|-------|----------|
| `Level` | Which level this gate applies to |
| `Gate Enabled?` | Whether requirements block advancement |
| `Minimum Submissions` | Counted submission days required |
| `Minimum Homework` | Satisfactory homework count required |
| `Minimum Videos` | Video submissions required |
| `Minimum Zoom Meetings` | Zoom attendance required |
| `Minimum Streak Days` | Streak length required |
| `Version Active?` | Which rule set is live for a season |

**Read by:** automation **042**.  
**V2 example:** Level 2 gate might require **1 homework** — set here, not in code.

### XP Reward Rules

| Field | Controls |
|-------|----------|
| `Rule Key` | Which activity (e.g. `SHOOTING_BASE`, streak keys) |
| `XP Amount` | Points awarded |
| `Active?` | Whether rule is live |

**Read by:** **010** (daily shooting), **054** (streaks), **059** (achievements), and others.

### Achievements

| Field | Controls |
|-------|----------|
| Achievement name, trigger type | What milestone exists (e.g. streak length) |
| Links to XP Reward Rules | How much XP the milestone pays |

**Read by:** **053**, **059**, **066**.

---

## Already config-driven (protect this pattern)

- Level assignment and gate blocking → **Levels** + **Level Gate Rules** + **042**
- Daily shooting XP → **XP Reward Rules** (`SHOOTING_BASE`) + **010**
- Streak / milestone XP amounts → **XP Reward Rules** + **Achievements** + **054** / **059**

---

## Move toward config (V2 engineering goal)

**Principle:** If staff might tune it season to season, it belongs in a **table**, not buried in a script.

| Candidate | Today | V2 direction |
|-----------|--------|--------------|
| XP amounts per activity | Mostly **XP Reward Rules** | Finish migrating any hardcoded amounts |
| Level thresholds | **Levels** table | Keep; document in game manual at launch |
| Gate minimums | **Level Gate Rules** | Spread for 2026–27; all edits in table |
| Streak milestone lengths | **Achievements** | Keep in table |
| Email template revision labels | WAS fields | Standardize naming in config or constants doc |
| Season dates / week boundaries | **Weeks** table + docs | Single documented source |

**Audit task (future):** Extension or Python script that flags scripts containing numeric XP literals or level names that should be config keys.

---

## Requires code or schema changes (not just table edits)

| Change | Why |
|--------|-----|
| **Dual-track progression** | **Deferred** — would need new enrollment fields + **042** rewrite |
| **“Gate blocked” → “honors only”** | **042** behavior change |
| **Streak “repeat 3/5/7 after every break”** | **053** logic; amounts are config, repeat behavior is code |
| **Automatic weekly emails** | New or merged **072** / **074** schedule |
| **`Active?` on all automations** | Guard clause in each script |
| **Google Drive–only files** | **009**, **070**, **020**, formulas, Make |
| **HW17 quiz as normal file path** | **067** + intake redesign |
| **More data in config tables** | Per-script refactor to read rules instead of literals |

---

## 2026–27 tuning workflow (when numbers are ready)

1. Duplicate or create `Version Active?` rule set for **2026–2027** in **Level Gate Rules**.
2. Edit **Levels** and **XP Reward Rules** for the new season (sandbox first if possible).
3. Test on 3–5 enrollments; run **041** → **042** recalc.
4. Run audits (**090E**, achievement audits).
5. Export or snapshot config for the **game manual** and website rules page.
6. Send manual **before** first submission.

**Do not** change live config mid-season without a documented migration (2025–26 lesson).

---

## Related docs

- [shooting-challenge-v2-master-direction.md](./shooting-challenge-v2-master-direction.md) — constitution
- [xp-motivation-analysis-2025-26.md](./xp-motivation-analysis-2025-26.md) — V1 data + historical brainstorm (dual-track **not** adopted)
- [close-out-considerations.md](./close-out-considerations.md) — C-014 watchlist
- Automation **042** — `airtable/automations/shooting-challenge/042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js`
