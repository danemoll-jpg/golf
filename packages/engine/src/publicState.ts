import { BotPersonalityId, Card, GamePhase, GameState, HoleSummary, MatchRules } from './types.js';

/** A layout slot as any viewer is allowed to see it — `card` is only populated once
 * `faceUp` is true. Unlike Durak's hand privacy (hidden from opponents, visible to the
 * owner), a face-down Golf card is unknown to literally everyone, including its own owner,
 * so this redaction doesn't vary by viewer at all. */
export interface PublicLayoutSlot {
  card?: Card;
  faceUp: boolean;
}

export interface PublicPlayerView {
  id: string;
  name: string;
  isBot: boolean;
  personality?: BotPersonalityId;
  layout: PublicLayoutSlot[];
  holeScores: number[];
  total: number;
}

export interface PublicGameState {
  players: PublicPlayerView[];
  rules: MatchRules;
  stockCount: number;
  discardTop?: Card;
  discardCount: number;
  actingSeat: number;
  /** The card the acting player is currently holding, mid-decision — populated only for
   * the viewer whose own seat is acting; every other viewer (including a spectator) gets
   * `undefined` here even though `pendingDrawSource` (stock vs. discard) is public. */
  pendingDraw?: Card;
  pendingDrawSource?: 'stock' | 'discard';
  awaitingForcedReveal: boolean;
  phase: GamePhase;
  holeNumber: number;
  startingSeat: number;
  finishedBy: string | null;
  finalTurnsRemaining: number;
  matchWinnerIds: string[] | null;
  /** Populated only while `phase === 'holeOver'` — see HoleSummary. Safe to expose in full
   * (including every player's final layout) since the hole it describes has already ended. */
  holeSummary: HoleSummary | null;
  /** Human player ids who've already readied up for the next hole, during 'holeOver'. */
  readyPlayerIds: string[];
  /** Which seat this view was built for. -1 if the viewer isn't seated (spectator). */
  viewerSeatIndex: number;
}

/** Builds the view of `state` that `viewerId` is allowed to see. */
export function redactState(state: GameState, viewerId: string): PublicGameState {
  const viewerSeatIndex = state.players.findIndex((p) => p.id === viewerId);

  return {
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      isBot: p.isBot,
      personality: p.personality,
      layout: p.layout.map((slot) => (slot.faceUp ? { card: slot.card, faceUp: true } : { faceUp: false })),
      holeScores: p.holeScores,
      total: p.holeScores.reduce((a, b) => a + b, 0),
    })),
    rules: state.rules,
    stockCount: state.stock.length,
    discardTop: state.discard[state.discard.length - 1],
    discardCount: state.discard.length,
    actingSeat: state.actingSeat,
    pendingDraw: viewerSeatIndex === state.actingSeat ? (state.pendingDraw?.card ?? undefined) : undefined,
    pendingDrawSource: state.pendingDraw?.source,
    awaitingForcedReveal: state.awaitingForcedReveal,
    phase: state.phase,
    holeNumber: state.holeNumber,
    startingSeat: state.startingSeat,
    finishedBy: state.finishedBy,
    finalTurnsRemaining: state.finalTurnsRemaining,
    matchWinnerIds: state.matchWinnerIds,
    holeSummary: state.holeSummary,
    readyPlayerIds: state.readyPlayerIds,
    viewerSeatIndex,
  };
}
