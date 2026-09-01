# FUT-047 — Homework feedback monitored contact copy

**Backlog:** FUT-047  
**Hub template:** `HOMEWORK_FEEDBACK` (`communications/emails/homework-feedback-email.js`)

## Change

Homework feedback parent emails no longer instruct parents to reply to the unmonitored notification address for feedback questions.

**Before:** “Reply to this email if you have questions about the feedback.”

**After:** “Questions about this feedback? Please contact us at schmidt@fairfieldbasketballclub.com.” (mailto link in HTML)

## Scope

- Homework feedback email body only
- Shared `EmailFooter` component unchanged (no contact copy there)
- Video feedback, welcome, and other templates retain their existing reply/contact copy unless separately authorized

## Promotion

Deploy checklist: [`../deploy-checklists/FUT-047-homework-feedback-contact-copy.md`](../deploy-checklists/FUT-047-homework-feedback-contact-copy.md)
