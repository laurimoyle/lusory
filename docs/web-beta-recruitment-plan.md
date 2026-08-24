# Lusory web-beta recruitment plan

Status: execution plan, 2026-08-24.

Ready-to-send copy and interview prompts: [`web-beta-outreach-kit.md`](web-beta-outreach-kit.md).

## Objective

Begin outside Google Play with the real web product. Recruit 30–40 adults who enter through
the temporary beta gate, choose a game, play it away from the screen, and voluntarily answer
the explicit questions. The Play closed test is a later conversion step, not the starting
point.

The working evidence targets are:

- 30 valid beta emails with a documented asked source mix;
- 20 anonymous first-game selections;
- 12 substantive usability responses across player and professional perspectives;
- 6 voluntary testimonials with affirmative public-use consent;
- 10–15 short professional discovery conversations; and
- a reserve of 18 willing Android testers before beginning the Play test.

These are separate aggregate targets. They are not a linked conversion funnel, because
Lusory deliberately cannot identify which email or referral answer produced a game choice.

## The invitation

Describe Lusory consistently:

> Lusory is a private web beta of fifteen contemplative games played in ordinary life, away
> from the screen. It is not therapy and there is no login or player profile. We are looking
> for adults willing to choose and play one game, then tell us what was clear or confusing.
> Allow roughly 20–30 minutes, although the game itself may send you away from the screen.
> Honest criticism is more useful than a positive review.

Use the normal production URL for open beta invitations. Use the same URL with `?test=1`
for participants who have agreed to complete the structured usability questions.

Do not promise a lifetime free tier, payment, clinical benefit, or future publication. The
appropriate benefit is early access, an opportunity to shape the product, and first notice
of a later Android test. A testimonial is never required and favorable sentiment is never
rewarded.

## Phase 0 — release readiness

Before sending an invitation beyond the owner:

1. Merge and deploy the beta data-path repair.
2. Verify the cold gate, introduction, three-game chooser, one complete game, usability form,
   testimonial form, and aggregate choice report.
3. Confirm that email and referral answers reach separate Supabase tables.
4. Confirm that the public privacy copy describes the deployed behavior accurately.
5. Do not merge the Vercel Web Analytics draft.

## Phase 1 — founding 10

Recruit ten people by direct invitation:

| Perspective | Target | Primary question |
|---|---:|---|
| Everyday potential players | 5 | Did you understand it, find a game, and finish one? |
| Therapists, counselors, or coaches | 2 | Is the non-therapy boundary clear and responsible? |
| Researchers or research-minded students | 2 | Are the claims proportionate and the questions useful? |
| HR, benefits, or wellness professional | 1 | Is the privacy model legible enough to consider a pilot? |

Give all ten the `?test=1` link. Ask clinicians to test Lusory themselves during this phase,
not distribute it to clients. Ask everyone to experience the introduction without advance
explanation, deal again if the first three games do not catch, complete one real game, and
then answer the questionnaire.

Pause recruitment if more than one person encounters the same blocking or comprehension
problem. Repair repeated failures before widening the cohort; do not revise the product from
one person's taste.

## Phase 2 — fifteen additional players

Open one channel at a time for two or three days:

1. Friends-of-friends and existing Chattanooga relationships.
2. A founder post and personal invitations on LinkedIn.
3. Chattanooga community, church, and interest groups.
4. Facebook groups whose administrators explicitly permit a beta/research invitation.
5. Relevant Reddit communities after checking their current rules or receiving moderator
   permission.
6. One 20–30 minute online or local small-group session.

Do not use UTM parameters, tracking links, pixels, referral headers, or separate identifying
codes. The gate asks how the participant found Lusory and optionally which public group,
organization, account, or event. Staggered channel windows let the owner compare asked source
totals with aggregate choice lift without claiming individual attribution.

## Phase 3 — ten professional participants

Approach a leader or administrator and ask them to circulate the invitation; do not scrape
directories or mass-message members.

Initial routes:

- University of Tennessee at Chattanooga Department of Psychology and its student research
  networks: <https://www.utc.edu/arts-and-sciences/psychology>
- Tennessee Mental Health Counselors Association: <https://tca.memberclicks.net/tmhca>
- Southeast Tennessee SHRM for HR, benefits, and workplace-wellness perspectives:
  <https://setnshrm.com/>
- local therapy practices, coaches, community leaders, and existing professional contacts;
- benefits consultants, wellness-platform staff, and insurer innovation contacts reached
  through warm introductions or focused LinkedIn messages.

The professional invitation requests product criticism, not endorsement. Clinicians assess
boundaries, safety, and referral fit. Researchers assess claims and study design. Buyers assess
procurement, implementation, privacy, and whether aggregate-only reporting is sufficient.

## Outreach cadence

### Week 1

- Invite the founding 10 individually.
- Run two short observed sessions, one on a phone and one on a laptop.
- Review only repeated blocking and comprehension failures.

### Week 2

- Open the friends-of-friends, LinkedIn, and one local-community window.
- Send one general beta update to the consented email cohort; never behavior-trigger it.
- Record which public channel was active on each date.

### Week 3

- Open one approved Facebook or Reddit window.
- Begin professional invitations through UTC, counselor, and HR networks.
- Conduct five 15-minute professional conversations.

### Week 4

- Fill missing perspectives rather than chasing raw volume.
- Conduct the remaining professional conversations.
- Review aggregate source, game-choice, usability, and testimonial totals.
- Decide the smallest supported product amendments and whether another web round is needed.

## Owner tracking sheet

Keep an operational sheet containing only outreach activity and aggregate results:

- date and channel opened;
- public group or organization approached;
- permission requested / granted / declined;
- invitations sent or estimated audience;
- aggregate beta emails by asked source;
- aggregate first choices and all selections;
- usability-response count by test version;
- consented-testimonial count;
- professional interviews completed; and
- repeated issue themes after the five-response threshold.

Do not place participant emails, game behavior, testimonial text, or usability free text in
the same sheet. The sheet must not reconstruct the joins the product refuses to create.

## Decision gates

1. **After the founding 10:** repair repeated access, comprehension, navigation, or safety
   failures.
2. **After 30–40 entrants:** choose the smallest evidence-supported interface amendments.
3. **After 10–15 professional conversations:** select B2C, B2B, or B2B2C as the primary
   route; keep the other two as distribution hypotheses.
4. **Before Google Play:** confirm 18 willing Android testers, then begin only when at least
   12 can remain continuously opted in for 14 days.

Official Play testing requirement for affected personal accounts:
<https://support.google.com/googleplay/android-developer/answer/14151465>
