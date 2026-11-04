# Lusory Play App — prototype v0.1 (Awe Route)

A shelf of games that ask you to do something the hard way, on purpose.

Single-file, local-first, no framework, no build system, no dependencies.
`index.html` **is** the app — open it in a browser and it runs.

## Invariants

These are build failures, not style notes. Full text in `docs/invariants.md`.

- No streaks, scores, badges, stored progress, or user-facing metrics of any kind.
- Device storage: the last-open date; during the beta, a gate-passed flag; and the player's yes/no to the game tally. Nothing else.
- No behavioral telemetry. Game choices are counted only from players who opt in (asked once, default off), and only as anonymous weekly totals. Email consent, referral answers, and usability answers are explicitly asked for and stored in separate, dated (never timestamped) pools.
- Private-beta mode requires an email and asked referral source before entry. It applies on `beta.*` and `*.vercel.app` hosts and is off on `app.*`. See `docs/beta-gate-and-go-to-market.md`.
- Difficulty prompt is symmetric (harder/same/gentler), fresh each session, never ranked.
- Grasshopper: max one moment per session (two on introduction day), five sanctioned
  slots only, never reactive, never in reflection or safety text.
- Content U/PG. Community features physical-only.
- Every feature passes: "Would someone still want this if it forgot they existed for a week?"

## How the invariants are enforced in code

| Invariant | Enforcement |
|---|---|
| One device-stored fact | A single `localStorage` key, `lusory.lastOpen`. One `getItem`, one `setItem`, memory fallback when storage throws. Verified by grep and by browser test. |
| No player metrics | The free-write never leaves the DOM; no player history is created and no counters or timers are shown. |
| Same-origin requests only | `connect-src 'self'` permits the opt-in choice counter and voluntary forms. The server stores no raw play event or player identifier. |
| Asked, separate intake | One atomic request prevents partial email/referral submission while the records remain in separate pools. A referral-only retry token prevents duplicates without joining the email to referral or play data. Test mode records answers only—never clicks, route, referrer, UTM, replay, or fingerprint. |
| Symmetric difficulty | Each tier button carries its own obstacle text, so the choice reads as three variants rather than three rank words. Equal width and height, nothing preselected, never persisted. |
| Grasshopper budget | A per-visit counter gates every slot. The visit is the unit, not the play-through, so replaying cannot farm him. A third of ordinary visits are silent. |
| Never reactive | Idle motion is timer-only (50–140s, randomised). The settle-hop is a one-shot JS latch, not a CSS rule that re-arms on navigation. The mark does not exist in the DOM on play or reflect. |
| Safety reachable | The clinician referral line is on About, and About is reachable from the very first screen. Progressive reveal gates the *shelf*, never safety text. |

## Tests

```bash
node test/serve.cjs &          # static server on :8123
node test/test.cjs             # the loop, chooser, storage, budget, phone widths
node test/choice-reporting.cjs # endpoint validation + privacy boundary
node test/intake-usability.cjs # opt-in, separation, limits, and test-answer validation
node test/intake-transaction.cjs # atomic intake validation, retry token, and RPC boundary
node test/regress.cjs          # 22 assertions: one per verification-pass finding
node test/csp-test.cjs         # full loop under the production CSP headers (:8124)
node test/netcheck.cjs         # proves zero browser-side third-party requests
node test/attack.cjs           # hostile-input pass: storage, history abuse, idle motion
node test/attack2.cjs          # probe pass: budget overrun trials + edge diagnostics
```

Requires `npm i playwright-core` and a Chromium binary; set the path at the top of each file.
Lighthouse accessibility last measured **100/100**, zero failing audits.

## Not in the app, on purpose

`docs/channel/science-axis-translation-table.md` maps each in-app metaphor label to its
research family and citations. It is **channel material for the coach/professional
channel, never linked in-app and never served**. The app shows metaphor labels only —
"The Small Self", not "Awe induction" — so a coach recognises the research without a
player reading a clinical claim.

`docs/frame-v0-original.html` is the v0 frame this was built from, kept for provenance.

## Deploy

Vercel, zero-config static. Root `index.html`, no build step. `vercel.json` sets a strict
CSP, `Referrer-Policy: no-referrer`, and disables geolocation/mic/camera.
