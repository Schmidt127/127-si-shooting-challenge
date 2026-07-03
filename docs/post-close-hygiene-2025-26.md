# Post-close hygiene — 2025–26 season

**Purpose:** Record cleanup and automation fixes discovered during **2025–26 close-out audits** (July 2026). Use this after final emails and Amazon fulfillment are done — not blockers for close-out itself.

**Last verified:** 2026-07-02 (Airtable extension scripts + Python cross-checks)

**Related:** [close-out-considerations.md](./close-out-considerations.md) (watchlist IDs C-006, C-011, C-012+) · [audits README](../airtable/extension-scripts/audits/README.md) · [PROJECT_STATE.md](./PROJECT_STATE.md)

---

## Close-out audits — what passed (2026-07-02)

Run in Airtable Scripting; JSON saved from console.

| # | Script | Result | Notes |
|---|--------|--------|-------|
| 1 | `audit-final-award-recipients-closeout.js` | **PASS** | 124 snapshot rows; 0 wrong links, 0 duplicates; 70 new **In Amazon Cart** rows (expected) |
| 2 | `audit-final-goal-conquer-reconciliation.js` | **PASS** | 14/14 Goal Met ↔ Conquered Goal aligned |
| 3 | `audit-final-awards-catalog-quick.js` | **PASS** (close-out) | `needConqueredRow: 0`; 49 scope mismatches — see **H-003** |
| 4 | `audit-final-awards-cart-summary.js` | **PASS** | **70** rows, **$595** gift cards, 8 award types |
| 5 | `audit-final-090f-athlete-achievement-unlocks-workflow.js` | **Hygiene only** | 9 duplicate unlock groups — see **H-001**; XP parity clean |
| 6 | `audit-final-090g-weekly-summary-email-workflow.js` | **Reviewed** (2026-07-02) | See **H-005** — do not retro-send missed weeklies; use final summary email |

**Historical repair already done:** Wrong **Award** links on ~91 Award Recipients rows; Blake/Riley Week 8 homework duplicates removed. Reference CSV: `Award Recipients-Grid view from June 29 FINAL.csv`.

---

## Post-season backlog

Priority: **High** = fix before next season · **Medium** = data hygiene · **Low** = optional / cosmetic

### H-001 — Dedupe Athlete Achievement Unlock rows (Medium)

**Found by:** `audit-final-090f-athlete-achievement-unlocks-workflow.js` (2026-07-02)

**Issue:** 9 duplicate groups on combo key **Enrollment + Achievement + Week**. All involve achievement **`reclgScxpCba3m1Mo`** (Shot Milestone). ~15 extra unlock rows across ~6 enrollments.

**Not blocking:** Amazon cart, final emails, or XP rollups (090F reported no missing links, no duplicate XP, no duplicate Milestone Source Key).

**How to fix (manual, after season):**

1. Re-run 090F; for each group below, open all `unlockIds`.
2. Keep **one** row per group (prefer the row with a valid **XP Events** link and **XP Award Status = Awarded**).
3. Delete or archive extras only after confirming no unique XP Event would be orphaned.
4. Re-run 090F until `duplicate_unlock_key_enrollment_achievement_week` is 0.

**Do not use** `repair-final-090f-unlock-week-from-source.js` for this — that script fills **empty** Week fields only.

