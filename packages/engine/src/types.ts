// Core types for the Golf engine. Kept framework-free so this package can be used
// identically by local play, online play, the bots, and the hint generator.
//
// "Golf" here means the classic 6-card version (aka Polish Golf / Polish Poker): each
// player has a 3x2 grid of cards, starts by revealing 2 of their own face-up, and tries to
// swap in low cards over 9 holes. Lowest cumulative score after 9 holes wins.

// 'X' is the placeholder suit for a Joker — it doesn't belong to a real suit, but every
// card needs one so the rest of the engine (rendering, the Card type) doesn't need to
// special-case a suitless card.
export type Suit = 'S' | 'H' | 'D' | 'C' | 'X';
export const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C'];
export const SUIT_SYMBOLS: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣', X: '🃏' };
export const SUIT_NAMES: Record<Suit, string> = {
  S: 'Spades',
  H: 'Hearts',
  D: 'Diamonds',
  C: 'Clubs',
  X: 'Joker',
};

export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'JOKER';
/** The 13 standard ranks — deliberately excludes JOKER, since this drives the suit×rank
 * cross product that builds the 52-card deck (see deck.ts) and a Joker isn't part of any
 * suit. Jokers are added on top, separately, only when the house rule is enabled. */
export const RANKS: readonly Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/** Golf scoring value per rank — Ace low (1), Two is a penalty card (-2), face cards are
 * 10 except King which is the prized zero, and a Joker (house-rule only) is the best card
 * in the deck at -5. Distinct from "rank order" (there isn't one — Golf has no
 * trick-taking, cards only ever compare by this score). */
export const RANK_VALUES: Record<Rank, number> = {
  A: 1,
  '2': -2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 10,
  Q: 10,
  K: 0,
  JOKER: -5,
};

export interface Card {
  suit: Suit;
  rank: Rank;
}

export function cardId(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function cardsEqual(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

export function cardLabel(card: Card): string {
  return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
}

export function cardValue(card: Card): number {
  return RANK_VALUES[card.rank];
}

/** One of a player's 6 layout positions. `card` is always present in engine state — even
 * face-down — but nobody (not even the owner) is allowed to know it until it's flipped.
 * `redactState` strips `card` off of any slot where `faceUp` is false before it goes out
 * over the wire, so this is the one place in the whole engine that models "unknown to
 * literally everyone" information, unlike Durak's "unknown to opponents only" hands. */
export interface LayoutSlot {
  card: Card;
  faceUp: boolean;
}

/** Layout indices pair up into 3 columns: [0,1], [2,3], [4,5]. A matching pair within a
 * column scores zero for both cards — see scoring.ts. */
export const LAYOUT_COLUMNS: readonly [number, number][] = [
  [0, 1],
  [2, 3],
  [4, 5],
];
export const LAYOUT_SIZE = 6;

export type BotPersonalityId = 'ed' | 'carol';

export interface PlayerState {
  id: string;
  name: string;
  isBot: boolean;
  personality?: BotPersonalityId;
  layout: LayoutSlot[];
  /** How many of this player's own reveals are still owed during the 'revealing' phase
   * (starts at 2, each `reveal` action decrements it). */
  revealsRemaining: number;
  /** One entry appended per completed hole (index 0 = hole 1). */
  holeScores: number[];
}

/** The card currently held after drawing, before it's been placed or discarded. Only
 * meaningful for `actingSeat` — nobody else, including a spectator, gets to see its value
 * (`redactState` strips it for every other viewer). */
export interface PendingDraw {
  source: 'stock' | 'discard';
  card: Card;
}

export type GamePhase = 'revealing' | 'playing' | 'finalTurns' | 'matchOver';

/** Structured events emitted by the engine as it plays — the seam commentary/sound cues
 * hook into. */
export type GameEvent =
  | { type: 'matchStarted'; playerOrder: string[] }
  | { type: 'holeStarted'; holeNumber: number; startingSeat: number }
  | { type: 'revealed'; by: string; slotIndex: number; forced: boolean }
  | { type: 'drew'; by: string; source: 'stock' | 'discard' }
  | { type: 'swapped'; by: string; slotIndex: number; cardOut: Card; cardIn: Card; greatPlay: boolean }
  | { type: 'discardedDrawn'; by: string }
  | { type: 'layoutComplete'; by: string }
  | { type: 'holeScored'; holeNumber: number; scores: Array<{ playerId: string; score: number; total: number }> }
  | { type: 'matchOver'; winnerIds: string[]; isDraw: boolean };

/** Optional house rules, fixed for the whole match (chosen at setup, before hole 1 is
 * dealt) — not secret, so it's fine to expose in PublicGameState too. */
export interface MatchRules {
  /** Adds 2 Jokers to the deck (54 cards total instead of 52), each worth -5 — the best
   * card in the deck. A well-documented Golf house rule, off by default since it's not
   * part of the base game. */
  jokers: boolean;
}

export const DEFAULT_RULES: MatchRules = { jokers: false };

export interface GameState {
  players: PlayerState[];
  rules: MatchRules;
  /** Draw pile; draw from the end (pop). */
  stock: Card[];
  /** Discard pile; top of pile is the last element. */
  discard: Card[];
  actingSeat: number;
  pendingDraw: PendingDraw | null;
  /** True right after declining a stock draw with 2+ face-down cards left — the acting
   * player owes one forced reveal before their turn can end. */
  awaitingForcedReveal: boolean;
  phase: GamePhase;
  holeNumber: number;
  /** Seat that leads this hole (reveals/plays first); rotates hole to hole. */
  startingSeat: number;
  /** Player id who first completed their layout this hole, triggering the final-turns
   * countdown. Null until that happens. */
  finishedBy: string | null;
  /** Counts down once per OTHER player's completed turn after `finishedBy` is set; hole is
   * scored when this hits 0. */
  finalTurnsRemaining: number;
  log: GameEvent[];
  /** Set once phase is 'matchOver' — lowest total wins; more than one id means a tie. */
  matchWinnerIds: string[] | null;
}

export interface EngineConfig {
  playerConfigs: Array<{ id: string; name: string; isBot: boolean; personality?: BotPersonalityId }>;
  /** Optional house rules for the whole match — defaults to DEFAULT_RULES (no Jokers) if omitted. */
  rules?: MatchRules;
  /** Optional seeded RNG for deterministic tests. */
  rng?: () => number;
}

export type RevealAction = { type: 'reveal'; slotIndex: number };
export type DrawStockAction = { type: 'drawStock' };
export type DrawDiscardAction = { type: 'drawDiscard' };
export type SwapAction = { type: 'swap'; slotIndex: number };
export type DiscardDrawnAction = { type: 'discardDrawn' };

export type PlayerAction = RevealAction | DrawStockAction | DrawDiscardAction | SwapAction | DiscardDrawnAction;

export interface LegalActions {
  seatIndex: number;
  actions: PlayerAction[];
}

export const HOLES_PER_MATCH = 9;
