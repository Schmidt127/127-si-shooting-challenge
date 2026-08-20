# Homework Assets & Homework Completion — Canonical Runbook

**Status:** Canonical for Submission Assets (homework/video prep), Homework Completions, homework XP, upload gates, and parent-feedback handoffs  
**Last updated:** 2026-08-20  
**Environment:** Production only — base `appn84sqPw03zEbTT`  
**Authority:** Current repository automation scripts under `airtable/automations/shooting-challenge/`

This runbook is the single source of truth for homework asset → completion → upload → XP → parent feedback ownership. Prefer it over older flow docs when they conflict.

**Parent email plane:** Communications Hub → Resend via queue producers (**071** / **073** → **079**). Do **not** treat Make/Gmail as the parent-email sending authority.

---

## 1. Canonical workflow

```text
Submission attachments (HW Sub 1/2, Video Upload, …)
  → 009 creates one Submission Asset per source attachment
       (Source Attachment ID idempotency)
  → 020 links or creates one Homework Completion per
       Enrollment + Week + Homework (library) + Slot
       (multiple assets may link to the same HC)
  → 070a / 070b send payloads only when:
       formula Ready to Send to Make? is ready AND
       Send to Make Trigger is checked
       (070a is intentionally OFF in Production — operational, not a code defect)
  → coach review and feedback
  → 064 prepares Homework XP (rule HOMEWORK_COMPLETION; does not create XP Event)
  → 065 creates/reconciles XP Event HOMEWORK_XP|{Homework Completion ID}
  → 078 marks Homework Parent Feedback Ready? (native Update Record — not 065)
  → 071 handles Homework parent handoff → Hub → Resend
  → 073 handles Video parent handoff → Hub → Resend
       (Video Parent Feedback Ready? is manual unless proven otherwise)
```

### Video asset async upload path (canonical)

```text
009 creates the video Submission Asset
  → 070b sends the async video upload handoff (Make → Lambda)
  → Lambda writes back upload fields on the Submission Asset
  → 070c verifies the writeback
  → 070c clears Send to Make Trigger after successful verification
```

**070c** is **enabled in Production**. It is separate from **070a** (homework upload, still intentionally OFF). **070c** does **not** upload files and does **not** replace **070b**.

---

## 2. Automation ownership (do not restore deleted slots)

| # | Role | Status |
|---|------|--------|
| **009** | Create Submission Assets from Submission attachments | Active (GitHub **v1.2**) |
| **020** | Link or create Homework Completion from homework Submission Asset | Active — **canonical HC create/link** (PROD paste **v3.6**; GitHub **v3.7** structure-only) |
| **012** | Legacy HC create | **Deleted** — must **not** be restored |
| **063** | Legacy Enrollment Grade Band copy to HC | **Deleted / retired** — must **not** be restored; repo file hard-stops |
| **064** | Prepare Homework XP fields from XP Reward Rules | Active — **does not** create XP Events (GitHub **v12.2**) |
| **065** | Create/reconcile Homework XP Event | Active (PROD evidence **v10.1**; GitHub **v10.2** structure-only) |
| **070a** | Homework asset → Make upload engine | Script current; **OFF in Production intentionally** |
| **070b** | Video asset → Make upload handoff | Active shared **v4.6** (PROD ON per Mike overlays) |
| **070c** | Verify async video upload writeback; clear Send to Make Trigger | **Enabled in Production** (GitHub **v1.1**) — not an uploader |
| **078** | Mark Homework `Parent Feedback Ready?` | **Native Update Record** (no script) |
| **071** | Homework parent feedback Hub handoff | Active Hub path (GitHub **v4.1**) |
| **073** | Video parent feedback Hub handoff | Active Hub path (GitHub **v4.2**) |
| **013** | Create/link Video Feedback from VIDEO asset | Active (companion to homework path) |
| **079** | Queue → Communications Hub | Unchanged ownership — do not reassign |

---

## 3. Submission Assets (009)

| Rule | Detail |
|------|--------|
| Create | One Submission Asset per source attachment / slot (HW1, HW2, VIDEO) |
| Idempotency | Exact **Source Attachment ID** match → skip (no duplicate asset) |
| Homework gate | HW1/HW2 require exactly one Homework Name 1/2 (PHA) link |
| Separateness | Assets are **not** Homework Completions; they link to HC after **020** |
| Prerequisites | Submission must already have Enrollment + Week |

---

## 4. Homework Completion uniqueness (020)

| Rule | Detail |
|------|--------|
| Uniqueness | **Enrollment + Week + Homework (library) + Slot** |
| Multi-asset | Multiple Submission Assets may link to **one** HC (resubmit / extra files merge) |
| Ambiguity | Multiple canonical HC candidates → refuse to choose (fail closed) |
| Not 012 | Do not recreate automation **012** |

Re-submits in the same week for the same assignment/slot merge onto the same Homework Completion.

