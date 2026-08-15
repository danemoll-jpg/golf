interface HomeScreenProps {
  onSelectLocal: () => void;
  onSelectOnline: () => void;
}

export function HomeScreen({ onSelectLocal, onSelectOnline }: HomeScreenProps) {
  return (
    <div className="start-screen">
      <div className="start-screen__card">
        <h1>⛳ Golf</h1>
        <p className="start-screen__subtitle">
          Also known as Polish Golf, or Polish Poker. Lowest score after 9 holes wins — flip a couple of cards,
          swap in the low ones, and try not to get stuck holding a Queen.
        </p>

        <div className="home-screen__choices">
          <button type="button" className="home-screen__choice" onClick={onSelectLocal}>
            <span className="home-screen__choice-emoji">🏌️</span>
            <span className="home-screen__choice-title">Play against AI</span>
            <span className="home-screen__choice-sub">Just you and this browser — no one else needed.</span>
          </button>
          <button type="button" className="home-screen__choice" onClick={onSelectOnline}>
            <span className="home-screen__choice-emoji">🌐</span>
            <span className="home-screen__choice-title">Play online vs. a friend</span>
            <span className="home-screen__choice-sub">Create a room, share the code, play from anywhere.</span>
          </button>
        </div>
      </div>
    </div>
  );
}
