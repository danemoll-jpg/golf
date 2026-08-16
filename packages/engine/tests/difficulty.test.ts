import { describe, expect, it } from 'vitest';
import {
  applyAction,
  BotDifficulty,
  chooseBotAction,
  createMatch,
  EngineConfig,
  getCurrentLegalActions,
  GameState,
} from '../src/index.js';

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

/** A fixed sequence of "rng rolls" for deterministically testing chooseBotAction's own
 * selection policy in isolation, independent of game-state randomness. */
function fixedRolls(...rolls: number[]): () => number {
  let i = 0;
  return () => rolls[Math.min(i++, rolls.length - 1)];
}

function playMatchWithDifficulties(difficulties: BotDifficulty[], seed: number): GameState {
  const rng = seededRng(seed);
  const playerConfigs: EngineConfig['playerConfigs'] = difficulties.map((_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    isBot: true,
  }));
  let state = createMatch({ playerConfigs, rng });

  let steps = 0;
  const MAX_STEPS = 20000;
  while (state.phase !== 'matchOver') {
    const legal = getCurrentLegalActions(state)!;
    const decision = chooseBotAction(state, legal.seatIndex, difficulties[legal.seatIndex], rng);
    if (!decision) throw new Error(`No legal action for seat ${legal.seatIndex}`);
    state = applyAction(state, legal.seatIndex, decision.action, rng);
    steps += 1;
    if (steps > MAX_STEPS) throw new Error(`Match did not terminate within ${MAX_STEPS} steps`);
  }
  return state;
}

function totalOf(state: GameState, playerId: string): number {
  return state.players.find((p) => p.id === playerId)!.holeScores.reduce((a, b) => a + b, 0);
}

describe('chooseBotAction selection policy', () => {
  it("'hard' always takes the top-ranked action regardless of the rng roll", () => {
    const rng = seededRng(1);
    const state = createMatch({ playerConfigs: [{ id: 'p0', name: 'P0', isBot: true }], rng });
    // High rolls would trigger a "settle for worse" branch on lower difficulties.
    const decision = chooseBotAction(state, 0, 'hard', fixedRolls(0.99, 0.99, 0.99));
    const best = chooseBotAction(state, 0, 'hard', fixedRolls(0.01));
    expect(decision).toEqual(best);
  });

  it("'normal' settles for a worse action on a high roll, where 'hard' would not", () => {
    const rng = seededRng(2);
    let state = createMatch({ playerConfigs: [{ id: 'p0', name: 'P0', isBot: true }], rng });
    // Get past the reveal phase (where every option scores identically, so there's nothing
    // to distinguish) into a real decision with more than one legal action.
    while (state.phase === 'revealing' || !state.pendingDraw) {
      const legal = getCurrentLegalActions(state)!;
      const decision = chooseBotAction(state, legal.seatIndex, 'hard', rng);
      state = applyAction(state, legal.seatIndex, decision!.action, rng);
    }
    const hardChoice = chooseBotAction(state, state.actingSeat, 'hard', fixedRolls(0.99));
    const normalChoiceHighRoll = chooseBotAction(state, state.actingSeat, 'normal', fixedRolls(0.99, 0.5));
    const normalChoiceLowRoll = chooseBotAction(state, state.actingSeat, 'normal', fixedRolls(0.01));
    expect(normalChoiceLowRoll).toEqual(hardChoice); // low roll -> still takes the best option
    // A high roll should differ from hard's pick whenever there IS a worse option available
    // to settle for (guaranteed here since swap always offers 6 slots).
    expect(normalChoiceHighRoll).not.toEqual(hardChoice);
  });
});

describe('difficulty actually matters', () => {
  it('a hard bot beats an easy bot more often than not over many matches', () => {
    const SEEDS = 40;
    let hardWins = 0;
    let easyWins = 0;
    let hardTotalSum = 0;
    let easyTotalSum = 0;

    for (let seed = 1; seed <= SEEDS; seed++) {
      const state = playMatchWithDifficulties(['hard', 'easy'], seed);
      const hardTotal = totalOf(state, 'p0');
      const easyTotal = totalOf(state, 'p1');
      hardTotalSum += hardTotal;
      easyTotalSum += easyTotal;
      if (hardTotal < easyTotal) hardWins += 1;
      else if (easyTotal < hardTotal) easyWins += 1;
    }

    // Golf is a hidden-information game with real luck (which cards you actually draw) —
    // hard shouldn't win literally every match, but it should win comfortably more often
    // than easy does, and its average score should be meaningfully lower over enough trials.
    expect(hardWins).toBeGreaterThan(easyWins);
    expect(hardTotalSum / SEEDS).toBeLessThan(easyTotalSum / SEEDS);
  });

  it('a hard bot also outplays a normal bot on average over many matches', () => {
    const SEEDS = 40;
    let hardTotalSum = 0;
    let normalTotalSum = 0;

    for (let seed = 1; seed <= SEEDS; seed++) {
      const state = playMatchWithDifficulties(['hard', 'normal'], seed + 1000);
      hardTotalSum += totalOf(state, 'p0');
      normalTotalSum += totalOf(state, 'p1');
    }

    expect(hardTotalSum / SEEDS).toBeLessThan(normalTotalSum / SEEDS);
  });
});
