import { faceDownIndices, getLegalActions, isPartOfMatchedColumn } from '../rules.js';
import { Card, cardValue, GameState, LAYOUT_COLUMNS, PlayerAction } from '../types.js';

/**
 * Heuristic move scorer shared by the bots and the human hint generator, so a hint always
 * matches what a competent bot would actually do — and a bot never has access to
 * information or moves the rules engine wouldn't allow (in particular: it never "knows"
 * the value of a still-face-down card it hasn't drawn).
 */
export interface ScoredAction {
  action: PlayerAction;
  score: number;
  reason: ReasonTag;
}

/** Machine-readable reason tags — hints.ts turns these into plain-English rationale. */
export type ReasonTag =
  | 'blindReveal'
  | 'lastFaceDown'
  | 'onlyOption'
  | 'discardCompletesPair'
  | 'discardGoodPickup'
  | 'discardSafeLow'
  | 'discardRisky'
  | 'stockGamble'
  | 'completePair'
  | 'upgradeKnownHigh'
  | 'downgradeKnownCard'
  | 'buryUnknown'
  | 'declineBadDraw';

function columnPartnerIndex(slotIndex: number): number {
  const column = LAYOUT_COLUMNS.find((c) => c.includes(slotIndex))!;
  return column[0] === slotIndex ? column[1] : column[0];
}

/** Would placing `card` at `slotIndex` complete a matching (zero-score) column? */
function wouldCompletePair(player: GameState['players'][number], slotIndex: number, card: Card): boolean {
  const partner = player.layout[columnPartnerIndex(slotIndex)];
  return partner.faceUp && partner.card.rank === card.rank;
}

/** Scores the best available swap destination for a held card — used both to evaluate a
 * discard-pile pickup before committing to it, and to rank the actual swap options once a
 * card is in hand. */
function bestSwapScore(player: GameState['players'][number], card: Card): { score: number; reason: ReasonTag } {
  let best = { score: -Infinity, reason: 'buryUnknown' as ReasonTag };
  for (let i = 0; i < player.layout.length; i++) {
    const slot = player.layout[i];
    let score: number;
    let reason: ReasonTag;
    if (wouldCompletePair(player, i, card)) {
      score = 200;
      reason = 'completePair';
    } else if (slot.faceUp) {
      if (isPartOfMatchedColumn(player, i)) {
        score = -500; // never break an already-scoring pair
        reason = 'downgradeKnownCard';
      } else {
        const delta = cardValue(slot.card) - cardValue(card);
        score = delta > 0 ? 100 + delta : -50 + delta;
        reason = delta > 0 ? 'upgradeKnownHigh' : 'downgradeKnownCard';
      }
    } else {
      score = 60 - cardValue(card);
      reason = 'buryUnknown';
    }
    if (score > best.score) best = { score, reason };
  }
  return best;
}

/** Scores every legal action for `seatIndex` and returns them best-first. */
export function scoreActions(state: GameState, seatIndex: number): ScoredAction[] {
  const actions = getLegalActions(state, seatIndex);
  const player = state.players[seatIndex];

  const scored: ScoredAction[] = actions.map((action) => {
    if (action.type === 'reveal') {
      const remainingFaceDown = faceDownIndices(player).length;
      const reason: ReasonTag =
        actions.length === 1 ? 'onlyOption' : remainingFaceDown === 1 ? 'lastFaceDown' : 'blindReveal';
      return { action, score: 0, reason };
    }

    if (action.type === 'drawStock') {
      return { action, score: 50, reason: 'stockGamble' };
    }

    if (action.type === 'drawDiscard') {
      const card = state.discard[state.discard.length - 1];
      const best = bestSwapScore(player, card);
      if (best.reason === 'completePair') return { action, score: 90, reason: 'discardCompletesPair' };
      if (best.reason === 'upgradeKnownHigh') return { action, score: 70, reason: 'discardGoodPickup' };
      if (cardValue(card) <= 1) return { action, score: 40, reason: 'discardSafeLow' };
      return { action, score: 10, reason: 'discardRisky' };
    }

    if (action.type === 'discardDrawn') {
      const card = state.pendingDraw!.card;
      const best = bestSwapScore(player, card);
      const score = cardValue(card) >= 7 && best.score < 40 ? 80 : 5;
      return { action, score, reason: 'declineBadDraw' };
    }

    // swap
    const card = state.pendingDraw!.card;
    const slotIndex = action.slotIndex;
    const slot = player.layout[slotIndex];
    if (wouldCompletePair(player, slotIndex, card)) {
      return { action, score: 200, reason: 'completePair' };
    }
    if (slot.faceUp) {
      if (isPartOfMatchedColumn(player, slotIndex)) {
        return { action, score: -500, reason: 'downgradeKnownCard' };
      }
      const delta = cardValue(slot.card) - cardValue(card);
      return delta > 0
        ? { action, score: 100 + delta, reason: 'upgradeKnownHigh' }
        : { action, score: -50 + delta, reason: 'downgradeKnownCard' };
    }
    return { action, score: cardValue(card) <= 3 ? 65 - cardValue(card) : 30 - cardValue(card), reason: 'buryUnknown' };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export function chooseBestAction(state: GameState, seatIndex: number): ScoredAction | null {
  const scored = scoreActions(state, seatIndex);
  return scored[0] ?? null;
}
