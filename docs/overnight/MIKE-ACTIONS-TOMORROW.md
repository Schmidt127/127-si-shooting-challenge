# Mike Actions — Tomorrow Morning (Consolidated)

**Source:** Overnight Agents 1–6 + Online Agents 7–8 · 2026-07-23 · Deduplicated by Agent 6  
**Environment:** PROD `appn84sqPw03zEbTT`  
**Evidence index:** `docs/overnight/FINAL-OVERNIGHT-RECONCILIATION.md`

---

## 1. Urgent / blocking

1. **Collapse PROD Config table to one record** (or add an explicit season/instance key). Four conflicting rows make “first record” readers order-dependent — highest Agent 2 risk (MIKE-ACTIONS #1; gates/Zoom recording flags).
2. **UI-attest PROD automations** after overnight changes. Agent 1 baseline: deleted **043, 032, 033, 063, 111**; upgraded **013 / 020 / 030**; ~4 free slots; **115 installed** dry+live PASS. Confirm vs Airtable UI (earlier capacity plan advised keeping some of these).
3. **Confirm Automation 112** state (OFF / deleted / still present).
4. **Paste/install 118** (dryRun default) so empty/homework-only weeks get a WAS — do **not** enable Live schedules until SC-035 email decision (or accept Option 1 interim for Schmidt-only).
5. **Authorize `npm install` in `web/`** (+ Playwright chromium) so typecheck/build/E2E can finish.

## 2. Quick Airtable actions

1. Create remaining **Testing** views (API cannot) — Schmidt enrollment filters — SC-003.
2. Keep **Weeks manually seeded** (by design).
3. Leave **Schmidt visible** on `Web - Leaderboard` (no exclusion filter yet).
4. Fix UI formula `XP Date Resolved`: case `"Submission Base"` → `"Shooting Base"` (Agent 2 #3).
5. Optional orphan cleanup for legacy **XP Events** / **Submission Assets** (dry-run first); WAS orphans already cleaned (392 deleted).
6. Note live Tutorials row counts + Softr/Interface bindings before SC-052 migration (`docs/online-agents/tutorials-content/MIKE-ACTIONS.md`).

## 3. Live tests (Schmidt)

1. Re-run or observe a second **115** Daily Submission scenario (idempotency / duplicate-day awareness).
2. Homework / video / Zoom recording paths still need post-reset live proof (SC-009–SC-011, SC-074).
3. After 118 paste: dryRun Sunday build for Schmidt week; confirm WAS ensure for empty/homework-only weeks.
4. Supervised 3-day streak / milestone crossing when ready (Agent 2 #10).
5. Spot-check `/shoot` catalogs + game manual + leaderboard on a real deploy.

## 4. Product decisions (record in Completion Master)

| ID | Ask | Overnight recommendation |
|----|-----|--------------------------|
| SC-035 | Empty-week parent email? | Option 3 encouragement later; Option 1 OK interim |
| SC-044 | Major-event channel / recipient / opt-in | Email first; ride EMC (SC-042) later |
| SC-014 | Quiz PDF vs attachment-less | Prefer PDF into normal pipeline |
| SC-112 | Athlete auth | Parent magic-link (A); family code (B) interim |
| SC-114 / SC-115 | Softr cutover + noindex removal | Soft cutover first; keep noindex until content ready |
| SC-081 | Streak repeat-after-break (+ 053 backdated double-award) | Amounts=config; behavior change only if Mike wants |
| SC-095 | Turn 070a ON in PROD? | Keep OFF until scheduled window |
| SC-066 / SC-067 | Early-bird / Program Instance timing | Deferred OK |
| — | Video XP live 1 vs rule 25; Lifetime XP excluding Zoom Recording Quiz 30 | Confirm intentional vs repair (Agent 2 #4/#5) |
| — | Submission formula XP 5/0.02 vs SHOOTING_BASE=20 | Remove formulas or adopt — don’t leave competing economics (Agent 2 #7) |

## 5. Later / deferred

- Re-paste **057** (Denver date-key) and **066** (Grade Band link-ID match) after repo fixes — Agent 2 #2/#6
- Archive inactive mojibake Grade Bands after dependency check — Agent 2 #8
- Email Message Center (SC-042)
- Learning Activities schema (SC-018–SC-020) after homework paths re-proven
- Presentation fields schema + web/email wiring (SC-054 / SC-043 / SC-117)
- Tutorials orphan migration execution (SC-052/053) — package ready under `docs/online-agents/tutorials-content/`
- Softr field renames (SC-144) in a coordinated wave
- Drive retirement (SC-100); platform media kits (SC-131–SC-132)
- Staff `/admin` diagnostics (needs staff auth)
- Treat `docs/foundation-reset/MIKE-ACTION-INSTALL-115-PROD.md` as **superseded** (115 already installed)

---

## Highest-priority morning package

**Name:** Config Integrity + Automation Attestation + Weekly Email Install Gate

1. Collapse Config table to a single authoritative row (or season key).  
2. Paste complete ON/OFF automation list from Airtable UI (closes SC-058 gap).  
3. Confirm 115 + deleted/upgraded set match Agent 1 baseline; confirm 112.  
4. Decide SC-035 empty-week email (or accept Option 1 interim).  
5. Paste **118** (dryRun default) — do not enable Live schedule yet.  
6. Authorize `web/` `npm install` and run Playwright smoke on `/shoot`.
