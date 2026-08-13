# Request inventory

Draft, round-6 accounts spike. One line per thing that crosses the wire or
lands in a database.

The test each line has to pass: **would we happily print this on the page
where we ask for the address?** If a line would need softening before we
showed it to a player, the line is wrong and the code changes — not the
wording.

## The shape of it

The browser talks to `lusory` and to nothing else. Every request below goes
to a path on the same origin the page came from. There is no analytics
script, no error reporter, no font host, no tag manager, no pixel. The
Content-Security-Policy on the released site allows `connect-src 'self'`
and nothing further, so a request to anywhere else fails in the browser
rather than quietly succeeding.

Behind those paths we run functions that hold a database (Supabase). The
database is a subprocessor. It is the only one. The browser is never told
it exists and never connects to it. Sign-in codes are sent by the same
provider, invoked from our server, which is why the count stays at one.

Row-level security is deny-all on all three tables. Nothing reaches the
data except our own functions.

## What we store, in full

Per player, three things:

- the email address they signed in with
- the date they last opened the game — a **date**, not a time
- the notes they wrote

That is the complete list. There is no fourth thing. Ids exist to join rows
and are not facts about anyone.

Separately, and attached to nobody, up to two answers to two questions
asked once at signup, stamped with the week they were given.

## Endpoint by endpoint

### `POST /api/auth/request` — send me a code

| | |
|---|---|
| Browser sends | the email address, typed by the player |
| We send onward | the address, to the mail provider, so it can send the code |
| We write | **nothing.** No row, no log entry, no record that the address was typed |
| We keep | nothing |

The reply is the same whether that address has an account or not, so this
endpoint cannot be used to find out who plays.

The address is used for the code and for nothing else. There is no mailing
list, no announcement, no "we're back" email, no re-engagement. Transactional
mail only, which here means: the code, and nothing else, ever.

### `POST /api/auth/verify` — here is the code

| | |
|---|---|
| Browser sends | the address, and the code from the email |
| We send onward | both, to the mail provider, to check the code is real |
| We write | one row in `players`: the address, and today's **date** in `last_open`. If a row for that address already exists, the date is the only thing that changes |
| We keep | a cookie in the browser |

The provider hands back an access token and a refresh token when the code
checks out. We read the user id off it and drop both on the floor. Neither
is stored, forwarded, or given to the browser.

The cookie holds a player id and an expiry, signed so it cannot be edited.
It is `HttpOnly` (scripts cannot read it), `Secure` (HTTPS only),
`SameSite=Strict` (does not travel to other sites). It is a session, not a
tracker: it carries no history and no behaviour, and it is the only cookie
the site sets.

### `POST /api/auth/signout`

| | |
|---|---|
| Browser sends | nothing |
| We write | nothing |
| We keep | nothing — the cookie is cleared |

Signing out is not an event. Nobody records that it happened.

### `GET /api/notes`

| | |
|---|---|
| Browser sends | the cookie |
| We write | nothing |
| We return | that player's own notes, and no one else's |

The cookie's player id is the entire boundary. Every query is filtered by
it and by nothing else.

### `POST /api/notes`

| | |
|---|---|
| Browser sends | the cookie, and the text of the note |
| We write | the note, with the **date** it was written, against that player |
| Also | today's date on `last_open` — the same one date, moved |

Notes are written for one reader and read by that same reader. They are
never read individually by us, never scanned, never counted, never
summarised, never used to train anything, and never change what that player
sees next. Nothing in the game reacts to what a note says. A note is a
place to put something down, not a signal.

### `POST /api/intake` — two questions, once

| | |
|---|---|
| Browser sends | up to two short answers: what you came for, where you heard of us |
| We write | one row: the two answers, and the **ISO year-week** |
| We do not write | any player id, any address, any timestamp, anything joinable |

Asked, never sensed. We ask because asking is honest; we do not watch to
find out.

The row is detached at the moment it is written. There is no column to put
a player in, so no later change can quietly start attaching one. The
timestamp is a week, deliberately: a week is too coarse to line an answer
up against the signup that produced it.

Both questions are skippable, and skipping is a real answer to have given.
If both are left blank, the page sends no request at all — not an empty
one.

## What is never collected

Not "collected and discarded" — never asked for in the first place.

- No streaks, scores, badges, levels, or progress
- No count of sessions, no session length, no time of day, no play pattern.
  `last_open` is a date because a timestamp would be play-pattern data
- No record of which difficulty was chosen, or how any round went
- No clicks, scrolls, focus, hovers, or timings
- No IP-based location, no device fingerprint, no advertising id
- No third-party analytics and no third-party error tracking. If a function
  breaks, we learn the status code and the endpoint. Not who, not what they
  typed
- No note bodies and no addresses in any log. Identifying material travels
  in POST bodies only — never in a URL — because the host records the path
  and query string of every request and we do not want it to have them

## Still open

Named here so they are not mistaken for settled.

- **Where `last_open` is stamped in the release.** In this spike it moves on
  sign-in and on saving a note. Whether it should instead move on a
  completed session is a design question, not an implementation one.
- **Mail at production volume.** The built-in mailer is rate-limited to a
  handful of codes an hour. Anything larger means custom SMTP, which is a
  second subprocessor.
- **End-to-end encryption of notes.** Notes are readable by the database
  today. Encrypting them so that they are not is a v2 target.
- **Deletion and export.** A player must be able to take their notes and to
  delete the account outright. Neither endpoint exists yet. Both are
  required before release.
- **The code in the email.** The provider's stock template sends a link
  rather than a six-digit code. A link means the player's browser would
  talk to the provider directly, which the architecture does not allow, so
  the template has to be changed to send the code before this ships.
