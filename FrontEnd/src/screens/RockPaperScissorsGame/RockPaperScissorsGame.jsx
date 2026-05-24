import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';
import './RockPaperScissorsGame.css';

// ── Icon URLs from CDN ─────────────────────────────────────────────────────────
const ICONS = {
  Rock:     'https://cdn-icons-png.flaticon.com/512/5132/5132948.png',
  Paper:    'https://cdn-icons-png.flaticon.com/512/5133/5133043.png',
  Scissors: 'https://cdn-icons-png.flaticon.com/512/5133/5133100.png',
};

const MOVE_KEYS  = ['R', 'P', 'S'];
const MOVE_NAMES = { R: 'Rock', P: 'Paper', S: 'Scissors' };

// ── AI Logic (ported from rps_game.py) ────────────────────────────────────────
function createAI() {
  let counts    = { R: 0, P: 0, S: 0 };
  let afterMove = {
    R: { R: 0, P: 0, S: 0 },
    P: { R: 0, P: 0, S: 0 },
    S: { R: 0, P: 0, S: 0 },
  };
  const beats    = { R: 'S', P: 'R', S: 'P' };
  const beatenBy = { R: 'P', P: 'S', S: 'R' };
  let lastMove = null;

  function getAIMove() {
    const total = counts.R + counts.P + counts.S;
    let predicted = null;

    if (total < 3) return { aiMove: 'P', predicted: null };

    if (lastMove !== null) {
      const follow = afterMove[lastMove];
      const followTotal = follow.R + follow.P + follow.S;
      if (followTotal >= 2) {
        predicted = MOVE_KEYS.reduce((a, b) => follow[a] > follow[b] ? a : b);
      }
    }

    if (predicted === null) {
      predicted = MOVE_KEYS.reduce((a, b) => counts[a] > counts[b] ? a : b);
    }

    const aiMove = beatenBy[predicted];
    return { aiMove, predicted };
  }

  function updateMemory(playerMove) {
    if (lastMove !== null) {
      afterMove[lastMove][playerMove] += 1;
    }
    counts[playerMove] += 1;
    lastMove = playerMove;
  }

  function determineOutcome(playerMove, aiMove) {
    if (playerMove === aiMove) return 'DRAW';
    if (beats[playerMove] === aiMove) return 'YOU WIN';
    return 'AI WINS';
  }

  function playRound(playerMove) {
    const { aiMove, predicted } = getAIMove();
    updateMemory(playerMove);
    const outcome = determineOutcome(playerMove, aiMove);
    return { aiMove, predicted, outcome };
  }

  function reset() {
    counts    = { R: 0, P: 0, S: 0 };
    afterMove = {
      R: { R: 0, P: 0, S: 0 },
      P: { R: 0, P: 0, S: 0 },
      S: { R: 0, P: 0, S: 0 },
    };
    lastMove = null;
  }

  return { playRound, reset };
}

