# Post-close hygiene — 2025–26 season

**Purpose:** Record cleanup and automation fixes discovered during **2025–26 close-out audits** (July 2026). Use this after final emails and Amazon fulfillment are done — not blockers for close-out itself.

**Last verified:** 2026-07-05 (H-001 **done**; H-002 **066 v3.1 GitHub done**, Airtable paste pending)

**Related:** [close-out-considerations.md](./close-out-considerations.md) (watchlist IDs C-006, C-011, C-012+) · [audits README](../airtable/extension-scripts/audits/README.md) · [PROJECT_STATE.md](./PROJECT_STATE.md)

**Wave 0:** **Closed 2026-07-05.**

---

## Close-out audits — what passed (2026-07-02)

Run in Airtable Scripting; JSON saved from console.

| # | Script | Result | Notes |
|---|--------|--------|-------|
| 1 | `audit-final-award-recipients-closeout.js` | **PASS** | 124 snapshot rows; 0 wrong links, 0 duplicates; 70 new **In Amazon Cart** rows (expected) |
| 2 | `audit-final-goal-conquer-reconciliation.js` | **PASS** | 14/14 Goal Met ↔ Conquered Goal aligned |
| 3 | `audit-final-awards-catalog-quick.js` | **PASS** (close-out) | `needConqueredRow: 0`; 49 scope mismatches — see **H-003** |
| 4 | `audit-final-awards-cart-summary.js` | **PASS** | **70** rows, **$595** gift cards, 8 award types |
| 5 | `audit-final-090f-athlete-achievement-unlocks-workflow.js` | **PASS** (v1.1, 2026-07-05) | Audit dedupe fixed — see **H-001**; 0 data deleted |
| 6 | `audit-final-090g-weekly-summary-email-workflow.js` | **Reviewed** (2026-07-02) | See **H-005** — do not retro-send missed weeklies; use final summary email |

**Historical repair already done:** Wrong **Award** links on ~91 Award Recipients rows; Blake/Riley Week 8 homework duplicates removed. Reference CSV: `Award Recipients-Grid view from June 29 FINAL.csv`.

---

## Post-season backlog

Priority: **High** = fix before next season · **Medium** = data hygiene · **Low** = optional / cosmetic

### H-001 — Fix 090F Athlete Achievement Unlock audit (Medium) — **DONE**

**Found by:** `audit-final-090f-athlete-achievement-unlocks-workflow.js` (2026-07-02)

**Outcome:** The 9 flagged groups were **not duplicate unlock rows**. Each group is **Enrollment + same Shot Milestone achievement + same Week** with **different `Shot Milestone` links** and **unique `Milestone Source Key`** values. Multiple shot milestones crossing in the same week is **legitimate**.

**Engineering principle:** **Fix the audit, not the data.**

**Resolved 2026-07-05:**

1. Updated `audit-final-090f-athlete-achievement-unlocks-workflow.js` (v1.1) and `run_final_090_audits.py`.
2. **Shot milestones:** dedupe on **`Milestone Source Key`** only.
3. **Other achievements:** Enrollment + Achievement + Week.
4. Live re-run **090F PASS** (Airtable + Python). **Zero rows deleted.**

**Watchlist:** [close-out-considerations.md](./close-out-considerations.md) **C-006** → resolved

### H-002 — Automation 066: V2 rewrite + Week write (High) — **GitHub DONE**

**Found by:** 090F audit + Week resolution review

**Re-audit 2026-07-05:** **0** shot-milestone unlocks with empty Week on active enrollments.

**Fix:** Automation **066** rewritten to **v3.1** (V2 Automation Standard) in GitHub — commit `45b17d7`:

- SCRIPT metadata + CONFIG blocks
- Week write from Milestone Activity Date via Weeks table ranges
- Batched create/update (50)
- Idempotent Milestone Source Key
- Standard outputs (`statusOut`, `actionOut`, `debugStep`, etc.)

**066 v3.1** is the **canonical template** for future V2 automation rewrites — see [v2/06-automation-standards.md](./v2/06-automation-standards.md).

**Status:** GitHub **done** · production Airtable paste **not done** (awaiting deploy checklist)

---

### H-003 — Award Recipients scope vs catalog scope (Low — accepted for 2025–26)

**Found by:** `audit-final-awards-catalog-quick.js` — **49** rows, issue type `recipient_scope_vs_catalog_scope`

**Issue:** **Awards** catalog says **Overall** or **Both**, but **Award Recipients** row still has recipient scope **Weekly**. Common on historical **Sent** rows (Conquered Goal, Random Drawing Incentive, Dedication, Grade Band mid-season, etc.).

**Decision (2026-07-02):** **Do not bulk-fix** before close-out. Rows are linked to the correct award and fulfillment status; scope is metadata inconsistency from how rows were created mid-season.

**Optional post-season:** Fix individual rows only if scope affects a report or email template. Re-run catalog quick audit after any batch change.

**Report:** `tools/airtable/_preview/awards-catalog-audit-report.md` (Python; may show 46 vs 49 — re-run if needed)

**Watchlist:** **C-015** in [close-out-considerations.md](./close-out-considerations.md)

---

### H-004 — Awards catalog: duplicate `thanks_for_playing` class bucket (Low)

