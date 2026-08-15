import { Card as CardType, SUIT_SYMBOLS } from '@golf/engine';

interface CardProps {
  card?: CardType; // undefined = face-down back
  playable?: boolean;
  faded?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  style?: React.CSSProperties;
  title?: string;
}

export function Card({ card, playable, faded, size = 'md', onClick, style, title }: CardProps) {
  const isJoker = card?.rank === 'JOKER';
  const isRed = card && (card.suit === 'H' || card.suit === 'D');
  const classNames = ['card', `card--${size}`];
  if (!card) classNames.push('card--back');
  if (playable) classNames.push('card--playable');
  if (faded) classNames.push('card--faded');
  if (onClick) classNames.push('card--clickable');
  if (isJoker) classNames.push('card--joker');

  const color = isJoker ? 'var(--gold)' : isRed ? 'var(--suit-red)' : 'var(--suit-black)';

  return (
    <button
      type="button"
      className={classNames.join(' ')}
      onClick={onClick}
      disabled={!onClick}
      style={{ color, ...style }}
      title={title ?? (isJoker ? 'Joker — worth -5, the best card in the deck' : undefined)}
    >
      {card ? (
        isJoker ? (
          <span className="card__joker-face">
            <span className="card__pip">🃏</span>
            <span className="card__joker-label">JOKER</span>
          </span>
        ) : (
          <>
            <span className="card__corner card__corner--top">
              {card.rank}
              <br />
              {SUIT_SYMBOLS[card.suit]}
            </span>
            <span className="card__pip">{SUIT_SYMBOLS[card.suit]}</span>
            <span className="card__corner card__corner--bottom">
              {card.rank}
              <br />
              {SUIT_SYMBOLS[card.suit]}
            </span>
          </>
        )
      ) : (
        <span className="card__back-pattern">⛳</span>
      )}
    </button>
  );
}
