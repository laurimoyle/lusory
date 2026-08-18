# Anonymous game-choice reporting

Status: implementation note, 2026-08-17.

This is the deliberately narrow exception to Lusory's former “no network calls” rule.
It exists to answer two product questions: which game is chosen first, and which games
are chosen most often overall.

## Data boundary

The browser sends only:

- game number (1–15)
- choice source (`first`, `randomizer`, or `shelf`)
- whether this was the first selection of the introduction-day visit

The API increments a weekly aggregate row. There is no raw event table and no player,
account, email, session, IP, user-agent, referrer, timestamp, or fingerprint column.
Counts may inform shelf curation but may never personalize an individual's shelf.

## Weekly report

Vercel calls `/api/cron/choice-report` at 14:00 UTC each Monday. The route reports the
previous complete Monday–Monday week through an owner-only email and requires:

- `CRON_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `REPORT_TO_EMAIL`
- optionally `REPORT_FROM_EMAIL`

The report shows first choices separately from all choices and includes the source split.
It contains aggregate counts only.
