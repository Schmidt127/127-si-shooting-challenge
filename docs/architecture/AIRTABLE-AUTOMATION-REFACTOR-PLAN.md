# Airtable Automation Refactor Plan — DEV

**As-of:** 2026-07-14 · Stage S21 · **Recommendations only — do not execute in Airtable yet**  
**Goal:** ≥ **5 free slots after** C-025 **117** orchestrator is deployed  
**Authority:** V2-014 four-axis + S21 inventory

---

## Targets

| Metric | Value |
|--------|------:|
| Current occupied (Mike) | **50** |
| Free now | **0** |
| After 117 swap (Phase 0) | **50 occupied / 0 free** |
| After Phase 0–3 (target) | **≤45 occupied / ≥5 free** |
| Stretch (EMC) | **~38–40 / ~10–12 free** |

---

## Ranking summary (entire base)

| Rank | Count (model) | Examples |
|------|---------------|----------|
| Keep separate | majority | 010, 013, 020, 022, 031, 041, 042, 064–066, 070a/b, 101, 113–116, 115, 117 |
| Combine safely | 2 | **006+021** |
| Combine with conditions | ~12 | 002; 030+032+033; 063→020; 111→013; EMC 071–077 |
| Retire safely | 1–3 | **043** (+ **061/078** if UI confirms) |
| Rename only | docs | 008, 112 doc rows; 117a–f library labels |
| Needs investigation | 4+ | **001**, **061**, **078**, **070c**, Folder 01 triggers |

Hard **do-not-merge:** 041↔010 · 064↔065 · 113↔114 · 057↔058

---

## Phased plan — safest high-value first

### Phase 0 — C-025 gate (required now)

| Step | Action | Slots | Risk |
|------|--------|------:|------|
| 0.1 | Mike confirms **043** in DEV UI (+ ON/OFF) | — | Low |
| 0.2 | Confirm **042** is live level/gate assigner | — | Med |
| 0.3 | Retire **043** only | **+1** | Low if 042 ON |
| 0.4 | Paste **117** orchestrator **OFF** | **−1** | Med |
| **Net** | | **0** | Cap still full |

**Fallback if 043 absent:** Use next UI-confirmed retire (**061** or **078**) — never 112 / never 115.

**Tests:** Level recalc on sandbox enrollment; one Recording Quiz fixture dry-run while 117 OFF.  
**Rollback:** Re-paste 043 from GitHub; delete 117.

---

### Phase 1 — Legacy / no-GitHub retires (UI confirm)

| Step | Action | Slots | Risk |
|------|--------|------:|------|
| 1.1 | Confirm **061** UI presence + last-run | — | |
| 1.2 | Retire **061** if Review Status already set by coach/064 path | **+1** | Med |
| 1.3 | Confirm **078** UI | — | |
| 1.4 | Retire **078** if **065** arms Parent Feedback Ready | **+1** | Med |

**Cumulative after Phase 0–1 (if both):** 48 occupied / **2 free** (after 117).

**Tests:** Homework review → XP → parent email skip/send on fixture.  
**Rollback:** Re-enable from docs-table script blob / recreate from backup.

---

### Phase 2 — Simple Category C merges

| Step | Action | Slots | Risk |
|------|--------|------:|------|
| 2.1 | Merge **006 + 021** → one Submissions prep automation | **+1** | Low–Med |
| 2.2 | OMNI confirm WAS fire order | — | |
| 2.3 | Merge **030 + 032 + 033** → one WAS bootstrap | **+2** | Med |

**Cumulative:** ~45 occupied / **~5 free** if Phase 1 both lands; else ~47 / 3 free → continue Phase 3.

**Tests:** Stage A submission with video+files; WAS create with goal+homework+grade band.  
**Rollback:** Re-split pastes of prior scripts; disable combined automation first.

---

### Phase 3 — Create-time absorb (backfill retire)

