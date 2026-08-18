# Lusory beta gate and go-to-market baseline

## Release mode

The web beta is temporarily gated. A visitor must provide:

1. an email for beta invitations, occasional product updates, and a later Google Play test invitation;
2. where they found the beta link;
3. optional public detail naming the subreddit, Facebook group, organization, account, or event.

The email and referral answer are sent in separate requests and stored in separate tables with no shared identifier. The browser stores `lusory.betaAccess.v1=yes`; it stores no email or referral answer. Set `BETA_GATED` to `false` in `index.html` to retire the gate and restore the optional signup model without deleting any beta data.

The gate does not create an account or login. It does not collect referrer headers, UTM parameters, fingerprints, routes, clickstreams, or player histories.

## Testimonial rule

After a new beta visitor completes a first game, Lusory offers one voluntary testimonial form. It is not a rating and does not affect access. The submission is stored separately from email, referral, game-choice counts, usability answers, and private reflection.

Public use requires explicit consent and an attribution choice. Anonymous attribution is allowed. Do not reward positive sentiment; any thank-you should compensate participation, not praise.

## Google Play correction and target

For a personal Play Console account created after November 13, 2023, Google currently requires a closed test with **at least 12 opted-in testers for 14 continuous days** before production access can be requested. This is separate from the **US$25 one-time developer-account registration fee**. Testers need Google or Google Workspace accounts.

- Official requirement: <https://support.google.com/googleplay/android-developer/answer/14151465>
- Test-track setup: <https://support.google.com/googleplay/android-developer/answer/9845334>
- Developer registration: <https://support.google.com/googleplay/android-developer/answer/6112435>

Recruit 30–40 web-beta entrants, seek 20 people who choose at least one game, and maintain a reserve of at least 18 willing Android testers. The operational floor is 12 continuously opted in; the larger reserve protects the 14-day run from attrition. Website participation does not itself satisfy Google's closed-test requirement.

## Beta recruitment lanes

### Players and potential B2C subscribers

- Reddit: research-friendly or product-feedback communities, including r/SampleSize where the post fits current rules; ask moderators before posting in wellbeing communities.
- Facebook: therapist, coaching, contemplative-practice, local Chattanooga, and evidence-based wellbeing groups; obtain administrator permission and use a separate source link description for each post.
- LinkedIn: short founder posts plus direct invitations to people who already discuss playful wellbeing, behavior change, digital wellness, or preventive mental health.
- Existing relationships: therapists, church/community leaders, coaches, friends, and former colleagues who can invite one appropriate tester rather than broadcasting indiscriminately.
- Small live sessions: a 20-minute online or Chattanooga workshop in which participants play one game away from the screen and then answer the usability questions.

Every public post should say that Lusory is formative and preventive, not therapy, and should ask for a real test rather than a favorable review.

### Professional discovery cohort

Recruit a deliberately mixed group alongside general players:

- 8–12 therapists, counselors, and coaches;
- 5–8 wellbeing or behavioral-science researchers;
- 5–8 employer-benefits, insurer, or wellness-platform buyers.

Ask them to evaluate different questions. Clinicians assess boundaries, safety, and referral fit. Researchers assess claims and study design. Buyers assess deployment, procurement, privacy, and whether aggregate-only reporting is sufficient.

## What the beta can measure

- beta emails by cohort;
- referral totals by source and optional public detail;
- anonymous first-game choices and total game selections;
- submitted usability answers;
- explicitly consented testimonials.

Because these pools are intentionally unjoined, Lusory cannot identify which email, referral source, or person completed a game. Compare cohort-level totals over the same recruitment window; do not claim individual conversion or source-to-play attribution.

## Route-to-market decision

Run B2C validation and B2B discovery in parallel, then choose the primary route from evidence:

| Route | Evidence to seek | Initial offer |
|---|---|---|
| B2C | repeat voluntary use, willingness to join the Android test, language showing personal value | low-cost consumer subscription after the beta |
| B2B | therapists or coaches want a bounded adjunct they can recommend without monitoring clients | professional referral pack or practice license, with no client dashboard |
| B2B2C | employers, insurers, or wellness platforms value a private preventive-play library and accept aggregate-only reporting | time-boxed cohort pilot with aggregate reporting and no individual surveillance |

Do not build three products at once. After the first 30–40 entrants, conduct 12–15 professional interviews and choose one primary route. Keep the other two as distribution channels until paid demand proves otherwise.

## Beta exit checklist

1. At least 30 valid beta emails and a documented source mix.
2. At least 12 high-quality usability responses across player and professional perspectives.
3. At least 6 usable, explicitly consented testimonials, with no target for positive sentiment.
4. A reserve of at least 18 confirmed Android testers with Google accounts before starting the 14-day closed test.
5. One primary route-to-market selected from interview and behavior evidence.
6. Turn `BETA_GATED` off, restore optional email capture, and retain the beta cohort label for follow-up invitations.

