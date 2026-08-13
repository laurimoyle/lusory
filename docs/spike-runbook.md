# Accounts spike — live loop runbook

Branch-only. The part of the round-6 acceptance that has to be driven from a
browser that can reach the preview.

## Why it is not already done

The session that built this had an egress policy that refused `*.vercel.app`
and `*.supabase.co` outright — a 403 at the proxy, on every request, for a
browser as well as for curl. The deployed endpoints could not be called from
it at all: not the loop, not a single POST. Everything not requiring those
two hosts was done and is green.

A fresh session with open egress drives what follows.

## Before you start

Preview:
`https://lusory-git-claude-accounts-spike-lauri-moyle-s-projects.vercel.app/spike.html`

Vercel Authentication on previews is off, so the page loads without an SSO
round trip.

Use the address the oracle is pinned to. Any other address gets a `404` from
`/api/spike-otp` — that is the guard working, not a fault.

Open the network panel before step 1 and tick "preserve log" so signing out
does not clear it.

The mailer is limited to a handful of codes an hour, which is why
`/api/spike-otp` exists: it mints a code without sending mail. Step 1 still
exercises the real mail path once, deliberately. After that the oracle
carries the loop, so the rate limit never becomes the thing under test.

## The loop

1. **Request a code for real.** Type the address, press
   `POST /api/auth/request`. Expect `200 {"ok":true}`. This is the one step
   that sends actual mail — it is here to prove that path works, not to
   supply the code.
2. **Mint a code.** Press `POST /api/spike-otp`. Expect `200` and the code
   field to fill itself in. No mail is sent by this step.
3. **Verify.** Press `POST /api/auth/verify`. Expect `200 {"ok":true}` and a
   `lusory_session` cookie — `HttpOnly`, `Secure`, `SameSite=Strict`.
4. **Save a note.** Type something, press `POST /api/notes`. Expect `200`
   and the note echoed back with a `created_on` **date** and no time.
5. **List.** Press `GET /api/notes`. The note is there, alone.
6. **Sign out.** Press `POST /api/auth/signout`, then `GET /api/notes` again:
   expect `401 {"error":"not signed in"}`. That refusal is the step.
7. **Sign in again.** Press `POST /api/spike-otp` for a fresh code, then
   `POST /api/auth/verify`.
8. **Notes persisted.** Press `GET /api/notes`. The note from step 4 is still
   there.

Then the intake box:

9. Leave **both** intake fields blank and press the intake button. The log
   should read `both blank — no request sent`, and the network panel should
   show **no request at all**. Not a 400 — nothing.
10. Fill in one or both, press it again. Expect `200`.

And the guard:

11. Put any other address in the email field and press `POST /api/spike-otp`.
    Expect `404 {"error":"not found"}`.

## What to look at in the network panel

Every row should be to
`lusory-git-claude-accounts-spike-...vercel.app`. If any row shows
`supabase.co`, or any other host, the architecture is broken and the spike
has failed. No fonts, no analytics, no error reporters — there are none to
find.

## Afterwards, from a session with database access

- `players` holds exactly one row; `notes` holds the note(s) from step 4;
  `intake_responses` holds the row from step 10 and carries no join key.
- Nothing else exists in any of the three tables.
- Vercel runtime logs for the preview contain only fixed `lusory:` codes —
  no address, no code, no note body.
- Production is byte-identical to `main` and its CSP still carries
  `connect-src 'none'`.

## Before release

Delete `api/spike-otp.js`, its tests, and this file. The oracle hands out
sign-in codes; it must never reach a production deploy.
