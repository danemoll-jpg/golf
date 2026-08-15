import { BotPersonalityId, GameEvent, GameState, PlayerState } from '../types.js';
import { CommentaryKey, PERSONALITIES } from './personalities.js';
import { CommentaryLine, CommentaryProvider } from './types.js';

type BotPlayer = PlayerState & { personality: BotPersonalityId };

type BaseKey = 'holeStart' | 'greatPlay' | 'layoutComplete' | 'holeWon' | 'matchWin' | 'matchDraw';

interface BaseEvent {
  key: BaseKey;
  actorId?: string;
}

function baseEventFor(event: GameEvent): BaseEvent | null {
  switch (event.type) {
    case 'holeStarted':
      return { key: 'holeStart' };
    case 'swapped':
      return event.greatPlay ? { key: 'greatPlay', actorId: event.by } : null;
    case 'layoutComplete':
      return { key: 'layoutComplete', actorId: event.by };
    case 'holeScored': {
      // Only call out a clear winner of the hole — a tie for lowest score is skipped
      // rather than arbitrarily picking one of the tied players to congratulate.
      const lowest = Math.min(...event.scores.map((s) => s.score));
      const winners = event.scores.filter((s) => s.score === lowest);
      if (winners.length !== 1) return null;
      return { key: 'holeWon', actorId: winners[0].playerId };
    }
    case 'matchOver':
      return event.isDraw ? { key: 'matchDraw' } : { key: 'matchWin', actorId: event.winnerIds[0] };
    default:
      return null;
  }
}

function resolveKey(base: BaseEvent, speakerId: string): CommentaryKey {
  if (base.key === 'holeStart' || base.key === 'matchDraw') return base.key;
  const isSelf = base.actorId === speakerId;
  return `${base.key}${isSelf ? 'Self' : 'Other'}` as CommentaryKey;
}

function fillTemplate(template: string, event: GameEvent, state: GameState): string {
  const nameOf = (id: string) => state.players.find((p) => p.id === id)?.name ?? id;
  let text = template;
  if (event.type === 'holeStarted') {
    text = text.replaceAll('{hole}', String(event.holeNumber));
  } else if (event.type === 'swapped' || event.type === 'layoutComplete') {
    text = text.replaceAll('{player}', nameOf(event.by));
  } else if (event.type === 'holeScored') {
    const lowest = Math.min(...event.scores.map((s) => s.score));
    const winner = event.scores.find((s) => s.score === lowest);
    if (winner) text = text.replaceAll('{player}', nameOf(winner.playerId));
  } else if (event.type === 'matchOver' && event.winnerIds[0]) {
    text = text.replaceAll('{player}', nameOf(event.winnerIds[0]));
  }
  return text;
}

/** Picks who speaks. Carol always gets first refusal on reacting to a great play — that
 * needling "ooh, look at YOU" reaction is her defining trait — and otherwise talks about
 * twice as often as the quieter Ed, matching their personalities. */
function pickSpeaker(bots: BotPlayer[], baseKey: BaseKey): BotPlayer {
  if (baseKey === 'greatPlay') {
    const carol = bots.find((b) => b.personality === 'carol');
    if (carol) return carol;
  }
  const weighted: BotPlayer[] = [];
  for (const b of bots) {
    for (let i = 0; i < (b.personality === 'carol' ? 2 : 1); i++) weighted.push(b);
  }
  return weighted[Math.floor(Math.random() * weighted.length)];
}

/**
 * Default commentary source: randomized templated one-liners, keyed off engine events. No
 * network calls, no API key required. Implements {@link CommentaryProvider}, so a future
 * Claude-powered provider can be swapped in without touching game logic.
 */
export class TemplateCommentaryProvider implements CommentaryProvider {
  private lastLineByPersonality = new Map<string, string>();

  onEvent(event: GameEvent, state: GameState): CommentaryLine[] {
    const base = baseEventFor(event);
    if (!base) return [];

    const bots = state.players.filter(
      (p): p is PlayerState & { personality: NonNullable<PlayerState['personality']> } => p.isBot && !!p.personality,
    );
    if (bots.length === 0) return [];
    const speaker = pickSpeaker(bots, base.key);

    const key = resolveKey(base, speaker.id);
    const pool = PERSONALITIES[speaker.personality].lines[key];
    if (!pool || pool.length === 0) return [];

    const last = this.lastLineByPersonality.get(speaker.personality);
    const candidates = pool.length > 1 ? pool.filter((l) => l !== last) : pool;
    const template = candidates[Math.floor(Math.random() * candidates.length)];
    this.lastLineByPersonality.set(speaker.personality, template);

    return [{ speakerId: speaker.id, personality: speaker.personality, text: fillTemplate(template, event, state) }];
  }
}
