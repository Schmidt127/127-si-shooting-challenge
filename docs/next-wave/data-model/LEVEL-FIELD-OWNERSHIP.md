# Level Field Ownership — Dual-Truth Resolution

**Evidence:** repo-script 041/042/043 + WAS schema formula + 072 email reads

---

## Authoritative progression (Enrollment)

| Field | Role | Writer | Notes |
|-------|------|--------|-------|
| Lifetime XP Total | Input to level calc | XP rollups / ledger | Read by 042 |
| Level Recalc Needed? | Queue flag | **041** sets; **042** clears | Not a level |
| Current Level | **Authoritative** current level link | **042** | Gate-aware |
| Next Level | **Authoritative** next level link | **042** | |
| Level Gate Rule | Active gate rule link | **042** (intended) | 043 legacy path — intended OFF after 042 proven |
| Level Status | Assigned / Gate Blocked / Error | **042** | |
| Level Gate Rules table | Config thresholds | Ops | Read by 042 |

**041** does not assign levels — only marks recalc.  
**043** sets Level Gate Rule from Next Level — superseded by 042 when 042 is live; confirm 043 OFF in UI (mike-ui).

---

## WAS `Level Number` (not authoritative)

| Aspect | Detail |
|--------|--------|
| Type | Formula on Weekly Athlete Summary |
| Logic | Hardcoded XP thresholds on `Total XP After Week` (1–8 bands) |
| Writer | none (formula) |
| Readers | **072** email display (`Level ${Level Number}` / Current Level text) |
| Classification | **Snapshot / email display** — may disagree with Enrollment Current Level + gates |

---

## Resolution

| Question | Answer |
|----------|--------|
| What is athlete’s real level? | Enrollments.`Current Level` via **042** |
| What do gates use? | Level Gate Rules + Enrollment gate formulas + 042 |
| What is WAS Level Number? | Display/snapshot for weekly email — **Do not use for progression** |
| Dual truth? | Yes until WAS formula aligned or 072 prefers Enrollment Current Level lookup |

**Recommended (no schema change now):** Keep 042 authoritative; hide WAS Level Number from ops progression views; optional later: 072 prefer Enrollment Current Level only (already partially reads Current Level fields).
