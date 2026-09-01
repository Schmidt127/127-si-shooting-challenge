# Homework Feedback email redesign — promotion checklist

> **Superseded for operator paste (2026-09-01):** Automation **071 v4.3** is **complete in Production** (Mike paste 2026-09-01). Do **not** re-paste unless regression is proven. Current authority: [`FUT-046-homework-feedback-subject.md`](./FUT-046-homework-feedback-subject.md), [`EMAIL-PASTE-QUEUE-2026-09.md`](./EMAIL-PASTE-QUEUE-2026-09.md), [`CURRENT-TRUTH.md`](../CURRENT-TRUTH.md).

Status: **Complete — Hub deployed; 071 v4.3 Production-updated (2026-09-01)**

## Scope

Branded `HOMEWORK_FEEDBACK` React Email template in Communications Hub, plus Automation
**071 v4.2** payload enrichment for parent-facing URLs, week context, and review status.

## Communications Hub (Vercel)

Repo: `Schmidt127/communications` (`communications-two-blue.vercel.app`)

1. Merge/push to `main` (auto-deploys).
2. Confirm Vercel build succeeds.
3. Controlled test: send one `HOMEWORK_FEEDBACK` ingest with `testMode: true`.
4. Verify Message subject: `Homework Feedback for {Athlete Name}`
5. Verify HTML includes: 127 Sports Intensity header, HOMEWORK REVIEW eyebrow,
   assignment details, coach feedback card, XP metric, submitted-work links or quiz-only copy,
   CTA (`View Submitted Homework` or `Open Homework Page`), shared footer links.

## Airtable — Automation 071 v4.2 *(historical promotion steps)*

> **Historical:** Steps below describe the **2026-08-22 v4.2** promotion. Production now runs **071 v4.3** (FUT-046 subject). See [`071-v4.3-homework-feedback-paste-packet.md`](./071-v4.3-homework-feedback-paste-packet.md) for the final attestation record.

Repo: `127-si-shooting-challenge`

1. Open Production Automation **071 - Create Homework Feedback Communications Hub Handoff**.
2. Paste committed **v4.2** source (docblock through end; skip GitHub header).
3. Confirm input `recordId` mapping unchanged.
4. Trigger one allowlisted test Homework Completion through 071 → 079.
5. Confirm queue Payload JSON includes:
   - `athleteName`, `homeworkTitle`, `coachFeedback`, `totalHomeworkXpAwarded`
   - `weekName` (when Weeks lookup resolves)
   - `reviewStatus: "Satisfactory"`
   - `landingPageUrl`, `shootPageUrl`, `homeworkPageUrl`
   - existing `submittedFiles` / `quizSummary` when applicable

## Notes

- Trigger, recipient, duplicate-send, and Hub routing logic are unchanged.
- Internal `canonical*` IDs remain in payload for ops only; Hub template does not render them.
- Subject line unchanged: `Homework Feedback for {athlete}`.
