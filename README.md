# Golf ⛳

A web version of **Golf** — also known as **Polish Golf** or **Polish Poker** — the card
game where lowest score wins, just like the sport. Play locally against two trash-talking
bots, or online against a friend via a shared room code.

Includes:
- The classic **6-card version**: a 3×2 grid per player, flip 2 of your own cards to start
  each hole, then swap in low cards over the game — a matching pair stacked in a column
  scores zero. **9 holes**, lowest total wins.
- **Online play**: create a room, share the 4-letter code, and play a real match against
  someone else from anywhere — synced live via Firestore, no server to run or keep alive.
- Two **heuristic AI bots** with distinct personalities: **Ed** (quiet, confident, the
  occasional dry joke) and **Carol** (loud, encouraging — until you make a great play, then
  she gets sassy about it).
- A **"What should I play?" hint button** — powered by the exact same logic the bots use, so
  it never suggests an illegal move.
- **Snarky commentary** that reacts to what's happening at the table — great swaps, someone
  finishing their layout, hole winners, and the final result.
- A **shared top-10 leaderboard** (lowest 9-hole total wins) — same Firestore-backed
  approach as Par Five's, flipped for golf scoring.
- A live **scorecard** (📋 button, any time) showing every hole so far plus running totals,
  the way an actual golf scorecard would.
- **Sound effects** — synthesized in the browser via the Web Audio API (no audio files to
  ship). Mute anytime with the 🔊 button, top-right.

## Quick start

```bash
npm install
npm run dev
```

That builds the shared game engine, then starts the Vite dev server for the client (no
separate backend process — the app is a pure static site). The terminal will print the URL —
Vite defaults to `http://localhost:5173`, but picks the next free port (5174, 5175, …) if
that one's taken.

Local (vs-bots) play works immediately with zero setup. Online play and the leaderboard need
a Firebase project's config filled into `packages/client/src/network/firebase.ts` first — see
"Deploying" below; until then, "Play online" will fail to create/join a room, and the
leaderboard button will just show "Loading…" forever.

### Tests

```bash
npm run test
```

Runs the engine's test suite: scoring rules (card values, column-pair cancellation), the
reveal-phase turn flow, and simulated full matches (bots playing bots — 2/3/4-player tables,
several seeds each) that assert all 52 cards are conserved at every single step and every
match terminates with a valid winner.

## How to play (short version)

- You've got 6 face-down cards in a 3×2 grid. Flip any 2 of your own to start the hole.
- On your turn: draw blind from the stock, or take the face-up top of the discard pile (you
  know what that one is, but so does everyone watching).
- Whatever you drew, either swap it into any of your 6 slots (the card it replaces goes
  face-up to the discard pile) — or, if you drew from the stock, discard it unused instead.
  Declining a stock card costs you a blind flip of one of your own face-down cards as a
  penalty, unless you're already down to your last one.
- Two matching ranks stacked in the same column score **zero** for both, no matter what they
  are. Everything else counts at its Golf value: Ace = 1, Two = **-2**, 3–10 face value,
  Jack/Queen = 10, King = **0**.
- The instant your whole grid is face-up, everyone else gets exactly one more turn, then the
  hole is scored.
- 9 holes. Lowest total wins.

Click **"What should I play?"** any time it's your turn if you want a suggested move and why.

## Project structure

```
packages/
  engine/   Pure game logic — rules, state machine, scoring, bot strategy, hints, and
            commentary. No UI or network dependencies; fully unit-tested (vitest).
  client/   React + Vite UI. No backend of its own:
            - Local (vs-bots) play runs the engine directly in the browser
              (src/hooks/useLocalGame.ts).
            - Online play syncs through a shared Firestore document
              (src/network/, src/hooks/useOnlineRoom.ts).
```

The engine is deliberately framework-free so the exact same "what moves are legal right now"
and "what's the best move" logic is shared by local play, online play, the bots, and the
human hint feature — a hint can never suggest something illegal, and a bot can never cheat by
seeing a card nobody's flipped yet.

## How online play is synced

There's no custom backend — both players' browsers talk directly to a shared Firestore
document at `rooms/{code}` (same approach as the author's other two projects, Durak and Par
Five):

- **Single writer per turn**: whoever's turn it is computes their move locally with the same
  engine code as local play, then writes the resulting state to the room. Everyone else's
  live subscription picks it up.
