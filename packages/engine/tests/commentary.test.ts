import { describe, expect, it } from 'vitest';
import { EngineConfig, GameState, PERSONALITIES, TemplateCommentaryProvider } from '../src/index.js';

function stateWith(playerConfigs: EngineConfig['playerConfigs']): GameState {
  // Minimal fabricated state — TemplateCommentaryProvider only reads state.players (for
  // names/personalities/isBot), so nothing else needs to be realistic here.
  return {
    players: playerConfigs.map((pc) => ({
      id: pc.id,
      name: pc.name,
      isBot: pc.isBot,
      personality: pc.personality,
      layout: [],
      revealsRemaining: 0,
      holeScores: [],
    })),
    rules: { jokers: false },
    stock: [],
    discard: [],
    actingSeat: 0,
    pendingDraw: null,
    awaitingForcedReveal: false,
    phase: 'playing',
    holeNumber: 1,
    startingSeat: 0,
    finishedBy: null,
    finalTurnsRemaining: 0,
    log: [],
    matchWinnerIds: null,
  };
}

function greatPlayEvent(by: string) {
  return {
    type: 'swapped' as const,
    by,
    slotIndex: 0,
    cardOut: { suit: 'S' as const, rank: 'Q' as const },
    cardIn: { suit: 'H' as const, rank: 'A' as const },
    greatPlay: true,
  };
}

describe('named relationship overrides', () => {
  it("Ed calls a player named Dan 'son' on a great play — never his generic reaction", () => {
    const state = stateWith([
      { id: 'ed', name: 'Ed', isBot: true, personality: 'ed' },
      { id: 'dan', name: 'Dan', isBot: false },
    ]);
    const provider = new TemplateCommentaryProvider();
    const lines = provider.onEvent(greatPlayEvent('dan'), state);
    expect(lines).toHaveLength(1);
    expect(lines[0].speakerId).toBe('ed');
    expect(PERSONALITIES.ed.namedOverrides!.dan!.greatPlayOther).toContain(lines[0].text);
    expect(PERSONALITIES.ed.lines.greatPlayOther).not.toContain(lines[0].text);
  });

  it("matches the name case-insensitively and ignores surrounding whitespace", () => {
    const state = stateWith([
      { id: 'ed', name: 'Ed', isBot: true, personality: 'ed' },
      { id: 'dan', name: '  DAN  ', isBot: false },
    ]);
    const provider = new TemplateCommentaryProvider();
    const lines = provider.onEvent(greatPlayEvent('dan'), state);
    expect(PERSONALITIES.ed.namedOverrides!.dan!.greatPlayOther).toContain(lines[0].text);
  });

  it('Carol goes soft on a player named Juliana instead of her usual needling', () => {
    const state = stateWith([
      { id: 'carol', name: 'Carol', isBot: true, personality: 'carol' },
      { id: 'juliana', name: 'Juliana', isBot: false },
    ]);
    const provider = new TemplateCommentaryProvider();
    const lines = provider.onEvent(greatPlayEvent('juliana'), state);
    expect(lines[0].speakerId).toBe('carol');
    expect(PERSONALITIES.carol.namedOverrides!.juliana!.greatPlayOther).toContain(lines[0].text);
    expect(PERSONALITIES.carol.lines.greatPlayOther).not.toContain(lines[0].text);
  });

  it('falls back to the normal reaction pool for anyone without a special relationship', () => {
    const state = stateWith([
      { id: 'ed', name: 'Ed', isBot: true, personality: 'ed' },
      { id: 'stranger', name: 'Bob', isBot: false },
    ]);
    const provider = new TemplateCommentaryProvider();
    const lines = provider.onEvent(greatPlayEvent('stranger'), state);
    expect(PERSONALITIES.ed.lines.greatPlayOther).toContain(lines[0].text);
  });

  it("Ed sometimes gets to react to his wife's great play with the spouse lines, instead of Carol always speaking first", () => {
    const state = stateWith([
      { id: 'ed', name: 'Ed', isBot: true, personality: 'ed' },
      { id: 'carol', name: 'Carol', isBot: true, personality: 'carol' },
    ]);
    const provider = new TemplateCommentaryProvider();

    let edSpoke = false;
    for (let i = 0; i < 300; i++) {
      const lines = provider.onEvent(greatPlayEvent('carol'), state);
      expect(lines).toHaveLength(1);
      if (lines[0].speakerId === 'ed') {
        edSpoke = true;
        expect(PERSONALITIES.ed.namedOverrides!.carol!.greatPlayOther).toContain(lines[0].text);
      } else {
        // Carol reacting to her own great play — self-congratulatory, not a named override.
        expect(lines[0].speakerId).toBe('carol');
        expect(PERSONALITIES.carol.lines.greatPlaySelf).toContain(lines[0].text);
      }
    }
    expect(edSpoke).toBe(true);
  });

  it("Carol still reacts first (with her needling lines) when someone ELSE makes a great play and she isn't the actor", () => {
    const state = stateWith([
      { id: 'ed', name: 'Ed', isBot: true, personality: 'ed' },
      { id: 'carol', name: 'Carol', isBot: true, personality: 'carol' },
      { id: 'stranger', name: 'Bob', isBot: false },
    ]);
    const provider = new TemplateCommentaryProvider();
    const lines = provider.onEvent(greatPlayEvent('stranger'), state);
    expect(lines[0].speakerId).toBe('carol');
    const substituted = PERSONALITIES.carol.lines.greatPlayOther.map((t) => t.replaceAll('{player}', 'Bob'));
    expect(substituted).toContain(lines[0].text);
  });
});
