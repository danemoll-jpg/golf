import { freshShuffledDeck, shuffle } from './deck.js';
import { faceDownIndices, getLegalActions, isActionLegal, isLayoutComplete, nextSeat, nextTurnSeat } from './rules.js';
import { scoreLayout } from './scoring.js';
import {
  Card,
  cardValue,
  DEFAULT_RULES,
  EngineConfig,
  GameState,
  HOLES_PER_MATCH,
  LAYOUT_COLUMNS,
  LAYOUT_SIZE,
  LegalActions,
  PlayerAction,
  PlayerState,
} from './types.js';

/** Deals a fresh hole in place: reshuffles a brand-new 52-card deck (Golf redeals every
 * hole, unlike Durak's single persistent deck), gives each player 6 face-down cards, flips
 * one card to start the discard pile, and puts everyone back in the 'revealing' phase. */
function dealHole(state: GameState, holeNumber: number, startingSeat: number, rng: () => number): void {
  const deck = freshShuffledDeck(rng, state.rules.jokers);
  for (const p of state.players) {
    p.layout = [];
    for (let i = 0; i < LAYOUT_SIZE; i++) {
      p.layout.push({ card: deck.pop()!, faceUp: false });
    }
    p.revealsRemaining = 2;
  }
  state.discard = [deck.pop()!];
  state.stock = deck;
  state.pendingDraw = null;
  state.awaitingForcedReveal = false;
  state.finishedBy = null;
  state.finalTurnsRemaining = 0;
  state.holeNumber = holeNumber;
  state.startingSeat = startingSeat;
  state.actingSeat = startingSeat;
  state.phase = 'revealing';
  state.log.push({ type: 'holeStarted', holeNumber, startingSeat });
}

export function createMatch(config: EngineConfig): GameState {
  const rng = config.rng ?? Math.random;

  const players: PlayerState[] = config.playerConfigs.map((pc) => ({
    id: pc.id,
    name: pc.name,
    isBot: pc.isBot,
    personality: pc.personality,
    layout: [],
    revealsRemaining: 2,
    holeScores: [],
  }));

  const state: GameState = {
    players,
    rules: config.rules ?? DEFAULT_RULES,
    stock: [],
    discard: [],
    actingSeat: 0,
    pendingDraw: null,
    awaitingForcedReveal: false,
    phase: 'revealing',
    holeNumber: 0,
    startingSeat: 0,
    finishedBy: null,
    finalTurnsRemaining: 0,
    log: [],
    matchWinnerIds: null,
  };

  state.log.push({ type: 'matchStarted', playerOrder: players.map((p) => p.id) });
  dealHole(state, 1, 0, rng);
  return state;
}

export function getCurrentLegalActions(state: GameState): LegalActions | null {
  if (state.phase === 'matchOver') return null;
  return { seatIndex: state.actingSeat, actions: getLegalActions(state, state.actingSeat) };
}

/** If the stock has run dry, reshuffle everything except the discard pile's top card back
 * into it — standard Golf/rummy-family behavior. */
function reshuffleIfNeeded(state: GameState, rng: () => number): void {
  if (state.stock.length > 0 || state.discard.length <= 1) return;
  const top = state.discard[state.discard.length - 1];
  state.stock = shuffle(state.discard.slice(0, -1), rng);
  state.discard = [top];
}

function endTurn(state: GameState, rng: () => number): void {
  if (state.phase === 'finalTurns') {
    state.finalTurnsRemaining -= 1;
    if (state.finalTurnsRemaining <= 0) {
      resolveHole(state, rng);
      return;
    }
  }
  state.actingSeat = nextTurnSeat(state);
}

/** Checks whether the acting player just completed their layout (all 6 face-up). The
 * FIRST player to do so each hole triggers the "everyone else gets one more turn" clock;
 * later completions (rare — another player finishing during their own final turn) are just
 * logged for commentary/flavor without resetting anything. Always ends the turn after. */
function checkLayoutCompleteAndAdvance(state: GameState, seatIndex: number, rng: () => number): void {
  const player = state.players[seatIndex];
  if (isLayoutComplete(player)) {
    const alreadyTriggered = state.finishedBy !== null;
    state.log.push({ type: 'layoutComplete', by: player.id });
    if (!alreadyTriggered) {
      state.finishedBy = player.id;
      state.phase = 'finalTurns';
      state.finalTurnsRemaining = state.players.length - 1;
    }
  }
  endTurn(state, rng);
}