- **Only the host's browser drives bot turns** — avoids two clients racing to step the same
  bot's move. A bot "turn" is often several atomic actions in a row (reveal, reveal, draw,
  then swap or discard), each its own Firestore write. This means the host needs to stay
  connected for bot turns to happen; a bot-free 2-human room has no such dependency mid-game.
- **Sound cues** are deterministic given the event log, so every client re-derives and plays
  them independently — no sync needed. **Commentary** is randomized (which bot speaks, which
  canned line), so it's computed once by whoever wrote the move and shared via the room doc,
  so both players see the same reaction.
- **The host submits final scores to the leaderboard** exactly once per finished match — the
  same host-only gating Par Five uses for its series tally, so a match's scores don't get
  added once per connected device.

### Card privacy

Golf has a different shape of hidden information than Durak's hands: a face-down card is
unknown to *everyone*, including its own owner, not just to opponents. The room document
still holds the *full* authoritative game state (every card, face-up or not), because that's
what every browser needs to sync the match — the UI just never shows a face-down card's
identity to anyone. There's no Auth/Cloud-Functions-based redaction in place — same accepted
tradeoff Durak documents for hands, not a competitive-integrity guarantee for a game against
strangers. See `firestore.rules` for the same caveat in the security-rules comments.

## Deploying

1. **Firebase**: create a project at [console.firebase.google.com](https://console.firebase.google.com),
   enable **Firestore** (Standard edition). In Project Settings → General → Your apps, add a
   Web app and copy its config object into `packages/client/src/network/firebase.ts`. Then
   paste this repo's `firestore.rules` into Firestore → Rules → Publish.
2. **Build**: `npm run build` (root) builds the engine, then the client to
   `packages/client/dist`.
3. **Host the static build** anywhere that serves static files — Netlify, Vercel, GitHub
   Pages, Cloudflare Pages, etc. all work with zero server-side config since this is a plain
   static site. For Netlify specifically: "Import from Git", build command
   `npm install && npm run build`, publish directory `packages/client/dist`.

No environment variables are needed at build time — the Firebase web config isn't a secret
(access control is enforced by `firestore.rules`, not by hiding the config), so it just gets
committed directly in `firebase.ts` once you've filled it in.

## Extending this later

- **Claude-powered commentary**: bot lines currently come from `TemplateCommentaryProvider`
  (`packages/engine/src/commentary/templateProvider.ts`), which picks randomized canned lines
  — no API key, no network calls. It implements the `CommentaryProvider` interface
  (`packages/engine/src/commentary/types.ts`); a `ClaudeCommentaryProvider` implementing that
  same interface (calling the Claude API, e.g. Haiku, with the game event as context) can be
  swapped in wherever `new TemplateCommentaryProvider()` is currently constructed
  (`useLocalGame.ts`, `useOnlineRoom.ts`), with no changes to game logic.
  See [claude.com/platform/api](https://claude.com/platform/api) for API keys.
- **More bot personalities / bigger tables**: add entries to `PERSONALITIES` in
  `packages/engine/src/commentary/personalities.ts` and to `BOT_PERSONALITIES`/
  `BOT_DISPLAY_NAMES` in `packages/client/src/lib/players.ts`, then raise `MAX_SEATS` in that
  same file past 4 if you want more than 4 seats total.
  Golf traditionally supports up to 8 players; the engine itself isn't hardcoded to a player
  count, just untested much past 4.
- **Other Golf variants**: the engine is built specifically around the 6-card version
  (3×2 grid, 2 initial reveals). A 4-card or 9-card ("Crazy Nines") variant would mean
  parameterizing `LAYOUT_SIZE`/`LAYOUT_COLUMNS` in `types.ts` and the initial-reveal count in
  `gameEngine.ts`, plus a matching column/row-of-three scoring rule in `scoring.ts`.
- **Real access control on rooms**: swap the "anyone with the code can read/write" Firestore
  rules for Firebase Auth + Cloud Functions doing the actual writes server-side, if this ever
  needs to be trustworthy for strangers rather than just a friend.

## A couple of simplifications versus some house rules

- The "discard a stock card without using it costs a forced reveal" rule is implemented
  exactly as commonly described — some tables play it slightly differently (or not at all).
- Only the standard column-pair-cancels-to-zero rule is implemented — some house rules also
  cancel a full three-in-a-row, or let one-eyed jacks pair with anything. Not here.

Neither affects who ends up winning a well-played hole — just some minor scoring-edge-case
flavor.
