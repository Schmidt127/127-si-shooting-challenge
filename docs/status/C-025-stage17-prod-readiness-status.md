# C-025 Stage 17 — Production readiness status

**Backlog ID:** C-025
**Date:** 2026-07-18
**Mode:** Read-only synthesize + document (no Airtable writes; no live Meta re-probe in this finalize pass)
**DEV:** `appTetnuCZlCZdTCT`
**PROD:** `appn84sqPw03zEbTT`
**Feature branch:** `feature/c025-stage17-zoom-attendance`
**Committed tip at audit start:** `e8db32e` (115 **v1.6**)
**Post-audit alignment:** Commit Automation **115 v1.8** + paste on this branch (see tip after this commit)
**Schema-gap audit source:** `audit/c025-stage17-prod-readiness` @ `0510663`

---

## Production-readiness verdict

# BLOCKED — SCHEMA MIGRATION REQUIRED

Zoom Attendance and Stage 17 support schema are **missing in PROD**. DEV one-click Pass does **not** make PROD ready.

**Repo / DEV alignment (115):** Resolved by committing **115 v1.8** + paste packet on this branch. PROD remains blocked on schema migration only.

---

## 1. Repository state (Phase 1)

| Item | Value |
|------|--------|
| Branch | `feature/c025-stage17-zoom-attendance` |
| Prior committed tip (v1.6 / audit docs) | `e8db32e` / `41f1abd` |
| **115 v1.8** | Committed on this branch with paste + related Stage 17 docs |
| Related audit worktree | `…-c025-stage17-audit` → `audit/c025-stage17-prod-readiness` @ `0510663` |
| `master` / ops production tip (docs) | `bd2c2b4` — no Stage 17 PROD schema |

### Authoritative script / paste versions (Stage 17 package)

| Automation | Repo version | Paste path | Notes |
|------------|--------------|------------|-------|
| **115** ETF (DEV only) | **v1.8** | `docs/deploy-checklists/C-025-stage17-115-etf-v1.8-PASTE.txt` | DEV Pass proven; do not promote to PROD |
| **117** Orchestrator | **v1.1.1** | `…-117-orchestrator-v1.1.1-PASTE.txt` | Remained **OFF** during DEV ETF Pass |
| **057** Perfect Week | **1.3** | `…-057-perfect-week-v1.3-PASTE.txt` | Fired successfully in DEV ETF; OFF after |
| **042** Level gates | **3.1** | `…-042-level-gates-v3.1-PASTE.txt` | Fired successfully in DEV ETF; OFF after |
| **101** Live Zoom XP | Unchanged | — | Must not change |

---

## 2. DEV proof (Phase 2) — confirmed PASS

| Item | Result |
|------|--------|
| ETF record | `recEuHFTjBftoJGMc` |
| Scenario | `C025_STAGE17_DOWNSTREAM` |
| Overall | **PASS** (live one-click) |
| Query usage | **11 / 22** |
| `Run Test?` | Cleared automatically |
| Phase A (057) | **Fired successfully** |
| Phase B (042) | **Fired successfully** |
| Automation **117** | **Remained OFF** |
| Post-test | 057 / 042 instructed **OFF** |
| PROD | **Blocked on schema migration** (Zoom Attendance missing) |
| Authoritative DEV script | Automation **115 v1.8** |

**Architecture conclusion:** DEV Stage 17 **downstream path proven** (115 v1.8 → 057 + 042) with 117 OFF.

---

## 3. PROD schema findings (Phase 3)

Evidence: live read-only Meta audit **2026-07-18** (`0510663` gap analysis) + static `prod-20260706` corroboration (29 tables, no ZA).

| Question | Classification |
|----------|----------------|
| Table `Zoom Attendance` in PROD | **Missing** |
| Renamed equivalent | **Missing** (none) |
| Zoom Meetings core (Attendees, Start Time, Week, 101 fields) | **Present and compatible** (live path) |
| Zoom Meetings Stage 17 support (Recording Available At, Effective*, ZA link, overrides) | **Missing** (~64 curated excl. ZZZ) |
| XP Bucket `Zoom Attendance` | **Present and compatible** |
| XP Source `Zoom Meeting Recording Quiz` | **Missing** (select option) |
| `ZOOM_ATTEND_BASE` rule = 60 active | **Present and compatible** |
| Recording % Config = 50 | **Missing** (Config fields) |
| WAS Perfect Week Queue / Zoom count fields | **Present and compatible** (for base 057) |
| Enrollment Level Recalc / levels / live Total Zoom Attendances | **Present and compatible** (live count only) |
| Enrollment → Zoom Attendance link | **Missing** |
| Testing Scenarios | DEV-only — **not required** for PROD athlete path |
| Automations 057/042/117/101 exact live versions | **Unknown** / **Manual verification required** (API 403) |

