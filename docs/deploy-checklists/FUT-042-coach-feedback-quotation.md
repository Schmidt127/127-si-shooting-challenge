# Deploy checklist — Coach feedback quotation styling (FUT-042)

**Date:** 2026-09-01  
**Repos:** `127-si-shooting-challenge` (`web/`) + `communications` (Hub email templates)  
**Does not change:** Automation **071** / **073** payloads, Airtable schema, FUT-043 card shell tokens

## Summary

Style parent-facing Coach Feedback as a clear quotation block:

- Indented block with consistent padding
- Smaller italic body text
- Orange left border (`#FF8B00`)
- Light blue-gray background (`#F4F6FB`, Hub `BRAND.cream`)
- Hidden entirely when Coach Feedback is empty (web + defensive email guard)

## Pre-deploy

1. Confirm SC branch `cursor/fut-042-coach-feedback-quote-e772` merged to `master`.
2. Confirm Hub branch with FUT-042 email changes merged to `communications` `main`.
3. Confirm Vercel deployments:
   - Shooting Challenge (`web` root) — athlete profile homework cards
   - Communications Hub — homework + video feedback templates
4. No Airtable automation paste required (presentation-only).

## Controlled proof — website

1. Open an athlete profile with homework that includes Coach Feedback.
2. Expect a labeled **Coach feedback** block with orange left border, light blue-gray background, italic smaller text.
3. Open an assignment with no Coach Feedback — quotation block absent.

## Controlled proof — email

1. Trigger one allowlisted homework feedback send (**071 → 079 → Hub → Resend**) and one video feedback send if available.
2. In HTML source, confirm quotation styles on coach feedback inner block:
   - `border-left: 4px solid #FF8B00`
   - `background-color: #F4F6FB`
   - `font-style: italic`
3. Confirm coach feedback text still escapes unsafe markup (existing XSS tests).

## Out of scope / unchanged

- Outer InfoCard shell styling (FUT-043)
- Weekly summary coach note card
- Automation script logic
