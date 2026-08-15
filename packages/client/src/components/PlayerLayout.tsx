import { LAYOUT_COLUMNS, PublicPlayerView } from '@golf/engine';
import { Card } from './Card';

interface PlayerLayoutProps {
  player: PublicPlayerView;
  avatar: string;
  isActing: boolean;
  isMe: boolean;
  size?: 'sm' | 'lg';
  /** Only meaningful when isMe — which of the 6 slots (by index) can currently be clicked,
   * and what happens when one is. */
  isSlotClickable?: (slotIndex: number) => boolean;
  onSlotClick?: (slotIndex: number) => void;
}

export function PlayerLayout({
  player,
  avatar,
  isActing,
  isMe,
  size = 'lg',
  isSlotClickable,
  onSlotClick,
}: PlayerLayoutProps) {
  const cardSize = size === 'lg' ? 'lg' : 'sm';

  return (
    <div className={`player-layout ${isActing ? 'player-layout--active' : ''} ${isMe ? 'player-layout--me' : ''}`}>
      <div className="player-layout__header">
        <span className="player-layout__avatar">{avatar}</span>
        <span className="player-layout__name">
          {player.name}
          {isMe && ' (you)'}
        </span>
        <span className="player-layout__total" title="Running total after completed holes">
          {player.total}
        </span>
      </div>
      <div className="player-layout__grid">
        {LAYOUT_COLUMNS.map(([topIndex, bottomIndex], colIndex) => (
          <div className="player-layout__column" key={colIndex}>
            {[topIndex, bottomIndex].map((slotIndex) => {
              const slot = player.layout[slotIndex];
              const clickable = isMe && !!isSlotClickable?.(slotIndex);
              return (
                <Card
                  key={slotIndex}
                  card={slot.faceUp ? slot.card : undefined}
                  size={cardSize}
                  playable={clickable}
                  onClick={clickable ? () => onSlotClick?.(slotIndex) : undefined}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