---

## 5. Ready to Send to Make vs Send to Make Trigger

| Field | Role |
|-------|------|
| Formula **`Ready to Send to Make?`** | Readiness indicator (attachment + destination + HC or VF link). **Does not send by itself.** |
| Checkbox **`Send to Make Trigger`** | **Required** for **070a** / **070b** to run. **020** arms it after successful HC link for homework assets. |

Never document the formula alone as the upload trigger.

### 070a OFF (operational)

- Production **070a** is **intentionally OFF** ([AUTOMATION_070A_LAUNCH_DECISION.md](../../v2/AUTOMATION_070A_LAUNCH_DECISION.md)).
- That is an **operational state**, not a repository code defect.
- **070b** remains governed by the current shared upload script logic and live Production configuration.
- **070c** is **not** a substitute for **070a**. **070c** only verifies the **async video** writeback path after **070b**.

Upload destination for Make is **asset upload only** — not parent email.

### 070c — async video writeback verify (Production ON)

| Rule | Detail |
|------|--------|
| Role | Completes the async path after **070b**: Lambda has written fields; **070c** verifies them |
| Production | **Enabled** |
| Does not | Upload files, call Make/Lambda, or replace **070b** |
| Clears trigger | **`Send to Make Trigger`** only after **successful** verification (idempotent if already cleared) |
| Corrected Airtable trigger condition | **`Writeback Complete?` is greater than 0** (formula number). Prefer this over “checked” wording alone |

**070c verifies** (all required for success):

| Field | Expectation |
|-------|-------------|
| **Upload Status** | `Uploaded` |
| **Writeback Complete?** | Truthy / ≥ 1 (trigger: **greater than 0**) |
| **Canonical File URL** | Not empty |
| **Storage Key** | Not empty |
| **File Content Hash** | Not empty |
| **File Hash Algorithm** | `SHA-256` |
| **Uploaded At** | Not empty |
| **Upload Error** | Empty |

---

## 6. Homework XP (064 / 065)

| Step | Automation | Behavior |
|------|------------|----------|
| Prepare | **064** | Requires Satisfactory?, Review Complete, Coach Feedback, Enrollment, Homework, Week, Submission Date. Looks up active XP Reward Rule **`HOMEWORK_COMPLETION`**. Writes Base/Total XP; Award Status = Pending. **Does not create an XP Event.** |
| Award | **065** | Creates/reconciles exactly one event with Source Key **`HOMEWORK_XP\|{Homework Completion ID}`**. XP Source / Bucket use **Homework Completion** per script CONFIG. |

Do **not** claim 064 creates XP Events or that 065 sets Parent Feedback Ready?.

---

## 7. Parent Feedback Ready? and handoffs

| Path | Who sets Ready? | Who sends / hands off |
|------|-----------------|------------------------|
| **Homework** | **078** — native Airtable Update Record (Satisfactory? + Coach Feedback; confirm exact UI conditions in Automations UI) | **071** → Email Handoff Queue → **079** → Hub → Resend |
| **Video** | **Manual** coach/operator check of Video Feedback `Parent Feedback Ready?` (no mark-ready automation in repo) | **073 v4.2 Live** → Email Handoff Queue → **079** → Hub → Resend. Script requires Ready + Feedback Posted? + Coach Feedback + Parent Feedback Sent? unchecked (+ XP/source gates). Make/Gmail do **not** send. |

**065 does not control Homework Parent Feedback Ready?.**

**Writeback ownership:**

| Field family | Owner |
|--------------|-------|
| Video Feedback `Parent Feedback Sent?` / `Sent On` / Delivery Status / Delivery Error / Hub Event ID / Resend Message ID | **Communications Hub** after Resend success/failure (not 073/079) |
| Homework Completions `Parent Feedback Sent?` / `Sent On` | Still Hub source PATCH TBD; **071** does not write them |

---

## 8. Production only

| Rule | Detail |
|------|--------|
| Active base | Production `appn84sqPw03zEbTT` only |
| DEV base / DEV-first paste | **Historical / obsolete** — do not instruct operators to paste or verify in DEV for this package |
| Validation | Offline tests + Mike-approved Production paste / UI attestation |

---

## 9. Related docs

| Doc | Role after this runbook |
|-----|-------------------------|
| [upload-workflow-homework-video.md](../../upload-workflow-homework-video.md) | Upload model + SC-009 photo path (aligned) |
| [data-flow/homework-flow.md](../../data-flow/homework-flow.md) | Short flow summary (aligned) |
| [automation-index.md](../../automation-index.md) | Slot index |
| [integrations/email-send-plane.md](../../integrations/email-send-plane.md) | Hub → Resend authority |
| [audits/video-parent-feedback-ready-workflow-audit-2026-08-17.md](../../audits/video-parent-feedback-ready-workflow-audit-2026-08-17.md) | Video Ready? is manual |