| Step | Action | Slots | Risk |
|------|--------|------:|------|
| 3.1 | Audit: do **020** / **013** always set Grade Band on create? | — | |
| 3.2 | Retire **063** (or fold into 020) | **+1** | Low if audit PASS |
| 3.3 | Retire **111** (or fold into 013) | **+1** | Low if audit PASS |

**Target check:** ≥5 free after 117 ✓ (Scenario B below).

**Tests:** New HW + VF children without empty Grade Band; legacy backfill view empty=0.  
**Rollback:** Re-enable 063/111 for backfill only.

---

### Phase 4 — Email Message Center (later)

| Step | Action | Slots | Risk |
|------|--------|------:|------|
| 4.1 | Weekly: **072+074** → one EMC weekly path | **+1** | High |
| 4.2 | Daily: **076+077** | **+1** | High |
| 4.3 | Fold **071/073/075** | **+3** | High |

Requires C-011 Email Key registry readiness. **Not** required to hit the 5-slot target.

---

### Phase 5 — Explicitly deferred / blocked

| Item | Why deferred |
|------|----------------|
| Folder 01 001+002+003 monolith | **001/002 docs triggers look swapped** — investigate first |
| 070a/b/c + 022 upload orchestrator | Order-sensitive Make/Lambda; C-013 risk |
| Retire **115** | Test harness — never for capacity |
| Retire **112** in DEV | **Not in UI** — 0 slots |
| Six-paste **117a–f** | Superseded by orchestrator |

---

## Slot recovery scenarios

| Scenario | Moves | Gross free | After 117 | ≥5? |
|----------|-------|------------|-----------|-----|
| A Minimum | 043 only + 117 | 0 net | 0 | No |
| **B Target** | 043 + 061 + 078 + 006∪021 + 063 + 111 | +6 | **+5** | **Yes** |
| C Stretch | B + 030∪032∪033 | +8 | +7 | Yes |
| D Strategic | C + EMC weekly | +9 | +8 | Yes |

**Recommended:** Execute **Phase 0 → 1 → 2.1 → 3**, then stop for Mike review before WAS trio / EMC.

---

## Migration order (single sequence)

1. UI inventory paste (close model gaps)  
2. Phase 0 (043 → 117 OFF)  
3. Phase 1 (061, 078)  
4. Phase 2.1 (006+021)  
5. Phase 3 (063, 111)  
6. Optional Phase 2.3 (WAS trio)  
7. Optional Phase 4 (EMC)  
8. Docs-table hygiene (add 022/067/115/116/117; retire 008/112 rows)

---

## Test requirements (global)

| Gate | Required before calling phase done |
|------|-------------------------------------|
| Offline repo | Existing Lambda 66 + offline suite where scripts change |
| DEV fixture | Schmidt / sandbox enrollment + one Submission |
| Domain audits | Stages A–J as affected (per trigger map) |
| XP | No duplicate XP Events (Source Key) |
| Make | No real parent email without intentional webhook |
| 117 | Recording Quiz fixture; email branch skipped without webhook |

---

## Rollback requirements (global)

1. GitHub SHA is re-paste source.  
2. Disable new/combined automation **before** re-enabling retired splits.  
3. Re-run matching dry-run audit.  
4. Never force-push; never delete without Mike approval.  
5. Document every DEV change in `docs/deploy-checklists/` before PROD promotion.

---

## Related

- [INVENTORY](./AIRTABLE-AUTOMATION-INVENTORY.md)
- [DEPENDENCY-MAP](./AIRTABLE-AUTOMATION-DEPENDENCY-MAP.md)
- [CAPACITY-LEDGER](./AIRTABLE-AUTOMATION-CAPACITY-LEDGER.md)
- [Mike decision sheet](../deploy-checklists/AIRTABLE-AUTOMATION-ARCHITECTURE-mike-decision-sheet.md)
- [V2-014 roadmap](../v2-014-automation-modernization-roadmap.md)
