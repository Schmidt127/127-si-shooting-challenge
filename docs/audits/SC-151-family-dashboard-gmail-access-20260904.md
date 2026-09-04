# SC-151 — Family Dashboard Gmail access (2026-09-04)

**Backlog ID:** SC-151  
**Status:** **MERGED/DEPLOYED**  
**PR:** [#389](https://github.com/Schmidt127/127-si-shooting-challenge/pull/389)  
**Merge SHA:** `a00ef7a5a3291f13550ee9f7e1b14609b01dce65`  
**Production deployment:** `dpl_2mch4scL3c6bgHZgizDbsqPTywbW` (target `production`, commit SHA matches merge)  
**Production URL:** https://www.fairfieldbasketballclub.com/shoot/dashboard/sign-in  
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

## Tests (pre-merge)

- Focused auth Vitest: 25/25  
- Full Vitest: 655 passed | 1 skipped  
- Lint: 0 errors, 5 pre-existing warnings  
- Typecheck / production build: pass  
- Playwright focused auth/sign-in: 13 passed | 4 skipped (`ATHLETE_AUTH_ENABLED` unset)  
- Web CI on PR #389: pass  

## Production smoke (2026-09-04, post-deploy)

| Check | Result |
|-------|--------|
| Deployed SHA equals merge `a00ef7a5` | Pass |
| `/shoot/dashboard/sign-in` loads | Pass (title: Family dashboard sign-in) |
| “Personal Gmail … not accepted” absent | Pass |
| Instruction: “Use the parent email entered on your Shooting Challenge registration.” | Pass |
| Magic link sent for smoke | **Not sent** (by design) |

## Coordinator reconciliation

SC-151 Future Work List row updated to **MERGED/DEPLOYED**. **Do not reopen SC-112** for this defect. If another agent concurrently edits SC-112 / SC-109 rows, keep those edits; only SC-151 status was intentionally changed here.
