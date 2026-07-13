# Worker A result — S2 C-024 dedupe field inventory

**Worker:** A  
**Task:** Overnight V2 Stage 2 — C-024 dedupe field + automation dependency inventory  
**Branch:** `overnight/v2-run/worker-a-s2-c024-inventory`  
**Base SHA:** `c59dca80723f281a7aa3f26a5f6ec03643c62b93`  
**Commit SHA:** `a18d1722d491993314c74aaf1677a89e54bf74cb` (inventory body: `6abfd1d`)  
**Environment:** Repo documentation only — **no PROD**, **no Airtable API**, **no automation logic edits**  
**Finished (UTC):** 2026-07-13T05:30:00Z (approx)

---

## Status

**COMPLETE**

| Gate | Result |
|------|--------|
| Five-table dedupe field inventory | **DONE** |
| 13 writer matrix with Source Key + recheck evidence | **DONE** |
| Schema citations (`airtable/schema/current/**` + snapshots) | **DONE** |
| Automation docblock citations | **DONE** |
| Stage 3 audit gaps flagged | **DONE** (12 gaps) |
| PROD / lambda / automations | **Not touched** (required) |

---

## Files changed

| File | Action |
|------|--------|
| `docs/deploy-checklists/C-024-dedupe-field-inventory-stage2.md` | **Created** — comprehensive tables + writer matrix + mermaid graph |
| `docs/overnight-runs/results/S2-worker-a-result.md` | **Created** — this result |

**Not edited (forbidden / out of scope):**

- `lambda/**`, `make/**`, `airtable/automations/**`
- `docs/overnight-runs/_live-status-update.md`
- `overnight/lead-integration` (Lead worktree)

---

## Table counts

| Table | Dedupe-related fields inventoried |
|-------|----------------------------------:|
| Submissions | 8 |
| Submission Assets | 24 |
| Homework Completions | 11 |
| XP Events | 12 |
| Athlete Achievement Unlocks | 8 |
| **Total** | **63** |

| Other counts | |
|--------------|--:|
| Automation writers mapped | 13 |
| Source Key prefix patterns | 10 |
| Audit gaps for Stage 3 | 12 |

---

## Key findings

1. **Two dedupe layers are distinct:** C-023 (file hash / `Duplicate File Status` / `Asset Reuse Decision`) vs C-024 (automation `Source Key` on XP Events and unlock keys on Achievement Unlocks). Upload retry idempotency (**070a/b/c**) uses Drive URL + trigger state — not Source Key.

2. **Strongest recheck patterns:** **114** (explicit `10a - Last-Chance XP Event Recheck Before Create`), **101** (in-memory `sourceKeyIndex`), **066** (`existingUnlockBySourceKey` Map), **009** (`existingAssetKeys` Set). **010**, **065**, **059** scan full XP table — race-window gap vs 114.

3. **Unlock dedupe is two-step:** **058** / **066** create unlock rows with `PERFECT_WEEK|…` or `SHOT_MILESTONE|…` keys; **059** projects the same patterns onto XP Events with link + Source Key duplicate protection.

4. **116 bridges C-023 → C-024:** On `Asset Reuse Decision`, resolves XP via `VIDEO_SUBMISSION|` or `HOMEWORK_XP|` prefixes (must stay aligned with **114** / **065** CONFIG).

5. **Schema doc drift:** [field-map.md](../../airtable/schema/current/field-map.md) names `Dedupe Key`; live XP field is **`Source Key`** with formula `XP Dedupe Key`. `Canonical File URL` / `Storage Key` still flagged missing on DEV.

---

## Blockers

| Blocker | Owner | Notes |
|---------|-------|-------|
| None for Worker A scope | — | Inventory complete; no implementation dependency |
| DEV fields `Canonical File URL` / `Storage Key` | Mike / OMNI | Blocks full L2b audit until DEV confirmed — see G5 in inventory |
| Worker D contract should align prefix registry | Worker D | A inventory provides draft registry; D owns canonical contract |

---

## Tests run

**N/A** — documentation-only task. All field names and patterns cited from:

- `airtable/schema/current/field-map.md`, `table-map.md`, `automation-trigger-map.md`
- `airtable/schema/snapshots/schema_doc_appn84sqPw03zEbTT_20260629_045741.md`
- `airtable/schema/snapshots/dev-20260706/schema_doc_appTetnuCZlCZdTCT_20260706_161606.md`
- Automation docblocks: 007, 009, 010, 054, 058, 059, 065, 066, 101, 114, 116, 070a, 070b, 070c

---

## Deliverable for Lead

Primary artifact: [C-024-dedupe-field-inventory-stage2.md](../../deploy-checklists/C-024-dedupe-field-inventory-stage2.md)

Integration order per LEAD-STAGE2-AUTHORIZED: **D → A → B → C**. This result is ready for Lead merge after Worker D contract pass.
