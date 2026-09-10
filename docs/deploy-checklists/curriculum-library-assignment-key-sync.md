# Promotion steps — Curriculum Homework Library Assignment Key sync

**Status:** Ready for Mike review  
**Backlog:** Structured Curriculum integration (Assignment Key propagation)  
**Production base:** `appn84sqPw03zEbTT` — **do not execute until Mike approves**

**Rule:** Production changes are not official until this document exists in GitHub. See [v2/04 § Official promotion documentation](../v2/04-ai-development-standards.md#official-promotion-documentation-required).

---

## What changed

Shooting Challenge adds a Hub → SC ingress endpoint so Structured Curriculum lessons automatically populate **Homework Library → Assignment Key**. Without this key, the private dashboard falls back to legacy `/shoot/homework/rec…` instead of Curriculum Hub questions.

| Artifact | Location | Notes |
|----------|----------|-------|
| Sync API | `POST /shoot/api/curriculum/library/sync` | Bearer `CURRICULUM_INGRESS_SECRET` (≥32 chars) |
| Service | `web/lib/curriculum/library-sync-service.ts` | Idempotent create/update; never overwrites a different existing key |
| Dashboard href | `web/lib/curriculum/homework-link.ts` | Valid key → `/api/curriculum/start?assignmentKey=…` |
| Hub caller | **127-si-curriculum-hub** (Mike paste) | Must invoke sync after lesson mints `assignmentKey` |

---

## Authoritative identifier

**Curriculum Hub owns `assignmentKey`** (UPPER_SNAKE with at least one `_`, e.g. `AESOP_CROW_PITCHER`, `SHOT_TRACKER_SETUP`). Shooting Challenge stores it on **Homework Library → Assignment Key** for PHA-linked rows. Submit ingress and assignments API already read this field.

---

## Hub integration contract

### When to call

After Hub creates or saves a Structured Curriculum lesson and knows:

1. `assignmentKey` (Hub-authoritative), and  
2. One target: `homeworkLibraryRecordId`, `phaRecordId`, or `assignmentTitle` (create-only).

Recommended flow on new lesson:

1. Hub mints `assignmentKey` at lesson creation.  
2. Hub calls sync with `assignmentKey` + `homeworkLibraryRecordId` **or** `phaRecordId` from existing PHA/library setup.  
3. Hub verifies via `GET /shoot/api/curriculum/assignments?enrollmentId=rec…` — `contentMissingReason` should be null.

### Request

```http
POST https://www.fairfieldbasketballclub.com/shoot/api/curriculum/library/sync
Authorization: Bearer <CURRICULUM_INGRESS_SECRET>
Content-Type: application/json

{
  "assignmentKey": "NEW_LESSON_ALPHA",
  "phaRecordId": "rec07GWst0ZXBKz7U",
  "assignmentTitle": "Optional title patch",
  "briefDescription": "Optional display blurb",
  "curriculumVersion": 1
}
```

### Response

| HTTP | `status` | Meaning |
|------|----------|---------|
| 201 | `created` | New Homework Library row (requires `assignmentTitle`) |
| 200 | `updated` | Blank key filled on existing row |
| 200 | `unchanged` | Key already matches |
| 409 | — | Duplicate key on another row, or row has different key |
| 422 | — | Invalid payload |

### Backfill existing rows

For PHA-linked library rows with blank keys, Hub (or ops script) calls sync with `assignmentKey` + `phaRecordId` from assignments API (`libraryRecordId` / `phaRecordId` in each assignment).

---

## Production promotion steps

### 1. Vercel (Shooting Challenge)

| # | Action | Done |
|---|--------|------|
| 1 | Merge SC PR to `master` (Mike approval) | [ ] |
| 2 | Confirm Vercel deploy succeeds (root `web`) | [ ] |
| 3 | Confirm `CURRICULUM_INGRESS_SECRET` is set in Production (≥32 chars) | [ ] |

### 2. Curriculum Hub

| # | Action | Done |
|---|--------|------|
| 1 | Add caller on Structured lesson create/save → `POST …/library/sync` | [ ] |
| 2 | Set `SC_CURRICULUM_INGRESS_URL` (or equivalent) to `https://www.fairfieldbasketballclub.com/shoot/api/curriculum/library/sync` | [ ] |
| 3 | Deploy Hub; create test lesson; verify library row gets Assignment Key | [ ] |
| 4 | Backfill any existing blank-key rows via `phaRecordId` | [ ] |

### 3. Smoke test (Production)

| Test | Expected | Done |
|------|----------|------|
| Sync POST with valid `phaRecordId` | 200 `updated` or `unchanged` | [ ] |
| Assignments GET for test enrollment | `assignmentKey` populated; no `contentMissingReason` | [ ] |
| Athlete dashboard "Open Homework" | Redirects to Hub questions (not `/homework/rec…`) | [ ] |

---

## Rollback

- SC: revert merge; endpoint removed; existing Airtable keys remain (no automatic delete).  
- Hub: disable sync caller; manual Assignment Key entry only if emergency (discouraged).
