import { GameEvent } from './types.js';

/**
 * Semantic sound cue names, derived from raw engine events so the client doesn't need to
 * infer "what just happened" from state diffs. Independent of commentary (which is gated
 * on a bot existing to "speak") — sound cues fire for every player, every time.
 */
export type SfxCue = 'deal' | 'reveal' | 'draw' | 'swap' | 'discardDrawn' | 'layoutComplete' | 'holeScored' | 'matchOver';

const CUE_BY_EVENT: Partial<Record<GameEvent['type'], SfxCue>> = {
  holeStarted: 'deal',
  revealed: 'reveal',
  drew: 'draw',
  swapped: 'swap',
  discardedDrawn: 'discardDrawn',
  layoutComplete: 'layoutComplete',
  holeScored: 'holeScored',
  matchOver: 'matchOver',
};

/** Maps a batch of raw engine events to the sound cues the client should play, in order. */
export function deriveSoundCues(events: GameEvent[]): SfxCue[] {
  const cues: SfxCue[] = [];
  for (const event of events) {
    const cue = CUE_BY_EVENT[event.type];
    if (cue) cues.push(cue);
  }
  return cues;
}
