# Feature brief — C-025 Zoom recording attendance path (DEV DoD)

**Status:** APPROVED by Mike — 2026-07-14  
**Execution model:** [DEV-EXECUTION-AND-PROMOTION-MODEL.md](../development/DEV-EXECUTION-AND-PROMOTION-MODEL.md)  
**Checkpoint:** `7dcf7c807b0fe38b0fd89ba0f20e65dc3079ba53`

## Business outcome

Athlete who misses live Zoom can earn config-driven recording credit (XP %, gate, Perfect Week, deadline, exclusivity, coach approval) without duplicate credit vs live attendance.

## Approved behavior

Owner decisions #9 (2026-07-13) — Config-driven; Source Key preserved; parent email only after Satisfactory when Config enables it.

## Scope (in)

- DEV cleanup of temp/legacy/probe/draft fields after dependency checks
- Implement and DEV-enable 117a–f (GitHub source + DEV paste/test path)
- DEV-only testable intake path so full credit workflow is E2E without public Fillout/web
- Document remaining activation steps for real user intake
- Promotion package for PROD (do not apply)

## Scope (out)

PROD · archive · real family email · Make prod · public Fillout cutover · Vercel/AWS prod · C-027 Airtable

## Acceptance criteria

- Recording Satisfactory → credit per Effective Config chain
- Live+recording same Enrollment+Meeting → conflict, no double XP
- Deadline formula/view behavior retained
- Idempotent XP Event (no duplicate Source Key)
- Temporary scaffolding removed or explicitly retained+documented
- Regression: Schmidt 4/4 + precedence still green
- Full workflow testable in DEV without public Fillout/web
- Remaining real-intake activation steps documented
- GitHub has scripts + promotion package; local = remote

## External-impact restrictions

No PROD · no archive · no real emails/texts · no paid/external user impact · 117f must not send (DEV webhook off / skipped_safe)

## Definition of done

Per DEV Execution Model §4.
