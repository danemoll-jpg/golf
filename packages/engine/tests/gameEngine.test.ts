import { describe, expect, it } from 'vitest';
import {
  applyAction,
  chooseBestAction,
  createMatch,
  EngineConfig,
  getCurrentLegalActions,
  GameState,
  HOLES_PER_MATCH,
} from '../src/index.js';

/** Deterministic seeded RNG (mulberry32) so simulated games are reproducible. */
function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function totalCardsInPlay(state: GameState): number {
  const inLayouts = state.players.reduce((sum, p) => sum + p.layout.length, 0);
  return state.stock.length + state.discard.length + inLayouts + (state.pendingDraw ? 1 : 0);
}

function makeConfig(playerCount: number): EngineConfig['playerConfigs'] {
  return Array.from({ length: playerCount }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i}`,
    isBot: true,
  }));
}

/** Plays a full 9-hole match with every seat driven by the shared bot heuristic, asserting
 * card conservation after every single action. Bounded step count guards against an
 * infinite loop actually hanging the test suite if a future change breaks turn advancement. */
function playFullMatch(playerCount: number, seed: number, rules?: EngineConfig['rules']): GameState {
  const rng = seededRng(seed);
  const expectedCards = rules?.jokers ? 54 : 52;
  let state = createMatch({ playerConfigs: makeConfig(playerCount), rules, rng });
  expect(totalCardsInPlay(state)).toBe(expectedCards);

  let steps = 0;
  const MAX_STEPS = 20000;
  while (state.phase !== 'matchOver') {
    const legal = getCurrentLegalActions(state);
    expect(legal).not.toBeNull();
    const decision = chooseBestAction(state, legal!.seatIndex);
    expect(decision).not.toBeNull();
    state = applyAction(state, legal!.seatIndex, decision!.action, rng);
    expect(totalCardsInPlay(state)).toBe(expectedCards);

    steps += 1;
    if (steps > MAX_STEPS) throw new Error(`Match did not terminate within ${MAX_STEPS} steps`);
  }
  return state;
}

describe('createMatch', () => {
  it('deals 6 face-down cards to every player and starts hole 1 in the revealing phase', () => {
    const state = createMatch({ playerConfigs: makeConfig(3), rng: seededRng(1) });
    expect(state.holeNumber).toBe(1);
    expect(state.phase).toBe('revealing');
    expect(state.discard).toHaveLength(1);
    for (const p of state.players) {
      expect(p.layout).toHaveLength(6);
      expect(p.layout.every((slot) => !slot.faceUp)).toBe(true);
      expect(p.revealsRemaining).toBe(2);
    }
    expect(totalCardsInPlay(state)).toBe(52);
  });
});

describe('reveal phase', () => {
  it('moves to the playing phase once every player has revealed exactly 2 cards', () => {
    let state = createMatch({ playerConfigs: makeConfig(2), rng: seededRng(2) });
    // Each seat reveals both of its own cards (staying the acting seat) before the turn
    // moves on to the next seat's reveals.
    for (let seat = 0; seat < 2; seat++) {
      for (let round = 0; round < 2; round++) {
        expect(state.actingSeat).toBe(seat);
        state = applyAction(state, seat, { type: 'reveal', slotIndex: round }, seededRng(2));
      }
    }
    expect(state.phase).toBe('playing');
    expect(state.actingSeat).toBe(state.startingSeat);
  });
});

describe('full simulated matches', () => {
  for (const playerCount of [2, 3, 4]) {
    for (const seed of [1, 2, 3]) {
      it(`completes a ${playerCount}-player match (seed ${seed}) with conserved cards and a decided winner`, () => {
        const state = playFullMatch(playerCount, seed);
        expect(state.phase).toBe('matchOver');
        expect(state.matchWinnerIds).not.toBeNull();
        expect(state.matchWinnerIds!.length).toBeGreaterThan(0);
        for (const p of state.players) {
          expect(p.holeScores).toHaveLength(HOLES_PER_MATCH);
        }

        const totals = state.players.map((p) => p.holeScores.reduce((a, b) => a + b, 0));
        const lowest = Math.min(...totals);
        for (const winnerId of state.matchWinnerIds!) {
          const player = state.players.find((p) => p.id === winnerId)!;
          expect(player.holeScores.reduce((a, b) => a + b, 0)).toBe(lowest);
        }
      });
    }
  }
});

describe('Jokers house rule', () => {
  it('deals from a 54-card deck (52 + 2 Jokers) when enabled', () => {
    const state = createMatch({ playerConfigs: makeConfig(3), rules: { jokers: true }, rng: seededRng(7) });
    expect(totalCardsInPlay(state)).toBe(54);
    const jokerCount = state.players.flatMap((p) => p.layout).filter((s) => s.card.rank === 'JOKER').length
      + state.stock.filter((c) => c.rank === 'JOKER').length
      + state.discard.filter((c) => c.rank === 'JOKER').length;
    expect(jokerCount).toBe(2);
  });

  it('deals from the standard 52-card deck when disabled (the default)', () => {
    const state = createMatch({ playerConfigs: makeConfig(3), rng: seededRng(7) });
    expect(totalCardsInPlay(state)).toBe(52);
    expect(state.rules.jokers).toBe(false);
  });

  for (const seed of [1, 2, 3]) {
    it(`completes a 3-player match with Jokers enabled (seed ${seed}), 54 cards conserved throughout`, () => {
      const state = playFullMatch(3, seed, { jokers: true });
      expect(state.phase).toBe('matchOver');
      expect(state.rules.jokers).toBe(true);
    });
  }
});
