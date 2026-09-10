# Curriculum Hub — Submit Authorization Contract

**Status:** SC implementation complete; Hub change required before production cutover.

## Problem

Ingress secret alone allows any Hub instance to submit homework for any enrollment ID. Submit authorization binds each submit to the enrollment (and optional assignment) established at handoff redeem.

## Redeem response (SC → Hub)

`POST /shoot/api/curriculum/redeem` now includes:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `submitAuthorizationToken` | string | yes | Opaque token; 4-hour TTL in shared Redis |
| `enrollmentId` | string | yes | Authorized enrollment |
| `gradeBand` | string | yes | Session band from handoff |
| `assignmentKey` | string | no | When athlete opened a specific assignment |

## Submit request (Hub → SC)

`POST /shoot/api/curriculum/homework/submit`

Additional requirement (either form):

- Header: `X-Curriculum-Submit-Authorization: <submitAuthorizationToken>`
- Body field: `submitAuthorizationToken`

Existing requirements unchanged:

- `Authorization: Bearer <CURRICULUM_INGRESS_SECRET>`
- `Idempotency-Key`
- JSON body per `parseCurriculumSubmitPayload`

## Validation errors

| HTTP | Meaning |
|------|---------|
| 401 | Missing or expired submit authorization |
| 403 | enrollmentId or assignmentKey mismatch |
| 422 | gradeBand mismatch vs session or enrollment |

Idempotent retries with the same `Idempotency-Key` succeed without re-presenting submit auth (SC returns prior receipt).

## Hub implementation checklist

1. Store `submitAuthorizationToken` in Hub session after redeem (memory or encrypted cookie).  
2. Attach token to every submit and upload-staging call (staging should use same enrollment).  
3. On 401 from submit, prompt athlete to re-open homework from SC dashboard (new handoff).  
4. Do not expose token to browser devtools in production builds if avoidable (server-side Hub proxy preferred).