| Enrollment ID | Week ID (3rd part of comboKey) | Dup count | Unlock record IDs |
|---------------|-------------------------------|-----------|-------------------|
| `recQiRUbTKZ5Wiz7B` | `recZwSGoAiERDdTMr` | 2 | `rec9HvrspXPIQijWU`, `rec87XSUgBDUq6Ou1` |
| `rechgOSWWFsOivzhX` | `recnMGC2JBHjO0ay6` | 5 | `recOMxdSiuDlctOAR`, `recW8qCgBQlESC5iq`, `rec00VRhnV8Qhexog`, `recDwfnDw758GJznx`, `recJY2Wpa763vqM5Z` |
| `rechgOSWWFsOivzhX` | `recZwSGoAiERDdTMr` | 3 | `reca0VqvGAtBcUn2m`, `recbjG82txFMn0xxs`, `recje8OQ2kv1JwiYH` |
| `recAHTFTFc2q4y59i` | `recnMGC2JBHjO0ay6` | 2 | `recMyR44ID7Hklvax`, `recrG1B0bTfXCvQie` |
| `recAHTFTFc2q4y59i` | `recaX4EyJ7BWWKfSq` | 2 | `recbQKgNyXRONHp4p`, `recsTbNvhHcbdpUI3` |
| `recAHTFTFc2q4y59i` | `recEYLwDOOYMMsDNf` | 2 | `recUFrhMYEri8RSWl`, `recaRv8zCoOrDFizD` |
| `recKlYEzTwrMaau6B` | `recbw58r8MlnhbBx7` | 2 | `recHUEQ4RjYYAPqaK`, `reckMQb6wE4cF8zmk` |
| `recvMhReNktxj1Txk` | `recNmS6xlp3HOWPAE` | 2 | `recGsYX4h3isuKSF9`, `recG1ShTMcXuDVH3u` |
| `recZm4wl6E5ePN2rb` | `recrTwxqXz31fNZ7e` | 4 | `recW96E4Tp7Pn5I75`, `recqF0EElx4ofNSnP`, `recXvyBgupVg2JFiI`, `recGcAaD6mP9D1AB5` |

**Watchlist:** [close-out-considerations.md](./close-out-considerations.md) **C-006**

---

### H-002 — Automation 066: write Week on shot-milestone unlocks (High)

**Found by:** 090F audit + Week 9 cohort review

**Issue:** Automation **066** creates Shot Milestone unlocks but does not always set **Athlete Achievement Unlocks.Week**. Automation **058** (perfect-week unlocks) does set Week explicitly — 066 should match that pattern.

**Why it matters next season:** Empty or inconsistent Week links make unlock audits, weekly rollups, and dedupe keys harder.

**Week 9 note (2025–26):** 13 Week 9 shot-milestone unlocks in the audit sample **did** have Week linked (`week9ByWeekLink: true`). The 066 fix is **forward-looking**, not required to finish 2025–26 close-out.

**Fix:** Edit `airtable/automations/shooting-challenge/066-*.js` to resolve Week from milestone activity date (same date→Week logic as `backfill-shot-milestone-xp-week-and-was.js` / `repair-final-090f-unlock-week-from-source.js`) and write `{ id: weekRecordId }` on create.

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
| C-009 | Redo Fillout HW17 quiz intake | [homework-flow.md](./data-flow/homework-flow.md) |
| C-010 | Harden `Active?` on all XP/email automations | [close-out-considerations.md](./close-out-considerations.md) |
| C-011 | Automate weekly parent emails | [weekly-summary-flow.md](./data-flow/weekly-summary-flow.md) |
| C-012 | Stage K — field ownership pass | [stage-j-legacy-cleanup.md](./airtable/stage-j-legacy-cleanup.md) |
| C-013 | Drive-only assets (no Airtable attachments) | [close-out-considerations.md](./close-out-considerations.md) |
| C-014 | XP / levels / streaks game design | [shooting-challenge-v2-master-direction.md](./shooting-challenge-v2-master-direction.md) — **decided 2026-07-03:** one ladder, spread gates, no dual-track for 2026–27 |

---

## Re-verification checklist (post-season)

```text
1. audit-final-090f-athlete-achievement-unlocks-workflow.js  → duplicate groups = 0
2. audit-final-awards-catalog-quick.js                         → optional scope cleanup
3. audit-final-090g-weekly-summary-email-workflow.js           → after any 072/074 changes
4. audit-field-coverage-report.js + stage-j doc                → field cleanup Phase 3–5
5. Fresh schema export → airtable/schema/snapshots/
```

Update this file and [PROJECT_STATE.md](./PROJECT_STATE.md) when items are resolved.
