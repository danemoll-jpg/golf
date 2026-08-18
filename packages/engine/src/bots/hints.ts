import { cardLabel, GameState, PlayerAction } from '../types.js';
import { chooseBestAction, ReasonTag } from './strategy.js';

export interface MoveHint {
  action: PlayerAction;
  headline: string;
  rationale: string;
}

function describeAction(action: PlayerAction): string {
  switch (action.type) {
    case 'reveal':
      return 'Flip a face-down card';
    case 'drawStock':
      return 'Draw blind from the stock';
    case 'drawDiscard':
      return 'Take the discard';
    case 'swap':
      return `Play it into slot ${action.slotIndex + 1}`;
    case 'discardDrawn':
      return "Discard it — don't use it";
    case 'readyForNextHole':
      return 'Ready up for the next hole';
  }
}

const RATIONALE: Record<ReasonTag, string> = {
  blindReveal: "Doesn't matter which — you've got no information either way, so any face-down card is as good a guess as another.",
  lastFaceDown: "It's your last face-down card — flipping it finishes your layout.",
  onlyOption: "It's your only legal move right now.",
  discardCompletesPair: 'That card matches one already face-up in a column — take it and lock in a zero for that pair.',
  discardGoodPickup: "You know exactly what it is, and it's better than a card you're already showing — a safe, informed upgrade.",
  discardSafeLow: "It's a cheap, low-value card — worth grabbing even without a specific slot in mind yet.",
  discardRisky: "It's not a great card, and taking it tells your opponents what you're up to — probably better to gamble on the stock instead.",
  stockGamble: 'Nobody gets to see what it is until you commit — but it keeps your plans hidden, and the discard card on offer isn\'t worth taking.',
  completePair: 'That completes a matching pair in the column — both cards score zero. Take it.',
  upgradeKnownHigh: "That's a real improvement over the card sitting there now — go ahead and swap it in.",
  downgradeKnownCard: "This would make your layout worse — only do this if every other slot is worse still.",
  buryUnknown: "You don't know what's under there, so swapping it in loses no information — a safe place to stash this card.",
  declineBadDraw: "It's an expensive card and nothing in your layout wants it — better to discard it and take the one-flip penalty than lock in a bad number.",
};

/** Suggests the best move for `seatIndex` using the same heuristic the bots use, in plain
 * English — this is the "What should I play?" button's whole implementation, so a hint can
 * never suggest something illegal and a bot can never cheat by seeing more than this. */
export function getHint(state: GameState, seatIndex: number): MoveHint | null {
  const best = chooseBestAction(state, seatIndex);
  if (!best) return null;
  return {
    action: best.action,
    headline: describeAction(best.action),
    rationale: RATIONALE[best.reason],
  };
}
