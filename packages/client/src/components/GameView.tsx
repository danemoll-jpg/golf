import { ReactNode, useState } from 'react';
import { MoveHint, PlayerAction, PublicGameState } from '@golf/engine';
import { CommentaryFeed } from './CommentaryFeed';
import { HintPanel } from './HintPanel';
import { HoleSummaryScreen } from './HoleSummaryScreen';
import { HowToPlay } from './HowToPlay';
import { LeaderboardPanel } from './LeaderboardPanel';
import { MatchOverScreen } from './MatchOverScreen';
import { PileArea } from './PileArea';
import { PlayerLayout } from './PlayerLayout';
import { ScoreCard } from './ScoreCard';
import { SoundToggle } from './SoundToggle';
import { CommentaryEntry } from '../hooks/useOnlineRoom';
import { canDiscardDrawn, canReveal, canSwap, isMyTurn } from '../lib/legality';
import { seatAvatar } from '../lib/players';

interface GameViewProps {
  publicState: PublicGameState;
  /** Human players' chosen avatars, keyed by player id — bots resolve their avatar from
   * `personality` instead, via seatAvatar(). */
  playerIcons: Record<string, string>;
  commentary: CommentaryEntry[];
  hint: MoveHint | null;
  error: string | null;
  connected: boolean;
  muted: boolean;
  toggleMuted: () => void;
  sendAction: (action: PlayerAction) => void;
  requestHint: () => void;
  clearHint: () => void;
  dismissCommentary: (id: string) => void;
  newMatch: () => void;
  headerExtra?: ReactNode;
}

/** The actual table screen — shared by local (vs-bots) and online (Firestore room) play,
 * since both hooks expose the same PublicGameState-shaped view of the match. */
export function GameView({
  publicState,
  playerIcons,
  commentary,
  hint,
  error,
  connected,
  muted,
  toggleMuted,
  sendAction,
  requestHint,
  clearHint,
  dismissCommentary,
  newMatch,
  headerExtra,
}: GameViewProps) {
  const [showScorecard, setShowScorecard] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const me = publicState.players[publicState.viewerSeatIndex];
  const opponents = publicState.players.filter((_, i) => i !== publicState.viewerSeatIndex);
  const myTurn = isMyTurn(publicState);
  const acting = publicState.players[publicState.actingSeat];

  function avatarFor(p: PublicGameState['players'][number]): string {
    return seatAvatar({ type: p.isBot ? 'bot' : 'human', personality: p.personality, icon: playerIcons[p.id] });
  }

  function isSlotClickable(slotIndex: number): boolean {
    if (canReveal(publicState)) return !me.layout[slotIndex].faceUp;
    return canSwap(publicState);
  }

  function handleSlotClick(slotIndex: number) {
    if (canReveal(publicState) && !me.layout[slotIndex].faceUp) {
      sendAction({ type: 'reveal', slotIndex });
    } else if (canSwap(publicState)) {
      sendAction({ type: 'swap', slotIndex });
    }
  }

  function statusText(): string {
    if (!myTurn) return acting ? `Waiting on ${acting.name}…` : '';
    if (publicState.awaitingForcedReveal) return "Flip one of your face-down cards — the price of not using that draw.";
    if (publicState.phase === 'revealing') return 'Flip 2 of your own cards to start the hole.';
    if (publicState.pendingDraw) {
      return publicState.pendingDrawSource === 'discard'
        ? 'Play it into one of your 6 slots.'
        : 'Play it into a slot, or discard it.';
    }
    return 'Draw from the stock, or take the discard.';
  }

  return (
    <div className="app">
      <SoundToggle muted={muted} onToggle={toggleMuted} />
      {headerExtra}
      {!connected && <div className="error-banner">Disconnected — try refreshing.</div>}
      {error && <div className="error-banner">{error}</div>}

      <div className="hole-banner">
        <span>
          Hole {publicState.holeNumber} of 9
          {publicState.finishedBy && (
            <span className="hole-banner__final"> · final turns ({publicState.finalTurnsRemaining} left)</span>
          )}
          {publicState.rules.jokers && <span className="hole-banner__jokers" title="2 Jokers are in this deck, worth -5 each"> · 🃏 Jokers</span>}
        </span>
        <span className="hole-banner__buttons">
          <button type="button" onClick={() => setShowScorecard(true)}>
            📋 Scorecard
          </button>
          <button type="button" onClick={() => setShowLeaderboard(true)}>
            🏆 Leaderboard
          </button>
          <button type="button" onClick={() => setShowHowToPlay(true)}>
            ❓ How to Play
          </button>
        </span>
      </div>

      <div className="opponents-row">
        {opponents.map((p) => (
          <PlayerLayout
            key={p.id}
            player={p}
            avatar={avatarFor(p)}
            isActing={publicState.actingSeat !== -1 && publicState.players[publicState.actingSeat]?.id === p.id}
            isMe={false}
            size="sm"
          />
        ))}
      </div>

      <PileArea
        state={publicState}
        onDrawStock={() => sendAction({ type: 'drawStock' })}
        onDrawDiscard={() => sendAction({ type: 'drawDiscard' })}
      />

      <div className="status-bar">
        <span className="status-bar__prompt">{statusText()}</span>
      </div>

      <div className="action-bar">
        <button type="button" disabled={!canDiscardDrawn(publicState)} onClick={() => sendAction({ type: 'discardDrawn' })}>
          Discard it
        </button>
        <HintPanel hint={hint} canRequest={myTurn} onRequest={requestHint} onDismiss={clearHint} />
      </div>

      <div className="my-area">
        <PlayerLayout
          player={me}
          avatar={avatarFor(me)}
          isActing={myTurn}
          isMe
          size="lg"
          isSlotClickable={isSlotClickable}
          onSlotClick={handleSlotClick}
        />
      </div>

      <CommentaryFeed entries={commentary} onDismiss={dismissCommentary} />

      {showScorecard && (
        <ScoreCard players={publicState.players} currentHole={publicState.holeNumber} onClose={() => setShowScorecard(false)} />
      )}
      {showLeaderboard && <LeaderboardPanel onClose={() => setShowLeaderboard(false)} />}
      {showHowToPlay && <HowToPlay onClose={() => setShowHowToPlay(false)} jokersInThisMatch={publicState.rules.jokers} />}
      {publicState.phase === 'holeOver' && publicState.holeSummary && (
        <HoleSummaryScreen
          key={publicState.holeSummary.holeNumber}
          state={publicState}
          onReady={() => sendAction({ type: 'readyForNextHole' })}
        />
      )}
      {publicState.phase === 'matchOver' && <MatchOverScreen state={publicState} onPlayAgain={newMatch} />}
    </div>
  );
}
