// Runs one bot decision using the shared heuristic strategy. Used identically by local
// (vs-bots) games and, in online rooms, by the host's browser stepping a bot seat.
import { applyAction, chooseBestAction, GameEvent, GameState } from '@golf/engine';

export interface BotStepResult {
  state: GameState;
  newEvents: GameEvent[];
}

export function isBotTurn(state: GameState): boolean {
  return state.phase !== 'matchOver' && state.players[state.actingSeat]?.isBot === true;
}

/** Applies exactly one bot decision using the shared heuristic strategy. A single call may
 * only draw (leaving the same bot still acting to decide swap/discard next) — the caller
 * loops via isBotTurn until it's a human's turn again. */
export function stepBot(state: GameState): BotStepResult {
  const seatIndex = state.actingSeat;
  const decision = chooseBestAction(state, seatIndex);
  if (!decision) throw new Error(`Bot at seat ${seatIndex} has no legal action available`);
  const prevLogLength = state.log.length;
  const next = applyAction(state, seatIndex, decision.action);
  return { state: next, newEvents: next.log.slice(prevLogLength) };
}