// ── Animated countdown ────────────────────────────────────────────────────────
function useCountdown(onDone) {
  const [count, setCount] = useState(null);
  const timerRef = useRef(null);

  function start() {
    setCount(3);
  }

  useEffect(() => {
    if (count === null) return;
    if (count === 0) {
      setCount(null);
      onDone();
      return;
    }
    timerRef.current = setTimeout(() => setCount(c => c - 1), 700);
    return () => clearTimeout(timerRef.current);
  }, [count]); // eslint-disable-line

  return { count, start };
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function RockPaperScissorsGame() {
  const navigate   = useNavigate();
  const aiRef      = useRef(createAI());

  // Auth
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, u => {
      if (!u) navigate('/login');
    });
    return () => unsub();
  }, [navigate]);

  // Screen: 'menu' | 'countdown' | 'reveal' | 'result'
  const [screen,      setScreen]      = useState('menu');
  const [playerMove,  setPlayerMove]  = useState(null);
  const [aiMove,      setAiMove]      = useState(null);
  const [outcome,     setOutcome]     = useState(null);
  const [roundLog,    setRoundLog]    = useState([]);

  // Score
  const [wins,   setWins]   = useState(0);
  const [draws,  setDraws]  = useState(0);
  const [losses, setLosses] = useState(0);

  const pendingPlayerMove = useRef(null);

  // ── Countdown → reveal ─────────────────────────────────────────────────────
  const { count, start: startCountdown } = useCountdown(() => {
    const pm = pendingPlayerMove.current;
    const { aiMove: am, outcome: oc } = aiRef.current.playRound(pm);
    setAiMove(am);
    setOutcome(oc);
    if (oc === 'YOU WIN') setWins(w => w + 1);
    else if (oc === 'DRAW') setDraws(d => d + 1);
    else setLosses(l => l + 1);
    setRoundLog(prev => [...prev, { player: pm, ai: am, outcome: oc }]);
    setScreen('reveal');
  });

  function handleChoice(move) {
    pendingPlayerMove.current = move;
    setPlayerMove(move);
    setAiMove(null);
    setOutcome(null);
    setScreen('countdown');
    startCountdown();
  }

  function handlePlayAgain() {
    setScreen('menu');
    setPlayerMove(null);
    setAiMove(null);
    setOutcome(null);
  }

  function handleReset() {
    aiRef.current.reset();
    setWins(0); setDraws(0); setLosses(0);
    setRoundLog([]);
    handlePlayAgain();
  }

  const total = wins + draws + losses;

  // ── MENU ───────────────────────────────────────────────────────────────────
  if (screen === 'menu' || screen === 'countdown') {
    return (
      <div className="rps-page">
        {/* Back button */}
        <button className="rps-back-btn" onClick={() => navigate('/kidshome')}>
          <img src="https://cdn-icons-png.flaticon.com/512/271/271220.png" alt="back" className="rps-back-icon" />
          Back to Home
        </button>

        <div className="rps-card">
          {/* Header */}
          <div className="rps-header">
            <h1 className="rps-title">Rock, Paper, Scissors</h1>
            <p className="rps-subtitle">Challenge the AI — it learns your moves!</p>
          </div>

          {/* Scoreboard */}
          {total > 0 && (
            <div className="rps-scoreboard">
              <div className="rps-score-item rps-score-win">
                <span className="rps-score-num">{wins}</span>
                <span className="rps-score-lbl">You</span>
              </div>
              <div className="rps-score-item rps-score-draw">
                <span className="rps-score-num">{draws}</span>
                <span className="rps-score-lbl">Draw</span>
              </div>
              <div className="rps-score-item rps-score-lose">
                <span className="rps-score-num">{losses}</span>
                <span className="rps-score-lbl">AI</span>
              </div>
            </div>
          )}

          {/* Countdown overlay */}
          {screen === 'countdown' && (
            <div className="rps-countdown-overlay">
              <div className="rps-countdown-ring">
                <span className="rps-countdown-num">{count}</span>
              </div>
              <p className="rps-countdown-label">Get ready…</p>
            </div>
          )}

          {/* Choice buttons */}
          {screen === 'menu' && (
            <>
              <p className="rps-choose-label">Choose your move</p>
              <div className="rps-choices">
                {MOVE_KEYS.map(key => (
                  <button
                    key={key}
                    className={`rps-choice-btn rps-${key.toLowerCase()}`}
                    onClick={() => handleChoice(key)}
                  >
                    <img
                      src={ICONS[MOVE_NAMES[key]]}
                      alt={MOVE_NAMES[key]}
                      className="rps-choice-icon"
                      draggable="false"
                    />
                    <span className="rps-choice-name">{MOVE_NAMES[key]}</span>
                  </button>
                ))}
              </div>

              {total > 0 && (
                <button className="rps-reset-btn" onClick={handleReset}>
                  <img src="https://cdn-icons-png.flaticon.com/512/10435/10435525.png" alt="reset" className="rps-reset-icon" />
                  Reset Game
                </button>
              )}
            </>
          )}
        </div>

        {/* Round history */}
        {roundLog.length > 0 && (
          <div className="rps-history-wrap">
            <h3 className="rps-history-title">Round History</h3>
            <div className="rps-history-list">
              {[...roundLog].reverse().slice(0, 5).map((r, i) => (
                <div
                  key={i}
                  className={`rps-history-row ${r.outcome === 'YOU WIN' ? 'win' : r.outcome === 'DRAW' ? 'draw' : 'lose'}`}
                >
                  <img src={ICONS[MOVE_NAMES[r.player]]} alt={MOVE_NAMES[r.player]} className="rps-hist-icon" />
                  <span className="rps-hist-vs">vs</span>
                  <img src={ICONS[MOVE_NAMES[r.ai]]} alt={MOVE_NAMES[r.ai]} className="rps-hist-icon" />
                  <span className="rps-hist-outcome">{r.outcome}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── REVEAL ─────────────────────────────────────────────────────────────────
  const outcomeClass = outcome === 'YOU WIN' ? 'win' : outcome === 'DRAW' ? 'draw' : 'lose';
  const outcomeLabel = outcome === 'YOU WIN' ? 'You Win!' : outcome === 'DRAW' ? "It's a Draw!" : 'AI Wins!';
  const outcomeIcon  = outcome === 'YOU WIN'
    ? 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png'
    : outcome === 'DRAW'
    ? 'https://cdn-icons-png.flaticon.com/512/1828/1828843.png'
    : 'https://cdn-icons-png.flaticon.com/512/2706/2706950.png';

  return (
    <div className="rps-page">
      <button className="rps-back-btn" onClick={() => navigate('/kidshome')}>
        <img src="https://cdn-icons-png.flaticon.com/512/271/271220.png" alt="back" className="rps-back-icon" />
        Back to Home
      </button>

      <div className={`rps-card rps-reveal-card ${outcomeClass}`}>
        {/* Result banner */}
        <div className={`rps-result-banner ${outcomeClass}`}>
          <img src={outcomeIcon} alt={outcomeLabel} className="rps-result-icon" />
          <span className="rps-result-text">{outcomeLabel}</span>
        </div>

        {/* Moves display */}
        <div className="rps-battle">
          {/* Player */}
          <div className="rps-battle-side rps-player-side">
            <p className="rps-battle-label">You</p>
            <div className="rps-battle-card player-card">
              <img src={ICONS[MOVE_NAMES[playerMove]]} alt={MOVE_NAMES[playerMove]} className="rps-battle-icon" />
            </div>
            <p className="rps-battle-name">{MOVE_NAMES[playerMove]}</p>
          </div>

          <div className="rps-battle-vs">VS</div>

          {/* AI */}
          <div className="rps-battle-side rps-ai-side">
            <p className="rps-battle-label">AI</p>
            <div className="rps-battle-card ai-card">
              <img src={ICONS[MOVE_NAMES[aiMove]]} alt={MOVE_NAMES[aiMove]} className="rps-battle-icon" />
            </div>
            <p className="rps-battle-name">{MOVE_NAMES[aiMove]}</p>
          </div>
        </div>

        {/* Scoreboard */}
        <div className="rps-scoreboard">
          <div className="rps-score-item rps-score-win">
            <span className="rps-score-num">{wins}</span>
            <span className="rps-score-lbl">You</span>
          </div>
          <div className="rps-score-item rps-score-draw">
            <span className="rps-score-num">{draws}</span>
            <span className="rps-score-lbl">Draw</span>
          </div>
          <div className="rps-score-item rps-score-lose">
            <span className="rps-score-num">{losses}</span>
            <span className="rps-score-lbl">AI</span>
          </div>
        </div>

        {/* Actions */}
        <div className="rps-reveal-actions">
          <button className="rps-play-again-btn" onClick={handlePlayAgain}>
            Play Again
          </button>
          <button className="rps-reset-btn" onClick={handleReset}>
            <img src="https://cdn-icons-png.flaticon.com/512/10435/10435525.png" alt="reset" className="rps-reset-icon" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
