# Voluntary intake and usability testing

Status: implementation note, 2026-08-17.

This is the “asked, never sensed” research boundary. It permits useful product learning
without creating a behavioral record of a player.

## Three separate pools

1. `email_subscribers` stores a normalized email, explicit consent time, and future
   unsubscribe state. It is for occasional substantive product updates only—not reminders,
   streaks, digests, or pressure to return.
2. `referral_responses` stores an asked source category plus a voluntary public organization,
   social account, group, or event name of at most 160 characters.
3. `usability_responses` stores the answers submitted from the explicit `?test=1` layer and
   the test version needed to interpret those answers after the interface changes.

There is no player, account, session, email, or other join key in the referral or usability
tables. The browser sends the three submissions through separate endpoints. Do not infer a
join from submission time.

## Test mode

Adding `?test=1` to the normal product URL reveals a small “Finish usability test” control.
The participant uses the real product and opens the question layer when ready. The app does
not record clicks, navigation history, dwell time, reflection text, referrer headers, UTM
parameters, fingerprints, or a session replay.

Version 1 asks:

- what the participant expected Lusory to be for;
- what was confusing or hard to find;
- whether the opening choice of three felt too small, right, or too large;
- whether the difficulty doors read as equal alternatives or ranked levels;
- what should be kept;
- what should change first; and
- whether returning tomorrow would feel self-explanatory.

## Reading the data

Do not revise the product from a single vivid comment. Review repeated problems alongside
the categorical answers, distinguish comprehension failures from taste, and propose a small
amendment for owner review. Bump `test_version` whenever a tested prompt or flow changes so
responses are never compared as though they described the same interface.
