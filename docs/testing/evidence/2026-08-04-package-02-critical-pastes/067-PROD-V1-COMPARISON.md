# Automation 067 — PROD v1.0 vs Repo v2.0 Comparison

| Field | Value |
|-------|--------|
| Date | **2026-08-04** |
| Package | P02 Critical Pastes |
| SC | SC-013, SC-014 |
| PROD base | `appn84sqPw03zEbTT` |
| PROD evidence | Mike: live Automation **067** identifies as **v1.0** / Date **2026-06-28** / quiz trigger / `recordId` / HC bridge / **no XP** |
| PROD body baseline used | Git commit `1fa4e01` file matching those identifiers (Mike’s full paste was not deposited as a file in-chat; byte-identical to that SoT). Archive: [`067-PROD-v1.0-baseline-from-git-1fa4e01.js`](./067-PROD-v1.0-baseline-from-git-1fa4e01.js). Unified diff: [`067-v1.0-vs-v2.0.unified.diff`](./067-v1.0-vs-v2.0.unified.diff) |
| Repo canonical | `airtable/automations/shooting-challenge/067-homework-link-or-create-completion-from-reflection-quiz.js` **v2.0** |
| Install packet | `docs/next-wave/homework-pipeline/067-OPTION-B-PROD-INSTALL.md` |
| Safety | No PROD changes in this package. 067 is **not** an XP writer. Do not disable 020/067 without proven conflict. |

---

## Binary recommendation

# **PASTE v2.0**

| Question | Answer |
|----------|--------|
| Necessary functional upgrade? | **Yes** (Option B package + HC slot stamping + attachment-optional outcomes) — not header-only |
| Docs/header-only? | **No** |
| Incompatible with current PROD schema? | **No** (assumes linked `Enrollments.Grade Band`, which schema confirms) |
| KEEP CURRENT v1.0? | No — leaves Package 2 / SC-013–014 install incomplete |
| REVISE BEFORE PASTE? | **No** for Option B season paste; residual defects are shared with v1 and non-blocking |

---

## 1. Current PROD behavior (v1.0)

As identified by Mike and matching repo SoT at `1fa4e01`:

| Behavior | Detail |
|----------|--------|
| Automation name | `067 - Homework - Link or Create Completion from Reflection Quiz` |
| Version | **v1.0** (Date Written **2026-06-28**) |
| Trigger table | **Final Reflection Quiz Submissions** |
| Input | `recordId` (quiz row) |
| Core job | Resolve active **HW 17** + Week → find/create **one Homework Completion** → link quiz ↔ HC |
| Dedupe | `Enrollment RID \| Week RID \| Homework RID` (`buildDedupeKey`) |
| Status on create | `Completion Status = Submitted`, `Review Status = Ready for Review` |
| Source | `Source System = Fillout` when writable/choice exists |
| Grade Band | Copies from `Enrollments.Grade Band` when present (linked IDs) |
| Does **not** | Create/modify XP Events; mark Satisfactory?; invent assets |
| XP path | Docblock: coach review then **064 then 065** |
| Idempotency | If quiz already has HC link → `skipped_already_linked` and **return** |
| Header note | `Last Synced From Airtable: (new - not yet deployed)` — **stale** if live in PROD |
| Assets / Submissions | **None** — no Item Slot / Asset Slot writes |

**Classification:** Intake/bridge only. **Not** an XP writer.

---

## 2. Exact v1.0 → v2.0 upgrade differences

**Size:** ~541 lines → ~885 lines (~+475 / −131 vs `1fa4e01`).

### 2.1 Functional (material)

