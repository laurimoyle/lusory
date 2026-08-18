# Lusory Play App — prototype v0.1 (Awe Route)

A shelf of games that ask you to do something the hard way, on purpose.

Single-file, local-first, no framework, no build system, no dependencies.
`index.html` **is** the app — open it in a browser and it runs.

## Invariants

These are build failures, not style notes. Full text in `docs/invariants.md`.

- No streaks, scores, badges, stored progress, or user-facing metrics of any kind.
- One stored fact only: last-open date, for the grasshopper's indifference.
- Local-first; no individual telemetry. Game selections increment anonymous weekly aggregate counters only.
- Difficulty prompt is symmetric (harder/same/gentler), fresh each session, never ranked.
- Grasshopper: max one moment per session (two on introduction day), five sanctioned
  slots only, never reactive, never in reflection or safety text.
- Content U/PG. Community features physical-only.
- Every feature passes: "Would someone still want this if it forgot they existed for a week?"

## How the invariants are enforced in code

| Invariant | Enforcement |
|---|---|
| One stored fact | A single `localStorage` key, `lusory.lastOpen`. One `getItem`, one `setItem`, memory fallback when storage throws. Verified by grep and by browser test. |
| No player metrics | The free-write never leaves the DOM; no player history is created and no counters or timers are shown. |
| Aggregate choice signal | `connect-src 'self'` permits one disclosed same-origin call. The server increments a week/game/source counter and stores no raw event or player identifier. |
| Symmetric difficulty | Each tier button carries its own obstacle text, so the choice reads as three variants rather than three rank words. Equal width and height, nothing preselected, never persisted. |
| Grasshopper budget | A per-visit counter gates every slot. The visit is the unit, not the play-through, so replaying cannot farm him. A third of ordinary visits are silent. |
| Never reactive | Idle motion is timer-only (50–140s, randomised). The settle-hop is a one-shot JS latch, not a CSS rule that re-arms on navigation. The mark does not exist in the DOM on play or reflect. |
| Safety reachable | The clinician referral line is on About, and About is reachable from the very first screen. Progressive reveal gates the *shelf*, never safety text. |

## Tests

```bash
node test/serve.cjs &          # static server on :8123
node test/test.cjs             # the loop, chooser, storage, budget, phone widths
node test/choice-reporting.cjs # endpoint privacy boundary + weekly email format
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
