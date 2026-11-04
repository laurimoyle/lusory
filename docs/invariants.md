# Invariants (project instructions §5, reconciled with drift-audit rulings R31–R33, R41)

Architect-owned. The project canon (`claude_lusory-canon.md` in project Knowledge) wins if this file ever disagrees.

Attached to every brief. Violations are build failures, not style notes.

- No streaks, scores, badges, stored progress, or user-facing metrics of any kind.
- Stored per player: email, last-open **date**, and the player's own notes. Nothing else. Notes are never analyzed at the individual level and never alter that player's experience. (Until accounts ship, production stores only the last-open date, written at first completion.) During the private beta only, one device-local boolean records that the gate was passed; it holds no email, answer, or behavior, and is deleted from the product when the gate retires (R33, R41). One device-local answer records whether the player agreed to the game tally (R31).
- No behavioral telemetry as evidence. Builder analytics: aggregate-only. Aggregate play counts exist **only from players who opted in** (R31: asked once, default off). Aggregate signal may curate the shelf; it may never personalize a player's shelf.
- Asked, never sensed: during the private beta, email and referral source are required before entry. Intake pools carry dates, never timestamps, and no column joins one pool to another (R32). Usability answers and explicitly consented testimonials also live in separate pools. No clickstream, session replay, UTM, browser referrer, or fingerprint.
- Difficulty prompt is symmetric (harder/same/gentler), chosen fresh each session, never ranked.
- Grasshopper: max one moment per session (two on introduction day), five sanctioned slots only, never reactive, never in reflection or safety text.
- Content U/PG. Community features physical-only.
- Every feature passes: "Would someone still want this if it forgot they existed for a week?"