**Found by:** `tools/airtable/audit_awards_catalog.py` (pre–extension-script pass)

**Issue:** Three catalog awards share class bucket `thanks_for_playing`:

| Record ID | Award name |
|-----------|------------|
| `recITxe6rgmDyjRWl` | Participation Award |
| `recuf8ucY0uhIqdWG` | Thanks for Playing - Every Bit Counts |
| `recEahm8HY7GnNoRl` | Zoom Attendance/Participation Award |

**Impact:** Email tooling maps **Participation Award** → family-facing “Thanks for Playing”; duplicate bucket can confuse catalog audits and naming.

**Fix (post-season):** Consolidate or re-label catalog **Class** / bucket fields; confirm Post Challenge cart rows (12 × Thanks for Playing @ $5) still point at `recuf8ucY0uh…` only.

**Report:** `tools/airtable/_preview/awards-catalog-audit-report.md`

**Watchlist:** **C-016**

---

### H-005 — Weekly summary email workflow (High — review at close-out; automate next season)

**Found by:** `audit-final-090g-weekly-summary-email-workflow.js` — **live run 2026-07-02**

**Scope:** 457 Weekly Athlete Summary rows (91 active enrollments). **0** missing enrollment/week links; **0** missing parent email on enrollment.

**Do not treat as close-out failure.** The audit reflects a **manual** 072 → 074 workflow (staff checks `Build Weekly Email Now?` / `Send to Make?`). Most gaps are historical — not bugs in awards/cart data.

| Category | Count | Meaning | Close-out action |
|----------|-------|---------|------------------|
| `clean_and_sent` | **92** | Weekly email actually sent | None |
| `should_have_sent_never_built` | **293** | Week ended, summary complete, **no HTML package** (072 never run) | **Do not retro-send** — early/mid season before weekly email ops |
| `package_built_not_sent` | **48** | HTML ready; **`Send to Make?` never checked** (072 leaves it unchecked by design) | **Do not bulk-send now** — use one final email instead |
| `needs_manual_review` | **23** | Edge cases — usually HTML exists but **WAS Recipients field empty** while enrollment has parent email | Spot-check only if final email builder reads WAS Recipients (final builder uses enrollment) |
| `error_blocked` | **1** | `recm6tgXXN4pYgjxf` — enrollment `recRMktT2fGDup8sm`, Week 8 (`recaX4EyJ7BWWKfSq`); error: *Send to Make? is not checked* | Historical; not blocking final summary |
| `missing_recipient` | 0 | — | — |
| `missing_enrollment_or_week` | 0 | — | — |

**Trigger simulation (right now):** `automation072BuildEligibleCount: 0`, `automation074SendEligibleCount: 0` — nothing pending in the manual trigger queue.

**Close-out action:** One **final challenge summary per family** via `repair-final-090g-build-final-challenge-summary-email.js` (dry-run → test 1 athlete via **074** → full send). Script note: *"Recommend one final challenge summary per family rather than sending N missed weeklies."*

**Next season fix:** Full automation — see **C-011** in [close-out-considerations.md](./close-out-considerations.md) (remove manual `Build Weekly Email Now?` / `Send to Make?` gates; scheduled 072→074).

---

### H-006 — Enrollment `Conquered Goal Date` lookup filter (Low)

**Issue:** Optional filtered lookup on Enrollment for Conquered Goal dates may not match all recipient rows if filter excludes **In Amazon Cart** or Post Challenge weeks.

**Action:** Only if a parent-facing field shows wrong/missing date after close-out. Align lookup filter with how Conquered Goal recipient rows are stored (Week 5–10 + Post Challenge).

---

## Larger initiatives (already on watchlist)

These overlap with hygiene but are **separate projects** — start after July 2026 close-out:

| ID | Topic | Doc |
|----|-------|-----|
| C-009 | Redo Fillout HW17 quiz intake | [homework-flow.md](./data-flow/homework-flow.md) — **owner pursuing Fillout attachment export** |
| C-010 | Harden `Active?` on all XP/email automations | [close-out-considerations.md](./close-out-considerations.md) |
| C-011 | Automate weekly parent emails | [weekly-summary-flow.md](./data-flow/weekly-summary-flow.md) |
| C-012 | Stage K — field ownership pass | [stage-j-legacy-cleanup.md](./airtable/stage-j-legacy-cleanup.md) |
| C-013 | Drive-only assets (no Airtable attachments) | [close-out-considerations.md](./close-out-considerations.md) |
| C-014 | XP / levels / streaks game design | [shooting-challenge-v2-master-direction.md](./shooting-challenge-v2-master-direction.md) — **decided 2026-07-03:** one ladder, spread gates, no dual-track for 2026–27 |

---

## Re-verification checklist (post-season)

```text
1. audit-final-090f-athlete-achievement-unlocks-workflow.js  → PASS (v1.1 — Source Key dedupe)
2. audit-final-awards-catalog-quick.js                         → optional scope cleanup
3. audit-final-090g-weekly-summary-email-workflow.js           → after any 072/074 changes
4. audit-field-coverage-report.js + stage-j doc                → field cleanup Phase 3–5
5. Fresh schema export → airtable/schema/snapshots/
```

Update this file and [PROJECT_STATE.md](./PROJECT_STATE.md) when items are resolved.
