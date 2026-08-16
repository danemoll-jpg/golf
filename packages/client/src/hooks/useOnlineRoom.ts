import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyAction,
  BotPersonalityId,
  deriveSoundCues,
  DEFAULT_RULES,
  getHint,
  MoveHint,
  PlayerAction,
  PublicGameState,
  redactState,
  SfxCue,
  TemplateCommentaryProvider,
} from '@golf/engine';
import { isBotTurn, stepBot } from '../lib/bot';
import { commentaryForEvents } from '../lib/commentary';
import { isMuted, playSound, setMuted, SoundName } from '../lib/audio';
import { addScoresToGlobalLeaderboard } from '../network/globalLeaderboard';
import { getClientId } from '../network/clientId';
import {
  addBotSeat as addBotSeatRequest,
  addOpenSeat as addOpenSeatRequest,
  createRoom,
  joinRoom,
  removeSeat as removeSeatRequest,
  resetToLobby,
  RoomDoc,
  setRoomRules,
  startMatch as startMatchRequest,
  subscribeToRoom,
  writeGameState,
} from '../network/rooms';

export interface CommentaryEntry {
  id: string;
  speakerId: string;
  personality: BotPersonalityId;
  text: string;
}

// Deliberately shorter than local play's pause — a single "turn" online can involve
// several chained bot actions (reveal, reveal, draw, swap), each with its own Firestore
// round-trip on top of this delay, so it compounds fast.
const BOT_THINK_MIN_MS = 250;
const BOT_THINK_MAX_MS = 450;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveSoundName(cue: SfxCue, state: PublicGameState | null): SoundName {
  if (cue !== 'matchOver') return cue;
  if (!state || !state.matchWinnerIds || state.matchWinnerIds.length > 1) return 'matchOverDraw';
  const iWon = state.players[state.viewerSeatIndex]?.id === state.matchWinnerIds[0];
  return iWon ? 'matchOverWin' : 'matchOverLose';
}

export interface UseOnlineRoom {
  connected: boolean;
  room: RoomDoc | null;
  code: string | null;
  isHost: boolean;
  mySeatIndex: number;
  error: string | null;
  createAndJoin: (hostName: string, hostIcon: string) => Promise<void>;
  joinExisting: (code: string, name: string, icon: string) => Promise<void>;
  leaveRoom: () => void;
  addOpenSeat: () => void;
  addBotSeat: () => void;
  removeSeat: (index: number) => void;
  setJokersRule: (jokers: boolean) => void;
  begin: () => void;
  publicState: PublicGameState | null;
  /** Human players' chosen avatars, keyed by player id — see GameView's playerIcons prop. */
  playerIcons: Record<string, string>;
  commentary: CommentaryEntry[];
  hint: MoveHint | null;
  muted: boolean;
  toggleMuted: () => void;
  sendAction: (action: PlayerAction) => void;
  requestHint: () => void;
  clearHint: () => void;
  dismissCommentary: (id: string) => void;
  newMatch: () => void;
}

/** Online (Firestore-synced) room: mirrors the shape of the local-play hook, but backed by
 * a shared `rooms/{code}` document instead of in-memory state. See src/network/rooms.ts for
 * the sync model — single writer per turn, host-driven bots, independently re-derived sound
 * cues, shared commentary. */