| Area | v1.0 PROD | v2.0 repo | Impact |
|------|-----------|-----------|--------|
| Option B product path | Implicit (no assets at all) | Explicit Option B: succeed with **0 assets**; `no_attachment_field` / `no_attachment_yet` | Aligns with approved SC-014 decision + install packet |
| Item Slot / Asset Slot | Not written | Sets **HW1** on create and on link-existing | Aligns HC with HW1 slot used by 020/ops |
| Parent Submission + Submission Assets | Not touched | **Optional** when quiz has attachment file(s): find/create Submission; assets deduped by Source Attachment ID; Upload Status Pending Link; **Send to Make Trigger = false** | Legacy/Option A-compatible; Option B expects empty/no PDF field so this branch idle |
| Already-linked quiz | Hard skip return | Keeps HC id and may still run attachment branch | Safer if PDF added later |
| Tables opened | Quiz, HC, Curriculum, Enrollments | + **Submissions**, **Submission Assets** | Needs those tables present (they are) |
| Outputs | quiz/HC ids | + `submissionIdOut`, `assetIdsOut`; richer `actionOut` | Operator visibility |
| Header | “not yet deployed” | “confirm on PROD paste — Option B path”; Last GitHub Update **2026-07-25** | Removes stale deploy lie |

### 2.2 Documentation / packaging

- Points at `067-OPTION-B-PROD-INSTALL.md`
- Forbids minting placeholder assets; documents Fillout-aware **071**
- Lists attachment field **candidates** (including `Quiz Result PDF`) but Option B forbids **creating** that field

### 2.3 Unchanged (intentionally preserved)

- Trigger table + `recordId`
- HW17 resolution (exactly one Active curriculum row + one Week)
- HC identity: **Enrollment + Week + Homework** RIDs
- No XP / no Satisfactory writes
- Race re-query before HC create
- Soft `setSingleSelect` / `setLink` (skip if field or choice missing)
- Full-table `selectRecordsAsync` for HC (+ curriculum); v2 adds more when attachments present

---

## 3. Is v2.0 necessary / docs-only / schema-incompatible?

| Classification | Verdict |
|----------------|---------|
| Necessary functional upgrade | **Yes** for Package 2: approved Option B install target, **HW1 slot** stamping, explicit zero-asset success outputs |
| Only documentation/header cleanup | **No** |
| Incompatible with PROD schema | **No** |

v1.0 already bridges quiz → reviewable HC without assets, so PROD is not “broken” for a minimal bridge — but leaving v1.0 fails the **approved Option B paste** and omits slot fields the rest of the homework pipeline expects.

---

## 4. Conflict assessment with Automation 020

### Can 020 and 067 process the same underlying homework event?

| Path | Trigger | When it runs |
|------|---------|--------------|
| **067** | Final Reflection Quiz Submissions | Quiz row ready (created / Pending, Enrollment set) |
| **020** | Submission Assets | Homework destination asset ready (purpose HW1/HW2, enrollment linked, etc.) |

- **Same quiz-only Option B event:** Only **067** runs. **020 does not** see the quiz table. **No concurrent processing of the same trigger record.**
- **Same athlete / HW17 assignment via normal asset homework:** **020** can create/link an HC from assets while **067** creates/links from quiz. Different triggers → **possible two HC rows** if both paths fire for the same Enrollment+Week+HW17 context.

**Do not disable 020 or 067** based on this alone — dual-writer is a **product risk** (documented OW-D4 / SC-016), not a proven live conflict. Option B’s “no fake assets” rule keeps quiz path off 020.

### Dedupe identities compared

| Writer | Match key (script) |
|--------|--------------------|
| **067** | `Enrollment RID + Week RID + Homework RID` |
| **020** | `Submission RID + Homework RID + Item/Asset slot (HW1/HW2)` |
| Formula `Homework Completion Key` | `ARRAYJOIN(Enrollment)\|ARRAYJOIN(Week)\|ARRAYJOIN(Homework)` — **display only**; scripts do **not** match on it (`HC-IDENTITY-AUDIT.md`) |

