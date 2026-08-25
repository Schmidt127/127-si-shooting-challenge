# START HERE — Next packages (2026-08-25)

**Authority:** [`docs/CURRENT-TRUTH.md`](../../CURRENT-TRUTH.md) · [`docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](../../SHOOTING_CHALLENGE_COMPLETION_MASTER.md)  
**Public site:** https://www.fairfieldbasketballclub.com/shoot  
**Rule:** Do **not** mark Installed / Live Tested / Complete without PROD paste + Schmidt (or disposable) evidence. Agents do not paste Airtable, change Vercel, enable Make schedules, or send email unless Mike authorizes that package.

---

## Task Classification

| Field | Value |
|-------|--------|
| Type | Ops verification + paste-package readiness |
| Phase | 3 Implementation / Phase 5 Close (docs) |
| Correct tool | Cursor (repo) + Mike for Airtable paste |
| Repo | `127-si-shooting-challenge` |
| Mike’s role | Paste 022/072/073 and 010; optional 035 ON decision |

---

## A. Original Jul 30 package order — reconciled

The chat asked for this exact order after PRs #43–#48. Against **2026-08-24/25** truth, that sequence is **historical / superseded**:

| # | Original ask | Current truth (2026-08-25) | Action |
|---|--------------|----------------------------|--------|
| 1 | Verify Production `/shoot` + #45 landing tip | **Re-verified PASS** on `fairfieldbasketballclub.com/shoot` — tip `f334c7a` matches Production deploy; no `hooopchallenges` typo; health `tokenValid:true` | Optional: dashboard-attest `NEXT_PUBLIC_LANDING_URL` |
| 2 | Paste **057 v1.4** + Denver / Perfect Week | **Superseded** — Production **057 v2.0** live-tested (48h grace). Do **not** downgrade to v1.4 | Full calendar PW award still calendar-blocked |
| 3 | Paste **035 v1.1** OFF-first + Tests 1–5 | **Superseded** — **035 v1.2** Live Tested (2026-08-03); remains **OFF** until Mike enables | Do not re-paste v1.1 |
| 4 | **067 Option B** HC / 0 assets / 1 XP | **Live Tested** (2026-08-04 Package 02) | GitHub advanced (v3.5); UI version confirm if promoting further |
| 5 | SC-041 fail→recover + COM-MAKE-001 retry/exhausted | **Not authorized** this turn; Make email plane **retired** (Hub → Resend) | Only if Mike names a new controlled Hub failure package |

Evidence pointers:

- 057 v2.0: `docs/deploy-checklists/057-v2.0-perfect-week-grace-period.md`
- 035 v1.2: Completion Master SC-049 Live Tested notes; automation **OFF**
- 067 Option B: `docs/testing/evidence/2026-08-04-package-02-critical-pastes/`
- Jul 27 truth audit: `docs/audits/REPO-COMPLETION-TRUTH-AUDIT-2026-07-27.md` (historical)

---

## B. Production `/shoot` verify (2026-08-25)

| Check | Result |
|-------|--------|
| Public URL | https://www.fairfieldbasketballclub.com/shoot |
| HTTP `/shoot` | **200** |
| Production GitHub deployment SHA | **`f334c7a`** (= `origin/master`) |
| Legacy `hooopchallenges.com` in HTML | **Absent** |
| Hub / landing host | `fairfieldbasketballclub.com` links present |
| Health `/shoot/api/airtable` | `ok:true`, `tokenValid:true`, base `appn84…` |
| Core routes | All **200** — see [`public-shoot-prod-verify.json`](./public-shoot-prod-verify.json) |

Detail: [`PUBLIC-SHOOT-PROD-VERIFY.md`](./PUBLIC-SHOOT-PROD-VERIFY.md)

---

## C. Actual next Mike paste packages (repo-ready)

Do these **instead** of re-pasting 057 v1.4 / 035 v1.1 / 067 Option B.

| Order | Package | Repo | PROD today | Operator doc |
|-------|---------|------|------------|--------------|
| **1** | **022 v2.2** secure parent video URL | v2.2 Ready | Still **v2.1** until paste | [`022-SECURE-VIDEO-PASTE.md`](./022-SECURE-VIDEO-PASTE.md) · canonical [`../../deploy-checklists/022-v2.2-secure-video-url-pipeline.md`](../../deploy-checklists/022-v2.2-secure-video-url-pipeline.md) |
| **2** | **072 v4.8** weekly Lambda-only video links | v4.8 Ready | **v4.7** live-tested | Same packet |
| **3** | **073 v4.4** block unsafe VF parent URL | v4.4 Ready | **v4.3** until paste | Same packet |
| **4** | **010 v10.12** settlement grace | v10.12 Ready | Code column may still show **v10.10** | [`010-V10.12-PASTE.md`](./010-V10.12-PASTE.md) · canonical [`../../deploy-checklists/010-v10.12-formula-settlement-grace.md`](../../deploy-checklists/010-v10.12-formula-settlement-grace.md) |

**035 ON decision** remains Mike-owned (Live Tested while OFF — not season Complete).

---

## D. Explicitly not in this package

- Live Airtable paste / schema / record mutation from agents  
- Vercel env / domain / alias changes  
- Make schedule enable / Gmail sends  
- SC-041 deliberate webhook fail or COM-MAKE-001 retry/exhausted  
- Claiming Complete for 022/072/073/010 without Mike paste + evidence  

---

## E. Offline validation commands (repo)

```bash
node lib/secure-video-url.test.js
node airtable/automations/shooting-challenge/lib/022-child-upload-writeback.test.js
node tests/video-feedback/secure-video-url-pipeline.test.js
node tests/email/automation-071-073-source-safety.test.js
```
