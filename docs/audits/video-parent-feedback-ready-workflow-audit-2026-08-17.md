# Audit — Video Feedback `Parent Feedback Ready?` → Communications Hub

Date: 2026-08-17 (Hub-corrected)
Base: Production `appn84sqPw03zEbTT`
Method: Repository scripts/docs + live Airtable MCP (`list_automations`, `get_automation`, `get_table_schema`)
Scope: What runs when Video Feedback → **Parent Feedback Ready?** is checked

---

## A. Verdict (exact automation)

| Question | Evidence-based answer |
|----------|------------------------|
| What runs when `Parent Feedback Ready?` is checked on **Video Feedback**? | Automation **073** — Create Video Feedback Communications Hub Handoff (`wfl7CPqiuntYBYeFP`) |
| Is that Automation **111**? | **No.** **111** was Grade Band copy; **deleted / absent** from live PROD. Grade Band prep is **013**. Do not use 111 for parent email. |
| Does any automation *set* Video Feedback `Parent Feedback Ready?`? | **No.** Unlike Homework (**078**), Video has **no** “mark ready” automation. Coach/operator checks Ready manually. |
| Create vs update? | **073 creates/reuses one Email Handoff Queue row** (`VIDEO_FEEDBACK\|VIDEO_FEEDBACK\|{vfRecId}`). It does **not** send email and does **not** create XP. |
| Who sends email? | **079** POSTs Communications Hub ingress → Hub renders + Resend. |
| Who marks Sent? | **Not 073.** Downstream Hub/Delivery writeback (open item — confirm who sets VF `Parent Feedback Sent?` / Sent On after Delivery Sent). |

### Critical live-base finding (2026-08-17)

| Item | Live state |
|------|------------|
| **073 deploymentStatus** | **`undeployed`** — primary reason no runs since ~July 1, 2026 |
| Script body in Airtable | **v3.2** Make webhook + Google Drive video URL preference |
| Script in GitHub | **v4.0** Hub handoff (`073-…js`) — no Make/Gmail/Hub ingress |
| **079** GitHub | **v2.1** — accepts `VIDEO_FEEDBACK` event/template/key |
| **071** (homework email) | Also **`undeployed`**; still Make-path (Hub Event Type `HOMEWORK_FEEDBACK` exists but 071 not migrated here) |

---

## B. End-to-end workflow (Communications Hub)

```
Video Feedback enters Ready match
  → 073 validates source/XP/ownership + creates Email Handoff Queue (Ready)
  → 079 dispatches queue row to Communications Hub ingress
  → Hub template VIDEO_FEEDBACK + Resend
  → queue Accepted writeback
  → (open) VF Parent Feedback Sent? / Sent On
```

Upstream context (not triggered by Ready checkbox):

| Step | Automation / system | Trigger | Fields / effect | Next |
|------|---------------------|---------|-----------------|------|
| 1 | **009** | Submission assets from Video Upload | Submission Assets | 013 |
| 2 | **013** | Asset ready for VF | Creates/links **Video Feedback**; Grade Band; upload arming | 070b |
| 3 | **070b** → upload pipeline | Asset Send to Make + Pending | Asset upload | 022 |
| 4 | **022** | Asset Upload Status + child linked | VF: `Upload Status`, `Video URL or Drive Link` (Reviewer → Canonical), `Video Asset File Name`, `Video Asset Uploaded At`; **does not mirror Google Drive onto VF** | Formula `Writeback Complete?` |
| 5 | Coach | Manual | `Coach Feedback`, `Feedback Posted?` | 113 |
| 6 | **113** | VF review / XP prep | Base XP fields; `Ready for XP Automation?` | 114 |
| 7 | **114** | VF Ready for XP | XP Event `VIDEO_SUBMISSION\|{VF id}` | XP rollups unlock 073 XP gates |
| 8 | Coach / operator | Manual | **`Parent Feedback Ready?` = checked** | **073** |
| 9 | **073 v4.0** | Matches conditions (below) | Email Handoff Queue Ready row | **079** |
| 10 | **079 v2.1** | Queue Status Ready | Hub ingress POST | Hub / Resend |
| 11 | Hub | Accepted event | Delivery | Sent writeback (confirm owner) |

**Approved VF `Writeback Complete?` formula (do not change without Mike):**

```airtable
AND(
  {Upload Status} = "Uploaded",
  {Video Asset Uploaded At} != BLANK()
)
```

---

## C. Broken / obsolete / mismatched references

