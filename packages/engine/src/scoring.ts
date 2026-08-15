import { cardValue, LAYOUT_COLUMNS, LayoutSlot } from './types.js';

/**
 * Scores one player's finished layout for a hole. A matching pair of ranks within the same
 * column (top+bottom) cancels to zero for both cards — everything else counts at its normal
 * Golf value (see RANK_VALUES). Assumes every slot's `card` is populated (true once a hole
 * is being scored — gameEngine flips every slot face-up before calling this).
 */
export function scoreLayout(layout: LayoutSlot[]): number {
  let total = 0;
  for (const [topIndex, bottomIndex] of LAYOUT_COLUMNS) {
    const top = layout[topIndex].card;
    const bottom = layout[bottomIndex].card;
    if (top.rank === bottom.rank) continue; // matched column — zero for both
    total += cardValue(top) + cardValue(bottom);
  }
  return total;
}
