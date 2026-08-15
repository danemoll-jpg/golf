import { Card, RANKS, SUITS } from './types.js';

/** Builds a standard 52-card deck, unshuffled. With `includeJokers`, adds 2 Jokers on top
 * (54 total) — see MatchRules.jokers. Jokers use the placeholder 'X' suit and aren't part
 * of the SUITS × RANKS cross product since they don't belong to a real suit. */
export function buildDeck(includeJokers = false): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ suit, rank });
    }
  }
  if (includeJokers) {
    cards.push({ suit: 'X', rank: 'JOKER' }, { suit: 'X', rank: 'JOKER' });
  }
  return cards;
}

/** Fisher-Yates shuffle. Accepts a custom RNG (0-1 range) so tests can be deterministic. */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Builds a fresh shuffled draw pile (draw from the end via pop()). */
export function freshShuffledDeck(rng: () => number = Math.random, includeJokers = false): Card[] {
  return shuffle(buildDeck(includeJokers), rng);
}
