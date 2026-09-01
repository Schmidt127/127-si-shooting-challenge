# Deploy checklist — Homework feedback monitored contact copy (FUT-047)

**Date:** 2026-09-01  
**Repos:** `communications` (Hub template) + SC docs  
**Does not change:** Automation **071** payload, Reply-To / From headers, video feedback, weekly summary, daily submission

## Summary

Replace homework feedback parent email body copy that instructed parents to **reply to this email** (unmonitored notification address) with monitored Fairfield contact:

> Questions about this feedback? Please contact us at schmidt@fairfieldbasketballclub.com.

## Pre-deploy

1. Confirm Hub branch `cursor/fut-047-homework-contact-e772` merged to `communications` `main`.
2. Confirm Vercel Hub deployment includes updated `emails/homework-feedback-email.js`.
3. No Airtable automation paste required for copy-only change.

## Controlled proof

1. Trigger one allowlisted homework feedback send (**071 → 079 → Hub → Resend**).
2. Open received email (HTML + plain text).
3. Expect closing contact line with **schmidt@fairfieldbasketballclub.com** (mailto link in HTML).
4. Expect **no** “Reply to this email if you have questions about the feedback.”
5. Confirm video feedback and other templates unchanged (video may still use reply copy where scoped separately).

## Out of scope / unchanged

- SMTP Reply-To / From notification addresses (deliverability unchanged)
- Automation **071** / **079** script logic
- Video feedback, welcome, daily submission, weekly summary contact copy
