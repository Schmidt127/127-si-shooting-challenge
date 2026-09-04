# SC-151 — Family Dashboard Gmail access (2026-09-04)

**Backlog ID:** SC-151  
**Branch:** `fix/sc-151-family-dashboard-gmail-access`  
**Related:** SC-112 (closed — do not reopen)

> **SC-112 remains closed. This Gmail-access issue is separate from the multi-child redirect defect.**

## Original warning (production)

Family Dashboard sign-in (`/shoot/dashboard/sign-in`) displayed:

> Use the parent email on your Shooting Challenge registration. Personal Gmail addresses are not accepted for family dashboard access.

## Was Gmail actually blocked?

**Yes — not copy-only.** Server validation rejected `gmail.com` / `googlemail.com` before enrollment lookup.

| Layer | Evidence | Effect |
|-------|----------|--------|
| Copy | `web/components/auth/sign-in-form.tsx` | Told parents Gmail was prohibited |
| Server validation | `web/lib/auth/parent-email.ts` — `BLOCKED_PERSONAL_DOMAINS` + `blocked_personal` | Gmail requests returned HTTP 400 via `magicLinkInvalidEmailResponse()` — never reached enrollment match |
| Docs | `web/docs/athlete-auth-architecture.md` listed Gmail block as a “security control” | Documented the incorrect gate |
| Tests | `web/lib/auth/auth.test.ts` asserted Gmail was blocked | Locked in the defect |
| Client | No client-side domain allow/block beyond HTML `type="email"` | N/A |
| Email delivery | Resend / test-mode / Hub cutover “no personal Gmail” notes | Ops test-safety only — **not** Family Dashboard auth policy |

No separate intentional Family Dashboard product decision was found that requires excluding Gmail. Hub cutover wording (“Prevent emails to personal Gmail”) is disposable-test / Test Mode safety, not parent sign-in eligibility.

## Root cause

SC-112 magic-link validation incorrectly treated personal Gmail as a blocked domain. Intended auth gate is **exact eligible Active enrollment match** on `Parent Email - Cleaned`, not mailbox provider.

## Behavior after fix

- Any syntactically valid parent email (including `@gmail.com` / `@googlemail.com`) may request a magic link.
- Access still requires a matching **Active** enrollment with the same cleaned parent email.
- Known and unknown emails (including unknown Gmail) still receive the same success confirmation (anti-enumeration).
- Rate limits, token hashing/single-use, session HMAC, opaque selection keys, and test-mode recipient forcing remain unchanged.
- Sign-in copy: “Use the parent email entered on your Shooting Challenge registration.”

## Security controls preserved

Uniform confirmation · rate limits · enrollment re-check · no Airtable IDs in URLs · single-use tokens · httpOnly signed session · test-mode recipient override · no auth weakening.

## Tests

See PR / session report for exact pass/fail totals (Vitest auth suite, lint, typecheck, Playwright auth/privacy, production build).

## Coordinator reconciliation

If another agent is editing `docs/127-SI-MASTER-FUTURE-WORK-LIST.md`, integrate the **SC-151** row from this PR (or this note) without reopening SC-112.
