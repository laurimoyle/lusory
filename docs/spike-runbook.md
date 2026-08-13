# Accounts spike — live loop runbook

Branch-only. This is the part of the round-6 acceptance that has to be done
from a browser that can reach the preview.

## Why it is not already done

This session's egress policy refuses `*.vercel.app` and `*.supabase.co`
outright — a 403 at the proxy, on every request, for the browser as well as
for curl. The preview is additionally behind Vercel SSO. So the deployed
endpoints could not be called from here at all: not the loop, not a single
POST.

Everything that does not require reaching those two hosts has been done and
is green — see the round-6 report. What is left is the live loop.

## Before you start

The built-in mailer is rate-limited to a handful of codes an hour, and the
loop needs **two**: one to sign in, one to sign in again after signing out.
Do the whole thing in one sitting.

Preview: `https://lusory-git-claude-accounts-spike-lauri-moyle-s-projects.vercel.app/spike.html`

Open the browser's network panel before step 1 and leave it open. Tick
"preserve log" so signing out does not clear it.

## The loop

1. **Request a code.** Type your address, press `POST /api/auth/request`.
   Expect `200 {"ok":true}`.
2. **Read the email.** If it contains a six-digit code, use that. If it
   contains a link instead, do **not** click it — clicking sends your
   browser to Supabase, which is exactly what this architecture does not
   do. Copy the `token=` value out of the link and paste that instead; the
   endpoint takes either. A link arriving here is itself a finding: it
   means the mail template still has to be changed before release.
3. **Verify.** Press `POST /api/auth/verify`. Expect `200 {"ok":true}` and
   a `lusory_session` cookie in the response — `HttpOnly`, `Secure`,
   `SameSite=Strict`.
4. **Save a note.** Type something into the note box, press
   `POST /api/notes`. Expect `200` and the note echoed back with a
   `created_on` **date** and no time.
5. **List.** Press `GET /api/notes`. Your note should be there, alone.
6. **Sign out.** Press `POST /api/auth/signout`. Then press `GET /api/notes`
   again: expect `401 {"error":"not signed in"}`. That refusal is the point
   of the step.
7. **Sign in again.** Request a second code, verify with it.
8. **Notes persisted.** Press `GET /api/notes`. The note from step 4 is
   still there.

Then, separately, the intake box:

9. Leave **both** intake fields blank and press the intake button. The log
   should say `both blank — no request sent`, and the network panel should
   show **no request at all**. Not a 400 — nothing.
10. Fill in one or both, press it again. Expect `200`.

## What to look at in the network panel

Every request in the log should be to
`lusory-git-claude-accounts-spike-...vercel.app`. If any row shows
`supabase.co`, or any other host, the architecture has been broken and the
spike has failed. Fonts, analytics, error reporters: there should be none,
because there are none.

## What to send back

The network panel's list of hosts, and any request that failed. The
database, the function logs, and production are checked from here
afterwards — those do not need you.
