import { GameState, LAYOUT_COLUMNS, LAYOUT_SIZE, PlayerAction, PlayerState } from './types.js';

export function faceDownIndices(player: PlayerState): number[] {
  const indices: number[] = [];
  for (let i = 0; i < player.layout.length; i++) {
    if (!player.layout[i].faceUp) indices.push(i);
  }
  return indices;
}

export function isLayoutComplete(player: PlayerState): boolean {
  return player.layout.every((slot) => slot.faceUp);
}

/** True if `slotIndex` is the second half of an already-matched (scoring-zero) column —
 * used by the bot heuristic to avoid breaking up a good pair for no reason. Not a legality
 * rule; swapping a matched slot is always allowed. */
export function isPartOfMatchedColumn(player: PlayerState, slotIndex: number): boolean {
  const column = LAYOUT_COLUMNS.find((c) => c.includes(slotIndex));
  if (!column) return false;
  const [a, b] = column;
  const slotA = player.layout[a];
  const slotB = player.layout[b];
  return slotA.faceUp && slotB.faceUp && slotA.card.rank === slotB.card.rank;
}

export function nextSeat(playerCount: number, from: number): number {
  return (from + 1) % playerCount;
}

/** Next seat in turn order, skipping `finishedBy`'s seat once the final-turns countdown is
 * underway — that player doesn't get another turn this hole. */
export function nextTurnSeat(state: GameState): number {
  const n = state.players.length;
  let idx = nextSeat(n, state.actingSeat);
  if (state.phase === 'finalTurns') {
    const finishedIndex = state.players.findIndex((p) => p.id === state.finishedBy);
    if (idx === finishedIndex) idx = nextSeat(n, idx);
  }
  return idx;
}

/** Computes the legal actions for whichever seat is currently allowed to act. */
export function getLegalActions(state: GameState, seatIndex: number): PlayerAction[] {
  if (state.phase === 'matchOver' || state.actingSeat !== seatIndex) return [];
  const player = state.players[seatIndex];

  if (state.awaitingForcedReveal) {
    return faceDownIndices(player).map((slotIndex) => ({ type: 'reveal', slotIndex }));
  }

  if (state.phase === 'revealing') {
    return faceDownIndices(player).map((slotIndex) => ({ type: 'reveal', slotIndex }));
  }

  // 'playing' or 'finalTurns'
  if (!state.pendingDraw) {
    const actions: PlayerAction[] = [{ type: 'drawStock' }];
    if (state.discard.length > 0) actions.push({ type: 'drawDiscard' });
    return actions;
  }

  const actions: PlayerAction[] = [];
  for (let i = 0; i < LAYOUT_SIZE; i++) actions.push({ type: 'swap', slotIndex: i });
  if (state.pendingDraw.source === 'stock') actions.push({ type: 'discardDrawn' });
  return actions;
}

export function isActionLegal(state: GameState, seatIndex: number, action: PlayerAction): boolean {
  const legal = getLegalActions(state, seatIndex);
  return legal.some((a) => {
    if (a.type !== action.type) return false;
    if (a.type === 'reveal' && action.type === 'reveal') return a.slotIndex === action.slotIndex;
    if (a.type === 'swap' && action.type === 'swap') return a.slotIndex === action.slotIndex;
    return true;
  });
}
