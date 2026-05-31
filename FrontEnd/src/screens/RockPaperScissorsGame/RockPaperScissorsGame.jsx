import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import './RockPaperScissorsGame.css';

// Game assets
const ICONS = {
  R: '/Rock.png',
  P: '/Paper.png',
  S: '/Scissors.png',
};
const MOVE_NAMES = { R: 'Rock', P: 'Paper', S: 'Scissors' };
const MOVES = ['R', 'P', 'S'];

export default function RockPaperScissorsGame() {
  const navigate = useNavigate();

  // Route auth guard
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) navigate('/login');
    });
    return () => unsub();
  }, [navigate]);

  // Track the player's move history so the game can guess the next choice.
  const counts = useRef({ R: 0, P: 0, S: 0 });
  const afterMove = useRef({
    R: { R: 0, P: 0, S: 0 },
    P: { R: 0, P: 0, S: 0 },
    S: { R: 0, P: 0, S: 0 },
  });
  const beats = { R: 'S', P: 'R', S: 'P' };
  const beatedBy = { R: 'P', P: 'S', S: 'R' };
  const lastMove = useRef(null);

  // Component state
  const [wins, setWins] = useState(0);
  const [draws, setDraws] = useState(0);
  const [losses, setLosses] = useState(0);
  const [result, setResult] = useState(null);   // null when game is idle
  const [aiThinking, setAiThinking] = useState('');
  const [roundLog, setRoundLog] = useState([]);     // list of played rounds
  const [animKey, setAnimKey] = useState(0);      // triggers simple scale animations

  // Use the player's past moves to predict what they may play next.
  function getAIMove() {
    const total = counts.current.R + counts.current.P + counts.current.S;

    if (total < 3) {
      return MOVES[Math.floor(Math.random() * 3)];
    }

    let predicted = null;
    let reason = '';

    if (lastMove.current !== null) {
      const follow = afterMove.current[lastMove.current];
      const followTotal = follow.R + follow.P + follow.S;
      if (followTotal >= 2) {
        predicted = MOVES.reduce((a, b) => follow[a] > follow[b] ? a : b);
        reason = `After ${MOVE_NAMES[lastMove.current]}, you usually play ${MOVE_NAMES[predicted]}`;
      }
    }

    if (predicted === null) {
      predicted = MOVES.reduce((a, b) => counts.current[a] > counts.current[b] ? a : b);
      reason = `You pick ${MOVE_NAMES[predicted]} most often`;
    }

    const aiMove = beatedBy[predicted];
    setAiThinking(`AI thought: ${reason} — so I played ${MOVE_NAMES[aiMove]}`);
    return aiMove;
  }

  // Handle playing one round
  function play(playerMove) {
    const aiMove = getAIMove();

    if (lastMove.current !== null) {
      afterMove.current[lastMove.current][playerMove]++;
    }
    counts.current[playerMove]++;
    lastMove.current = playerMove;

    let outcome;
    if (playerMove === aiMove) outcome = 'DRAW';
    else if (beats[playerMove] === aiMove) outcome = 'WIN';
    else outcome = 'LOSE';

    if (outcome === 'WIN') setWins(w => w + 1);
    else if (outcome === 'DRAW') setDraws(d => d + 1);
    else setLosses(l => l + 1);

    setResult({ playerMove, aiMove, outcome });
    setRoundLog(prev => [{ player: playerMove, ai: aiMove, outcome }, ...prev]);
    setAnimKey(k => k + 1);
  }

  // Clear memory and reset scores
  function resetGame() {
    counts.current = { R: 0, P: 0, S: 0 };
    afterMove.current = {
      R: { R: 0, P: 0, S: 0 },
      P: { R: 0, P: 0, S: 0 },
      S: { R: 0, P: 0, S: 0 },
    };
    lastMove.current = null;
    setWins(0); setDraws(0); setLosses(0);
    setResult(null);
    setAiThinking('');
    setRoundLog([]);
  }

  const resultMeta = result
    ? result.outcome === 'WIN'
      ? { label: 'You Win!', cls: 'rps2-win' }
      : result.outcome === 'DRAW'
        ? { label: "It's a Draw!", cls: 'rps2-draw' }
        : { label: 'AI Wins!', cls: 'rps2-lose' }
    : null;

  return (
    <div className="rps2-page">
      <div className="rps2-body">
        <div className="rps2-card">
          {/* Top navigation header */}
          <div className="rps2-header">
            <button className="rps2-back-btn" onClick={() => navigate('/kidshome')}>
              <img
                src="https://cdn-icons-png.flaticon.com/512/271/271220.png"
                alt="back"
                className="rps2-back-icon"
              />
              Back
            </button>
            <div className="rps2-header-center">
              <img
                src="https://cdn-icons-png.flaticon.com/512/4212/4212448.png"
                alt="game"
                className="rps2-header-icon"
              />
              <div className="rps2-header-text">
                <h1 className="rps2-title">Rock, Paper, Scissors</h1>
                <p className="rps2-subtitle">Challenge the AI — it learns your patterns!</p>
              </div>
            </div>
          </div>

          {/* Scores */}
          <div className="rps2-scoreboard">
            <div className="rps2-score-item rps2-score-you">
              <span className="rps2-score-num">{wins}</span>
              <span className="rps2-score-lbl">You</span>
            </div>
            <div className="rps2-scoreboard-divider" />
            <div className="rps2-score-item rps2-score-draw">
              <span className="rps2-score-num">{draws}</span>
              <span className="rps2-score-lbl">Draw</span>
            </div>
            <div className="rps2-scoreboard-divider" />
            <div className="rps2-score-item rps2-score-ai">
              <span className="rps2-score-num">{losses}</span>
              <span className="rps2-score-lbl">AI</span>
            </div>
          </div>

          {/* Battle outcomes */}
          {result && (
            <div key={animKey} className={`rps2-result-banner ${resultMeta.cls}`}>
              <div className="rps2-battle">
                <div className="rps2-fighter">
                  <span className="rps2-fighter-lbl">You</span>
                  <div className="rps2-fighter-img-wrap rps2-you-wrap">
                    <img src={ICONS[result.playerMove]} alt={MOVE_NAMES[result.playerMove]} className="rps2-fighter-img" />
                  </div>
                  <span className="rps2-fighter-name">{MOVE_NAMES[result.playerMove]}</span>
                </div>
                <div className="rps2-vs">VS</div>
                <div className="rps2-fighter">
                  <span className="rps2-fighter-lbl">AI</span>
                  <div className="rps2-fighter-img-wrap rps2-ai-wrap">
                    <img src={ICONS[result.aiMove]} alt={MOVE_NAMES[result.aiMove]} className="rps2-fighter-img" />
                  </div>
                  <span className="rps2-fighter-name">{MOVE_NAMES[result.aiMove]}</span>
                </div>
              </div>
              <div className={`rps2-outcome-pill ${resultMeta.cls}`}>{resultMeta.label}</div>
            </div>
          )}

          {/* Show a simple explanation of why the opponent chose that move */}
          {aiThinking && (
            <p className="rps2-thinking">{aiThinking}</p>
          )}

          {/* Game controls */}
          <p className="rps2-choose-lbl">{result ? 'Play again?' : 'Choose your move'}</p>
          <div className="rps2-choices">
            {MOVES.map(key => (
              <button
                key={key}
                className={`rps2-choice-btn rps2-btn-${key.toLowerCase()}`}
                onClick={() => play(key)}
              >
                <img src={ICONS[key]} alt={MOVE_NAMES[key]} className="rps2-choice-icon" />
                <span className="rps2-choice-name">{MOVE_NAMES[key]}</span>
              </button>
            ))}
          </div>

          {/* Reset stats */}
          {(wins + draws + losses) > 0 && (
            <button className="rps2-reset-btn" onClick={resetGame}>
              ↺ Reset Game
            </button>
          )}
        </div>

        {/* History column on the right side */}
        <div className="rps2-history">
          <h3 className="rps2-history-title">Round History</h3>
          {roundLog.length === 0 ? (
            <p className="rps2-history-empty">No rounds played yet.<br />Make your first move!</p>
          ) : (
            <div className="rps2-history-list">
              {roundLog.slice(0, 10).map((r, i) => (
                <div
                  key={i}
                  className={`rps2-history-row ${r.outcome === 'WIN' ? 'rps2-win' : r.outcome === 'DRAW' ? 'rps2-draw' : 'rps2-lose'}`}
                >
                  <span className="rps2-hist-round">#{roundLog.length - i}</span>
                  <img src={ICONS[r.player]} alt={MOVE_NAMES[r.player]} className="rps2-hist-icon" />
                  <span className="rps2-hist-vs">vs</span>
                  <img src={ICONS[r.ai]} alt={MOVE_NAMES[r.ai]} className="rps2-hist-icon" />
                  <span className="rps2-hist-outcome">
                    {r.outcome === 'WIN' ? 'You Won' : r.outcome === 'DRAW' ? 'Draw' : 'AI Won'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
