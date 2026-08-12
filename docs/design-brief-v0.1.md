# Brief for the UX/UI pass — Lusory v0.1

**Status:** v1, 2026-08-11. Written against the signed-off round-2 build.
**Classification:** internal working doc. Lives in `docs/`, so `.vercelignore` keeps it off
the served site. Illustrated version (with the nine screens captured at 390px):
https://claude.ai/code/artifact/8511acec-87d6-4024-b48a-75614608a499

---

## §0 Read first — the constraints are the product, not the budget

Lusory is an anti-engagement app. No streaks, scores, badges, progress, notifications,
accounts, or analytics — not as a v1 shortcut but permanently, as its argument. The
research it draws on includes a finding that measuring an enjoyable activity tends to make
it feel like work, so the app refuses to measure you. Its own copy says so: *"Nothing you
do here is counted, stored, ranked, or shown back to you — and no claim about this app will
ever be built from watching you use it."*

Most of the standard UX toolkit is therefore unavailable, and several moves that would
raise any normal product's metrics are build failures here. A progress bar is not a polish
item that got cut; it is the thing the app was built to refuse.

**The test every proposal must pass:** *"Would someone still want this if it forgot they
existed for a week?"* If a change only works because the app remembers the player, it
fails. The app does forget them. That is the specification, not a limitation.

## §1 What a player does

Suits defined a game as the voluntary attempt to overcome unnecessary obstacles. Each of
the fifteen entries is a goal, a rule forbidding the easy way, and an attitude. The loop:
open → pick a game → choose how hard the obstacle sits today → do it in the real world →
come back → answer one question about who you were in there → close. Nothing is saved.

A wry grasshopper lives in the margins and speaks at most once per visit, governed by
`the-grasshopper-plan v1.2`: a per-session budget, five sanctioned slots, a list of
prohibitions. Scarcity is the mechanism — he is a moral image, not a mascot.

## §2 The screens

Nine: intro, the telling (fable), the introduction, game plate, play, reflect, done,
shelf, about. See the illustrated version for captures.

One structural note invisible in screenshots: **the shelf is unreachable until a first
session completes** — refused at the destination, including a direct call to the shelf
route, not hidden behind a disabled button. A new player is given one game, not fifteen.

## §3 The design system in place

A naturalist's field guide.

| Token | Value | Role |
|---|---|---|
| `--paper` | `#EFEAD8` | ground, under a faint generated noise texture |
| `--plate` | `#F6F2E3` | raised surfaces, tier buttons |
| `--ink` | `#24241B` | text |
| `--leaf` | `#4A6636` | the grasshopper, entry numerals, active sort axis |
| `--hay` | `#7D5A18` | group headings, "also for two" flags |
| `--margin` | `52px` | the field margin |

**Type.** One family, two roles, both system serifs (`ui-serif, Georgia, Iowan Old Style`),
differentiated by size and weight rather than face. Display 2.7rem/1.15 → body 17px/1.62.
Uppercase letterspaced labels carry all metadata. No webfont is loaded, and none can be.

**The field margin** is the signature motif: a 52px left margin holding a hairline rule and
a leaf-green entry numeral, so every game reads as a plate in a field guide. It is the
app's strongest visual idea and the thing most worth protecting.

**Motion.** Two behaviours only: a one-shot settle-hop when the mark first appears, and an
idle twitch on a random 50–140s timer that re-draws on every screen entry. Never reactive —
*"input may postpone motion, never provoke it."* Tapping the mark does nothing, on purpose.
All idling is suppressed under reduced-motion.

## §4 The technical envelope

Not preferences. A proposal violating one cannot ship in this architecture.

