import { faceDownIndices, getLegalActions, isPartOfMatchedColumn } from '../rules.js';
import { Card, cardValue, GameState, LAYOUT_COLUMNS, PlayerAction, RANK_VALUES, RANKS, Rank } from '../types.js';

/**
 * Heuristic move scorer shared by the bots and the human hint generator, so a hint always
 * matches what a competent bot would actually do — and a bot never has access to
 * information or moves the rules engine wouldn't allow (in particular: it never "knows"
 * the value of a still-face-down card it hasn't drawn). Everything here — including the
 * card-counting in expectedUnseenValue() — only ever uses information a sharp human
 * opponent could work out too: the discard pile and whatever's face-up on the table.
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

function fullDeckRankCounts(includeJokers: boolean): Partial<Record<Rank, number>> {
  const counts: Partial<Record<Rank, number>> = {};
  for (const r of RANKS) counts[r] = 4;
  if (includeJokers) counts.JOKER = 2;
  return counts;
}

/** How many of each rank are currently visible to everyone — the discard pile plus every
 * face-up card in every player's layout (never a face-down card, never the stock). */
function countVisibleByRank(state: GameState): Partial<Record<Rank, number>> {
  const counts: Partial<Record<Rank, number>> = {};
  const bump = (rank: Rank) => {
    counts[rank] = (counts[rank] ?? 0) + 1;
  };
  for (const card of state.discard) bump(card.rank);
  for (const player of state.players) {
    for (const slot of player.layout) {
      if (slot.faceUp) bump(slot.card.rank);
    }
  }
  return counts;
}

/** Expected value of a uniformly random still-unseen card — whatever's left in the stock,
 * or under any player's still-face-down slot — adjusted for everything already visible on
 * the board. This is what makes "bury this in an unknown slot" an actual bet instead of a
 * guess: as high cards get used up, the remaining pool skews lower (worth burying more
 * eagerly); as low cards get used up, it skews higher (burying is less obviously good). */
function expectedUnseenValue(state: GameState): number {
  const total = fullDeckRankCounts(state.rules.jokers);
  const seen = countVisibleByRank(state);
  let sumValue = 0;
  let count = 0;
  for (const rank of Object.keys(total) as Rank[]) {
    const remaining = Math.max(0, (total[rank] ?? 0) - (seen[rank] ?? 0));
    sumValue += remaining * RANK_VALUES[rank];
    count += remaining;
  }
  return count > 0 ? sumValue / count : 0;
}

/** Fewest face-down cards remaining among every OTHER player — a low number means someone
 * could complete their layout very soon and trigger the "everyone else gets one more turn"
 * countdown, which should make a sharp player less willing to spend a turn just declining a
 * card (that costs a forced blind reveal on top of the turn itself). */
function closestOpponentFaceDownCount(state: GameState, seatIndex: number): number {
  let min = Infinity;
  state.players.forEach((p, i) => {
    if (i === seatIndex) return;
    const faceDown = p.layout.filter((s) => !s.faceUp).length;
    if (faceDown < min) min = faceDown;
  });
  return Number.isFinite(min) ? min : 6;
}

/** Scores the best available swap destination for a held card — used both to evaluate a
 * discard-pile pickup before committing to it, and to rank the actual swap options once a
 * card is in hand. */
function bestSwapScore(player: GameState['players'][number], card: Card, avgUnseen: number): { score: number; reason: ReasonTag } {
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
      // Rational bury: better than break-even (score > 50) exactly when this card beats the
      // expected value of whatever's likely still hidden under that slot.
      score = 50 + (avgUnseen - cardValue(card));
      reason = 'buryUnknown';
    }
    if (score > best.score) best = { score, reason };
  }
  return best;
}

/** Scores every legal action for `seatIndex` and returns them best-first. This is the one
 * "brain" behind both the human hint button and every bot's play — difficulty (see
 * chooseBotAction below) only changes how reliably a bot acts on this ranking, never the
 * ranking itself, so a hint is always the strongest advice regardless of who's playing. */
export function scoreActions(state: GameState, seatIndex: number): ScoredAction[] {
  const actions = getLegalActions(state, seatIndex);
  const player = state.players[seatIndex];
  const avgUnseen = expectedUnseenValue(state);

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
      const best = bestSwapScore(player, card, avgUnseen);
      if (best.reason === 'completePair') return { action, score: 90, reason: 'discardCompletesPair' };
      if (best.reason === 'upgradeKnownHigh') return { action, score: 70, reason: 'discardGoodPickup' };
      // A card meaningfully better than a random unseen card is worth taking even with
      // nowhere obvious to put it yet — beats gambling blind on the stock.
      if (cardValue(card) < avgUnseen - 1) return { action, score: 55, reason: 'discardSafeLow' };
      return { action, score: 10, reason: 'discardRisky' };
    }

    if (action.type === 'discardDrawn') {
      const card = state.pendingDraw!.card;
      const best = bestSwapScore(player, card, avgUnseen);
      // Declining costs a whole extra beat (discard, then a forced blind reveal) — a real
      // cost if an opponent could end the hole any turn now, so raise the bar for "bad
      // enough to decline" when time looks short.
      const urgent = closestOpponentFaceDownCount(state, seatIndex) <= 1;
      const badEnoughToDecline = cardValue(card) >= (urgent ? 8 : 6) && best.score < 40;
      return { action, score: badEnoughToDecline ? (urgent ? 45 : 80) : 5, reason: 'declineBadDraw' };
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
    return { action, score: 50 + (avgUnseen - cardValue(card)), reason: 'buryUnknown' };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/** Always the single best-ranked move — this is what the "What should I play?" hint uses,
 * so a hint is never sandbagged and never wrong about what the strongest play actually is. */
export function chooseBestAction(state: GameState, seatIndex: number): ScoredAction | null {
  const scored = scoreActions(state, seatIndex);
  return scored[0] ?? null;
}

export type BotDifficulty = 'easy' | 'normal' | 'hard';

/**
 * Picks a bot's actual move for a given difficulty, drawing from the exact same ranking a
 * hint would use — difficulty only changes how consistently the bot acts on it:
 *  - 'hard' always takes the top-ranked option — a genuinely sharp opponent.
 *  - 'normal' usually takes the best option but sometimes settles for the next-best or an
 *    outright weaker one — competent, beatable, roughly a casual club player.
 *  - 'easy' takes the best option less than half the time — forgiving, good for a newer or
 *    younger player.
 */
export function chooseBotAction(
  state: GameState,
  seatIndex: number,
  difficulty: BotDifficulty = 'normal',
  rng: () => number = Math.random,
): ScoredAction | null {
  const scored = scoreActions(state, seatIndex);
  if (scored.length === 0) return null;
  if (difficulty === 'hard' || scored.length === 1) return scored[0];

  const roll = rng();
  if (difficulty === 'normal') {
    if (roll < 0.72) return scored[0];
    if (roll < 0.92 && scored.length > 1) return scored[1];
    return scored[Math.floor(rng() * scored.length)];
  }

  // easy
  if (roll < 0.35) return scored[0];
  if (roll < 0.65) return scored[Math.floor(rng() * Math.min(3, scored.length))];
  return scored[Math.floor(rng() * scored.length)];
}
