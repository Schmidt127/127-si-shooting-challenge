# Repository Completion Truth Audit — 2026-07-27

**Agent:** Agent 1 — repository completion / QA / launch hardening  
**Starting `origin/master`:** `9d18b269bb21936c6ac39d917bfe931eb361531f` (merge of PR #47; includes #43–#46)  
**Authority:** `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` wins when older docs disagree.

This audit separates **repository truth** from **production truth**. Code in GitHub is not proof of PROD install or live test.

---

## 1. Layers of truth

| Layer | What counts as evidence | What does **not** count |
|-------|-------------------------|-------------------------|
| **Repository** | Scripts, helpers, fixtures, offline tests, deploy checklists, SOPs on `master` | Assuming paste happened |
| **Airtable PROD** | Mike UI attestation, paste confirmation, Schmidt record IDs, automation ON/OFF readback | Script file existing in repo |
| **Vercel PROD** | Production deployment SHA/URL smoke, env var verification in dashboard | Preview PR green / local Playwright |
| **Make / Gmail / Fillout** | Controlled send writeback, scenario ON/OFF attestation | Blueprint files in `make/` |
| **Manual Mike actions** | Named packages with rollback | Unattended agent mutations |

---

## 2. Post–PR #43–#47 stack (repository)

| Package | Repo status | PROD install | Live tested | Notes |
|---------|-------------|--------------|-------------|-------|
| **035 v1.1** Weekly Threshold | Built + Ready for PROD Paste | **Not installed** (checklist) | No | SC-049 |
| **057 v1.4** Perfect Week Denver | Built + Ready for PROD Paste | PROD still **v1.3** per completion master | No for v1.4 | SC-021 / SC-028 / SC-077 |
| **067 Option B** quiz | Built + install packet | Not confirmed pasted | No | SC-013 / SC-014 |
| **SC-041** weekly-email retry SOP + contracts | Built in Repository | N/A (docs/helpers) | No deliberate fail→recover | SCN-029 offline-only until Mike authorizes |
| **Browser QA /shoot fixes** | Merged (#45) | Needs Production deploy + env | Preview proven; PROD landing typo may remain | `NEXT_PUBLIC_LANDING_URL` |
| **SCN-021–029 fixtures** | Built in Repository | SCN-001–020 installed; 021–029 pending | No for 021–029 | SC-002 |
| **Recovery docs (#47)** | Merged | N/A | N/A | Tomorrow-start doc dated 2026-07-26 is stale as “tomorrow” |

---

## 3. Stale / contradictory documentation found

| Claim | Location | Correction |
|-------|----------|------------|
| PRs #43–#47 still Draft; merge sequence pending | `docs/recovery/SHOOTING-CHALLENGE-MIKE-NEXT-ACTIONS-2026-07-25.md` | **Merged into master** as of `9d18b26`. Next = Vercel Production env + paste packages |
| Production commit tip still “verify PR #42 / 9110a71” only | `docs/PROJECT_STATE.md` | App release may still be older tip until #45 lands on Production; verify dynamically |
| SC-028 “Installed in PROD” while 057 v1.4 checklist says Ready for Paste | Completion master | Honest: **PROD = v1.3 installed**; **v1.4 = Built / Ready for Paste** — do not promote v1.4 to Live Tested |
| Softr as launch dependency | Older checklists | Superseded — Softr Obsolete (SC-114) |
| 118/119 schedules OFF | Older was-email notes | Superseded — schedules **ON** (C-011 Live) |

---

## 4. Manual Mike actions (exact order — after this repo PR)

1. Confirm Production Vercel has tip including browser QA (`39df7cb` / merge of #45+) and set `NEXT_PUBLIC_LANDING_URL=https://www.hoopchallenges.com` (rebuild required).
2. Paste **057 v1.4** → Schmidt Denver boundary proof.
3. Create/paste **035 v1.1 OFF-first** → Schmidt Tests 1–5.
4. Confirm/paste **067 Option B** → HC / 0 assets / 1 XP after satisfactory.
5. Optional authorized: SC-041 deliberate webhook fail→recover (SCN-029); COM-MAKE-001 retry/exhausted.
6. Install SCN-021–029 (and new SCN-030+) into Testing Scenarios table when ready.

---

## 5. Prohibited unattended actions

- Live Airtable record/field/view/automation mutations
- Production Airtable paste from agents
- Make webhook fires / Gmail sends
- Enabling Communications or Make schedules
- Vercel env/alias/domain changes
- Fillout form edits
- Claiming Installed / Live Tested / Complete without evidence
- Bulk weekly-email rearm

---

## 6. High-value repository gaps addressed in Agent 1 wave

- Truth audit (this file) + completion-master integrity checker
- Expanded offline contracts: threshold / Perfect Week DST / homework / weekly-email
- Scenario fixtures SCN-030+ + catalog rebuild/validate
- Public `/shoot` Playwright hardening (tablet, a11y, hub links, reduced motion)
- Content/external-dependency audit (repo-safe fixes only)
- Season rollover dry-run fixture coverage

**Statuses deliberately not promoted:** SC-013, SC-014, SC-021, SC-028, SC-041, SC-049 remain Built / Ready for Paste / Installed(v1.3) — not Complete or Live Tested for unpasted versions.