Full tables: [C-025-stage17-prod-schema-gap-analysis.md](../deploy-checklists/C-025-stage17-prod-schema-gap-analysis.md).

### Count summary

| Class | Count |
|-------|------:|
| Missing (curated Stage 17) | **125** |
| Incompatible | **1** (`XP Source` lacks Recording Quiz option) |
| Unknown (manual / product) | **10** (gap §17) + automation version unknowns |
| Manual verification required | **≥10** (formulas after recreate, Config row, views, automation UI versions, intake path) |

---

## 4. PROD automations (Phase 4)

| Automation | PROD status | Evidence class |
|------------|-------------|----------------|
| **101** | Expected live path ON; version **Unknown** | Manual verification required |
| **057** | Expected present (pre–v1.3 likely); exact version **Unknown** | Manual verification required |
| **042** | Expected present (pre–v3.1 likely); exact version **Unknown** | Manual verification required |
| **117** | **Not installable / not present** as Stage 17 orchestrator until schema exists | Missing surface |
| **115** | DEV-only — **do not promote** | — |

Repo paste backups exist for 117 v1.1.1 / 057 v1.3 / 042 v3.1. Prior PROD script text for rollback must be **copied from Airtable UI** before overwrite (API cannot export).

---

## 5. Historical data / migration (Phase 5)

| Question | Recommendation |
|----------|----------------|
| Backfill historical ZA / recording XP | **Not required** for go-live — **prospective only** default |
| Rewrite historical live XP | **Forbidden** |
| Live vs recording | Disjoint keys `ZOOM_ATTEND_BASE|…` vs `ZOOM_CREDIT|…`; live wins; soft-void recording only |
| Attendees | Never write from recording |
| Smallest safe migration | Schema+Config+XP Source option → paste OFF → isolated smoke → gradual enable |

---

## 6. Highest-risk issue

Any recording path that writes athletes into **`Zoom Meetings.Attendees`** can **double-award live XP via Automation 101** while valid PROD `ZOOM_ATTEND_BASE|…` history already exists.

---

## 7. Smallest safe next Production action

**Not** paste. First Mike-approved action after repo align:

1. Commit / align **115 v1.8** on the feature branch (DEV/repo match).
2. Then start PROD OMNI schema: create **Zoom Attendance** + Config recording fields + XP Source option (automations still OFF).

Exact first Production Airtable action: **OMNI create Zoom Attendance table scaffold** (or Config Stage 17 fields first — either order is fine while automations OFF). Prefer Config % + XP Source option early so formulas can target stable selects.

---

## 8. Actions requiring Mike’s approval

- Any PROD schema create/rename
- Any PROD automation paste or enable
- Any change to `ZOOM_ATTEND_BASE` amount
- Any soft-void / edit of live athlete XP beyond designated smoke fixtures
- Merge feature branch → `master`
- Retroactive recording-credit backfill

---

## 9. Safety

| Base | This finalize pass |
|------|--------------------|
| DEV | **Untouched** (no API writes; no retest) |
| PROD | **Untouched** |
| Make / Gmail / Softr | Not accessed |

---

## Related deliverables

- [C-025-stage17-prod-schema-gap-analysis.md](../deploy-checklists/C-025-stage17-prod-schema-gap-analysis.md)
- [C-025-stage17-production-release-packet.md](../deploy-checklists/C-025-stage17-production-release-packet.md)
- [C-025-stage17-etf-downstream-dev-packet.md](../deploy-checklists/C-025-stage17-etf-downstream-dev-packet.md) (115 **v1.8**)
- Prior STOP (superseded on DEV gate only): [C-025-stage17-prod-promotion-STOP-2026-07-18.md](../deploy-checklists/C-025-stage17-prod-promotion-STOP-2026-07-18.md)
