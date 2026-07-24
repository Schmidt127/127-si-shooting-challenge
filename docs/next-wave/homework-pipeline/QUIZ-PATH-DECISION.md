# Quiz path decision — HW17 Final Reflection

**Agent:** 11 · **Date:** 2026-07-24  
**Product decision owner:** Mike  
**Status:** APPROVED — **Option B** (attachment-less completion)  
**Machine helpers:** `lib/homework-contracts/quiz-path.js`

Confirmed facts:

- **067 v2.0** supports attachment-less quiz rows (`no_attachment_field` / `no_attachment_yet`)
- PROD **Final Reflection Quiz Submissions** currently has **no** attachment field
- Option A would have required field **`Quiz Result PDF`** (multipleAttachments) + Fillout mapping — **not approved**

---

## Approved decision (2026-07-24)

| Field | Value |
|-------|--------|
| **Choice** | **Option B — attachment-less completion** |
| **Automation** | Use existing **067** attachment-less processing path |
| **Do not** | Create a **Quiz Result PDF** field |
| **Do not** | Create a fake attachment / placeholder Submission Asset |
| **XP** | Still **064 → 065** after coach Satisfactory + Review Complete (067 never awards) |

Recorded on completion master **SC-014** → status **Built in Repository** (repo behavior + contract complete; PROD install/live test still open under SC-013).

**No Automation 067 repository correction required** for this decision — the attachment-less path already exists.

---

## Option A — Quiz Result PDF (not chosen)

| Item | Spec |
|---|---|
| Exact Airtable field | `Final Reflection Quiz Submissions` → **`Quiz Result PDF`** |
| Field type | `multipleAttachments` |
| Fillout mapping | Form file/PDF export → `Quiz Result PDF` on create/update |
| 067 behavior | When files present: find/create parent Submission; create Submission Assets (dedupe `Source Attachment ID`); link assets ↔ HC; Upload Status `Pending Link`; Send to Make Trigger false until armed |
| Asset creation | Yes — one asset per file |
| Upload | **020** (if asset triggers) / **070a** → **022** writeback |
| Review | Coach reviews file via Drive URL on HC + quiz Score fields |
| XP | **064 → 065** only; 067 never awards |

**Status:** Rejected for current season path. Remains a possible future upgrade only if Mike later wants PDF/Drive review parity.

---

## Option B — Attachment-less completion (**APPROVED**)

| Item | Spec |
|---|---|
| Existing 067 path | v2.0 completion bridge with `no_attachment_field` when attachment candidates absent |
| Review display | Interface/view must show quiz **Score** / **Target Score Met?** on HC or linked quiz row — **no Drive URL required** |
| Score/result presentation | Keep auto-score on quiz table; HC Review Status = Ready for Review |
| XP | **064 → 065** after coach Satisfactory + Review Complete |
| No fake attachment | Do **not** mint empty Submission Assets or placeholder files |
| Testing | PROD/DEV: 067 → HC created, 0 assets → coach review → one XP → 071 without asset trigger requirement |

**Pros:** Matches current PROD schema; ships without OMNI field create; already coded.  
**Cons:** No file artifact in Drive; coach UX must be score-centric.

---

## Next steps (ops / install — not decision)

1. Confirm PROD **067** paste matches repo attachment-less path (install/update if drifted).  
2. Coach review Interface/view shows Score / Target Score Met? without Drive URL.  
3. Schmidt live test: 067 → HC, 0 assets → review → one XP.  
4. Do **not** create `Quiz Result PDF` or fake attachments.

Helpers (historical recommendation; decision now locked):

```js
recommendQuizPath({ quizTableHasAttachmentField: false })
// → option_b_attachment_less
```