| Reference | Status |
|-----------|--------|
| Automation **111** as Parent Feedback Ready handler | **Wrong** — absent; not parent email |
| Assuming 073 still POSTs Make / Gmail | **Obsolete** — GitHub **v4.0** is Hub queue create only |
| Live Airtable **v3.2** Make script | **Stale** — paste **v4.0** + turn ON |
| Docs saying video feedback “may still use Make” | **Stale** after this cutover — Hub path is source of truth |
| Putting **Reviewer File URL** / **Canonical File URL** on Video Feedback | **Forbidden** — those exist on **Submission Assets** / Homework only |
| Using VF Google Drive File/Folder ID/URL fields | **Forbidden** — obsolete for VF workflow |
| Schema snapshots (2026-07) VF Writeback Drive formula | Historical only; superseded by live/approved formula above |
| `Pasted code(2).ts` | **Not found** as `(2)`. Closest Desktop file `Pasted code.ts` is Enrollment Parent Welcome Make path — **not** 073 |

---

## D. Trigger audit (keep unless Mike revises)

**Automation:** 073
**Table:** Video Feedback (`tblOV6pJDxQFBSQ3q`)
**Trigger type:** When a record matches conditions

| Condition | Verdict |
|-----------|---------|
| Parent Feedback Ready? checked | Correct; must transition into match (typically unchecked→checked) |
| Parent Feedback Sent? unchecked | Correct checkbox “is unchecked / false” config |
| Feedback Posted? checked | Valid product gate (coach posted before parent email) |
| Coach Feedback not empty | Required for Hub payload |
| Enrollment / Submission not empty | Required ownership chain |
| Total Video XP Awarded > 0 | Aligns with XP-first product rule; can block if XP not awarded yet |
| Base XP Awarded > 0 | Same; redundant with Total if Base is always the only component — still valid |

**Do not add to trigger:** parent email, video URL, upload status, Writeback Complete?, Reviewer/Canonical URLs, Google Drive fields. Those stay **script validation** (073) so operators get clear errors instead of silent non-fires.

**Airtable matches-conditions behavior:** does **not** auto-run for rows that already match when the automation is turned ON. Proof test: other conditions true → Ready unchecked → save → Ready checked → confirm run.

**Recommendation:** **Keep trigger unchanged.** Consequence of leaving XP gates: legitimate coach feedback with Ready checked but XP not yet awarded will not fire until XP lands (or Ready is toggled after XP).

---

## E. Script rewrite decision

| Option | Decision |
|--------|----------|
| Keep Make webhook 073 | **Rejected** — Communications Hub is outbound law |
| Patch v3.3 only | **Rejected** — still Make |
| **Rewrite 073 → Hub queue create (v4.0)** | **Required** — done in GitHub |
| Extend **079** for VIDEO_FEEDBACK | **Required** — done (v2.1) |
| New automation number | **Not required** — keep **073** identity |

---

## F. Google Drive inventory (Video Feedback–connected)

### Must not use on Video Feedback (absolute)

Any VF Google Drive File/Folder ID/URL/Name fields; do not recommend or write them in 073/022 VF path.

### Repo references (report — not all purged)

| Location | Nature |
|----------|--------|
| Historical schema snapshots under `airtable/schema/snapshots/**` | Document old VF Writeback formulas that required Drive IDs/URLs |
| **022** | Still reads Drive fields on **Submission Assets** / Homework mirrors; **explicitly does not mirror Drive onto Video Feedback** |
| **070a / 070b** | Asset upload skip-if-Drive-exists (asset table — not VF parent email) |
| **020** and homework scripts | Homework Drive fields — separate from VF |
| Make / deploy checklists / C-013 docs | Legacy upload engine documentation |
| **073 v4.0** | Mentions Drive only as ban + field name `Video URL or Drive Link` (VF writable URL, not a Drive API field) |

**Reviewer File URL / Canonical File URL:** remain on Submission Assets (and homework paths). 073 may **read** asset Reviewer File URL as video-link fallback; must **not** invent those fields on VF.

---

## G. Mike paste / turn-on checklist (Production then PROD)

1. Paste **073 v4.0** (remove Make webhook / sendMode inputs; optional `testMode`, default true).
2. Paste **079 v2.1** (VIDEO_FEEDBACK acceptance).
3. Confirm Communications Hub has template **`VIDEO_FEEDBACK`** and Event Type choice exists on Email Handoff Queue.
4. Turn **073 ON** (`deploymentStatus` deployed).
5. Confirm **079** remains ON for Ready queue rows.
6. E2E on a Schmidt VF: Ready unchecked→checked with Test Mode → expect queue → 079 → Hub (no live parent until Test Mode off / Hub test routing confirmed).
7. Confirm who writes **Parent Feedback Sent?** after Hub Delivery Sent; document if a separate writeback is still missing.

---

## H. Open items

- VF `Parent Feedback Sent?` writeback owner after Hub delivery (073 intentionally does not write it).
- Hub template content/proof for `VIDEO_FEEDBACK` (Hub repo / ops — not this automation script).
- **071** still Make; Hub has `HOMEWORK_FEEDBACK` — separate migration.
- Live Airtable still holds **v3.2** until Mike pastes **v4.0**.