| Constraint | Rules out | Enforced by |
|---|---|---|
| Single file, no build, no dependencies | Component libraries, icon packs, CSS frameworks | architecture |
| `default-src 'self'` | Every CDN asset. **Google Fonts cannot load.** A custom face must be inlined as a data URI or not used | `vercel.json` |
| `img-src 'self' data:` | Remote imagery. Illustration must be inline SVG or data URI, and it lands in page weight | `vercel.json` |
| `connect-src 'none'` | Analytics, A/B tests, error reporting, feature flags. **No design decision here can be validated by instrumentation** | `vercel.json` |
| One `localStorage` key | Preferences, dismissed-tip flags, onboarding state, theme choice, saved notes | test + grep |
| 44px minimum tap targets | Dense toolbars, small icon buttons | `test.cjs` |
| 390 / 430 / 820px, no horizontal overflow | Layouts needing a wide viewport | `test.cjs` |
| Graceful with JS disabled | Anything that leaves a blank page without JS | `attack.cjs` |

`index.html` *is* the app. Deliverables assuming a component system will not survive
contact with it. Redlines, inline SVG, and pasteable CSS are the useful currency.

## §5 Where the pass must not go

Each would read as an obvious improvement in a normal product. The reason matters more
than the rule.

- **No streaks, scores, badges, levels, totals, or completion counts.** One counter and the
  app's central claim is a lie.
- **Do not show played games differently from unplayed ones.** That is a progress record
  wearing a checkmark. Nothing is stored to draw it from, and nothing should be.
- **Never rank, recommend, or praise a difficulty tier.** If "harder" is praised, praise
  becomes rank, and rank walks in through the side door built to keep it out.
- **No grasshopper in rules, safety text, the reflection, or the science section.** Rules
  are load-bearing and a joke inside a rule makes the rule optional. A character in the
  reflection turns self-examination into a performance for an audience of one insect.
- **The mark never reacts** to taps, hovers, or completions. Reactive motion is feedback,
  feedback is reward, reward is the loop the app refuses.
- **No call to action** — stay, continue, share, rate, invite. Leaving cleanly is the
  designed outcome.
- **Never greet a returning player warmly or note their absence with regret.** Guilt and
  delight are both retention levers; indifference is the specified tone.
- **No emoji anywhere; no exclamation mark in his voice.** Voice spec, absolute.
- **Never name a research family** — "savoring", "expressive writing", "gratitude
  intervention". In-app labels are metaphors precisely so a player never reads a clinical
  claim. The mapping exists but is channel material and is never served.

## §6 The asks, ranked

**01 — The desktop experience is an unexamined phone.** One responsive breakpoint (`34rem`,
tier buttons only); everything else is a `29.5rem` column centred in whatever space exists.
On a laptop the field guide is a narrow strip on a wide empty field. This may be right — a
field guide is hand-held — but it has never been decided, only inherited. Commit to the
phone column and frame the desktop deliberately, or design the wide case properly. Do not
simply widen the measure; 66 characters is doing real work in the rules text.

**02 — Three "harder" tiers advertise themselves.** Difficulty must read as three variants,
never three ranks. Nothing is preselected or stored and the buttons are equal in size, but
games 1, 5 and 14 give the hardest tier a payoff clause its siblings lack: "awe on hostile
terrain", "feel what the number was hiding", "tell the story of how it almost never
happened". The ruling is that the fix direction is *less, not more* — trim those three to
bare obstacles rather than giving every tier an advertisement. That copy edit is assigned.
The design question left over: does the three-button form itself imply an axis from weak to
strong, and is there a treatment that reads as three doors rather than three rungs?

**03 — Fifteen entries, two sort axes, no search.** Sorts by *Temperament* or *What it
grows*. Handsome and long; a player wanting tonight's game scrolls past fourteen they don't
want. Filtering and favouriting need stored preferences; "recently played" needs history —
all unavailable. Within that, can fifteen scan faster? The metadata line is the obvious
candidate: it repeats the temperament the group heading above it already states.

**04 — Should the field guide have a night mode?** No `prefers-color-scheme` handling at
all: warm paper in a dark room at 11pm, and several games are evening activities. The
counter-argument is that paper is the identity. Note a *user-chosen* theme is impossible —
storing the choice needs a second key. Only the OS query is available. Recommendation with
a reason, please, not a default.

