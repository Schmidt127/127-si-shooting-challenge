# Mike Actions — Tomorrow Morning (Consolidated)

**Source:** Overnight Agents 1–6 · 2026-07-23 · Deduplicated by Agent 6  
**Environment:** PROD `appn84sqPw03zEbTT`

---

## 1. Urgent / blocking

1. **UI-attest PROD automations** after overnight changes. Agent 1 baseline claims deleted **043, 032, 033, 063, 111** and upgraded **013 / 020 / 030**; free slots ~4; **115 installed** with dry+live PASS. Confirm this matches the Airtable UI (especially whether 032/033/063/111 deletions were intentional — earlier capacity plan advised keeping some of these).
2. **Confirm Automation 112** state (OFF / deleted / still present). SC-059 still needs a clear 112 outcome.
3. **Do not enable 118/119 Live schedules** until empty-week email decision (SC-035) is recorded — or explicitly accept Option 1 interim send-always for Schmidt-only testing.
4. **Authorize `npm install` in `web/`** so Agent 6 Playwright/build verification can finish.

## 2. Quick Airtable actions

1. Create remaining **Testing** views (API cannot) — Schmidt enrollment filters — SC-003.
2. Keep **Weeks manually seeded** (by design).
3. Leave **Schmidt visible** on `Web - Leaderboard` (no exclusion filter yet).
4. Review **Config table** multi-row conflict (Max Videos Per Submission values disagree) — Agent 2 defect.
5. Optional: continue orphan cleanup for legacy **XP Events** / **Submission Assets** (dry-run first); WAS orphans already cleaned (392 deleted).

## 3. Live tests (Schmidt)

1. Re-run or observe a second **115** Daily Submission scenario (idempotency / duplicate-day awareness).
2. Homework / video / Zoom recording paths still need post-reset live proof (SC-009–SC-011, SC-074).
3. After 118 paste: dryRun Sunday build for Schmidt week; confirm WAS ensure for empty/homework-only weeks.
4. Spot-check `/shoot` catalogs + game manual + leaderboard on a real deploy.

## 4. Product decisions (record in Completion Master)

| ID | Ask | Overnight recommendation |
|----|-----|--------------------------|
| SC-035 | Empty-week parent email? | Option 3 encouragement later; Option 1 OK interim |
| SC-044 | Major-event channel / recipient / opt-in | Email first; ride EMC (SC-042) later |
| SC-014 | Quiz PDF vs attachment-less | Prefer PDF into normal pipeline |
| SC-112 | Athlete auth | Parent magic-link (A); family code (B) interim |
| SC-114 / SC-115 | Softr cutover + noindex removal | Soft cutover first; keep noindex until content ready |
| SC-081 | Streak repeat-after-break | Amounts=config; behavior change only if Mike wants |
| SC-095 | Turn 070a ON in PROD? | Keep OFF until scheduled window |
| SC-066 / SC-067 | Early-bird / Program Instance timing | Deferred OK |

## 5. Later / deferred

- Email Message Center (SC-042)
- Learning Activities schema (SC-018–SC-020) after homework paths re-proven
- Presentation fields schema + web/email wiring (SC-054 / SC-043 / SC-117)
- Softr field renames (SC-144) in a coordinated wave
- Drive retirement (SC-100)
- Platform media kits (SC-131–SC-132)
- Staff `/admin` diagnostics (needs staff auth)

---

## Highest-priority morning package

**Name:** PROD Automation Attestation + Weekly Email Install Gate

1. Paste complete ON/OFF automation list from Airtable UI (closes SC-058 gap).  
2. Confirm 115 + deleted/upgraded set match Agent 1 baseline.  
3. Decide SC-035 empty-week email (or accept Option 1 interim).  
4. Paste **118** (dryRun default) — do not enable Live schedule yet.  
5. Authorize `web/` `npm install` and run Playwright smoke on `/shoot`.
