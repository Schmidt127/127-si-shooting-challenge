# Video Feedback email redesign — promotion checklist

Status: **Repository-ready / promotion pending**
Production change: **Not applied by Cursor**

## Scope

Branded `VIDEO_FEEDBACK` React Email template in Communications Hub, plus Automation
**073 v4.3** payload enrichment for program context, review status, and footer URLs.

## Communications Hub (Vercel)

Repo: `Schmidt127/communications` (`communications-two-blue.vercel.app`)

1. Merge/push to `main` (auto-deploys).
2. Confirm Vercel build succeeds.
3. Controlled test: send one `VIDEO_FEEDBACK` ingest with `testMode: true`.
4. Verify Message subject: `Video Feedback for {Athlete Name}`
5. Verify HTML includes: 127 Sports Intensity header, VIDEO FEEDBACK eyebrow,
   video details, coach feedback card, XP metric, `Watch Reviewed Video` CTA when `videoUrl`
   is present, shared footer links.

## Airtable — Automation 073 v4.3

Repo: `127-si-shooting-challenge`

1. Open Production Automation **073 - Create Video Feedback Communications Hub Handoff**.
2. Paste committed **v4.3** source (docblock through end; skip GitHub header).
3. Confirm input `recordId` mapping unchanged.
4. Trigger one allowlisted test Video Feedback record through 073 → 079.
5. Confirm queue Payload JSON includes:
   - `athleteName`, `coachFeedback`, `videoUrl`, `totalVideoXpAwarded`, `weekName`
   - `programName` (when Program Instance resolves)
   - `reviewStatus: "Review complete"`
   - `landingPageUrl`, `shootPageUrl`

## Notes

- Parent video link remains **Video Feedback → Video URL or Drive Link** only (022 writeback).
- Trigger, recipient, duplicate-send, and Hub routing logic are unchanged.
- Internal `videoFeedbackKey` / `canonical*` IDs remain in payload for ops only.
- Subject line unchanged: `Video Feedback for {athlete}`.
