# Phase D — Current-state analysis: 072 ∪ 074 Weekly Summary Email

**Date:** 2026-07-14  
**Package:** `phase-d-072-074-prep`  
**Status:** Repo analysis only — `READY_FOR_AUTHORIZATION`  
**HEAD baseline:** `6205173` (Lead worktree at prep start)  
**Surviving number (proposed):** **072** (absorbs 074 → library stub)

---

## 1. Exact responsibilities

| Concern | **072** (build v3.7) | **074** (send v2.0) |
|--------|----------------------|---------------------|
| Package build | Yes — branded HTML/text/JSON on WAS | No — reads prepared fields |
| Queue / readiness | Clears `Build Weekly Email Now?`; sets `Weekly Email Ready?` | Requires Ready; clears `Send to Make?` on handoff success |
| Make handoff | Explicitly must **not** send | POSTs JSON webhook to Make |
| Send keys | Writes package + `Weekly Email Revision`; no handoff key | Payload includes `sendType` / `sendTag`; no Airtable send-key stamp (Make owns Gmail success) |
| Status transitions | Build Now→off; Ready→on; Sent→off; Send to Make→**off** (review gate); clears Sent At + Error | Requires Ready + Send to Make + !Sent; on success: Send→off, Error clear, Ready stays on, **Sent left off** |
| Retry | Re-check Build Now | Leaves `Send to Make?` checked on webhook failure |
| Timestamps | Writes `Weekly Email Last Built At` | Writes `handoffBuiltAt` in payload only; does **not** write Sent At |
| Errors | Throws on missing enrollment/week; clears Error on successful build | Writes `Weekly Email Error` on webhook fail; throws |

### 072 — Build (detail)

1. Trigger arm: `Build Weekly Email Now?` checked; `Weekly Email Sent?` unchecked; Enrollment + Week present.
2. Aggregates shooting / homework / Zoom / video / streaks / thresholds / XP buckets from linked + week-scoped rows.
3. Writes subject, recipients CSV (parent + athlete cleaned emails), HTML, text, payload JSON, week label, revision, last-built-at.
4. **Does not** arm Make (`Send to Make?` left unchecked) so staff can review HTML first.
5. **Does not** talk to Make/Gmail.

### 074 — Send (detail)

1. Trigger arm: Ready + `Send to Make?` + !Sent + non-empty Subject / Recipients / HTML.
2. Validates send mode (`test` requires `testRecipientEmail`).
3. Builds Make payload (modern + legacy aliases: `subject`/`html`/`csvemail`).
4. POSTs webhook; on failure retains `Send to Make?` and stamps Error; on success clears Send + Error only.
5. **Make owns** final `Weekly Email Sent?` / Sent At after Gmail success.

---

## 2. Fields read / written

### Weekly Athlete Summary — 072 writes

| Field | Write |
|-------|-------|
| Build Weekly Email Now? | → false |
| Weekly Email Ready? | → true |
| Weekly Email Sent? | → false |
| Send to Make? | → false |
| Weekly Email Sent At | → null |
| Weekly Email Error | → "" |
| Weekly Email Subject / Recipients / HTML / Text / Payload JSON / Week Label / Revision / Last Built At | generated |

### Weekly Athlete Summary — 074 writes

| Field | On success | On webhook fail |
|-------|------------|-----------------|
| Send to Make? | → false | unchanged (retry) |
| Weekly Email Error | → "" | error message |
| Weekly Email Ready? | → true | unchanged |
| Weekly Email Sent? | → false (must stay false) | unchanged |
| Weekly Email Sent At | **never** | **never** |

### Reads (072)

WAS links + rollups; Enrollments (emails, name, grade band, level candidates); Weeks (dates/keys/curriculum); Submissions; Homework Completions; XP Events; Video Feedback; Zoom Meetings; XP Reward Rules; FBC Curriculum - SYNC.

### Reads (074)

WAS: Ready/Sent/Send flags, Enrollment, Week, Subject, Recipients, HTML, Text, Payload JSON, Week Label, sendMode.

---

## 3. Config / secure vars

| Input | 072 | 074 |
|-------|-----|-----|
| `recordId` | required | required |
| `sendModeInput` / `sendMode` | optional (default test) | optional (default test) |
| `makeWebhookUrl` | — | **required** (current throws if blank) |
| `testRecipientEmail` | — | required when sendMode=test |
| `replyTo` | — | optional (default Mike school email) |

No Config-table dependency today. Branding / XP defaults live in 072 `CONFIG`.  
Webhook URL is a **secure automation input** (never commit secrets).

---

## 4. Why both are OFF (Folder 07)

Evidence from architecture inventory, overnight capacity work, and C-011 design audit:

1. **Folder 07 OFF standing rule** during capacity/consolidation — overnight phases A–C forbid enabling Folder 07 OFF automations; 072/074 sit in that folder.
2. **Manual review workflow** — 072 deliberately does not arm send; ops arm `Send to Make?` only after HTML review. Off status prevents accidental mass triggers while season/close-out and C-011 are unfinished.
3. **C-011 not implemented** — no scheduled weekly cadence yet; audit shows historical `should_have_sent_never_built` / `package_built_not_sent` gaps from manual ops, not from a live scheduler.
4. **Real-send risk** — 074 → Make → Gmail. DEV must keep webhook blank or pointed at a log/test scenario before any ON.

---

## 5. Make / Gmail assumptions

| Assumption | Implication |
|------------|-------------|
| Make scenario accepts weekly_summary / WEEKLY_SUMMARY_PARENT | Keep payload aliases (`subject`, `html`, `csvemail`) |
| Make writes Sent? / Sent At only after Gmail module succeeds | Combined script must **not** mark Sent on webhook ACK |
| Test mode routes to `testRecipientEmail` | Live mode uses parent/athlete CSV |
| Webhook failure ≠ Gmail failure | Leave Send armed for retry; do not clear on fail |
| Blank webhook in DEV | Combined v4.0.0 treats as **safe no-send** (hardened vs legacy 074 throw) |

---

## 6. Combine direction (repo)

Evidence supports combining **with conditions**:

- Same table, sequential arms, shared package fields, shared sendMode.
- Ordered BUILD → SEND must be preserved; human review gate optional via leaving Send unchecked after build.
- Survive **072**; absorb **074** into SECTION 22B; library-stub 074 for slot recovery (+1 → 5 free after C2).
