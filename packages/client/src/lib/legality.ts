// Lightweight client-side "can I do this right now?" checks, used only for
// highlighting/disabling controls in the UI. The engine is still the sole source of
// truth — applyAction re-validates every action via @golf/engine's rules — so nothing here
// needs to be exhaustively airtight, just a good-faith mirror of the real rules.
import { PublicGameState } from '@golf/engine';

export function isMyTurn(state: PublicGameState): boolean {
  return state.actingSeat === state.viewerSeatIndex;
}

export function canReveal(state: PublicGameState): boolean {
  if (!isMyTurn(state)) return false;
  return state.awaitingForcedReveal || state.phase === 'revealing';
}

export function canDrawStock(state: PublicGameState): boolean {
  return isMyTurn(state) && !state.awaitingForcedReveal && !state.pendingDraw && (state.phase === 'playing' || state.phase === 'finalTurns');
}

export function canDrawDiscard(state: PublicGameState): boolean {
  return canDrawStock(state) && state.discardCount > 0;
}

export function canSwap(state: PublicGameState): boolean {
  return isMyTurn(state) && !!state.pendingDraw;
}

export function canDiscardDrawn(state: PublicGameState): boolean {
  return canSwap(state) && state.pendingDrawSource === 'stock';
}
