# Email + SC-147 paste queue — September 2026

**Purpose:** Desktop operator index for pending Airtable pastes (repo-only until Mike executes).  
**Rule:** DEV proof → Mike approval → Production paste → `CHANGELOG.md` ### Airtable.

Hub plane (already live for template changes): **079** → Communications Hub → Resend. See [`docs/integrations/email-send-plane.md`](../integrations/email-send-plane.md).

---

## Priority order

| Priority | Item | Version | Operator packet | Hub dep | Blockers |
|----------|------|---------|-----------------|---------|----------|
| **1** | **071** Homework Feedback Hub handoff | **v4.3** | [`071-v4.3-homework-feedback-paste-packet.md`](./071-v4.3-homework-feedback-paste-packet.md) | FUT-046 subject (live) | None — ready for DEV paste |
| **2** | **076** Daily Submission Hub handoff | **v8.12** | [`076-v8.12-daily-submission-paste-packet.md`](./076-v8.12-daily-submission-paste-packet.md) | FUT-041 XP columns (live) | None — ready for DEV paste |
| **3** | **SC-147** Zoom Recording half-XP | **v1.0** | [`SC-147-zoom-recording-half-xp.md`](./SC-147-zoom-recording-half-xp.md) | None (XP writer, not email) | Mike: confirm slot **147**, `ZOOM_RECORDING` rule row, DEV disposable proof |

**Suggested session order:** Paste **071** + **076** on DEV in one sitting (email bundle); run Schmidt smokes; promote both to Production after proof. **SC-147** is independent — schedule after slot + XP Reward Rules row decisions.

---

## Quick reference

| Automation | Paste range | Smoke path |
|------------|-------------|------------|
| **071** | Docblock `Version: v4.3` → EOF; skip GitHub header | Schmidt HC → queue → **079** → Hub subject with `[TEST]` |
| **076** | Docblock `* 076 - EMAIL…` → EOF; skip GitHub summary header | Schmidt counted submission via **031** → queue → **079** → XP Earned \| Extra Credit columns |
| **147** | Docblock `* 147 (slot TBD)…` → EOF; skip GitHub header | Offline tests first; disposable ZA recording quiz path |

---

## Related (no 071/076 paste)

| Item | Note |
|------|------|
| **FUT-047** | Homework contact copy — Hub only; no automation paste |
| **FUT-032** | Homework Hub writeback — already live |
| **117 v2.1** | Zoom recording **email** only — do **not** add XP to 117 |

---

## Close-out

After each Production paste:

- [ ] Update packet **Status** → `Promoted to Production`
- [ ] `CHANGELOG.md` ### Airtable — paste date + version
- [ ] `docs/automation-index.md` if slot/version tracking changes (SC-147)
