# Voluntary intake and usability testing

Status: implementation note, 2026-08-17.

This is the “asked, never sensed” research boundary. It permits useful product learning
without creating a behavioral record of a player.

## Separate pools

1. `email_subscribers` stores a normalized email, cohort label, explicit consent time, and
   future unsubscribe state. The temporary beta cohort permits beta and Google Play testing
   invitations; the updates cohort remains for occasional substantive product updates.
2. `referral_responses` stores an intake-context label, asked source category, and voluntary public organization,
   social account, group, or event name of at most 160 characters.
3. `usability_responses` stores the answers submitted from the explicit `?test=1` layer and
   the test version needed to interpret those answers after the interface changes.
4. `beta_testimonials` stores only words the participant explicitly submits after a completed
   first game, their attribution choice, optional name/role, and affirmative public-use consent.

There is no player, account, session, email, or other join key in the referral, usability,
or testimonial tables. The browser sends submissions through separate endpoints. Do not
infer a join from submission time.

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
