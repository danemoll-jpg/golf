import { HOLES_PER_MATCH, PublicPlayerView } from '@golf/engine';

interface ScoreCardProps {
  players: PublicPlayerView[];
  currentHole: number;
  onClose: () => void;
}

/** The 9-hole running scorecard — same idea as a real golf scorecard, one row per player,
 * one column per hole, plus a running total. Available any time via a button in GameView,
 * not just at match end. */
export function ScoreCard({ players, currentHole, onClose }: ScoreCardProps) {
  const holes = Array.from({ length: HOLES_PER_MATCH }, (_, i) => i + 1);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>📋 Scorecard</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="scorecard-table-wrap">
          <table className="scorecard-table">
            <thead>
              <tr>
                <th>Player</th>
                {holes.map((h) => (
                  <th key={h} className={h === currentHole ? 'scorecard-table__current' : ''}>
                    {h}
                  </th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  {holes.map((h) => (
                    <td key={h} className={h === currentHole ? 'scorecard-table__current' : ''}>
                      {p.holeScores[h - 1] ?? '–'}
                    </td>
                  ))}
                  <td className="scorecard-table__total">{p.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
