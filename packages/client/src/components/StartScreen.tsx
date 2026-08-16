import { useState } from 'react';
import { BotDifficulty } from '@golf/engine';
import { unlockAudio } from '../lib/audio';
import { DEFAULT_DIFFICULTY, DIFFICULTY_DESCRIPTIONS, DIFFICULTY_LABELS, DIFFICULTY_OPTIONS } from '../lib/difficulty';
import { DEFAULT_PLAYER_ICON } from '../lib/icons';
import { IconPicker } from './IconPicker';

interface StartScreenProps {
  connected: boolean;
  onStart: (humanName: string, totalPlayers: number, icon: string, jokers: boolean, difficulty: BotDifficulty) => void;
  onBack: () => void;
}

export function StartScreen({ connected, onStart, onBack }: StartScreenProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(DEFAULT_PLAYER_ICON);
  const [totalPlayers, setTotalPlayers] = useState(3);
  const [jokers, setJokers] = useState(false);
  const [difficulty, setDifficulty] = useState<BotDifficulty>(DEFAULT_DIFFICULTY);

  function handleStart() {
    // Browsers require a real user gesture before audio can play — this click is it.
    unlockAudio();
    onStart(name, totalPlayers, icon, jokers, difficulty);
  }

  return (
    <div className="start-screen">
      <div className="start-screen__card">
        <button type="button" className="back-link" onClick={onBack}>
          ‹ Back
        </button>
        <h1>⛳ Golf</h1>
        <p className="start-screen__subtitle">
          Lowest score after 9 holes wins. Flip 2 cards to start, then swap in low ones as you draw — a matched
          pair in a column scores zero.
        </p>

        <label className="start-screen__label">
          What should Ed &amp; Carol call you?
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dan"
            maxLength={20}
          />
        </label>

        <label className="start-screen__label">
          Your avatar
          <IconPicker value={icon} onChange={setIcon} />
        </label>

        <label className="start-screen__label">
          Table size
          <div className="start-screen__options">
            <button type="button" className={totalPlayers === 2 ? 'active' : ''} onClick={() => setTotalPlayers(2)}>
              You vs. 1
            </button>
            <button type="button" className={totalPlayers === 3 ? 'active' : ''} onClick={() => setTotalPlayers(3)}>
              You vs. 2
            </button>
          </div>
        </label>

        <label className="start-screen__label">
          Bot difficulty
          <div className="start-screen__options">
            {DIFFICULTY_OPTIONS.map((d) => (
              <button key={d} type="button" className={difficulty === d ? 'active' : ''} onClick={() => setDifficulty(d)}>
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
          <span className="start-screen__hint">{DIFFICULTY_DESCRIPTIONS[difficulty]}</span>
        </label>

        <label className="start-screen__checkbox">
          <input type="checkbox" checked={jokers} onChange={(e) => setJokers(e.target.checked)} />
          🃏 Play with Jokers (2 extra cards worth -5 each — a house-rule variant)
        </label>

        <button type="button" className="start-screen__submit" disabled={!connected} onClick={handleStart}>
          {connected ? 'Deal the cards ⛳' : 'Connecting…'}
        </button>

        <details className="start-screen__rules">
          <summary>I don't really know how to play — quick rules?</summary>
          <ul>
            <li>You've got 6 face-down cards in a 3×2 grid — flip any 2 of your own to start.</li>
            <li>On your turn, draw from the stock (blind) or take the discard (you know what it is).</li>
            <li>Swap it into any of your 6 slots — the card it replaces goes face-up to the discard pile.</li>
            <li>Drew from the stock and don't want it? Discard it — but you'll have to flip one of your own face-down cards as a penalty.</li>
            <li>Two matching ranks stacked in the same column score zero for both — everything else counts (Ace = 1, Two = -2, 3–10 face value, Jack/Queen = 10, King = 0).</li>
            <li>Once your whole grid is face-up, everyone else gets exactly one more turn, then the hole is scored.</li>
            <li>9 holes, lowest total wins.</li>
            <li>Optional: turn on Jokers below for 2 extra cards worth -5 each — the best card in the deck.</li>
            <li>Pick a bot difficulty below — Easy is forgiving, Hard card-counts and plays sharp.</li>
          </ul>
          <p>Stuck mid-turn? Hit the "What should I play?" button any time.</p>
        </details>
      </div>
    </div>
  );
}
