# PKG-006R Video XP Lock Investigation — 2026-08-23

**Question:** Is PKG-006R still an active production lock on Video XP Automations **113** and **114**?

**Answer:** **No.** PKG-006R (and PKG-036) coordination locks are **complete**. Automations **113 v6.4** and **114 v6.1** are **already Live** in Production with GitHub-matching versions. Documentation that still cites PKG-006R as blocking Video XP paste is **stale**.

**Remaining gap:** PKG-007 **controlled Production lifecycle proof** for Video XP (Schmidt test packet) — not automation paste.

---

## Lock determination

| Criterion | Evidence | Result |
|-----------|----------|--------|
| PKG-006R completion | [`PKG-006R-PKG-036-PRODUCTION-OPERATOR-PACKET.md`](../deploy-checklists/PKG-006R-PKG-036-PRODUCTION-OPERATOR-PACKET.md) — **Complete 2026-08-15**; 010 v10.9 ON | **Satisfied** |
| PKG-036 completion | Same packet — 041 v5.0 / 042 v4.1.2 ON | **Satisfied** |
| 113/114 Production install | API read 2026-08-23: **113 v6.4 Live**, **114 v6.1 Live** | **Already installed** |
| GitHub ↔ Production match | [`2026-08-20-automation-49-code-audit.md`](../audits/2026-08-20-automation-49-code-audit.md) — EXACT_BODY MATCH | **No paste needed** |
| PKG-007 Video XP proof | [`VIDEO-FEEDBACK-XP-PRODUCTION-SCHMIDT-TEST.md`](../deploy-checklists/VIDEO-FEEDBACK-XP-PRODUCTION-SCHMIDT-TEST.md) — lifecycle evidence pending | **Open — Mike** |

**Classification:** **#2 — Lock requirements satisfied; some docs still document as locked.** Actual blocker is **#3 — missing PKG-007 Video XP Production proof**, not PKG-006R.

---

## Production automation state (API 2026-08-23)

| # | Name | Status | Version | GitHub |
|---|------|--------|---------|--------|
| **111** | Copy Enrollment Grade Band | **Absent** (retired; 013 owns grade band) | — | v1.1 historical |
| **113** | Assign Base Video XP | **Live** | **v6.4** | v6.4 MATCH |
| **114** | Create or Update Video XP Event | **Live** | **v6.1** | v6.1 MATCH |

**XP Reward Rule:** `VIDEO_SUBMISSION` active, **25 XP** (`rec06c1tu3IO8EZqG`).

---

## PKG-007-RDY-001 coordination hold (historical)

The hold in Completion Master §0C blocked paste/configure/test of 113/114 until **both** PKG-006R and PKG-036 locks released. Both completed **2026-08-15**. Scripts were subsequently installed and audited **2026-08-20**. The hold **no longer applies to paste**; it should be reframed as **lifecycle proof pending**.

---

## Verification checklist (repository — 113/114 source)

| Requirement | 113 v6.4 | 114 v6.1 |
|-------------|----------|----------|
| Automation name | Assign Base Video XP | Create or Update Video XP Event |
| Trigger table | Video Feedback | Video Feedback |
| Input | `recordId` (dynamic) | `recordId` (dynamic) |
| Feedback Posted? gate | Yes (113 skips if unchecked) | Via eligibility / withdrawal |
| Total Video XP Awarded | Writes Base XP; arms Ready | Requires Ready + positive total |
| XP bucket | N/A (113 does not create XP) | `Video Feedback` |
| XP amount | From `VIDEO_SUBMISSION` rule (25) | From VF Total Video XP Awarded |
| Source Key | N/A | `VIDEO_SUBMISSION\|{videoFeedbackId}` |
| Duplicate prevention | One inactive canonical re-arm | Exact VF link + Source Key match |
| Replay | Re-arms 114 only | Same event ID on restore |
| Inactive / duplicate handling | Fail-closed on ambiguous rules | Deactivate exact event; no replacement |
| Email / queue | None | None (docblock explicit) |
| Grade band | **Not used** for XP (013 for display) | Enrollment scoping only |

Offline evidence: `tests/video-feedback/video-feedback-xp-lifecycle.test.js` (10), `video-feedback-xp-mocked-runtime.test.js` (7), `video-feedback-xp-readiness.test.js` (10).

---

## Safe testing without awarding XP

| Scenario | Safe? | How |
|----------|-------|-----|
| Video upload without feedback | **Yes** | 013/022 create/link VF; leave `Feedback Posted?` unchecked — 113 skips, 114 does not award |
| Feedback posted, zero XP intent | **Yes** | Check `Do Not Award XP?` before arming; 114 deactivates/skips |
| Valid feedback + positive XP | **Controlled only** | Schmidt disposable VF per test packet; deactivate event after proof |
| Parent email | **No send without approval** | Keep **073** OFF or ensure `testMode` + allowlisted recipient; 073 creates Hub queue only |
| Duplicate replay | **Read-only audit first** | `audit-video-xp-pipeline-integrity.js` dry-run |

---

## What Cursor can do autonomously

- Repository verification, offline tests, audit dry-run scripts, documentation reconciliation
- Read-only Production API checks (automation version, rule existence)
- Prepare operator packets and evidence worksheets

## What requires Mike

- Controlled Schmidt Video XP lifecycle proof per [`VIDEO-FEEDBACK-XP-PRODUCTION-SCHMIDT-TEST.md`](../deploy-checklists/VIDEO-FEEDBACK-XP-PRODUCTION-SCHMIDT-TEST.md)
- Native trigger condition attestation (watched fields) in Automations UI
- Any disposable VF row create/review/withdrawal during proof
- Parent email positive path only with explicit approval + test mode

---

## Paste bundles

**Not required.** Production already runs 113 v6.4 and 114 v6.1 matching GitHub. Source files:

- `airtable/automations/shooting-challenge/113-video-review-and-xp-assign-base-video-xp.js`
- `airtable/automations/shooting-challenge/114-video-review-and-xp-create-or-update-video-xp-event.js`

Re-paste only if Mike confirms UI version drift.