Keys **differ**. 067 will **not** find an 020 HC by Submission+slot alone (and vice versa) unless Enrollment+Week+Homework also match and 067’s finder sees that triple — 020 HCs usually have Enrollment+Week+Homework set, so **067 can link_existing to an 020-created HC** if the triple matches. 020 will **not** find a 067-only HC by Submission+slot if Submission link/slot shape differs.

### Canonical unique identity for a Homework Completion

| Layer | Canonical rule |
|-------|----------------|
| Product / formula | One logical completion per **Enrollment + Week + Homework** (formula mirrors that with display names) |
| 067 script | RID triple Enrollment + Week + Homework — **preserved** |
| 020 script | Submission + Homework + slot (asset path) |
| Newer canonical? | **No** — repo still preserves Enrollment + Week + Homework for quiz; do not invent a third key |

---

## 5. Fields 067 requires / expected types

### Always (v1 and v2)

| Table | Field | Expected type | Role |
|-------|-------|---------------|------|
| Final Reflection Quiz Submissions | Enrollment | link → Enrollments | Athlete identity (exactly one) |
| Final Reflection Quiz Submissions | Homework Completion | link → Homework Completions | Bridge idempotency |
| Final Reflection Quiz Submissions | Submitted At | date/datetime | Optional → HC Submission Date |
| Final Reflection Quiz Submissions | Processing Status | single select | Processed / Needs Review / Error |
| Final Reflection Quiz Submissions | Processing Error | text | Notes |
| FBC Curriculum - SYNC | Homework Number | single select (or select-like) | Must include **HW 17** |
| FBC Curriculum - SYNC | Active? | checkbox | Active HW17 filter |
| FBC Curriculum - SYNC | Week | link → Weeks | Exactly one |
| Homework Completions | Enrollment, Week, Homework | links | Identity + create |
| Homework Completions | Grade Band | link → Grade Bands | Optional stamp from enrollment |
| Homework Completions | Final Reflection Quiz Submissions | link | Bidirectional link |
| Homework Completions | Source System | single select | Fillout |
| Homework Completions | Item Type | single select | Homework |
| Homework Completions | Completion Status | single select | Submitted |
| Homework Completions | Review Status | single select | Ready for Review |
| Homework Completions | Submission Date | date | From quiz |
| Enrollments | Grade Band | **link → Grade Bands** | See §6 |

### Added / used by v2.0

| Table | Field | Expected type | Role |
|-------|-------|---------------|------|
| Homework Completions | Item Slot, Asset Slot | single select | **HW1** |
| Homework Completions | Submission Assets, Submissions - Linked | links | Optional asset path |
| Submissions | Enrollment, Week, Homework Name 1, HW Sub 1, Submission Assets | links / attachment | Only if files present |
| Submission Assets | Enrollment - Linked, Submission - Linked, Airtable Attachment, Source Attachment ID, purpose/type/slot, Upload Status, Send to Make Trigger, Homework Completions | mixed | Only if files present |
| Quiz | attachment candidates | multipleAttachments | Optional; Option B: absent or empty |

Missing writable fields or missing select choices are **silently skipped** (both versions) via `setSingleSelect` / `setLink` / `isWritable`.

---

## 6. `Enrollments.Grade Band` type

**Confirmed linked-record** (prefers single record) to table **Grade Bands**.

Evidence: `airtable/schema/snapshots/schema_doc_appn84sqPw03zEbTT_20260628_082345.md` (Enrollments → Grade Bands via Grade Band); also `docs/next-wave/homework-pipeline/020-PROD-VS-REPO-COMPARISON.md`.

Script assumption (`linkedIds` on Grade Band) is **correct**.

---

## 7. Homework XP ownership — is “064 then 065” current?

**Yes.**

| Automation | Repo version | Role |
|------------|--------------|------|
| **064** | prepare homework XP award (~v12.1 / 2026-06-17) | Sets XP amount / prep after Satisfactory? — **does not create XP Event** |
| **065** | **v9.2** create homework XP event | Creates `HOMEWORK_XP\|{homeworkCompletionId}` after prep |

