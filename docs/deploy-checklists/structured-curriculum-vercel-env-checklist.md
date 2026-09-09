# Structured Curriculum — Vercel / Hub Environment Checklist

**Non-secret reference.** Never commit values. Configure in Vercel dashboard and Curriculum Hub project separately.

## Shooting Challenge (`web/` on Vercel)

| Variable | Dev | Preview | Production | Notes |
|----------|-----|---------|------------|-------|
| `CURRICULUM_HUB_URL` | Optional | Required | Required | HTTPS origin only in prod |
| `CURRICULUM_HANDOFF_SECRET` | Required for redeem | Required | Required | ≥32 chars; shared with Hub |
| `CURRICULUM_INGRESS_SECRET` | Required for submit/assignments/staging | Required | Required | ≥32 chars; **different** from handoff secret; shared with Hub |
| `UPSTASH_REDIS_REST_URL` | Optional (memory fallback locally) | Required | Required | Handoff + submit auth store |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Required | Required | Same Upstash instance as handoff |
| `CURRICULUM_STAGING_S3_BUCKET` | Optional | Recommended | Recommended | Private staging bytes |
| `AWS_ACCESS_KEY_ID` | If S3 staging | If S3 | If S3 | Scoped to staging prefix only |
| `AWS_SECRET_ACCESS_KEY` | If S3 staging | If S3 | If S3 | Never commit |
| `AWS_REGION` | If S3 staging | If S3 | If S3 | e.g. `us-east-2` |
| `CURRICULUM_UPLOAD_MAX_BYTES` | Optional | Optional | Optional | Default 8MB |
| `AIRTABLE_API_TOKEN` | Required for live routes | Required | Required | Server-side only |
| `AIRTABLE_BASE_ID` | Required | Required | Required | Shooting Challenge base |

## Curriculum Hub (separate repository / Vercel project)

| Variable | Must match SC? | Purpose |
|----------|----------------|---------|
| `CURRICULUM_HANDOFF_SECRET` | **Same value** | Redeem handoff from SC |
| `CURRICULUM_INGRESS_SECRET` | **Same value** | Submit, assignments, upload-staging |
| SC public base URL + `/shoot` | N/A | Handoff redirect target |

## Pre-staging dependencies

1. Upstash Redis reachable from SC serverless functions  
2. Hub updated to store and forward `submitAuthorizationToken`  
3. Ingress + handoff secrets rotated together if either leaked  
4. Airtable DEV base with Homework Attempts / Responses tables  

## Must not commit

- Any `*_SECRET` value  
- `AIRTABLE_API_TOKEN`  
- AWS keys  
- Upstash tokens  
