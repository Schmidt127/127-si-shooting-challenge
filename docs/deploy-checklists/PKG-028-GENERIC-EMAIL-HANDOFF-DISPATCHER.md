# PKG-028 — Generic Email Handoff Dispatcher

**Status:** Post-app improvement; not approved or installed in Production
**Automation:** 079 v3.0
**Production blocker:** No
**Last updated:** 2026-08-12

## Scope

Replace event-specific WELCOME / DAILY_SUBMISSION branching in Automation 079
with the universal envelope contract in
[`../contracts/EMAIL-HANDOFF-QUEUE-ENVELOPE-v1.md`](../contracts/EMAIL-HANDOFF-QUEUE-ENVELOPE-v1.md).
No email producer, Communications Hub processor, template, schema, or secret is
changed by this package.

## Required review before promotion

1. Confirm current WELCOME and DAILY_SUBMISSION producers create canonical keys,
   or are covered by the documented legacy WELCOME compatibility rule.
2. Confirm Hub processors still reject unsupported event/template/payload
   combinations before creating a Message or Delivery.
3. Run the 079 offline suite and existing 076/canonical email regressions.
4. In an authorized non-delivery test, prove:
   - existing WELCOME acceptance/replay;
   - existing DAILY_SUBMISSION acceptance/replay;
   - one synthetic future envelope reaches a rejecting test Hub without a
     provider Delivery;
   - malformed key and duplicate-recipient cases do not call the Hub.
5. Mike reviews the evidence and explicitly approves Production replacement.

## Safe Production rollout

1. Preserve the existing 079 v2.0 source and current queue evidence.
2. Pause the 079 trigger only for the paste window; do not alter producers.
3. Paste the committed v3.0 source into the existing 079 slot, omitting only the
   GitHub header.
4. Preserve dynamic `recordId` and existing `ingressSecret` mappings.
5. Re-enable 079 and test one already-approved allowlisted queue event.
6. Verify exactly one Hub Event, Message, Delivery, provider ID, and attempt.
7. Replay the same handoff key and verify no second Delivery.
8. Keep 077 and legacy Make/Gmail paths OFF.

## Rollback

Turn 079 OFF, preserve the failed queue row and Last Error, and restore the
previous committed v2.0 script. Do not create replacement queue rows, alter
handoff keys, enable legacy senders, or change Hub secrets as rollback steps.

## Explicit exclusions

- No Production Airtable access or paste is part of this repository package.
- No Hub deployment or new event processor is included.
- No schema or single-select option is added.
- No HOMEWORK_FEEDBACK, VIDEO_FEEDBACK, WEEKLY_SUMMARY, or other source producer
  is implemented here.