function resolveHole(state: GameState, rng: () => number): void {
  const scores: Array<{ playerId: string; score: number; total: number }> = [];
  for (const p of state.players) {
    // Whatever's still face-down gets turned over for scoring — everyone sees the full
    // layout at the end of a hole, same as cards being flipped for a real showdown.
    for (const slot of p.layout) slot.faceUp = true;
    const score = scoreLayout(p.layout);
    p.holeScores.push(score);
    scores.push({ playerId: p.id, score, total: p.holeScores.reduce((a, b) => a + b, 0) });
  }
  state.log.push({ type: 'holeScored', holeNumber: state.holeNumber, scores });

  if (state.holeNumber >= HOLES_PER_MATCH) {
    const totals = state.players.map((p) => ({ id: p.id, total: p.holeScores.reduce((a, b) => a + b, 0) }));
    const lowest = Math.min(...totals.map((t) => t.total));
    const winnerIds = totals.filter((t) => t.total === lowest).map((t) => t.id);
    state.matchWinnerIds = winnerIds;
    state.phase = 'matchOver';
    state.log.push({ type: 'matchOver', winnerIds, isDraw: winnerIds.length > 1 });
    return;
  }

  dealHole(state, state.holeNumber + 1, nextSeat(state.players.length, state.startingSeat), rng);
}

export function applyAction(
  state: GameState,
  seatIndex: number,
  action: PlayerAction,
  rng: () => number = Math.random,
): GameState {
  if (!isActionLegal(state, seatIndex, action)) {
    throw new Error(`Illegal action ${JSON.stringify(action)} for seat ${seatIndex} in phase ${state.phase}`);
  }
  const next: GameState = structuredClone(state);
  const player = next.players[seatIndex];

  switch (action.type) {
    case 'reveal': {
      const wasForced = next.awaitingForcedReveal;
      player.layout[action.slotIndex].faceUp = true;
      next.log.push({ type: 'revealed', by: player.id, slotIndex: action.slotIndex, forced: wasForced });

      if (wasForced) {
        next.awaitingForcedReveal = false;
        checkLayoutCompleteAndAdvance(next, seatIndex, rng);
      } else if (next.phase === 'revealing') {
        player.revealsRemaining -= 1;
        if (player.revealsRemaining > 0) {
          // Same seat reveals its second card.
        } else if (next.players.every((p) => p.revealsRemaining === 0)) {
          next.phase = 'playing';
          next.actingSeat = next.startingSeat;
        } else {
          next.actingSeat = nextSeat(next.players.length, seatIndex);
        }
      }
      break;
    }

    case 'drawStock': {
      reshuffleIfNeeded(next, rng);
      if (next.stock.length === 0) {
        // Both piles genuinely exhausted (vanishingly rare with a fresh 52-card deck) —
        // score the hole with what's on the table rather than getting stuck.
        resolveHole(next, rng);
        break;
      }
      const card = next.stock.pop()!;
      next.pendingDraw = { source: 'stock', card };
      next.log.push({ type: 'drew', by: player.id, source: 'stock' });
      break;
    }

    case 'drawDiscard': {
      const card: Card = next.discard.pop()!;
      next.pendingDraw = { source: 'discard', card };
      next.log.push({ type: 'drew', by: player.id, source: 'discard' });
      break;
    }

    case 'swap': {
      const slot = player.layout[action.slotIndex];
      const cardOut = slot.card;
      const cardIn = next.pendingDraw!.card;
      const wasFaceDown = !slot.faceUp;

      player.layout[action.slotIndex] = { card: cardIn, faceUp: true };

      const column = LAYOUT_COLUMNS.find((c) => c.includes(action.slotIndex))!;
      const partnerIndex = column[0] === action.slotIndex ? column[1] : column[0];
      const partner = player.layout[partnerIndex];
      const pairFormed = partner.faceUp && partner.card.rank === cardIn.rank;
      // A "great play" the way a good club player would recognize one: you locked in a
      // zero-point pair, or you blind-swapped out a card that turned out to be expensive
      // for something cheap.
      const bigUpgrade = wasFaceDown && cardValue(cardOut) >= 8 && cardValue(cardIn) <= 2;
      const greatPlay = pairFormed || bigUpgrade;

      next.discard.push(cardOut);
      next.pendingDraw = null;
      next.log.push({ type: 'swapped', by: player.id, slotIndex: action.slotIndex, cardOut, cardIn, greatPlay });

      checkLayoutCompleteAndAdvance(next, seatIndex, rng);
      break;
    }

    case 'discardDrawn': {
      next.discard.push(next.pendingDraw!.card);
      next.pendingDraw = null;
      next.log.push({ type: 'discardedDrawn', by: player.id });

      // Declining a stock card without using it costs you a peek at your own layout — flip
      // one face-down card blind — UNLESS you're already down to your last one, in which
      // case the rule waives the penalty rather than force-ending your hole for free.
      if (faceDownIndices(player).length > 1) {
        next.awaitingForcedReveal = true;
      } else {
        endTurn(next, rng);
      }
      break;
    }
  }

  return next;
}
