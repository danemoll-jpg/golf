import { PublicGameState } from '@golf/engine';
import { Card } from './Card';
import { canDrawDiscard, canDrawStock } from '../lib/legality';

interface PileAreaProps {
  state: PublicGameState;
  onDrawStock: () => void;
  onDrawDiscard: () => void;
}

export function PileArea({ state, onDrawStock, onDrawDiscard }: PileAreaProps) {
  const drawStockOk = canDrawStock(state);
  const drawDiscardOk = canDrawDiscard(state);

  return (
    <div className="pile-area">
      <div className="pile" title={`${state.stockCount} cards left in the stock`}>
        <Card size="md" playable={drawStockOk} onClick={drawStockOk ? onDrawStock : undefined} />
        <span className="pile__label">Stock · {state.stockCount}</span>
      </div>

      <div className="pile" title={`${state.discardCount} cards in the discard pile`}>
        <Card card={state.discardTop} size="md" playable={drawDiscardOk} onClick={drawDiscardOk ? onDrawDiscard : undefined} />
        <span className="pile__label">Discard · {state.discardCount}</span>
      </div>

      {state.pendingDraw && (
        <div className="pile pile--held">
          <Card card={state.pendingDraw} size="md" />
          <span className="pile__label">
            Your draw {state.pendingDrawSource === 'discard' ? '(from discard)' : '(from stock)'}
          </span>
        </div>
      )}
    </div>
  );
}