067 must never award XP. Install packet + both script headers still say **064 → 065** after coach review. **071** remains parent-email (Fillout-aware), not XP.

---

## 8. Defect review

| Defect | v1.0 | v2.0 | Severity for Option B paste |
|--------|------|------|------------------------------|
| Multiple matches use `matches[0]` | Yes (HC) | Yes (HC + Submission matches) | Medium if duplicates already exist; low if uniqueness holds |
| Required missing fields silently skipped | Yes | Yes | Medium — incomplete HC possible without throw |
| Required missing single-select choices silently skipped | Yes | Yes | Medium — same pattern |
| Full-table `selectRecordsAsync` | HC + curriculum | + Submissions/Assets when attachments | Medium scale; acceptable for current PROD size; watch growth |
| Stale `not yet deployed` header | **Yes** | Fixed | Low — fixed by paste |
| `no_attachment_field` errorOut text mentions creating Quiz Result PDF | N/A | Present | Low — Option B must **not** create that field; statusOut still success |
| Last-resort “any attachment field” on quiz | N/A | Yes | Low if attachments empty; avoid putting files on unrelated quiz attachment fields |

None of the above alone forces **REVISE BEFORE PASTE** for the approved Option B season path.

---

## 9. Required fixes (before / after paste)

### Before paste (Mike)

1. Confirm live script header still **v1.0** (optional: paste Mike’s live body into evidence and re-diff if unsure).
2. Confirm trigger still Final Reflection Quiz Submissions + `recordId`.
3. Confirm exactly one Active **HW 17** curriculum row with Week.
4. Do **not** create `Quiz Result PDF`.
5. Keep **020** as-is; do not disable.
6. Keep 067 as bridge only (no XP).

### On paste

1. Paste repo **v2.0** from production docblock through end (skip GitHub header).
2. Confirm header shows **Version: v2.0** and Option B language.
3. Leave **ON** for Schmidt testing per install packet.

### After paste (Schmidt)

See §10. No code revise required unless T1–T2 fail.

---

## 10. Controlled Schmidt test plan (post-paste)

Enrollment: `recgP9qZYjAhE7NXm` only. Follow `067-OPTION-B-PROD-INSTALL.md` T1–T2 (+ optional T3).

| Test | Steps | Expect |
|------|-------|--------|
| **T1** Option B | Quiz row: Enrollment=Schmidt, score fields set, **no** attachment, Processing Pending if used | 067: `success` + `created_new` or `linked_existing` + `no_attachment_*`; **one** HC; Item/Asset Slot **HW1** if fields exist; **0** assets; Ready for Review |
| Coach → XP | Mark Satisfactory? + Review Complete | Exactly **one** Homework XP via **064→065**; 067 unchanged |
| **T2** Rerun | Re-run 067 / second quiz same Enr+Week+HW17 | Same HC; no second HC; no second XP after already awarded |
| **T3** Blank enrollment | Empty Enrollment | `needs_review`; no orphan HC |
| **Negative** | Do not enable 070a for this path | No Make homework upload required |

Evidence folder for results: `docs/testing/evidence/2026-08-04-package-02-critical-pastes/` (add Schmidt RIDs after run).

---

## 11. Summary table

| Topic | Result |
|-------|--------|
| Current PROD | **067 v1.0** quiz→HC bridge; no XP; no assets; stale “not yet deployed” header |
| Upgrade nature | **Functional** Option B + HW1 slots + optional asset branch — not docs-only |
| Schema | Compatible; Grade Band is linked |
| vs 020 | Different triggers/keys; quiz-only Option B does not fire 020; dual HC risk only if asset path also used for HW17 |
| Canonical HC identity | Preserve **Enrollment + Week + Homework** (067); formula is display-only |
| XP ownership | **064 then 065** still current |
| Recommendation | **PASTE v2.0** |
