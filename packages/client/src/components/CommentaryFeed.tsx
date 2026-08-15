import { useEffect } from 'react';
import { PERSONALITIES } from '@golf/engine';
import { CommentaryEntry } from '../hooks/useOnlineRoom';

interface CommentaryFeedProps {
  entries: CommentaryEntry[];
  onDismiss: (id: string) => void;
}

const AUTO_DISMISS_MS = 6500;

export function CommentaryFeed({ entries, onDismiss }: CommentaryFeedProps) {
  const visible = entries.slice(-4);

  return (
    <div className="commentary-feed">
      {visible.map((entry) => (
        <CommentaryToast key={entry.id} entry={entry} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function CommentaryToast({ entry, onDismiss }: { entry: CommentaryEntry; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(entry.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [entry.id, onDismiss]);

  const personality = PERSONALITIES[entry.personality];

  return (
    <div className="commentary-toast">
      <span className="commentary-toast__avatar">{personality.avatar}</span>
      <div>
        <div className="commentary-toast__name">{personality.displayName}</div>
        <div className="commentary-toast__text">{entry.text}</div>
      </div>
    </div>
  );
}