export function useOnlineRoom(): UseOnlineRoom {
  const myClientId = useMemo(() => getClientId(), []);
  const [code, setCode] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<MoveHint | null>(null);
  const [dismissedSeqs, setDismissedSeqs] = useState<Set<number>>(new Set());
  const [muted, setMutedState] = useState(() => isMuted());

  const lastSeenLogLength = useRef(0);
  const botLoopRunning = useRef(false);
  const commentaryProvider = useRef(new TemplateCommentaryProvider());
  const submittedLeaderboard = useRef(false);

  useEffect(() => {
    if (!code) return undefined;
    const unsubscribe = subscribeToRoom(code, (next) => {
      setRoom(next);
      setError(next ? null : 'That room no longer exists.');
    });
    return unsubscribe;
  }, [code]);

  const mySeatIndex = room?.seats.findIndex((s) => s.clientId === myClientId) ?? -1;
  const isHost = room?.hostClientId === myClientId;
  const gameState = room?.gameState ?? null;

  // Independently re-derive + play sound cues for any newly-arrived events. Deterministic
  // given the same event log, so every connected client computing this separately is fine.
  useEffect(() => {
    if (!gameState) {
      lastSeenLogLength.current = 0;
      return;
    }
    const newEvents = gameState.log.slice(lastSeenLogLength.current);
    lastSeenLogLength.current = gameState.log.length;
    if (newEvents.length === 0) return;
    const publicNow = mySeatIndex >= 0 ? redactState(gameState, room!.seats[mySeatIndex].id) : null;
    for (const cue of deriveSoundCues(newEvents)) playSound(resolveSoundName(cue, publicNow));
  }, [gameState, mySeatIndex, room]);

  // Host's browser drives every bot turn (and every atomic step of it — a bot "turn" here
  // may be several actions in a row: reveal, reveal, draw, then swap or discard).
  useEffect(() => {
    if (!isHost || !code || !room || !gameState) return;
    if (!isBotTurn(gameState)) return;
    if (botLoopRunning.current) return;
    botLoopRunning.current = true;

    let current = gameState;
    let currentRoom = room;
    (async () => {
      while (isBotTurn(current)) {
        await delay(BOT_THINK_MIN_MS + Math.random() * (BOT_THINK_MAX_MS - BOT_THINK_MIN_MS));
        const { state: next, newEvents } = stepBot(current);
        const lines = await commentaryForEvents(commentaryProvider.current, newEvents, next);
        const written = await writeGameState(code, currentRoom, next, lines);
        current = next;
        // Keep our local copy in step with what we just wrote (rather than waiting for the
        // snapshot round-trip) so a second loop iteration doesn't clobber it.
        currentRoom = { ...currentRoom, ...written };
      }
    })().finally(() => {
      botLoopRunning.current = false;
    });
  }, [isHost, code, room, gameState]);

  // Host submits final totals to the shared leaderboard exactly once per finished match —
  // every connected client sees the same matchOver moment via its own subscription, so
  // without this host-only gate, a match's scores would get added once PER connected
  // device instead of once total.
  useEffect(() => {
    if (!isHost || !gameState || gameState.phase !== 'matchOver' || submittedLeaderboard.current) return;
    submittedLeaderboard.current = true;
    // Bots don't compete for leaderboard spots — only human results get submitted, so the
    // board reflects real players, not however well the heuristic bot strategy happens to play.
    const results = gameState.players
      .filter((p) => !p.isBot)
      .map((p) => ({
        name: p.name,
        score: p.holeScores.reduce((a, b) => a + b, 0),
        isAi: false,
      }));
    if (results.length === 0) return;
    addScoresToGlobalLeaderboard(results).catch(() => {
      // Leaderboard is a nice-to-have — a failed write shouldn't disrupt the game-over screen.
    });
  }, [isHost, gameState]);

  const createAndJoin = useCallback(async (hostName: string, hostIcon: string) => {
    setError(null);
    try {
      const newCode = await createRoom(hostName, hostIcon);
      setCode(newCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create a room.');
    }
  }, []);

  const joinExisting = useCallback(async (joinCode: string, name: string, icon: string) => {
    setError(null);
    try {
      const joined = await joinRoom(joinCode, name, icon);
      setCode(joined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join that room.');
    }
  }, []);

  const leaveRoom = useCallback(() => {
    setCode(null);
    setRoom(null);
    setError(null);
    setHint(null);
    setDismissedSeqs(new Set());
  }, []);

  const addOpenSeat = useCallback(() => {
    if (code) addOpenSeatRequest(code).catch((err) => setError(err instanceof Error ? err.message : 'Failed.'));
  }, [code]);

  const addBotSeat = useCallback(() => {
    if (code) addBotSeatRequest(code).catch((err) => setError(err instanceof Error ? err.message : 'Failed.'));
  }, [code]);

  const removeSeat = useCallback(
    (index: number) => {
      if (code) removeSeatRequest(code, index).catch((err) => setError(err instanceof Error ? err.message : 'Failed.'));
    },
    [code],
  );

  const setJokersRule = useCallback(
    (jokers: boolean) => {
      if (code) setRoomRules(code, { jokers }).catch((err) => setError(err instanceof Error ? err.message : 'Failed.'));
    },
    [code],
  );

  const begin = useCallback(() => {
    if (code && room) {
      startMatchRequest(code, room.seats, room.rules ?? DEFAULT_RULES).catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed.'),
      );
    }
  }, [code, room]);

  const publicState = gameState && mySeatIndex >= 0 ? redactState(gameState, room!.seats[mySeatIndex].id) : null;

  const sendAction = useCallback(
    (action: PlayerAction) => {
      if (!code || !room || !gameState || mySeatIndex < 0) return;
      if (gameState.actingSeat !== mySeatIndex) {
        setError("It's not your turn.");
        return;
      }
      setError(null);
      setHint(null);
      (async () => {
        try {
          const prevLogLength = gameState.log.length;
          const next = applyAction(gameState, mySeatIndex, action);
          const newEvents = next.log.slice(prevLogLength);
          const lines = await commentaryForEvents(commentaryProvider.current, newEvents, next);
          await writeGameState(code, room, next, lines);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'That move was rejected.');
        }
      })();
    },
    [code, room, gameState, mySeatIndex],
  );

  const requestHint = useCallback(() => {
    if (!gameState || mySeatIndex < 0) return;
    setHint(getHint(gameState, mySeatIndex));
  }, [gameState, mySeatIndex]);

  const clearHint = useCallback(() => setHint(null), []);

  const dismissCommentary = useCallback((id: string) => {
    const seq = Number(id);
    if (Number.isNaN(seq)) return;
    setDismissedSeqs((prev) => new Set(prev).add(seq));
  }, []);

  const newMatch = useCallback(() => {
    if (code) {
      resetToLobby(code).catch((err) => setError(err instanceof Error ? err.message : 'Failed.'));
      setHint(null);
      setDismissedSeqs(new Set());
      submittedLeaderboard.current = false;
    }
  }, [code]);

  const toggleMuted = useCallback(() => {
    setMutedState((prev) => {
      const next = !prev;
      setMuted(next);
      return next;
    });
  }, []);

  const commentary: CommentaryEntry[] = (room?.commentary ?? [])
    .filter((c) => !dismissedSeqs.has(c.seq))
    .map((c) => ({ id: String(c.seq), speakerId: c.speakerId, personality: c.personality, text: c.text }));

  const playerIcons: Record<string, string> = Object.fromEntries(
    (room?.seats ?? []).filter((s): s is typeof s & { icon: string } => !!s.icon).map((s) => [s.id, s.icon]),
  );

  return {
    connected: room !== null,
    room,
    code,
    isHost,
    mySeatIndex,
    error,
    createAndJoin,
    joinExisting,
    leaveRoom,
    addOpenSeat,
    addBotSeat,
    removeSeat,
    setJokersRule,
    begin,
    publicState,
    playerIcons,
    commentary,
    hint,
    muted,
    toggleMuted,
    sendAction,
    requestHint,
    clearHint,
    dismissCommentary,
    newMatch,
  };
}
