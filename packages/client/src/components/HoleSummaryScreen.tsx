import { useState } from 'react';
import { LAYOUT_COLUMNS, PublicGameState } from '@golf/engine';
import { Card } from './Card';

interface HoleSummaryScreenProps {
  state: PublicGameState;
  onReady: () => void;
}

/** Shown between holes — what everyone was left holding (their full 6-card layout, all
 * face-up by the time a hole ends) and how many strokes it cost them this hole, plus their
 * new running total. Play is paused here: it only continues once every human player (bots
 * auto-ready instantly) has clicked through, whether the match is local, online, or on its
 * very last hole heading into the match-over screen. */
export function HoleSummaryScreen({ state, onReady }: HoleSummaryScreenProps) {
  const summary = state.holeSummary;
  const [justClicked, setJustClicked] = useState(false);
  if (!summary) return null;

  const me = state.viewerSeatIndex >= 0 ? state.players[state.viewerSeatIndex] : undefined;
  const iAmHuman = !!me && !me.isBot;
  const iAmReady = justClicked || (!!me && state.readyPlayerIds.includes(me.id));
  const waitingOn = state.players.filter((p) => !p.isBot && !state.readyPlayerIds.includes(p.id) && p.id !== me?.id);

  const nameFor = (id: string) => state.players.find((p) => p.id === id)?.name ?? id;
  const lowestScore = Math.min(...summary.players.map((p) => p.holeScore));
  const sorted = [...summary.players].sort((a, b) => a.holeScore - b.holeScore);

  function handleReady() {
    setJustClicked(true);
    onReady();
  }

  return (
    <div className="game-over">
      <div className="game-over__card">
        <div className="game-over__emoji">⛳</div>
        <h2>Hole {summary.holeNumber} complete</h2>
        <p>{summary.isFinalHole ? "Every layout's revealed — that was the last hole!" : "Every layout's revealed."}</p>

        <div className="hole-summary-list">
          {sorted.map((p) => (
            <div key={p.playerId} className={`hole-summary-row ${p.holeScore === lowestScore ? 'hole-summary-row--best' : ''}`}>
              <div className="hole-summary-row__header">
                <span className="hole-summary-row__name">{nameFor(p.playerId)}</span>
                <span className="hole-summary-row__score">
                  {p.holeScore >= 0 ? '+' : ''}
                  {p.holeScore} pts <span className="hole-summary-row__total">· {p.total} total</span>
                </span>
              </div>
              <div className="hole-summary-row__layout">
                {LAYOUT_COLUMNS.map(([topIndex, bottomIndex], colIndex) => (
                  <div className="hole-summary-row__column" key={colIndex}>
                    {[topIndex, bottomIndex].map((slotIndex) => (
                      <Card key={slotIndex} card={p.layout[slotIndex].card} size="sm" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {iAmHuman && !iAmReady && (
          <button type="button" className="game-over__button" onClick={handleReady}>
            {summary.isFinalHole ? 'See final results 🏆' : 'Next hole →'}
          </button>
        )}
        {(!iAmHuman || iAmReady) && (
          <p className="hole-summary__waiting">
            {waitingOn.length > 0 ? `Waiting on ${waitingOn.map((p) => p.name).join(', ')}…` : 'Starting…'}
          </p>
        )}
      </div>
    </div>
  );
}
