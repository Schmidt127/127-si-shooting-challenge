# Structured Curriculum — Hub Production cutover

**Scope:** Curriculum Hub (separate repo / Vercel project) + Hub Airtable  
**SC repo status:** PR **#504** merged; curriculum routes live on Production (401 without secrets)  
**Blockers at prep (2026-09-10):** Hub Production redeem + submit URLs empty · ~~Submission Outbox retry fields~~ **DONE — Mike UI 2026-09-10**  
**Live E2E:** Not run — requires steps below + disposable test enrollment

---

## Prerequisites (Shooting Challenge — already on Production)

Confirm SC-side endpoints respond (not 404):

```bash
curl -sS -o /dev/null -w "health %{http_code}\n" \
  "https://www.fairfieldbasketballclub.com/shoot/api/health"

curl -sS -o /dev/null -w "redeem %{http_code}\n" -X POST \
  "https://www.fairfieldbasketballclub.com/shoot/api/curriculum/redeem"

curl -sS -o /dev/null -w "submit %{http_code}\n" -X POST \
  "https://www.fairfieldbasketballclub.com/shoot/api/curriculum/homework/submit"
```

Expected: health **200**; redeem/submit **401** (auth required, not 404).

SC Vercel env reference: [`structured-curriculum-vercel-env-checklist.md`](./structured-curriculum-vercel-env-checklist.md)

---

## Mike — Hub Vercel Production

Open the **Curriculum Hub** Vercel project → Settings → Environment Variables → **Production**.

### 1. Shared secrets (must match Shooting Challenge Production)

| Variable | Must equal SC Production? |
|---|---|
| `CURRICULUM_HANDOFF_SECRET` | **Yes** — same value |
| `CURRICULUM_INGRESS_SECRET` | **Yes** — same value (different from handoff secret) |

Rotate both together if either leaked.

### 2. Shooting Challenge endpoint URLs (empty at 2026-09-10 prep)

Set Production values to Fairfield Shooting Challenge (exact env names per Hub repo — verify in Hub `.env.example`):

| Setting | Required Production value |
|---|---|
| Redeem URL | `https://www.fairfieldbasketballclub.com/shoot/api/curriculum/redeem` |
| Submit URL | `https://www.fairfieldbasketballclub.com/shoot/api/curriculum/homework/submit` |
| Upload URL | Verify still correct (was correct at prep) |

Redeploy Hub Production after changes.

### 3. Submit authorization (Hub code — PR #21)

Hub must implement contract [`docs/interfaces/curriculum-hub-submit-authorization.md`](../interfaces/curriculum-hub-submit-authorization.md):

1. After redeem, store `submitAuthorizationToken` server-side (session or encrypted cookie).
2. Send on every `POST .../homework/submit` via header `X-Curriculum-Submit-Authorization`.
3. On submit **401**, prompt athlete to re-open homework from SC dashboard (new handoff).

---

## Hub Airtable — Submission Outbox retry fields

**COMPLETE (2026-09-10)** — Mike added five fields on **Submission Outbox** in Curriculum Hub base:

Retry Payload · Delivery Attempt Count · Last Attempt At · Delivered At · Processing Claim

Checklist: [`HUB-SUBMISSION-OUTBOX-RETRY-FIELDS.md`](./HUB-SUBMISSION-OUTBOX-RETRY-FIELDS.md)

**Note:** Retry payload is **JSON, not encrypted** per prep review of Hub PR #21. Agent did not live-verify field IDs — Hub PR #21 merge + E2E is authority.

---

## Hub PR #21 (GitHub)

| Item | Prep finding |
|---|---|
| State | Open, mergeable |
| Typecheck / tests / build | PASS |
| Lint | Failed on purity rule — resolve before merge if blocking team policy |
| Protected diagnostics route | Not found in Hub repo |

Merge Hub PR when lint policy satisfied and Production env from steps above is staged.

---

## Disposable live E2E (when unblocked)

1. Mike allowlisted email + disposable enrollment in Production.
2. Athlete opens homework from SC dashboard → Hub handoff → redeem succeeds.
3. Complete one structured homework submit → Homework Completion + Attempt/Response records created.
4. Capture evidence; do not use production athlete PII in docs.

**Not executed** in agent session — no authorized live submission.

---

## References

- Prep audit: [`docs/audits/AT-HOME-RELEASE-PREP-2026-09-10.md`](../audits/AT-HOME-RELEASE-PREP-2026-09-10.md)
- SC structured homework audit: [`docs/audits/structured-homework-pre-vercel-work.md`](../audits/structured-homework-pre-vercel-work.md)
- SC-172 production verify: [`docs/audits/SC-172-PRODUCTION-VERIFY-20260910.md`](../audits/SC-172-PRODUCTION-VERIFY-20260910.md)