**05 — The grasshopper is a mark, and the burden of proof is on more.** A single-stroke
line drawing; illustration, expression systems and animation libraries are deferred on
purpose. If the pass concludes the mark is too quiet, that argument is welcome but must
carry the burden — *more* needs proving, *less* never does. Two hard limits: reference
woodcuts and old field guides only, never animation studios (Disney's 1934 grasshopper and
Pixar's Hopper are copyrighted characterisations and ours must owe them nothing); and he
never bounces, celebrates, or reacts.

**06 — The near-empty play screen.** While a player is out, the screen holds the rule and
almost nothing else — no timer, no counter, no check-in, no grasshopper (absent from the
DOM there, so stillness is guaranteed by architecture). Correct in principle; we want a
second opinion on whether it reads as reassuring or merely blank on a real phone.

**07 — Copy my note is the only exit for anything written.** The free-write never leaves
the DOM and evaporates with the page, by design and said plainly on screen. The single
escape hatch is *Copy my note* on the closing screen, with a legacy `execCommand` fallback
behind the async clipboard API. Untested on iOS Safari and Android Chrome. If the fallback
is weak, this is the one place a player can lose something they wanted.

## §7 Build state

| Item | State | Note |
|---|---|---|
| Round-2 build, six gate items | verified | re-checked in a browser under the production CSP |
| About science sentence in plain English | shipped | the last ruled code change |
| Shelf numerals printing under the titles | fixed | found while capturing screens for this brief |
| Tier payoff clauses on games 1, 5, 14 | open | owner copy task; ask 02 |
| Copy-my-note on iOS Safari + Android Chrome | open | ask 07 |
| `test/attack.cjs`, `test/attack2.cjs` | current | A13/A12/A9 rewritten against ruled behaviour (R15); harness repaired; included in the suite |

**The defect found while writing this.** Every shelf entry renders as `entry plate`, where
`.plate` supplies the 52px field margin — but `.entry`'s padding shorthand sits later in
the stylesheet at equal specificity and silently reset the left padding to zero. The
numeral column and its rule printed *on top of* the title: at 390px the numeral spanned
x 17.6–61.6 while the title also began at x 17.6, on all fifteen entries and the first-run
card. The game plate uses `plate spec` rather than `entry`, which is why the intended
layout was visible there and why this survived four verification passes — the screen
everyone checked was the correct one. Regression pin G now measures the geometry rather
than trusting the eye.

Carry the method note into the pass: this was found by screenshotting every screen at a
real width, not by reading the CSS.

## §8 Done means

- **The field-guide identity is intact or stronger.** A pass that modernises this into a
  wellness app has failed, however clean the result.
- **Every proposal ships in one file with no dependencies** — inline CSS, inline SVG, data
  URIs; redlines and pasteable code, not component specs.
- **Nothing new is stored and nothing new is counted.** A proposal needing a second
  `localStorage` key is out of scope by definition.
- **The three tiers read as three doors, not three rungs.**
- **Leaving still feels clean.** The last screen should make closing the app easy, not tug.
- **Accessibility holds at 100**, tap targets stay ≥44px, reduced-motion still silences
  everything.

**The standing signal.** One background measure, aggregate-only, and it checks the
character rather than the player: *if sessions containing a grasshopper moment predict
faster re-opens, he has become dopamine furniture* and his budget tightens. The correct
direction of adjustment is always toward less. He is working when people quote him
occasionally and forget him mostly; he has failed when anyone opens the app to see what
he will say. Hold your own proposals to the same test.

---

**Sources.** The running build (`index.html`) · `docs/invariants.md` · The Grasshopper Plan
v1.2 · architect sign-off v0.1 · science-axis translation table v2 (channel material,
never served — its path is deliberately not named in the shipped source).
