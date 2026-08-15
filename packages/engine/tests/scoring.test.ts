import { describe, expect, it } from 'vitest';
import { Card, LayoutSlot, scoreLayout } from '../src/index.js';

function layoutOf(ranks: Card['rank'][]): LayoutSlot[] {
  const suits: Card['suit'][] = ['S', 'H', 'D', 'C', 'S', 'H'];
  return ranks.map((rank, i) => ({ card: { rank, suit: suits[i] }, faceUp: true }));
}

describe('scoreLayout', () => {
  it('sums plain card values with no matches', () => {
    // Columns: [A,3]=1+3=4, [10,K]=10+0=10, [J,5]=10+5=15 -> 29
    const layout = layoutOf(['A', '3', '10', 'K', 'J', '5']);
    expect(scoreLayout(layout)).toBe(29);
  });

  it('scores Twos as -2', () => {
    const layout = layoutOf(['2', '2', 'K', 'K', 'K', 'K']);
    // Column [2,2] would normally match to zero (same rank) — use different suits already,
    // rank still matches -> zero. Use non-matching pair to isolate the -2 value instead.
    const isolated = layoutOf(['2', '5', 'K', 'K', 'K', 'K']);
    expect(scoreLayout(isolated)).toBe(-2 + 5 + 0 + 0 + 0 + 0);
    expect(scoreLayout(layout)).toBe(0); // matched column of 2s cancels
  });

  it('cancels a matching column pair to zero regardless of value', () => {
    // Column [J,J] would be 10+10=20 unmatched-value-wise, but matches -> 0.
    const layout = layoutOf(['J', 'J', 'A', '2', 'K', 'K']);
    expect(scoreLayout(layout)).toBe(0 + (1 + -2) + 0);
  });

  it('does not cancel a same-rank pair split across different columns', () => {
    // Both Kings, but in different columns — Kings score 0 anyway, so use Jacks instead.
    const layout = layoutOf(['J', 'A', 'J', '2', 'K', 'K']);
    expect(scoreLayout(layout)).toBe((10 + 1) + (10 + -2) + 0);
  });

  it('scores a Joker as -5, the best card in the deck', () => {
    const layout = layoutOf(['JOKER', '5', 'K', 'K', 'K', 'K']);
    expect(scoreLayout(layout)).toBe(-5 + 5);
  });

  it('cancels two Jokers stacked in the same column to zero, same as any other matched pair', () => {
    // A documented quirk, not a bug: -5 + -5 = -10 would be even better, but the generic
    // "same rank in a column cancels" rule doesn't special-case Jokers.
    const layout = layoutOf(['JOKER', 'JOKER', 'A', '2', 'K', 'K']);
    expect(scoreLayout(layout)).toBe(0 + (1 + -2) + 0);
  });
});
