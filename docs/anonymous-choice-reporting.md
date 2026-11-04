# Anonymous game-choice reporting

Status: implementation note, 2026-08-17. **Amended 2026-11-02 (R31): the tally is opt-in.**

This is the deliberately narrow exception to Lusory's former “no network calls” rule.
It exists to answer two product questions: which game is chosen first, and which games
are chosen most often overall.

## Opt-in (R31)

Nothing is sent unless the player says yes. The question is asked once, on the done
screen after the first completed game; it defaults to off and the answer is kept only on
the device (`lusory.tallyOptIn.v1`). The About page shows the current setting and can
change it. `TALLY_ENABLED` in `index.html` disables the request entirely. Because the
question comes after the first completed game, the first choice of a first visit is never
sent, so `first_choices` no longer accumulates. Which game people pick first is a question
for the usability test, not the tally.

## Data boundary

The browser sends only:

- game number (1–15)
- choice source (`first`, `randomizer`, or `shelf`)
- whether this was the first selection of the introduction-day visit

The API increments a weekly aggregate row. There is no raw event table and no player,
account, email, session, IP, user-agent, referrer, timestamp, or fingerprint column.
Counts may inform shelf curation but may never personalize an individual's shelf.

## Weekly report

An owner-only scheduled task reads the aggregate table each Monday morning (Eastern) and
self-delivers the previous complete Monday–Monday week through the owner's connected Gmail.
It shows first choices separately from all choices and includes the source split. The task
is read-only and explicitly excludes `players`, `notes`, `intake`, and individual identifiers.

Email delivery is intentionally outside the deployed app. The app therefore needs no cron
route, mail vendor, recipient address, or additional delivery credentials.
