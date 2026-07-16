# Automation 112 — OFF-State Verification Packet

**Status:** Verification checklist — **112 must remain OFF**; delete only in Mike-approved maintenance window  
**Base:** DEV attest first; PROD attest before any delete  
**Scripts:**  
- Production path: `013-…create-video-feedback…` (**v2.0**) — **ON**  
- Legacy: `112-video-review-and-xp-create-video-feedback-from-submission-asset.js` (**v2.1**) — **OFF**  
**Authority:** V2-014 · PROJECT_STATE · Mike Q1 **2026-07-05** (delete approved, not executed) · automation-index Stage G (“Run 013 not 112”)

---

## 1. Why 112 must remain OFF

| | **013** (production) | **112** (legacy) |
|--|----------------------|------------------|
| Key format | `VIDEO_FEEDBACK\|{assetId}` | Bare asset `recordId` |
| Asset writeback | Links VF + sets Upload Status **Pending Link** + arms Make (**070b**) | Creates VF only — **no** upload ladder / Make arm |
| Disposition | **Keep** | **OFF → delete** (Category F) |

Re-enabling 112 risks:

1. Duplicate Video Feedback rows for the same asset  
2. Wrong / non-prefixed Source Keys (audit `legacy_video_feedback_key`)  
3. Assets stuck without Pending Link → **070b** never runs  
4. Divergent coach review / XP paths (114 expects 013-shaped rows)

**Do not re-enable 112** “to test video.” Use **013** only.

---

## 2. How to verify 112 is not required by active workflows

| # | Check | Expected | Done |
|---|-------|----------|------|
| V1 | Automations UI — **112** enabled? | **No** (disabled / OFF) | [ ] |
| V2 | Automations UI — **013** enabled? | **Yes** | [ ] |
| V3 | No Make scenario / automation description depends on name “112” | None | [ ] |
| V4 | Recent Video Feedback Source Keys | Prefixed `VIDEO_FEEDBACK\|…`, not bare `rec…` | [ ] |
| V5 | After video asset → VF create | Asset Upload Status = Pending Link; Send to Make armed when ready (**013** path) | [ ] |
| V6 | Run `audit-video-pipeline-integrity.js` (dry-run) | Recommends 013; no finding that 112 must be ON | [ ] |
| V7 | C-020 / Schmidt video fixture (Test D) | VF rows appear under C-019 Testing view via **013** | [ ] |
| V8 | Screenshot or OMNI note | Attach OFF proof (repo cannot see UI) | [ ] |

If any check fails because 112 is ON: **turn 112 OFF immediately** in that base; repair duplicate VF under Mike guidance; do not leave both ON.

---

## 3. OFF-state verification packet (copy for run log)

```text
Base: ____________________  (must be DEV appTetnuCZlCZdTCT or named PROD window)
Date: ____________________
Verifier: ________________

[ ] 112 = OFF
[ ] 013 = ON
[ ] Sample VF keys prefixed VIDEO_FEEDBACK|
[ ] Asset Pending Link after VF create (013)
[ ] audit-video-pipeline-integrity.js dry-run notes attached
[ ] No Make dependency on 112
[ ] Schmidt Testing view shows VF from 013-only path

Conclusion: 112 not required by active workflows: YES / NO
If NO — stop; do not delete; file findings.
```

---

## 4. Delete readiness (separate from OFF)

OFF alone does **not** recover an automation slot. Delete only when:

1. OFF-state packet PASS on that base  
2. Monitor period complete (PROJECT_STATE / V2-014a)  
3. Mike explicit maintenance-window approval  
4. GitHub retains `112-…js` for rollback re-paste until delete is accepted

**This Worker packet does not delete 112.**

---

## 5. Rollback if someone turns 112 ON

1. Disable 112 immediately.  
2. Audit VF duplicates / bare keys.  
3. Prefer 013 re-run / safe repair — do not “fix” by leaving 112 ON.  
4. Re-paste 013 if overwritten.

---

## 6. Uncertainties

| Item | Status |
|------|--------|
| Live DEV/PROD toggle state | **UNKNOWN** until UI attest (docs claim OFF) |
| Historical bare-key VF rows remaining | **UNKNOWN** — audit |
| Whether any private Make scenario still names 112 | **UNKNOWN** — Make UI |

---

## 7. Mike approvals needed

1. Complete §3 packet on DEV (and PROD before delete).  
2. Approve delete only at maintenance window (already conceptually approved 2026-07-05 — still needs execution go).  
3. Do not authorize re-enable for experiments.

---

## 8. Related

- `docs/automation-index.md` · `docs/PROJECT_STATE.md`  
- Audit: `airtable/extension-scripts/audits/audit-video-pipeline-integrity.js`  
- C-019 Video Feedback Testing view: [C019_DEV_TESTING_VIEWS.md](./C019_DEV_TESTING_VIEWS.md)  
- Offline: `tools/airtable/tests/test_automation_059_043_112_contracts.py`
