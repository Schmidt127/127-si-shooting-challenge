# Quiz path decision — HW17 Final Reflection

**Agent:** 11 · **Date:** 2026-07-24  
**Product decision owner:** Mike  
**Machine helpers:** `lib/homework-contracts/quiz-path.js`

Confirmed facts:

- **067 v2.0** supports attachment-less quiz rows (`no_attachment_field` / `no_attachment_yet`)
- PROD **Final Reflection Quiz Submissions** currently has **no** attachment field
- Option A requires field **`Quiz Result PDF`** (multipleAttachments) + Fillout mapping

---

## Option A — Quiz Result PDF (fully specified)

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
| Testing | DEV: create field → map Fillout → run 067 → assets_created → upload ladder → Satisfactory → one XP Event → 067 rerun idempotent |

**Pros:** Full parity with file homework; Drive artifact for coach.  
**Cons:** Schema + Fillout work; depends on 070a being ON for true upload parity.

---

## Option B — Attachment-less completion (fully specified)

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

## Recommendation (not a product decision)

**Recommend Option B** for the current pipeline:

1. PROD quiz table has no attachment field today.  
2. 067 already implements the attachment-less bridge.  
3. Homework Make upload (**070a**) has historically been OFF — Option A’s upload parity is incomplete until that is intentional.  
4. Option A remains the upgrade path when Mike wants PDF/Drive review parity.

**Mike must choose** A or B before PROD schema / Fillout changes for Option A.

Helpers:

```js
recommendQuizPath({ quizTableHasAttachmentField: false })
// → option_b_attachment_less (productDecisionRequired: true)
```
