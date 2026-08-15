interface Section {
  heading: string;
  body?: string;
  items?: Array<[string, string]>;
}

const SECTIONS: Section[] = [
  {
    heading: 'Objective',
    body: 'Score as little as possible, like golf the sport, over 9 "holes" — lowest total wins.',
  },
  {
    heading: 'Setup',
    body: "You've got 6 face-down cards in a 3×2 grid. At the start of each hole, flip any 2 of your own cards face-up — everyone at the table can see them, but your other 4 stay a mystery to everyone, including you, until they get flipped later.",
  },
  {
    heading: 'Your Turn',
    body: 'Draw either the top of the stock (face-down — you\'re the only one who sees it) or the top of the discard pile (face-up — everyone already knows what it is). Then either swap it into any of your 6 slots — the card it replaces goes face-up onto the discard pile — or, only if you drew from the stock, discard it unused instead.',
  },
  {
    heading: "Declining a stock card",
    body: "If you draw from the stock and don't want it, you can discard it without playing it — but that costs you a blind flip of one of your own still-face-down cards as a penalty (waived if you're already down to your last one).",
  },
  {
    heading: 'Scoring a card',
    items: [
      ['Ace', '1 point'],
      ['2', '−2 points (the one card you actually want!)'],
      ['3 – 10', 'Face value'],
      ['Jack / Queen', '10 points'],
      ['King', '0 points'],
    ],
  },
  {
    heading: 'Matching pairs',
    body: 'Two cards of the same rank stacked in the same column (top + bottom) score zero for both, no matter what the rank is — even a pair of Jacks. This is the whole game: hunt for pairs, dodge Jacks and Queens.',
  },
  {
    heading: 'Ending a hole',
    body: "The instant any player's entire grid is face-up, everyone else gets exactly one more turn, then every remaining face-down card gets flipped and the hole is scored.",
  },
  {
    heading: 'Winning',
    body: 'After 9 holes, whoever has the lowest running total wins the match. Check the 📋 Scorecard button any time to see where everyone stands.',
  },
];

const JOKERS_SECTION: Section = {
  heading: 'Optional: Jokers',
  body: "A house-rule variant, 2 extra cards added to the deck, worth -5 each — the best card you can hold. They swap and score exactly like any other card, including the pair rule: two Jokers stacked in the same column cancel to zero, just like any matching pair, even though keeping them apart would score better.",
};

interface HowToPlayProps {
  onClose: () => void;
  /** Whether Jokers are active in the current match, if there is one — undefined (e.g. the
   * pre-game screens) just shows the rule as background info without an ON/OFF badge. */
  jokersInThisMatch?: boolean;
}

export function HowToPlay({ onClose, jokersInThisMatch }: HowToPlayProps) {
  const sections =
    jokersInThisMatch === undefined
      ? [...SECTIONS, JOKERS_SECTION]
      : [...SECTIONS, { ...JOKERS_SECTION, body: `${JOKERS_SECTION.body} This match: ${jokersInThisMatch ? 'ON 🃏' : 'OFF'}.` }];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>❓ How to Play</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="how-to-play__body">
          {sections.map((section) => (
            <div key={section.heading} className="how-to-play__section">
              <h3>{section.heading}</h3>
              {section.items ? (
                <ul>
                  {section.items.map(([name, desc]) => (
                    <li key={name}>
                      <strong>{name}</strong> — {desc}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{section.body}</p>
              )}
            </div>
          ))}
        </div>
        <p className="how-to-play__footer">
          Stuck mid-turn? Close this and tap <strong>🤔 What should I play?</strong> for a live suggestion.
        </p>
      </div>
    </div>
  );
}
